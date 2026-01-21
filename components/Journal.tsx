import React, { useState, useEffect, useRef } from 'react';
import { FadeIn } from './ui/FadeIn';
import { logToGoogleSheet } from '../utils/logger';
import { GOOGLE_SHEET_LOGGER_URL } from '../utils/logger';
import { JournalProps } from '../types';
import { ImageViewer } from './ui/ImageViewer';
import { GifPicker } from './ui/GifPicker';

const GIPHY_API_KEY = "CYkdse9AFnChvfYG9WsHVoIqLABOmQa1";

interface Message {
  id: number | string;
  text: string;
  image?: string;
  timestamp: string; // Display time
  fullTimestamp?: number; // Sorting
  type?: string;
  sender: 'me' | 'other' | 'system';
}

// Helper to compress image to base64
const processImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Conservative limit to fit in Google Sheet cell (50k char limit)
        const MAX_DIM = 600; 
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height *= MAX_DIM / width;
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width *= MAX_DIM / height;
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        // High compression to ensure we don't break the sheet
        const dataUrl = canvas.toDataURL('image/jpeg', 0.5); 
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export const Journal: React.FC<JournalProps> = ({ isDark, onReflect, userMode }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMessage, setCurrentMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchHistory = async () => {
    try {
      // Don't set full loading state on background refreshes to avoid UI flicker
      if (messages.length === 0) setIsLoading(true);
      
      const res = await fetch(GOOGLE_SHEET_LOGGER_URL); 
      const result = await res.json();
      
      if (result.status === 'success' && Array.isArray(result.data)) {
         const fetchedMessages: Message[] = result.data
          .filter((item: any) => 
              item['Type'] === 'Journal Entry' || 
              item['Type'] === 'Admin Reply'
          )
          .map((item: any, index: number) => {
            let sender: 'me' | 'other' = 'other';
            
            if (userMode === 'Admin') {
                sender = item['Type'] === 'Admin Reply' ? 'me' : 'other';
            } else {
                sender = item['Type'] === 'Journal Entry' ? 'me' : 'other';
            }

            let text = item['User Input'];
            let image = undefined;

            if (text.startsWith('data:image')) {
                image = text;
                text = ''; 
            } else if (text.includes('||IMG||')) {
                const parts = text.split('||IMG||');
                text = parts[0];
                image = parts[1];
            }

            return {
              id: `history-${index}`,
              text: text,
              image: image,
              timestamp: new Date(item['Timestamp']).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              fullTimestamp: new Date(item['Timestamp']).getTime(),
              type: item['Type'],
              sender: sender,
            };
          });
          
          // Sort by time ascending (oldest first)
          fetchedMessages.sort((a, b) => (a.fullTimestamp || 0) - (b.fullTimestamp || 0));
          
          // Determine Partner Presence (Active in last 15 minutes)
          const lastMessageFromOther = fetchedMessages
            .filter(m => m.sender === 'other')
            .pop(); // Still need to find the actual latest 'other' for presence, not necessarily the displayed latest
          
          if (lastMessageFromOther && lastMessageFromOther.fullTimestamp) {
            const timeSinceLastMsg = Date.now() - lastMessageFromOther.fullTimestamp;
            // 15 minutes = 900000 ms
            setPartnerOnline(timeSinceLastMsg < 900000);
          } else {
            setPartnerOnline(false);
          }

          setMessages(fetchedMessages);
          setIsConnected(true);
      }
    } catch (error) {
      console.error("Failed to fetch journal history:", error);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch and polling
  useEffect(() => {
    fetchHistory();
    const interval = setInterval(fetchHistory, 10000); // Poll every 10 seconds to be gentler
    return () => clearInterval(interval);
  }, [userMode]);

  // Scroll to bottom logic: Only scroll the container, not the window
  useEffect(() => {
    if (scrollContainerRef.current) {
        const { scrollHeight, clientHeight } = scrollContainerRef.current;
        // Scroll to the bottom of the container
        scrollContainerRef.current.scrollTo({
            top: scrollHeight - clientHeight,
            behavior: 'smooth'
        });
    }
  }, [messages]);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const base64 = await processImage(e.target.files[0]);
        setSelectedImage(base64);
        setShowGifPicker(false); // Close GIF picker if open
      } catch (err) {
        console.error("Image processing failed", err);
        alert("Could not process image. Try a smaller one.");
      }
    }
  };

  const handleGifSelect = (url: string) => {
    setSelectedImage(url);
    setShowGifPicker(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((currentMessage.trim() === '' && !selectedImage) || isSending) return;

    setIsSending(true);

    const type = userMode === 'Admin' ? 'Admin Reply' : 'Journal Entry';
    
    // Construct payload. 
    let payload = currentMessage.trim();
    if (selectedImage) {
        if (payload) {
            payload = `${payload}||IMG||${selectedImage}`;
        } else {
            if (!selectedImage.startsWith('data:image')) {
                 payload = ` ||IMG||${selectedImage}`;
            } else {
                 payload = selectedImage; 
            }
        }
    }

    // Optimistic Update: Add new message to the end
    const newMessage: Message = {
      id: Date.now(),
      text: currentMessage.trim(),
      image: selectedImage || undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      fullTimestamp: Date.now(), 
      sender: 'me',
      type: type
    };

    setMessages(prev => [...prev, newMessage]); 
    setCurrentMessage('');
    setSelectedImage(null);
    setShowGifPicker(false);
    
    // Log to sheet
    await logToGoogleSheet(type, payload, '');
    
    setIsSending(false);
    // Trigger immediate fetch to sync state
    setTimeout(fetchHistory, 1000);
  };

  const getStatusText = () => {
    if (!isConnected) return 'Offline';
    if (partnerOnline) return 'Connected to you as always';
    if (userMode === 'Aliya') return 'He is offline but anyways connected to you';
    return 'She is offline but anyways connected to you';
  };

  return (
    <>
      <div className={`
          relative flex flex-col 
          w-full h-[90vh] md:h-[80vh] md:max-w-4xl md:mx-auto 
          md:border md:rounded-2xl md:overflow-hidden md:shadow-sm
          border-y md:border-0
          transition-all duration-[1500ms]
          ${isDark ? 'border-star/10 bg-night/50' : 'border-ink/10 bg-paper/50'}
        `}>
        
        {/* Header */}
        <div className={`
          flex items-center justify-between px-6 py-4 border-b
          ${isDark ? 'border-star/10 bg-night/80' : 'border-ink/5 bg-paper/80'}
          backdrop-blur-sm
        `}>
          {/* Left: Status */}
          <div className="flex-shrink-0 flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${isConnected && partnerOnline ? 'bg-green-500/50 animate-pulse' : (isConnected ? 'bg-mist/40' : 'bg-red-500/30')}`}></div>
              <span className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-mist max-w-[200px] md:max-w-none leading-tight">
                  {getStatusText()}
              </span>
          </div>
          
          {/* Center: Refresh Button */}
          <div className="flex-grow flex justify-center">
            <button
                onClick={() => fetchHistory()}
                className={`
                    flex items-center gap-2 p-2 px-4 rounded-full text-xs uppercase tracking-[0.2em]
                    transition-colors duration-300
                    ${isDark ? 'text-mist hover:text-star hover:bg-star/10' : 'text-mist hover:text-ink hover:bg-ink/5'}
                    ${isLoading ? 'animate-heart-pulse' : ''} 
                `}
                title="Refresh messages"
                disabled={isLoading} 
            >
                <svg
                    width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className="text-red-400" 
                >
                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                </svg>
                <span>Refresh</span>
            </button>
          </div>

          {/* Right: User Mode text */}
          <div className="flex-shrink-0 text-xs uppercase tracking-[0.2em] text-mist/60 hidden md:block">
              {userMode === 'Admin' ? 'Her' : 'Sanctuary'}
          </div>
        </div>

        {/* Messages Area */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth"
        >
          {isLoading && messages.length === 0 ? (
              <div className="flex justify-center items-center h-full">
                  <span className="text-mist text-sm animate-pulse tracking-widest">LOADING...</span>
              </div>
          ) : (
              <>
                  {messages.length === 0 && ( 
                      <div className="flex flex-col items-center justify-center h-full opacity-30">
                          <p className="text-sm text-mist italic">It starts with a whisper...</p>
                      </div>
                  )}
                  {messages.map((msg) => (
                      <FadeIn key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`
                              max-w-[85%] md:max-w-[70%] flex flex-col space-y-1
                              ${msg.sender === 'me' ? 'items-end' : 'items-start'}
                          `}>
                              <div className={`
                                  p-4 rounded-2xl shadow-sm relative overflow-hidden group
                                  ${msg.sender === 'me' 
                                      ? (isDark ? 'bg-star/10 text-star rounded-tr-sm' : 'bg-ink/5 text-ink rounded-tr-sm') 
                                      : (isDark ? 'bg-mist/10 text-mist rounded-tl-sm' : 'bg-white text-ink/80 rounded-tl-sm border border-mist/10')
                                  }
                              `}>
                                  {msg.image && (
                                      <div 
                                        className="mb-2 rounded-lg overflow-hidden cursor-zoom-in hover:opacity-90 transition-opacity"
                                        onClick={() => setViewingImageUrl(msg.image || null)}
                                      >
                                          <img src={msg.image} alt="attachment" className="max-w-full h-auto object-cover max-h-64" />
                                      </div>
                                  )}
                                  {msg.text && <p className="leading-relaxed font-serif text-lg whitespace-pre-wrap">{msg.text}</p>}
                                  <span className="text-[10px] uppercase tracking-wider opacity-40 mt-2 block text-right">
                                      {msg.timestamp}
                                  </span>
                              </div>
                          </div>
                      </FadeIn>
                  ))}
              </>
          )}
        </div>

        {/* Input Area */}
        <div className={`
          p-4 border-t relative
          ${isDark ? 'border-star/10 bg-night' : 'border-ink/5 bg-paper'}
        `}>
          
          {/* GIF Picker Component */}
          {showGifPicker && (
            <GifPicker 
                apiKey={GIPHY_API_KEY} 
                onSelect={handleGifSelect} 
                onClose={() => setShowGifPicker(false)}
                isDark={isDark}
            />
          )}

          {selectedImage && (
              <div className="flex items-center gap-2 mb-2 p-2 rounded bg-mist/10 w-fit">
                  <span className="text-xs text-mist">
                      {selectedImage.startsWith('data:') ? 'Photo attached' : 'GIF attached'}
                  </span>
                  <button 
                      onClick={() => setSelectedImage(null)}
                      className="text-mist hover:text-red-400"
                  >
                      &times;
                  </button>
              </div>
          )}
          <form onSubmit={handleSendMessage} className="flex items-end gap-3 relative">
              {/* Image Upload Button */}
              <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                      p-3 rounded-full transition-colors duration-300 flex items-center justify-center
                      ${isDark ? 'text-mist hover:text-star hover:bg-star/10' : 'text-mist hover:text-ink hover:bg-ink/5'}
                  `}
                  title="Attach Image"
              >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                  </svg>
              </button>
              <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageSelect} 
                  accept="image/*" 
                  className="hidden" 
              />
              
              {/* GIF Button */}
              <button
                  type="button"
                  onClick={() => setShowGifPicker(!showGifPicker)}
                  className={`
                      p-3 rounded-full transition-colors duration-300 flex items-center justify-center
                      ${showGifPicker 
                          ? (isDark ? 'text-star bg-star/10' : 'text-ink bg-ink/5')
                          : (isDark ? 'text-mist hover:text-star hover:bg-star/10' : 'text-mist hover:text-ink hover:bg-ink/5')
                      }
                  `}
                  title="Add GIF"
              >
                  <span className="font-bold text-[10px] tracking-wider border rounded px-1 border-current">GIF</span>
              </button>

              <textarea
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onFocus={() => setShowGifPicker(false)}
                  onKeyDown={(e) => {
                      if(e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(e);
                      }
                  }}
                  placeholder="Type a message..."
                  rows={1}
                  className={`
                      flex-1 bg-transparent max-h-32 py-3 px-2 font-serif text-lg outline-none resize-none
                      ${isDark ? 'text-star placeholder-mist/30' : 'text-ink placeholder-mist/40'}
                  `}
              />

              <button
                  type="submit"
                  disabled={isSending || (!currentMessage.trim() && !selectedImage)}
                  className={`
                      p-3 rounded-full transition-all duration-300 flex items-center justify-center
                      ${(!currentMessage.trim() && !selectedImage) 
                          ? 'opacity-30 cursor-not-allowed text-mist' 
                          : (isDark ? 'text-star bg-star/10 hover:bg-star/20' : 'text-paper bg-ink hover:bg-ink/80 shadow-md')
                      }
                  `}
              >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <line x1="22" y1="2" x2="11" y2="13"></line>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
              </button>
          </form>
        </div>

      </div>

      {viewingImageUrl && (
          <ImageViewer src={viewingImageUrl} onClose={() => setViewingImageUrl(null)} />
      )}
    </>
  );
};