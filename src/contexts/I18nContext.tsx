import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Translation, fr } from '../i18n/translations';
import { en } from '../i18n/en';
import { eo } from '../i18n/eo';
import { es } from '../i18n/es';

export type SupportedLanguage = 'fr' | 'en' | 'eo' | 'es';

const translations: Record<SupportedLanguage, Translation> = {
  fr,
  en,
  eo,
  es
};

interface I18nContextType {
  t: Translation;
  currentLanguage: SupportedLanguage;
  changeLanguage: (language: SupportedLanguage) => void;
  getSupportedLanguages: () => Array<{ code: SupportedLanguage; name: string }>;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

interface I18nProviderProps {
  children: ReactNode;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>('fr');
  const [t, setT] = useState<Translation>(fr);

  useEffect(() => {
    // Force un rechargement des traductions
    const forceReload = () => {
      // Charger la langue sauvegardée
      const savedLanguage = localStorage.getItem('liberchat-language') as SupportedLanguage;
      if (savedLanguage && translations[savedLanguage]) {
        setCurrentLanguage(savedLanguage);
        setT(translations[savedLanguage]);

      } else {
        // Détecter la langue du navigateur
        const browserLang = navigator.language.split('-')[0] as SupportedLanguage;
        if (translations[browserLang]) {
          setCurrentLanguage(browserLang);
          setT(translations[browserLang]);

        } else {
          // Fallback vers français
          setCurrentLanguage('fr');
          setT(translations.fr);

        }
      }
    };

    forceReload();
  }, []);

  const changeLanguage = (language: SupportedLanguage) => {
    if (translations[language]) {
      setCurrentLanguage(language);
      setT(translations[language]);
      localStorage.setItem('liberchat-language', language);

    }
  };

  const getSupportedLanguages = (): Array<{ code: SupportedLanguage; name: string }> => {
    return [
      { code: 'fr', name: 'Français' },
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Español' },
      { code: 'eo', name: 'Esperanto' }
    ];
  };

  const value: I18nContextType = {
    t,
    currentLanguage,
    changeLanguage,
    getSupportedLanguages
  };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18nContext = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (context === undefined) {
    // During development, provide a fallback to prevent crashes during hot reloads
    if (process.env.NODE_ENV === 'development') {
      console.warn('useI18nContext called outside of I18nProvider, using fallback');
      return {
        t: fr,
        currentLanguage: 'fr',
        changeLanguage: () => { },
        getSupportedLanguages: () => [
          { code: 'fr', name: 'Français' },
          { code: 'en', name: 'English' },
          { code: 'es', name: 'Español' },
          { code: 'eo', name: 'Esperanto' }
        ]
      };
    }
    throw new Error('useI18nContext must be used within an I18nProvider');
  }
  return context;
};