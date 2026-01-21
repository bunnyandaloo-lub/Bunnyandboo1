
import React from 'react';
import { FadeIn } from './ui/FadeIn';

interface PresenceHeartProps {
  count: number;
  isDark: boolean;
  onHeartClick: () => void;
  isSending: boolean;
}

export const PresenceHeart: React.FC<PresenceHeartProps> = ({ count, isDark, onHeartClick, isSending }) => {
  const hasHearts = count > 0;

  return (
    <FadeIn delay={200} duration={2000} className="flex flex-col items-center justify-center pt-24 pb-12">
      <div className="relative">
        {/* The Main Presence Logo */}
        <button 
          onClick={onHeartClick}
          disabled={isSending}
          className={`
            relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-1000
            ${isDark ? 'bg-star/5 border border-star/10' : 'bg-ink/5 border border-ink/10'}
            ${hasHearts ? 'glow-heart' : ''}
            ${isSending ? 'animate-pulse scale-95' : 'hover:scale-105'}
            group
          `}
        >
          {/* Logo Letter */}
          <span className={`text-4xl font-light tracking-tighter ${isDark ? 'text-star/80' : 'text-ink/80'}`}>
            A
          </span>
          
          {/* Heart overlay when active */}
          {hasHearts && (
            <div className="absolute -top-1 -right-1 w-6 h-6 flex items-center justify-center">
              <span className="text-red-400 text-sm animate-heart-pulse">❤️</span>
            </div>
          )}
        </button>

        {/* Floating Hearts Feedback on click */}
        {isSending && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-2xl animate-bounce">❤️</span>
          </div>
        )}
      </div>

      {hasHearts ? (
        <div className="mt-8 text-center animate-in fade-in slide-in-from-top-4 duration-1000">
          <p className={`text-lg font-serif italic tracking-wide ${isDark ? 'text-mist' : 'text-ink/70'}`}>
            "Today, you crossed my mind <span className="font-bold tabular-nums">{count}</span> {count === 1 ? 'time' : 'times'}."
          </p>
          <p className="text-[10px] uppercase tracking-[0.3em] text-mist/40 mt-2">
            Presence Felt
          </p>
        </div>
      ) : (
        <div className="mt-8 text-center opacity-30">
          <p className={`text-sm font-serif italic tracking-widest ${isDark ? 'text-mist' : 'text-ink/70'}`}>
            Quietly here.
          </p>
        </div>
      )}
    </FadeIn>
  );
};
