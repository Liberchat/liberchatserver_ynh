import { useState, useEffect } from 'react';
import { AccessibilitySettings } from '../components/AccessibilitySettings';

const DEFAULT_SETTINGS: AccessibilitySettings = {
  highContrast: false,
  fontSize: 'normal',
  dyslexiaFont: false,
  reduceMotion: false,
  screenReader: false,
  keyboardNavigation: false,
};

export const useAccessibility = () => {
  const [settings, setSettings] = useState<AccessibilitySettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const saved = localStorage.getItem('liberchat-accessibility');
    if (saved) {
      try {
        const parsedSettings = JSON.parse(saved);
        setSettings({ ...DEFAULT_SETTINGS, ...parsedSettings });
      } catch (error) {
      }
    }
  }, []);

  const updateSettings = (newSettings: AccessibilitySettings) => {
    setSettings(newSettings);
    localStorage.setItem('liberchat-accessibility', JSON.stringify(newSettings));
  };

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    // Contraste élevé
    if (settings.highContrast) {
      root.classList.add('high-contrast');
      body.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
      body.classList.remove('high-contrast');
    }

    // FORCER LA TAILLE DIRECTEMENT SUR TOUS LES ÉLÉMENTS
    const fontSizes = {
      small: '14px',
      normal: '16px'
    };

    const lineHeights = {
      small: '1.4',
      normal: '1.5'
    };

    // MÉTHODE INTELLIGENTE : APPLIQUER SEULEMENT SUR LES ÉLÉMENTS TEXTUELS
    const textElements = document.querySelectorAll('p, div, span, h1, h2, h3, h4, h5, h6, label, li, td, th, a');
    textElements.forEach(element => {
      if (element instanceof HTMLElement) {
        // Ne pas toucher aux éléments du menu d'accessibilité
        if (!element.closest('.adaptive-modal') && !element.closest('header') && !element.closest('nav')) {
          element.style.fontSize = fontSizes[settings.fontSize];
          element.style.lineHeight = lineHeights[settings.fontSize];
        }
      }
    });

    // Appliquer aussi sur les boutons SAUF ceux du menu d'accessibilité
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
      if (button instanceof HTMLElement) {
        // Ne pas toucher aux boutons du menu d'accessibilité et du header
        if (!button.closest('.adaptive-modal') && !button.closest('header') && !button.closest('nav')) {
          button.style.fontSize = fontSizes[settings.fontSize];
        }
      }
    });

    // FORCER UNE TAILLE FIXE SUR LES BOUTONS DU MENU D'ACCESSIBILITÉ
    const modalButtons = document.querySelectorAll('.adaptive-modal button, header button, nav button');
    modalButtons.forEach(button => {
      if (button instanceof HTMLElement) {
        button.style.fontSize = '14px'; // Taille fixe pour rester visible
        button.style.lineHeight = '1.4';
        button.style.minHeight = '32px';
        button.style.padding = '6px 12px';
      }
    });

    // AUSSI CHANGER LA CLASSE
    document.body.classList.remove('font-small', 'font-normal');
    document.body.classList.add(`font-${settings.fontSize}`);

    console.log(`HOOK: Taille appliquée: ${settings.fontSize} (${fontSizes[settings.fontSize]})`);

    // Police dyslexie
    if (settings.dyslexiaFont) {
      root.classList.add('dyslexia-font');
      body.classList.add('dyslexia-font');
    } else {
      root.classList.remove('dyslexia-font');
      body.classList.remove('dyslexia-font');
    }

    // Réduction des animations
    if (settings.reduceMotion) {
      root.classList.add('reduce-motion');
      body.classList.add('reduce-motion');
      root.style.setProperty('--animation-duration', '0s');
      root.style.setProperty('--transition-duration', '0s');
    } else {
      root.classList.remove('reduce-motion');
      body.classList.remove('reduce-motion');
      root.style.removeProperty('--animation-duration');
      root.style.removeProperty('--transition-duration');
    }

    // Mode lecteur d'écran
    if (settings.screenReader) {
      root.classList.add('screen-reader-mode');
      body.classList.add('screen-reader-mode');
    } else {
      root.classList.remove('screen-reader-mode');
      body.classList.remove('screen-reader-mode');
    }

    // Navigation clavier
    if (settings.keyboardNavigation) {
      root.classList.add('keyboard-navigation');
      body.classList.add('keyboard-navigation');
    } else {
      root.classList.remove('keyboard-navigation');
      body.classList.remove('keyboard-navigation');
    }

    // C'EST TOUT - PAS BESOIN DE PLUS

  }, [settings]);

  const announceToScreenReader = (message: string) => {
    // Créer l'annonce ARIA pour les vrais lecteurs d'écran
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'assertive');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.setAttribute('role', 'status');
    announcement.className = 'sr-only';
    announcement.textContent = message;

    const announcementId = `announcement-${Date.now()}`;
    announcement.id = announcementId;
    document.body.appendChild(announcement);

    // Si le mode lecteur d'écran est activé, ajouter aussi la synthèse vocale du navigateur
    if (settings.screenReader) {
      // Synthèse vocale native du navigateur pour les tests
      if ('speechSynthesis' in window) {
        // Arrêter toute synthèse en cours
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(message);
        utterance.lang = 'fr-FR';
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 0.8;

        // Essayer de trouver une voix française
        const voices = window.speechSynthesis.getVoices();
        const frenchVoice = voices.find(voice =>
          voice.lang.startsWith('fr') ||
          voice.name.toLowerCase().includes('french') ||
          voice.name.toLowerCase().includes('français')
        );

        if (frenchVoice) {
          utterance.voice = frenchVoice;
        }

        window.speechSynthesis.speak(utterance);
      }

      // Notification visuelle pour confirmer
      const visualAnnouncement = document.createElement('div');
      visualAnnouncement.textContent = `🔊 ${message}`;
      visualAnnouncement.style.cssText = `
        position: fixed;
        top: 1rem;
        right: 1rem;
        background: #22c55e;
        color: white;
        padding: 1rem;
        border-radius: 0.5rem;
        border: 2px solid #16a34a;
        z-index: 9999;
        max-width: 300px;
        font-size: 1rem;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        animation: slideIn 0.3s ease-out;
      `;
      document.body.appendChild(visualAnnouncement);

      setTimeout(() => {
        if (document.body.contains(visualAnnouncement)) {
          document.body.removeChild(visualAnnouncement);
        }
      }, 3000);
    }

    setTimeout(() => {
      if (document.body.contains(announcement)) {
        document.body.removeChild(announcement);
      }
    }, 2000);
  };

  const applyFontSizeImmediately = () => {
    // FORCER LA TAILLE DIRECTEMENT SUR LES ÉLÉMENTS TEXTUELS
    const fontSizes = {
      small: '14px',
      normal: '16px'
    };

    const lineHeights = {
      small: '1.4',
      normal: '1.5'
    };

    // MÉTHODE INTELLIGENTE : APPLIQUER SEULEMENT SUR LES ÉLÉMENTS TEXTUELS
    const textElements = document.querySelectorAll('p, div, span, h1, h2, h3, h4, h5, h6, label, li, td, th, a');
    textElements.forEach(element => {
      if (element instanceof HTMLElement) {
        // Ne pas toucher aux éléments du menu d'accessibilité
        if (!element.closest('.adaptive-modal') && !element.closest('header') && !element.closest('nav')) {
          element.style.fontSize = fontSizes[settings.fontSize];
          element.style.lineHeight = lineHeights[settings.fontSize];
        }
      }
    });

    // Appliquer aussi sur les boutons SAUF ceux du menu d'accessibilité
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
      if (button instanceof HTMLElement) {
        // Ne pas toucher aux boutons du menu d'accessibilité et du header
        if (!button.closest('.adaptive-modal') && !button.closest('header') && !button.closest('nav')) {
          button.style.fontSize = fontSizes[settings.fontSize];
        }
      }
    });

    // FORCER UNE TAILLE FIXE SUR LES BOUTONS DU MENU D'ACCESSIBILITÉ
    const modalButtons = document.querySelectorAll('.adaptive-modal button, header button, nav button');
    modalButtons.forEach(button => {
      if (button instanceof HTMLElement) {
        button.style.fontSize = '14px'; // Taille fixe pour rester visible
        button.style.lineHeight = '1.4';
        button.style.minHeight = '32px';
        button.style.padding = '6px 12px';
      }
    });

    console.log(`APPLY IMMEDIATELY: ${settings.fontSize} (${fontSizes[settings.fontSize]})`);
  };

  return {
    settings,
    updateSettings,
    announceToScreenReader,
    applyFontSizeImmediately,
  };
};