import React, { useState, useRef, useEffect } from 'react';

interface ImageViewerProps {
  src: string;
  onClose: () => void;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ src, onClose }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [src]);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.5, 4));
  const handleZoomOut = () => {
    setScale(prev => {
      const newScale = Math.max(prev - 0.5, 1);
      if (newScale === 1) setPosition({ x: 0, y: 0 });
      return newScale;
    });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    // Smooth wheel zoom
    if (e.deltaY < 0) {
      setScale(prev => Math.min(prev + 0.2, 4));
    } else {
      setScale(prev => {
        const newScale = Math.max(prev - 0.2, 1);
        if (newScale === 1) setPosition({ x: 0, y: 0 });
        return newScale;
      });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      e.preventDefault();
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div 
      className="fixed inset-0 z-[100] bg-night/95 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300"
      onWheel={handleWheel}
    >
      {/* Toolbar */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-[101]">
        <div className="text-star/50 text-xs tracking-widest uppercase ml-2 hidden md:block">Viewing Memory</div>
        <div className="flex items-center gap-4 bg-black/40 px-4 py-2 rounded-full backdrop-blur-sm border border-white/10 mx-auto md:mx-0">
          <button 
            onClick={handleZoomOut} 
            className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30" 
            disabled={scale <= 1}
            title="Zoom Out"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          <span className="text-white/80 font-mono text-xs w-10 text-center select-none">{Math.round(scale * 100)}%</span>
          <button 
            onClick={handleZoomIn} 
            className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30" 
            disabled={scale >= 4}
            title="Zoom In"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>
        <button 
            onClick={onClose}
            className="p-3 rounded-full bg-white/5 text-white/70 hover:bg-white/20 hover:text-white transition-all absolute right-6 top-6"
            title="Close"
        >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      {/* Image Area */}
      <div 
        ref={containerRef}
        className="relative w-full h-full flex items-center justify-center overflow-hidden"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={(e) => {
             // Close if clicking the empty space around the image
             if (e.target === containerRef.current && scale === 1) onClose();
        }}
      >
        <img 
          src={src} 
          alt="Full view" 
          className="max-w-[95%] max-h-[90vh] object-contain transition-transform duration-100 ease-out select-none shadow-2xl"
          style={{ 
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            cursor: isDragging ? 'grabbing' : (scale > 1 ? 'grab' : 'zoom-in')
          }}
          onClick={(e) => {
              e.stopPropagation();
              if (scale === 1) handleZoomIn();
          }}
          draggable={false}
        />
      </div>
      
      <div className="absolute bottom-8 text-white/20 text-[10px] tracking-[0.3em] uppercase pointer-events-none select-none">
        Scroll to Zoom • Drag to Pan
      </div>
    </div>
  );
};