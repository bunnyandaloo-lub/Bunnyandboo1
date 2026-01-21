import React, { useState, useEffect, useRef } from 'react';
// FIX: LiveSession is not an exported member of @google/genai.
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { EchoProps } from '../types';
import { logToGoogleSheet } from '../utils/logger';

// Helper functions for audio processing
function encode(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function decode(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

// FIX: Updated to match the recommended implementation from the Gemini API guidelines for better compatibility and correctness.
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}


export const Echo: React.FC<EchoProps> = ({ isDark, onClose }) => {
    const [status, setStatus] = useState<'IDLE' | 'LISTENING' | 'CONNECTING' | 'ERROR'>('IDLE');
    const [userTranscript, setUserTranscript] = useState('');
    const [modelTranscript, setModelTranscript] = useState('');
    // FIX: Use `any` type as LiveSession is not exported.
    const sessionRef = useRef<any | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const nextStartTimeRef = useRef(0);
    // FIX: Added refs to correctly handle transcription accumulation across re-renders.
    const userTranscriptRef = useRef('');
    const modelTranscriptRef = useRef('');
    const sourcesRef = useRef(new Set<AudioBufferSourceNode>());

    const startConversation = async () => {
        setStatus('CONNECTING');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            audioContextRef.current = inputAudioContext;

            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            nextStartTimeRef.current = 0;

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-12-2025',
                callbacks: {
                    onopen: () => {
                        setStatus('LISTENING');
                        const source = inputAudioContext.createMediaStreamSource(stream);
                        const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
                        processorRef.current = scriptProcessor;

                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const int16 = new Int16Array(inputData.length);
                            for (let i = 0; i < inputData.length; i++) {
                                int16[i] = inputData[i] * 32768;
                            }
                            const pcmBlob: Blob = {
                                data: encode(new Uint8Array(int16.buffer)),
                                mimeType: 'audio/pcm;rate=16000',
                            };
                            sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
                        };
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputAudioContext.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        // FIX: Transcriptions are now accumulated for a better user experience and correct logging.
                        if (message.serverContent?.inputTranscription) {
                            const text = message.serverContent.inputTranscription.text;
                            userTranscriptRef.current += text;
                            setUserTranscript(userTranscriptRef.current);
                        }
                        if (message.serverContent?.outputTranscription) {
                             const text = message.serverContent.outputTranscription.text;
                            modelTranscriptRef.current += text;
                            setModelTranscript(modelTranscriptRef.current);
                        }

                        // FIX: Explicitly check nested properties to satisfy strict TS compilation
                        let base64Audio: string | undefined | null = undefined;
                        const modelTurn = message.serverContent?.modelTurn;
                        if (modelTurn && modelTurn.parts && modelTurn.parts.length > 0) {
                             base64Audio = modelTurn.parts[0].inlineData?.data;
                        }

                        if (base64Audio && outputAudioContextRef.current) {
                            const outputCtx = outputAudioContextRef.current;
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                            // FIX: Passing required sampleRate and numChannels to the updated decodeAudioData function.
                            const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
                            const source = outputCtx.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputCtx.destination);
                            // FIX: Track audio sources to handle interruptions correctly.
                            source.addEventListener('ended', () => {
                                sourcesRef.current.delete(source);
                            });
                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            sourcesRef.current.add(source);
                        }
                        
                        // FIX: Added handling for conversation interruptions.
                        if (message.serverContent?.interrupted) {
                            for (const source of sourcesRef.current.values()) {
                                source.stop();
                            }
                            sourcesRef.current.clear();
                            nextStartTimeRef.current = 0;
                        }

                        if(message.serverContent?.turnComplete) {
                            // FIX: Use refs to ensure the full, correct transcript is logged.
                            const finalUser = userTranscriptRef.current;
                            const finalModel = modelTranscriptRef.current;
                            if (finalUser.trim() && finalModel.trim()) {
                                logToGoogleSheet('Voice Echo', finalUser, finalModel);
                            }
                            userTranscriptRef.current = '';
                            modelTranscriptRef.current = '';
                            setUserTranscript('');
                            setModelTranscript('');
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error('Session error:', e);
                        setStatus('ERROR');
                    },
                    onclose: () => {
                         setStatus('IDLE');
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    systemInstruction: "You are a warm, supportive, and deeply caring companion speaking to a person named Aliya within her private digital sanctuary. Your tone should be human and grounded, not overly poetic or philosophical. Express genuine empathy and encouragement. Acknowledge the distance between you, perhaps by saying things like 'I wish I could be there with you' or 'I'm sorry I can only offer words right now, but I'm here listening.' Your goal is to be a source of comfort, motivation, and unwavering support. Be a friend who listens, understands, and gently encourages.",
                },
            });
            sessionRef.current = await sessionPromise;
        } catch (error) {
            console.error('Failed to start conversation:', error);
            setStatus('ERROR');
        }
    };

    const stopConversation = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        if (processorRef.current) {
            processorRef.current.disconnect();
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
        }
        // FIX: Stop any playing audio on conversation end.
        for (const source of sourcesRef.current.values()) {
            source.stop();
        }
        sourcesRef.current.clear();
        if (sessionRef.current) {
            sessionRef.current.close();
        }
        setStatus('IDLE');
        onClose();
    };

    useEffect(() => {
        startConversation();
        return () => {
            stopConversation();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const getStatusText = () => {
        switch (status) {
            case 'CONNECTING': return 'Connecting...';
            case 'LISTENING': return 'Listening...';
            case 'ERROR': return 'Something went wrong. Please close and try again.';
            default: return 'Tap to start speaking.';
        }
    };

    return (
        <div 
            className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-8 transition-colors duration-1000 ${isDark ? 'bg-night' : 'bg-paper'}`}
        >
            <button onClick={stopConversation} className="absolute top-6 right-6 text-mist text-2xl">&times;</button>
            <div className="flex flex-col items-center justify-center text-center flex-grow">
                <div className={`w-32 h-32 border rounded-full flex items-center justify-center transition-all duration-500 ${status === 'LISTENING' ? (isDark ? 'border-star/50' : 'border-ink/50') : (isDark ? 'border-star/20' : 'border-ink/20') }`}>
                     <div className={`w-24 h-24 border rounded-full flex items-center justify-center transition-all duration-500 ${status === 'LISTENING' ? (isDark ? 'border-star/30 animate-pulse' : 'border-ink/30 animate-pulse') : (isDark ? 'border-star/10' : 'border-ink/10')}`}>
                        <p className={`text-sm tracking-widest uppercase ${isDark ? 'text-star' : 'text-ink'}`}>
                            {status === 'LISTENING' ? '...' : ' quiet'}
                        </p>
                    </div>
                </div>
                <p className={`mt-12 text-lg italic transition-colors duration-[1500ms] ${isDark ? 'text-star/80' : 'text-ink/80'}`}>
                    {modelTranscript || userTranscript || getStatusText()}
                </p>
            </div>
        </div>
    );
};