import React, { useState, useEffect, useRef } from 'react';

interface GifPickerProps {
  apiKey: string;
  onSelect: (url: string) => void;
  onClose: () => void;
  isDark: boolean;
}

interface GiphyImage {
  id: string;
  images: {
    fixed_height: {
      url: string;
    };
    downsized: {
      url: string;
    };
  };
  title: string;
}

export const GifPicker: React.FC<GifPickerProps> = ({ apiKey, onSelect, onClose, isDark }) => {
  const [gifs, setGifs] = useState<GiphyImage[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // FIX: Explicitly type ref as number | null for browser setTimeout compatibility.
  const debounceRef = useRef<number | null>(null);

  const fetchGifs = async (query: string) => {
    setIsLoading(true);
    try {
      const endpoint = query 
        ? `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(query)}&limit=20&rating=g`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=20&rating=g`;
      
      const res = await fetch(endpoint);
      const data = await res.json();
      setGifs(data.data || []);
    } catch (error) {
      console.error("Failed to fetch GIFs", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load (Trending)
  useEffect(() => {
    fetchGifs('');
  }, []);

  // Handle Search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    
    if (debounceRef.current) {
        clearTimeout(debounceRef.current);
    }
    
    // FIX: Use window.setTimeout to guarantee a number return type, avoiding Node.js type conflicts.
    debounceRef.current = window.setTimeout(() => {
      fetchGifs(val);
    }, 500);
  };

  return (
    <div className={`
      absolute bottom-full left-0 right-0 mb-4 mx-4 rounded-xl shadow-2xl overflow-hidden flex flex-col h-80 z-50 border
      animate-in fade-in slide-in-from-bottom-4 duration-300
      ${isDark ? 'bg-night border-star/10' : 'bg-paper border-ink/10'}
    `}>
      {/* Header / Search */}
      <div className={`p-3 border-b flex items-center gap-2 ${isDark ? 'border-star/10 bg-night' : 'border-ink/5 bg-paper'}`}>
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Search Giphy..."
            autoFocus
            className={`
              w-full pl-8 pr-4 py-1.5 rounded-full text-sm outline-none font-serif
              ${isDark 
                ? 'bg-star/10 text-star placeholder-star/30 focus:bg-star/20' 
                : 'bg-ink/5 text-ink placeholder-ink/30 focus:bg-ink/10'
              }
            `}
          />
          <svg 
            className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${isDark ? 'text-star/50' : 'text-ink/50'}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </div>
        <button 
          onClick={onClose}
          className={`p-1.5 rounded-full transition-colors ${isDark ? 'text-mist hover:text-star hover:bg-star/10' : 'text-mist hover:text-ink hover:bg-ink/5'}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      {/* Grid */}
      <div className={`
        flex-1 overflow-y-auto p-2
        ${isDark ? 'scrollbar-thin scrollbar-thumb-star/20' : 'scrollbar-thin scrollbar-thumb-ink/10'}
      `}>
        {isLoading && gifs.length === 0 ? (
          <div className="h-full flex items-center justify-center">
             <span className="text-mist text-xs animate-pulse tracking-widest">LOADING...</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {gifs.map((gif) => (
              <button
                key={gif.id}
                onClick={() => onSelect(gif.images.downsized.url)}
                className="relative aspect-video w-full overflow-hidden rounded-lg group"
              >
                <img 
                  src={gif.images.fixed_height.url} 
                  alt={gif.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              </button>
            ))}
          </div>
        )}
        {!isLoading && gifs.length === 0 && (
          <div className="h-full flex items-center justify-center text-mist text-xs italic">
            No GIFs found.
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className={`py-1 px-3 text-[9px] text-center tracking-widest uppercase opacity-40 ${isDark ? 'bg-star/5 text-star' : 'bg-ink/5 text-ink'}`}>
        Powered by Giphy
      </div>
    </div>
  );
};