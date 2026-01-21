import React, { useState, useEffect } from 'react';
import { FadeIn } from './ui/FadeIn';
import { logToGoogleSheet, GOOGLE_SHEET_LOGGER_URL } from '../utils/logger';
import { JournalProps, UserMode } from '../types';
import { TodaysPoemJournalForm } from './TodaysPoemJournalForm'; // Import the new form

interface DailyJournalEntry {
  id: string;
  poemText: string;
  spotifyUrl?: string;
  fullTimestamp: number;
  sender: 'HIM' | 'HER';
}

export const TodaysPoemJournal: React.FC<Pick<JournalProps, 'isDark' | 'userMode'>> = ({ isDark, userMode }) => {
  const [latestEntry, setLatestEntry] = useState<DailyJournalEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchLatestDailyJournal = async () => {
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

            // Determine sender for display
            // This assumes 'Admin' user is the one posting 'Daily Poem Journal'
            const sender: 'HIM' | 'HER' = (item['Type'] === 'Daily Poem Journal' && userMode === 'Admin') ? 'HIM' : 'HER'; 

            return {
              id: `daily-journal-${index}`,
              poemText,
              spotifyUrl,
              fullTimestamp,
              sender,
            };
          })
          .sort((a: DailyJournalEntry, b: DailyJournalEntry) => b.fullTimestamp - a.fullTimestamp); // Newest first

        if (dailyJournals.length > 0) {
          setLatestEntry(dailyJournals[0]);
        } else {
          setLatestEntry(null);
        }
      }
    } catch (error) {
      console.error("Failed to fetch daily poem journal:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLatestDailyJournal();
    // Poll for new entries every minute in case admin posts
    const interval = setInterval(fetchLatestDailyJournal, 60000); 
    return () => clearInterval(interval);
  }, [userMode]); // Re-fetch if user mode changes

  const handleSaveDailyPoem = async (poemText: string, spotifyUrl?: string) => {
    const journalType = 'Daily Poem Journal';
    const payload = JSON.stringify({ poemText, spotifyUrl });
    await logToGoogleSheet(journalType, payload, '');
    await fetchLatestDailyJournal(); // Re-fetch to update with the new entry
  };

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


  const formattedDate = latestEntry?.fullTimestamp
    ? new Date(latestEntry.fullTimestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
    : '';
  const formattedTime = latestEntry?.fullTimestamp
    ? new Date(latestEntry.fullTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <>
      <section className={`max-w-2xl mx-auto px-6 md:px-12 prose prose-lg md:prose-xl prose-p:font-serif prose-p:leading-loose transition-colors duration-[1500ms] ${isDark ? 'prose-p:text-star' : 'prose-p:text-ink'} relative`}>
        {isLoading ? (
          <div className="flex justify-center items-center h-48">
            <span className="text-mist text-sm animate-pulse tracking-widest">LOADING JOURNAL...</span>
          </div>
        ) : (
          <FadeIn>
            {latestEntry ? (
              <div className="flex flex-col items-center justify-center text-center space-y-8">
                <p className={`text-sm text-mist/60 italic tracking-wide`}>
                  {latestEntry.poemText.split('\n').map((line, index) => (
                    <span key={index} className="block">{line || <br/>}</span>
                  ))}
                </p>
                <p className={`font-serif text-base md:text-lg tracking-wide opacity-80 ${isDark ? 'text-mist' : 'text-ink/70'}`}>
                   - {latestEntry.sender}, {formattedDate}, {formattedTime}
                </p>
                {latestEntry.spotifyUrl && getSpotifyEmbedUrl(latestEntry.spotifyUrl) && (
                  <div className="mt-8 w-full max-w-lg mx-auto flex flex-col items-center space-y-4">
                    <p className={`text-sm text-mist tracking-widest uppercase text-center`}>
                      Warm thoughts don’t need answers.
                    </p>
                    <div className={`w-full relative opacity-80 grayscale transition-all duration-700`}>
                      {/* 
                        IMPORTANT: Spotify embeds cannot be directly controlled for autoplay or volume from a parent iframe due to browser security policies.
                        The user must manually press play.
                      */}
                      <iframe 
                        style={{ borderRadius: '12px' }} 
                        src={getSpotifyEmbedUrl(latestEntry.spotifyUrl)} 
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
            ) : (
                <div className="flex flex-col items-center justify-center h-48 opacity-30">
                    <p className="text-sm text-mist italic">No daily journal entries yet.</p>
                </div>
            )}
          </FadeIn>
        )}
        
        {userMode === 'Admin' && (
          <button
            onClick={() => setShowForm(true)}
            className={`
              absolute -top-12 right-6 md:right-12 p-2 px-4 rounded-full text-xs uppercase tracking-[0.2em]
              transition-colors duration-300
              ${isDark ? 'text-star bg-star/10 hover:bg-star/20' : 'text-ink bg-ink/10 hover:bg-ink/20'}
            `}
            title="Add/Edit Today's Journal"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            <span className="ml-2">Journal</span>
          </button>
        )}
      </section>

      {showForm && (
        <TodaysPoemJournalForm
          isDark={isDark}
          onClose={() => setShowForm(false)}
          onSave={handleSaveDailyPoem}
          userMode={userMode}
        />
      )}
    </>
  );
};