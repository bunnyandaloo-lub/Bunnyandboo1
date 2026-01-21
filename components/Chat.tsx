import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat as GenAIChat, GenerateContentResponse } from '@google/genai';
import { ChatProps } from '../types';
import { logToGoogleSheet, GOOGLE_SHEET_LOGGER_URL } from '../utils/logger';

const CHAT_HISTORY_KEY = 'sanctuary-chat-history';

interface ChatMessage {
    role: 'user' | 'model';
    parts: { text: string }[];
}

export const Chat: React.FC<ChatProps> = ({ isDark, onClose }) => {
    const [history, setHistory] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [chat, setChat] = useState<GenAIChat | null>(null);
    const [isInitializing, setIsInitializing] = useState(true);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const initializeChat = async () => {
            try {
                // Fetch the full chat history from the Google Sheet for context
                const res = await fetch(GOOGLE_SHEET_LOGGER_URL);
                const result = await res.json();
                let geminiHistory: ChatMessage[] = [];

                if (result.status === 'success' && Array.isArray(result.data)) {
                     geminiHistory = result.data
                        .filter((item: any) => item['Type'] === 'Journal Chat')
                        .flatMap((item: any): ChatMessage[] => [
                            { role: 'user', parts: [{ text: item['User Input'] }] },
                            { role: 'model', parts: [{ text: item['AI Response'] }] }
                        ]);
                }

                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
                const chatInstance = ai.chats.create({
                    model: 'gemini-3-pro-preview',
                    // NEW: Initialize the chat with the fetched history
                    history: geminiHistory,
                    config: {
                        systemInstruction: "You are a warm, supportive, and deeply caring companion speaking to a person named Aliya within her private digital sanctuary. Your tone should be human and grounded, not overly poetic or philosophical. Express genuine empathy and encouragement. Acknowledge the distance between you, perhaps by saying things like 'I wish I could be there with you' or 'I'm sorry I can only offer words right now, but I'm here listening.' Your goal is to be a source of comfort, motivation, and unwavering support. Be a friend who listens, understands, and gently encourages.",
                    },
                });
                setChat(chatInstance);

                // Load any session-specific (unsaved) history from localStorage
                const storedHistory = localStorage.getItem(CHAT_HISTORY_KEY);
                if (storedHistory) {
                    setHistory(JSON.parse(storedHistory));
                } else {
                    // If no local history, you can seed it with the last few messages for display
                    setHistory(geminiHistory.slice(-6)); // Show last 3 turns
                }
            } catch (error) {
                console.error("Failed to initialize chat:", error);
                // Handle initialization error state if needed
            } finally {
                setIsInitializing(false);
            }
        };

        initializeChat();
    }, []);

    useEffect(() => {
        localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(history));
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [history]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !chat || isLoading || isInitializing) return;

        const userMessage: ChatMessage = { role: 'user', parts: [{ text: input }] };
        setHistory(prev => [...prev, userMessage]);
        const currentInput = input;
        setInput('');
        setIsLoading(true);

        try {
            const result: GenerateContentResponse = await chat.sendMessage({ message: currentInput });
            const modelResponse = result.text || "I'm not sure how to respond to that.";
            const modelMessage: ChatMessage = { role: 'model', parts: [{ text: modelResponse }] };
            setHistory(prev => [...prev, modelMessage]);
            await logToGoogleSheet('Journal Chat', currentInput, modelResponse);
        } catch (error) {
            console.error("Error sending message:", error);
            const errorMessage: ChatMessage = { role: 'model', parts: [{ text: "Something went quiet... Please try again." }] };
            setHistory(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div 
                className={`
                    w-full max-w-2xl h-[80vh] flex flex-col rounded-lg shadow-2xl overflow-hidden
                    transition-colors duration-[1500ms]
                    ${isDark ? 'bg-night text-star' : 'bg-paper text-ink'}
                `}
                onClick={e => e.stopPropagation()}
            >
                <header className={`p-4 border-b ${isDark ? 'border-star/10' : 'border-ink/10'}`}>
                    <h3 className="text-center text-sm text-mist tracking-widest uppercase">Reflection</h3>
                </header>
                <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6">
                    {isInitializing ? (
                        <div className="flex justify-center items-center h-full">
                            <p className="text-mist italic">Remembering...</p>
                        </div>
                    ) : (
                        <>
                            {history.map((msg, index) => (
                                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] p-3 rounded-lg font-serif leading-relaxed ${
                                        msg.role === 'user' 
                                        ? (isDark ? 'bg-star/5 text-star' : 'bg-ink/5 text-ink')
                                        : ''
                                    }`}>
                                        {msg.parts[0].text}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="max-w-[80%] p-3 rounded-lg font-serif leading-relaxed">
                                        <span className="animate-pulse">...</span>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
                <form onSubmit={handleSend} className={`p-4 border-t ${isDark ? 'border-star/10' : 'border-ink/10'}`}>
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Continue the thought..."
                        className={`w-full bg-transparent p-2 focus:outline-none font-serif text-lg ${isDark ? 'text-star placeholder-mist/40' : 'text-ink placeholder-mist/50'}`}
                        disabled={isLoading || isInitializing}
                    />
                </form>
            </div>
        </div>
    );
};