import React, { useState } from 'react';

interface MenuProps {
  isDark: boolean;
}

const menuItems = [
  { href: '#thoughts', label: 'Thoughts' },
  { href: '#memories', label: 'Memories' },
  { href: '#music', label: 'Music' },
];

export const Menu: React.FC<MenuProps> = ({ isDark }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);

  return (
    <>
      <button
        onClick={toggleMenu}
        className={`
          fixed top-6 right-6 z-40 w-8 h-8 rounded-full flex items-center justify-center
          transition-all duration-300 ease-in-out
          ${isOpen ? (isDark ? 'bg-star/20' : 'bg-ink/20') : ''}
          ${isDark ? 'hover:bg-star/10' : 'hover:bg-ink/10'}
        `}
        aria-label="Toggle navigation menu"
        aria-expanded={isOpen}
      >
        <div className="space-y-1.5">
          {[...Array(3)].map((_, i) => (
            <span
              key={i}
              className={`
                block w-5 h-px transition-transform duration-300 ease-in-out
                ${isDark ? 'bg-star' : 'bg-ink'}
              `}
              style={{
                transform: isOpen
                  ? i === 0
                    ? 'translateY(6px) rotate(45deg)'
                    : i === 2
                    ? 'translateY(-6px) rotate(-45deg)'
                    : 'opacity(0)'
                  : '',
              }}
            ></span>
          ))}
        </div>
      </button>

      <nav
        className={`
          fixed top-0 right-0 h-full w-64 pt-24 px-8 z-30
          transition-transform duration-500 ease-in-out
          ${isDark ? 'bg-night/90 backdrop-blur-md' : 'bg-paper/90 backdrop-blur-md'}
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        <ul className="space-y-6 text-right">
          {menuItems.map((item, index) => (
            <li
              key={item.href}
              className="transition-all duration-500 ease-in-out"
              style={{
                transform: isOpen ? 'translateX(0)' : 'translateX(20px)',
                opacity: isOpen ? 1 : 0,
                transitionDelay: `${isOpen ? 150 + index * 50 : 0}ms`,
              }}
            >
              <a
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`
                  text-lg font-serif tracking-wider transition-colors duration-300
                  ${isDark ? 'text-mist hover:text-star' : 'text-mist hover:text-ink'}
                `}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
};