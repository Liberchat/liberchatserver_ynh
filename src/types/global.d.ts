// Types globaux pour l'application

declare global {
  interface Window {
    crypto: Crypto;
  }
}

// Types pour les messages
export interface Message {
  id: number;
  type: 'text' | 'file' | 'system' | 'audio' | 'gif';
  username?: string;
  content?: string;
  fileData?: string;
  fileType?: string;
  fileName?: string;
  gifUrl?: string;
  timestamp: number;
  replyTo?: Message;
  edited?: boolean;
  reactions?: { [emoji: string]: string[] };
}

// Types pour les utilisateurs
export interface User {
  username: string;
  socketId: string;
  isInCall: boolean;
}

export {};