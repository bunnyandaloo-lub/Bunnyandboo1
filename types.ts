import React from 'react';

export type UserMode = 'Aliya' | 'Admin';

export interface FadeInProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}

export interface ImageProps {
  src: string;
  alt: string;
}

export interface JournalProps {
    isDark: boolean;
    onReflect: () => void;
    userMode: UserMode;
}

export interface ChatProps {
    isDark: boolean;
    onClose: () => void;
}

export interface EchoProps {
    isDark: boolean;
    onClose: () => void;
}

export interface SanctuaryProps {
    userMode: UserMode;
    onStartFarewell?: () => void;
}

export interface JournalHistoryViewerProps {
  isDark: boolean;
  onClose: () => void;
  userMode: UserMode;
}