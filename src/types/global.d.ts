/**
 * Déclarations TypeScript globales pour LibreChat
 */

// Déclarations pour import.meta.env (Vite)
interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
  readonly BASE_URL: string;
  readonly VITE_APP_TITLE?: string;
  // Ajoutez d'autres variables d'environnement Vite si nécessaire
  [key: string]: any;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Déclaration globale pour s'assurer que TypeScript reconnaît import.meta
declare const importMeta: ImportMeta;

// Déclarations pour les APIs spécifiques aux WebViews et navigateurs
declare global {
  interface Window {
    // Chrome API (peut ne pas exister dans tous les environnements)
    chrome?: {
      [key: string]: any;
    };
    
    // Capacitor (applications hybrides)
    Capacitor?: {
      Plugins?: {
        Browser?: {
          open: (options: { url: string }) => void;
        };
        [key: string]: any;
      };
      [key: string]: any;
    };
    
    // Cordova (applications hybrides)
    cordova?: {
      [key: string]: any;
    };
    
    // Electron
    electronAPI?: {
      [key: string]: any;
    };
    
    // WebKit (iOS)
    webkit?: {
      messageHandlers?: {
        [key: string]: any;
      };
      [key: string]: any;
    };
  }
  
  interface Navigator {
    // iOS standalone mode (PWA)
    standalone?: boolean;
  }
}

export {};