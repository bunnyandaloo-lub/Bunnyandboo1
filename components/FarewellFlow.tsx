import React, { useState } from 'react';
import { FadeIn } from './ui/FadeIn';
import { FAREWELL_IMAGE_URL } from './ui/ImageLinks';
import { logToGoogleSheet } from '../utils/logger';

interface FarewellFlowProps {
  onCancel: () => void;
}

export const FarewellFlow: React.FC<FarewellFlowProps> = ({ onCancel }) => {
  const [inputValue, setInputValue] = useState('');
  const [isFinal, setIsFinal] = useState(false);

  const handleCancel = async () => {
    // Log the cancellation attempt before going back
    try {
      await logToGoogleSheet('Farewell Interaction', 'User clicked back/closed deletion screen', 'Returned to Home');
    } catch (e) {
      console.error("Logging failed", e);
    }
    onCancel();
  };

  const handleDelete = async () => {
    if (inputValue.trim().toUpperCase() === 'DELETE') {
      setIsFinal(true);
      // Log the successful deletion command
      try {
        await logToGoogleSheet('Farewell Interaction', 'User confirmed deletion with DELETE command', 'Permanent Deletion Triggered');
      } catch (e) {
        console.error("Logging failed", e);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-night overflow-hidden flex items-center justify-center">
      {/* Background Image - Full visibility on final stage, filtered on first */}
      <div 
        className={`absolute inset-0 transition-all duration-[4000ms] ease-in-out ${isFinal ? 'grayscale-0 opacity-80 scale-105' : 'grayscale contrast-125 opacity-40'}`}
        style={{
          backgroundImage: `url(${FAREWELL_IMAGE_URL})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className={`absolute inset-0 bg-black/40 transition-opacity duration-[3000ms] ${isFinal ? 'opacity-20' : 'opacity-60'}`} />

      {/* Close button - Only visible before final deletion */}
      {!isFinal && (
        <button 
          onClick={handleCancel}
          className="absolute top-8 right-8 z-[210] p-4 text-paper/50 hover:text-paper transition-all hover:scale-110"
          title="Return to Sanctuary"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      )}

      <div className="relative z-10 w-full max-w-2xl px-8">
        {!isFinal ? (
          <FadeIn duration={2000} className="space-y-12">
            <div className="text-center space-y-6">
              <h1 className="text-5xl md:text-7xl font-serif text-paper tracking-tighter">The Final Choice</h1>
              <p className="font-serif italic text-lg md:text-xl text-paper/70 leading-relaxed max-w-lg mx-auto">
                "To let this sanctuary and all its contents drift away forever, type <span className="text-paper font-bold tracking-widest uppercase">DELETE</span> in the box below. This will erase these digital pages, but the moments we shared will live on forever in our hearts."
              </p>
            </div>

            <div className="space-y-8">
              <div className="relative group">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Type DELETE to delete site"
                  className="w-full bg-white/5 backdrop-blur-md border border-white/20 rounded-full py-5 px-8 text-center text-paper font-serif text-2xl placeholder:text-paper/20 outline-none focus:border-white/50 transition-all tracking-widest uppercase shadow-2xl"
                />
              </div>
              
              <div className="flex flex-col gap-6">
                <button
                  onClick={handleDelete}
                  disabled={inputValue.trim().toUpperCase() !== 'DELETE'}
                  className="w-full py-5 bg-paper text-ink rounded-full text-xs uppercase tracking-[0.4em] font-bold hover:bg-white transition-all transform hover:scale-[1.02] shadow-2xl disabled:opacity-20 disabled:cursor-not-allowed disabled:scale-100"
                >
                  Confirm Deletion
                </button>
                
                <div className="flex items-center justify-center gap-4">
                  <div className="h-px bg-white/10 flex-1"></div>
                  <span className="text-[10px] uppercase tracking-[0.3em] text-paper/30 italic">Or if you changed your mind</span>
                  <div className="h-px bg-white/10 flex-1"></div>
                </div>

                <button
                  onClick={handleCancel}
                  className="w-full py-3 bg-white/5 border border-white/10 text-paper/60 rounded-full text-[10px] uppercase tracking-[0.3em] hover:bg-white/10 hover:text-paper transition-all flex items-center justify-center gap-2"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                  Exit back to home
                </button>
              </div>
            </div>
          </FadeIn>
        ) : (
          <FadeIn duration={3000} className="text-center space-y-12">
            <div className="space-y-8">
              <p className="font-serif text-2xl md:text-4xl text-paper leading-tight tracking-tight shadow-sm">
                "This website and all its contents will now be deleted forever."
              </p>
              <p className="font-serif italic text-xl md:text-2xl text-paper/90 leading-relaxed">
                Even though the moments it carried cannot be erased from our hearts, I wish you all the best and a beautiful, happy life. <br/><span className="mt-6 block text-paper font-normal not-italic tracking-wider uppercase text-sm opacity-80">Take care, Aliya.</span>
              </p>
            </div>

            <div className="pt-12 border-t border-white/20 space-y-8 bg-black/10 backdrop-blur-[2px] p-8 rounded-3xl">
              <p className="font-serif italic text-xl md:text-2xl text-paper/80 leading-loose text-left">
                Aliya, I am letting you go now, with a soft, warm kiss on the cheek and all the love I can give. But please know—I will always be right here whenever you need me. This isn't transactional; it's just who I am for you. I never expected this path, I never went looking for this in my life, but it happened—and I am so deeply glad it did. Through us, I learned so much about the person I am, and those truths will carry me a long, long way. 
              </p>
              
              <p className="font-serif text-paper/90 text-lg md:text-xl italic mt-6 text-center animate-pulse">
                Come back in a few hours and you will find this gone.
              </p>
              
              <div className="flex justify-center pt-8">
                <div className="px-6 py-2 border border-paper/10 rounded-full text-[9px] uppercase tracking-[0.8em] text-paper/30 animate-pulse bg-white/5">
                  Fading into memory
                </div>
              </div>
            </div>
          </FadeIn>
        )}
      </div>
    </div>
  );
};

export default FarewellFlow;