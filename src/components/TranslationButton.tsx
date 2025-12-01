import React, { useState } from 'react';
import { Languages, Loader2 } from 'lucide-react';
import { translationService, TranslationLanguage } from '../services/translationService';
import { useI18nContext } from '../contexts/I18nContext';

interface TranslationButtonProps {
  text: string;
  onTranslation: (translatedText: string, targetLanguage: string) => void;
  className?: string;
  variant?: 'button' | 'menu-item';
}

export const TranslationButton: React.FC<TranslationButtonProps> = ({
  text,
  onTranslation,
  className = '',
  variant = 'button'
}) => {
  const { t } = useI18nContext();
  const [isTranslating, setIsTranslating] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [supportedLanguages, setSupportedLanguages] = useState<TranslationLanguage[]>([]);

  React.useEffect(() => {
    setSupportedLanguages(translationService.getSupportedLanguages());
  }, []);

  const handleTranslate = async (targetLanguage: string) => {
    if (!text.trim()) return;

    setIsTranslating(true);
    setShowLanguageMenu(false);

    try {
      const result = await translationService.translateText(text, targetLanguage);
      onTranslation(result.translatedText, targetLanguage);
    } catch (error) {
      console.error('Erreur de traduction:', error);
      // Afficher le texte original avec une indication d'erreur
      onTranslation(`${text} [${t.messages.translationUnavailable}]`, targetLanguage);
    } finally {
      setIsTranslating(false);
    }
  };

  if (variant === 'menu-item') {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setShowLanguageMenu(!showLanguageMenu)}
          disabled={isTranslating || !text.trim()}
          className="block w-full text-left px-3 py-1.5 rounded-xl hover:bg-red-700/80 hover:text-white active:scale-95 transition-all duration-150 disabled:opacity-50"
        >
          {isTranslating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
              Traduction...
            </>
          ) : (
            <>
              🌐 Traduire
            </>
          )}
        </button>

        {showLanguageMenu && (
          <div className="absolute left-full top-0 ml-2 bg-black/95 border border-red-700 rounded-lg shadow-lg z-50 min-w-[150px] max-w-[90vw]
                          sm:left-full 
                          max-sm:left-1/2 max-sm:transform max-sm:-translate-x-1/2 max-sm:ml-0">
            <div className="p-2 border-b border-red-700">
              <span className="text-xs font-medium text-red-300">
                Traduire vers:
              </span>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {supportedLanguages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleTranslate(lang.code)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-red-700/80 hover:text-white transition-colors text-white"
                >
                  {lang.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Overlay pour fermer le menu */}
        {showLanguageMenu && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowLanguageMenu(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setShowLanguageMenu(!showLanguageMenu)}
        disabled={isTranslating || !text.trim()}
        className="p-1 text-gray-500 hover:text-blue-500 transition-colors disabled:opacity-50"
        title="Traduire ce message"
      >
        {isTranslating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Languages className="w-4 h-4" />
        )}
      </button>

      {showLanguageMenu && (
        <div className="absolute bottom-full right-0 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 min-w-[150px] max-w-[90vw]
                        sm:right-0 
                        max-sm:right-0 max-sm:transform max-sm:-translate-x-1/2 max-sm:left-1/2">
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Traduire vers:
            </span>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {supportedLanguages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleTranslate(lang.code)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {lang.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Overlay pour fermer le menu */}
      {showLanguageMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowLanguageMenu(false)}
        />
      )}
    </div>
  );
};