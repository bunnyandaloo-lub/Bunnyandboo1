import React, { useState, useEffect, useRef } from 'react';
import { FadeIn } from './ui/FadeIn';
import { GOOGLE_SHEET_LOGGER_URL } from '../utils/logger';
import { JournalHistoryViewerProps } from '../types';

interface DailyJournalEntry {
  id: string;
  poemText: string;
  spotifyUrl?: string;
  fullTimestamp: number;
  sender: 'HIM' | 'HER';
}

export const JournalHistoryViewer: React.FC<JournalHistoryViewerProps> = ({ isDark, onClose, userMode }) => {
  const [journalEntries, setJournalEntries] = useState<DailyJournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const fetchAllDailyJournals = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(GOOGLE_SHEET_LOGGER_URL);
      const result = await res.json();

      if (result.status === 'success' && Array.isArray(result.data)) {
        const dailyJournals = result.data
          .filter((item: any) => item['Type'] === 'Daily Poem Journal')
          .map((item: any, index: number) => {
            const fullTimestamp = new Date(item['Timestamp']).getTime();
            let poemText = '';
            let spotifyUrl = undefined;
            
            try {
                const payload = JSON.parse(item['User Input']);
                poemText = payload.poemText || '';
                spotifyUrl = payload.spotifyUrl || undefined;
            } catch (e) {
                console.warn("Failed to parse daily poem journal payload, treating as plain text:", item['User Input']);
                poemText = item['User Input']; // Fallback to raw input
            }

            // Determine sender for display (assuming Admin is 'HIM' for these entries)
            const sender: 'HIM' | 'HER' = 'HIM'; 

            return {
              id: `daily-journal-history-${index}`,
              poemText,
              spotifyUrl,
              fullTimestamp,
              sender,
            };
          })
          .sort((a: DailyJournalEntry, b: DailyJournalEntry) => b.fullTimestamp - a.fullTimestamp); // Newest first

        setJournalEntries(dailyJournals);
      }
    } catch (error) {
      console.error("Failed to fetch all daily poem journals:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllDailyJournals();
    // Close on Escape key press
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const getSpotifyEmbedUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const trackId = pathParts[pathParts.indexOf('track') + 1];
      if (trackId) {
        return `https://open.spotify.com/embed/track/${trackId}?utm_source=generator&go=1&t=0`;
      }
    } catch (e) {
      console.error("Invalid Spotify URL for embedding:", url, e);
    }
    return ''; // Return empty string if not a valid embeddable track URL
  };

  return (
    <div 
      className="fixed inset-0 z-[70] flex flex-col items-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300"
      onClick={onClose}
    >
      <FadeIn delay={0} duration={300} className="w-full max-w-4xl h-full flex flex-col">
        <div 
          className={`
            rounded-xl shadow-2xl flex flex-col flex-1 overflow-hidden
            ${isDark ? 'bg-night/90 border border-star/10 text-star' : 'bg-paper/90 border border-ink/10 text-ink'}
          `}
          onClick={e => e.stopPropagation()}
        >
          <header className={`p-4 border-b flex justify-between items-center ${isDark ? 'border-star/10' : 'border-ink/10'}`}>
            <h3 className="text-lg font-bold font-serif">Journal History</h3>
            <button
              type="button"
              onClick={onClose}
              className={`p-2 rounded-full text-mist hover:text-star transition-colors ${isDark ? 'hover:bg-star/10' : 'hover:bg-ink/10'}`}
              title="Close Journal History"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </header>

          <div 
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto p-6 space-y-12"
          >
            {isLoading ? (
              <div className="flex justify-center items-center h-full">
                <span className="text-mist text-sm animate-pulse tracking-widest">LOADING ARCHIVE...</span>
              </div>
            ) : (
              <>
                {journalEntries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full opacity-30">
                    <p className="text-sm text-mist italic">No journal entries found in the archive.</p>
                  </div>
                ) : (
                  journalEntries.map((entry, index) => {
                    const formattedDate = entry.fullTimestamp
                      ? new Date(entry.fullTimestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
                      : '';
                    const formattedTime = entry.fullTimestamp
                      ? new Date(entry.fullTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '';

                    return (
                      <FadeIn key={entry.id} delay={index * 50} className="w-full">
                        <div className={`
                          flex flex-col items-center justify-center text-center space-y-4 p-6 rounded-lg shadow-sm
                          ${isDark ? 'bg-night/50 border border-star/5' : 'bg-paper border border-ink/5'}
                        `}>
                          <p className={`text-sm text-mist/60 italic tracking-wide`}>
                            {entry.poemText.split('\n').map((line, lineIndex) => (
                              <span key={lineIndex} className="block">{line || <br/>}</span>
                            ))}
                          </p>
                          <p className={`font-serif text-base md:text-lg tracking-wide opacity-80 ${isDark ? 'text-mist' : 'text-ink/70'}`}>
                             - {entry.sender}, {formattedDate}, {formattedTime}
                          </p>
                          {entry.spotifyUrl && getSpotifyEmbedUrl(entry.spotifyUrl) && (
                            <div className="mt-4 w-full max-w-sm mx-auto flex flex-col items-center space-y-3">
                              <p className={`text-xs text-mist tracking-widest uppercase text-center`}>
                                Accompanying Melody
                              </p>
                              <div className={`w-full relative opacity-70 grayscale transition-all duration-700`}>
                                <iframe 
                                  style={{ borderRadius: '12px' }} 
                                  src={getSpotifyEmbedUrl(entry.spotifyUrl)} 
                                  width="100%" 
                                  height="180" 
                                  frameBorder="0" 
                                  allowFullScreen={true} 
                                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                                  loading="lazy">
                                </iframe>
                                {/* Removed the overlay div to ensure play button visibility */}
                              </div>
                            </div>
                          )}
                        </div>
                      </FadeIn>
                    );
                  })
                )}
              </>
            )}
          </div>
        </div>
      </FadeIn>
    </div>
  );
};