import React, { useState } from 'react';
import { useI18nContext, SupportedLanguage } from '../contexts/I18nContext';
import { Languages } from 'lucide-react';

interface LanguageSelectorProps {
  className?: string;
  theme?: 'light' | 'dark';
  accessibilitySettings?: { fontSize?: string };
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  className = '',
  theme = 'dark',
  accessibilitySettings
}) => {
  const { t, currentLanguage, changeLanguage, getSupportedLanguages } = useI18nContext();
  const [showLanguages, setShowLanguages] = useState(false);
  const supportedLanguages = getSupportedLanguages();

  const handleLanguageChange = (language: SupportedLanguage) => {
    changeLanguage(language);
    setShowLanguages(false);
  };

  const getCurrentLanguageName = () => {
    return supportedLanguages.find(lang => lang.code === currentLanguage)?.name || 'Français';
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setShowLanguages(!showLanguages)}
        className={`flex items-center gap-1 sm:gap-2 px-1 sm:px-3 py-1 rounded-full shadow border-2 border-red-700 font-bold font-mono transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-700 text-xs sm:text-base ${theme === 'dark' ? 'bg-black/80 text-white hover:bg-white hover:text-red-700' : 'bg-white/90 text-black hover:bg-red-700 hover:text-white'
          }`}
        title={`${t.header.language}: ${getCurrentLanguageName()}`}
        aria-label={t.header.languageSelector}
      >
        <span className="inline-flex items-center"><Languages size={14} /> <span className={`ml-1 ${accessibilitySettings?.fontSize === 'large' || accessibilitySettings?.fontSize === 'xlarge'
            ? 'hidden' : 'hidden sm:inline'
          }`}>{t.header.language}</span></span>
      </button>

      {showLanguages && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/95 border-2 border-red-700 rounded-lg shadow-2xl p-4 min-w-[200px] max-w-[90vw] z-50">
          <h3 className="text-red-400 font-bold mb-3 font-mono tracking-wider text-center">
            {t.header.languageTitle}
          </h3>

          <div className="space-y-1">
            {supportedLanguages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={`w-full text-left px-3 py-2 rounded font-mono text-sm transition-colors ${currentLanguage === lang.code
                    ? 'bg-red-700 text-white border border-white'
                    : 'text-red-300 hover:bg-red-700/40 hover:text-white'
                  }`}
              >
                <span className="font-bold">{lang.code.toUpperCase()}</span> - {lang.name}
              </button>
            ))}
          </div>

          <div className="text-xs text-red-300 font-mono mt-3 text-center border-t border-red-700 pt-2">
            {t.header.multilingualInterface}
          </div>
        </div>
      )}

      {/* Overlay pour fermer */}
      {showLanguages && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowLanguages(false)}
        />
      )}
    </div>
  );
};