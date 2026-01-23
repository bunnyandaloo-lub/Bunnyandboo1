import React, { useState, useEffect } from 'react';
import { FadeIn } from './ui/FadeIn';
import { INTRO_IMAGE_URL } from './ui/ImageLinks';

interface IntroSequenceProps {
  heartCount: number;
  onComplete: () => void;
}

export const IntroSequence: React.FC<IntroSequenceProps> = ({ heartCount, onComplete }) => {
  const [phase, setPhase] = useState<'HEART' | 'PICTURE'>('HEART');

  const handleHeartClick = () => {
    setPhase('PICTURE');
  };

  useEffect(() => {
    if (phase === 'PICTURE') {
      const timer = setTimeout(() => {
        onComplete();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [phase, onComplete]);

  return (
    <div className="fixed inset-0 z-[100] bg-paper flex items-center justify-center overflow-hidden">
      {phase === 'HEART' ? (
        <div className="flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-1000">
          <button 
            onClick={handleHeartClick}
            className="group relative flex flex-col items-center"
          >
            <div className="text-6xl md:text-8xl animate-heart-pulse glow-heart cursor-pointer transform transition-transform group-hover:scale-110">
              ❤️
            </div>
            <div className="mt-8 text-center px-6">
              <p className="font-serif italic text-xl md:text-2xl text-ink/70 tracking-wide">
                "You crossed my mind <span className="font-bold tabular-nums">{heartCount}</span> {heartCount === 1 ? 'time' : 'times'} today."
              </p>
              <p className="mt-4 text-[10px] uppercase tracking-[0.4em] text-mist opacity-50">
                Click to enter
              </p>
            </div>
          </button>
        </div>
      ) : (
        <div className="relative w-full h-full flex items-center justify-center animate-in fade-in duration-[2000ms]">
          <div 
            className="absolute inset-0 grayscale opacity-80"
            style={{
              backgroundImage: `url(${INTRO_IMAGE_URL})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <div className="absolute inset-0 bg-black/20" />
          
          <FadeIn delay={1000} duration={2000} className="relative z-10">
            <h1 className="text-8xl md:text-9xl text-paper font-light tracking-tight text-center" style={{ textShadow: '0 4px 30px rgba(0,0,0,0.4)' }}>
              Aliya
            </h1>
          </FadeIn>
        </div>
      )}
    </div>
  );
};