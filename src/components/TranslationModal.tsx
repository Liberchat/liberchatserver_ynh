import React, { useState, useEffect } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { useI18nContext } from '../contexts/I18nContext';

interface TranslationModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalText: string;
  translatedText: string;
  targetLanguage: string;
  sourceLanguage?: string;
}

export const TranslationModal: React.FC<TranslationModalProps> = ({
  isOpen,
  onClose,
  originalText,
  translatedText,
  targetLanguage,
  sourceLanguage
}) => {
  const { t } = useI18nContext();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(translatedText);
      setCopied(true);
    } catch (error) {
      console.error(t.messages.copyError, error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="bg-black border-2 border-red-700 rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-2 border-red-700">
          <h3 className="text-lg font-bold text-red-400 font-mono tracking-wider">
            🌐 TRADUCTION LIBRE
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-red-400 hover:text-white hover:bg-red-700 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto bg-black">
          {/* Original text */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-red-300 font-mono">
                ⚑ Texte original {sourceLanguage && `(${sourceLanguage})`}
              </label>
            </div>
            <div className="p-3 bg-gray-900 border border-red-700 rounded-lg">
              <p className="text-white whitespace-pre-wrap font-mono">
                {originalText}
              </p>
            </div>
          </div>

          {/* Translated text */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-red-300 font-mono">
                ⚑ Traduction ({targetLanguage})
              </label>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-red-700 text-white rounded hover:bg-red-600 transition-colors font-mono"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3" />
                    Copié
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Copier
                  </>
                )}
              </button>
            </div>
            <div className="p-3 bg-red-900/20 border border-red-700 rounded-lg">
              <p className="text-white whitespace-pre-wrap font-mono">
                {translatedText}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t-2 border-red-700 bg-black">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-red-700 text-white rounded hover:bg-red-600 transition-colors font-mono border-2 border-white"
            >
              {t.translation.close}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};