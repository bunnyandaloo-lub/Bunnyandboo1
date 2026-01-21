import React, { useState, useEffect, useRef } from 'react';
import { UserMode } from '../types';
import { FadeIn } from './ui/FadeIn';

interface TodaysPoemJournalFormProps {
  isDark: boolean;
  onClose: () => void;
  onSave: (poemText: string, spotifyUrl?: string) => Promise<void>;
  userMode: UserMode;
}

const INITIAL_POEM_TEXT = `It is quiet here.

You don’t need to say anything.

There’s nothing to explain.

I made this space so it could exist — open, unguarded, and easy to return to.

Even when time stretches, even when distance settles in, you’re still in my thoughts.

That hasn’t really changed.

Some things are better left untouched by words. Not because they’re fragile, but because they’re alive.

You do that to me sometimes. You bring a lightness, a small rush — the kind that feels a lot like butterflies.

So I leave those feelings here.

Not to be answered. Not to turn into anything.

If you ever come back, this place is ready.

If you don’t, it stays just the same.

Warm. Quiet. Yours.`;

export const TodaysPoemJournalForm: React.FC<TodaysPoemJournalFormProps> = ({ isDark, onClose, onSave, userMode }) => {
  const [poemText, setPoemText] = useState(INITIAL_POEM_TEXT);
  const [spotifyUrl, setSpotifyUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poemText.trim() || isSaving) return;

    setIsSaving(true);
    try {
      await onSave(poemText.trim(), spotifyUrl.trim() || undefined);
      onClose();
    } catch (error) {
      console.error("Failed to save daily poem journal:", error);
      alert("Failed to save journal. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSpotifyUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputUrl = e.target.value.trim();
    // Basic validation for Spotify track URL to ensure it's embeddable
    if (inputUrl.startsWith('https://open.spotify.com/track/')) {
      setSpotifyUrl(inputUrl);
    } else if (inputUrl === '') {
      setSpotifyUrl('');
    } else {
      // If it's not a valid track URL, clear it or provide feedback
      // For now, we'll allow other URLs but they might not embed correctly.
      // Better to strictly validate for 'track/'
      setSpotifyUrl(inputUrl);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <FadeIn delay={0} duration={300} className="w-full max-w-2xl">
        <div 
          ref={formRef}
          className={`
            rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden
            ${isDark ? 'bg-night border border-star/10 text-star' : 'bg-paper border border-ink/10 text-ink'}
          `}
          onClick={e => e.stopPropagation()}
        >
          <header className={`p-4 border-b text-center ${isDark ? 'border-star/10' : 'border-ink/10'}`}>
            <h3 className="text-lg font-bold font-serif">Today's Journal</h3>
          </header>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
            <div>
              <label htmlFor="poemText" className={`block text-xs uppercase tracking-widest mb-1 ${isDark ? 'text-mist' : 'text-ink/60'}`}>Poem/Thoughts</label>
              <textarea
                id="poemText"
                value={poemText}
                onChange={(e) => setPoemText(e.target.value)}
                rows={15}
                className={`w-full bg-transparent p-2 rounded-md border text-lg font-serif outline-none resize-y ${isDark ? 'border-star/20 focus:border-star/50' : 'border-ink/20 focus:border-ink/50'}`}
                autoFocus
                required
              />
            </div>

            <div>
              <label htmlFor="spotifyUrl" className={`block text-xs uppercase tracking-widest mb-1 ${isDark ? 'text-mist' : 'text-ink/60'}`}>Spotify Track URL (Optional)</label>
              <input
                id="spotifyUrl"
                type="url"
                value={spotifyUrl}
                onChange={handleSpotifyUrlChange}
                placeholder="e.g., https://open.spotify.com/track/..."
                className={`w-full bg-transparent p-2 rounded-md border text-lg font-serif outline-none ${isDark ? 'border-star/20 focus:border-star/50' : 'border-ink/20 focus:border-ink/50'}`}
              />
              <p className={`mt-1 text-xs ${isDark ? 'text-mist/70' : 'text-ink/50'}`}>Only full Spotify track URLs are supported for embedding (e.g., tracks, not playlists).</p>
            </div>
          </form>

          <footer className={`p-4 border-t flex justify-end gap-3 ${isDark ? 'border-star/10' : 'border-ink/10'}`}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className={`py-2 px-5 rounded-full text-sm uppercase tracking-widest transition-colors ${isDark ? 'text-mist hover:bg-star/10' : 'text-ink/70 hover:bg-ink/10'}`}
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={isSaving || !poemText.trim()}
              className={`py-2 px-5 rounded-full text-sm uppercase tracking-widest transition-colors
                ${isSaving || !poemText.trim()
                  ? 'opacity-50 cursor-not-allowed'
                  : (isDark ? 'bg-star/20 text-star hover:bg-star/30' : 'bg-ink text-paper hover:bg-ink/90 shadow-md')
                }
              `}
            >
              {isSaving ? 'Posting...' : 'Post Journal'}
            </button>
          </footer>
        </div>
      </FadeIn>
    </div>
  );
};