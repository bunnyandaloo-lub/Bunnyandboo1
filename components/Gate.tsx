import React, { useState } from 'react';

interface GateProps {
  onUnlock: (password: string) => void;
}

export const Gate: React.FC<GateProps> = ({ onUnlock }) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUnlock(input);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-paper p-4">
      <div className="w-full max-w-md flex flex-col items-center space-y-8">
        <p className="text-ink text-lg tracking-wide opacity-80 italic">
          This is a private place. Who are you?
        </p>

        <form onSubmit={handleSubmit} className="w-full flex flex-col items-center">
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-48 bg-transparent border-b border-mist/30 text-center text-ink text-xl py-2 focus:outline-none focus:border-ink/50 transition-colors placeholder-transparent"
            autoFocus
            spellCheck={false}
          />
          <button 
            type="submit" 
            className="mt-8 text-xs uppercase tracking-[0.2em] text-mist hover:text-ink transition-colors duration-500"
          >
            Enter
          </button>
        </form>
      </div>
    </div>
  );
};