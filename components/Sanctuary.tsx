
import React, { useState, useEffect, useRef } from 'react';
import { FadeIn } from './ui/FadeIn';
import { Journal } from './Journal';
import { Chat } from './Chat';
import { Menu } from './ui/Menu';
import { PresenceHeart } from './PresenceHeart';
import { INTRO_IMAGE_URL, MIRROR_IMAGE_URL, FOOTPRINTS_IMAGE_URL, IMAGE_3_URL } from './ui/ImageLinks';
import { SanctuaryProps } from '../types';
import { TodaysPoemJournal } from './TodaysPoemJournal';
import { JournalHistoryViewer } from './JournalHistoryViewer';
import { logHeart, fetchLogs } from '../utils/logger';

const IntroSection: React.FC<{ scrollY: number; mousePos: { x: number; y: number } }> = ({ scrollY, mousePos }) => {
  const fadeEnd = 600;
  const textOpacity = Math.max(0, 1 - scrollY / fadeEnd);
  const nameTranslateX = (mousePos.x / window.innerWidth - 0.5) * 20;
  const nameTranslateY = (mousePos.y / window.innerHeight - 0.5) * 10;

  return (
    <section
      className="relative min-h-screen w-full flex flex-col items-center justify-center"
      style={{
        backgroundImage: `url(${INTRO_IMAGE_URL})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'scroll',
      }}
    >
      <div className="absolute inset-0 bg-black/30 grayscale opacity-70" />
      <div
        className="relative z-10 text-center transition-transform duration-300 ease-out"
        style={{
          transform: `translate(${nameTranslateX}px, ${nameTranslateY}px)`,
          opacity: textOpacity,
        }}
      >
        <h1 className="text-8xl md:text-9xl text-paper font-light tracking-tight" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}>
          Aliya
        </h1>
      </div>
      <div
        className="absolute bottom-10 left-1/2 -translate-x-1/2 text-paper text-xs uppercase tracking-[0.2em] animate-pulse"
        style={{ opacity: textOpacity }}
      >
        Scroll Down
      </div>
    </section>
  );
};

export const Sanctuary: React.FC<SanctuaryProps> = ({ userMode }) => {
  const [isDark, setIsDark] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showJournalHistory, setShowJournalHistory] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [heartCount, setHeartCount] = useState(0);
  const [isSendingHeart, setIsSendingHeart] = useState(false);

  // Daily reset and fetching heart count
  const calculateDailyHearts = async () => {
    const data = await fetchLogs();
    const today = new Date().toLocaleDateString();
    
    const count = data.filter((log: any) => {
      const isHeart = log['Type'] === 'Heart Sent';
      const logDate = new Date(log['Timestamp']).toLocaleDateString();
      return isHeart && logDate === today;
    }).length;

    setHeartCount(count);
    if (navigator.setAppBadge) navigator.setAppBadge(count);
  };

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const img = new Image();
    img.src = INTRO_IMAGE_URL;
    const handleLoad = () => {
      setTimeout(() => {
        setIsLoading(false);
        document.body.style.overflow = '';
      }, 2000);
    };
    if (img.complete) handleLoad(); else img.onload = handleLoad;

    calculateDailyHearts();
    const interval = setInterval(calculateDailyHearts, 30000); // Check every 30s

    // Request notifications permission politely
    if ('Notification' in window && Notification.permission === 'default') {
      setTimeout(() => {
        Notification.requestPermission();
      }, 10000);
    }

    return () => {
      document.body.style.overflow = '';
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    const handleMouseMove = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const handleHeartClick = async () => {
    if (isSendingHeart) return;
    setIsSendingHeart(true);
    
    const newCount = heartCount + 1;
    setHeartCount(newCount);
    
    // UI feedback and immediate badge update
    if (navigator.setAppBadge) navigator.setAppBadge(newCount);
    
    try {
      await logHeart(userMode, newCount);
    } finally {
      setIsSendingHeart(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[100] bg-paper flex items-center justify-center">
        <div className="text-mist text-xs tracking-[0.3em] uppercase animate-pulse">...</div>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsDark(!isDark)}
        className={`fixed top-6 left-6 z-40 p-2 rounded-full transition-all duration-300 ${isDark ? 'text-star hover:bg-star/10' : 'text-ink hover:bg-ink/10'}`}
      >
        {isDark ? (
           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        ) : (
           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        )}
      </button>

      {/* Heart Send Button - Bottom Right */}
      <button
        onClick={handleHeartClick}
        disabled={isSendingHeart}
        className={`fixed bottom-6 right-6 z-40 p-4 rounded-full shadow-lg transition-all duration-500 transform ${isSendingHeart ? 'scale-90 opacity-50' : 'hover:scale-110 active:scale-95'} ${isDark ? 'bg-star/10 text-red-400' : 'bg-ink text-red-300'}`}
        title="Send a heart"
      >
        <span className={`${isSendingHeart ? 'animate-ping' : ''}`}>❤️</span>
      </button>

      <Menu isDark={isDark} />

      <main 
        className={`min-h-screen pb-32 transition-colors duration-[1500ms] ease-in-out ${isDark ? 'bg-night text-star selection:bg-stone-800 selection:text-star' : 'bg-paper text-ink selection:bg-stone-200 selection:text-ink'}`}
      >
        <IntroSection scrollY={scrollY} mousePos={mousePos} />
        
        <div className="space-y-32 pt-24"> 
          
          {/* Dynamic Presence Logo & Heart Count */}
          <PresenceHeart 
            count={heartCount} 
            isDark={isDark} 
            onHeartClick={handleHeartClick} 
            isSending={isSendingHeart} 
          />

          <TodaysPoemJournal isDark={isDark} userMode={userMode} />

          <section className="flex justify-center mt-12 px-6 md:px-12">
            <FadeIn delay={200} duration={1000}>
                <button
                    onClick={() => setShowJournalHistory(true)}
                    className={`py-3 px-8 rounded-full text-sm uppercase tracking-[0.2em] font-bold shadow-lg transition-all duration-300 ease-out ${isDark ? 'bg-star/10 text-star hover:bg-star/20 active:scale-[0.98]' : 'bg-ink/10 text-ink hover:bg-ink/20 active:scale-[0.98]'}`}
                >
                    View All Journals
                </button>
            </FadeIn>
          </section>

          <section id="thoughts" className="w-full md:max-w-5xl md:mx-auto md:px-6">
            <FadeIn delay={500} duration={1500}>
              <Journal isDark={isDark} onReflect={() => setIsChatOpen(true)} userMode={userMode} />
            </FadeIn>
          </section>

          <section id="memories" className="max-w-2xl mx-auto px-6 md:px-12 space-y-32 pt-32">
            <FadeIn duration={2000}>
              <div className="flex flex-col items-center space-y-6">
                <div className="w-full aspect-[4/5] md:aspect-[3/2] overflow-hidden bg-stone-900 shadow-xl">
                  <img src={MIRROR_IMAGE_URL} alt="A quiet moment reflected." className="w-full h-full object-cover opacity-90 grayscale transition-opacity duration-1000"/>
                </div>
                <p className={`font-serif italic text-base md:text-lg tracking-wide opacity-80 ${isDark ? 'text-mist' : 'text-ink/70'}`}>Infinite grace.</p>
              </div>
            </FadeIn>
            
            <FadeIn duration={2000}>
              <div className="flex flex-col items-center space-y-6">
                <div className="w-full aspect-square md:aspect-[4/3] overflow-hidden bg-stone-900 max-w-md mx-auto shadow-xl">
                  <img src={INTRO_IMAGE_URL} alt="A gentle smile." className="w-full h-full object-cover opacity-90 grayscale transition-opacity duration-1000"/>
                </div>
                 <p className={`font-serif italic text-base md:text-lg tracking-wide opacity-80 ${isDark ? 'text-mist' : 'text-ink/70'}`}>My heart's favorite view.</p>
              </div>
            </FadeIn>
          </section>

          <section id="music" className="max-w-2xl mx-auto px-6 md:px-12 flex flex-col items-center justify-center space-y-6 py-12">
            <FadeIn className="w-full flex flex-col items-center">
              <p className="text-sm text-mist tracking-widest uppercase text-center mb-4">Listen closely...</p>
              <div className="w-full max-w-lg mx-auto opacity-80 grayscale transition-all duration-700 relative">
                <iframe style={{ borderRadius: '12px' }} src="https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M?utm_source=generator" width="100%" height="352" frameBorder="0" allowFullScreen={true} allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
              </div>
            </FadeIn>
          </section>

          <footer className="max-w-2xl mx-auto px-6 md:px-12 pt-20 pb-32 flex justify-center">
            <FadeIn delay={500} duration={2000}>
              <p className="text-sm text-mist/60 italic tracking-wide">For Aliya. Always.</p>
            </FadeIn>
          </footer>
        </div>
      </main>

      {isChatOpen && <Chat isDark={isDark} onClose={() => setIsChatOpen(false)} />}
      {showJournalHistory && (
        <JournalHistoryViewer isDark={isDark} onClose={() => setShowJournalHistory(false)} userMode={userMode} />
      )}
    </>
  );
};
