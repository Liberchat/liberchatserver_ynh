import React, { useState, useEffect } from 'react';
import { translationService } from '../services/translationService';
import { useI18nContext } from '../contexts/I18nContext';

interface AutoTranslationProps {
    text: string;
    targetLanguage: string;
    enabled: boolean;
}

export const AutoTranslation: React.FC<AutoTranslationProps> = ({
    text,
    targetLanguage,
    enabled
}) => {
    const { t } = useI18nContext();
    const [translatedText, setTranslatedText] = useState<string>('');
    const [isTranslating, setIsTranslating] = useState(false);
    const [error, setError] = useState<string>('');

    useEffect(() => {


        if (!enabled || !text?.trim() || text.length < 2) {
            setTranslatedText('');
            return;
        }

        const translateText = async () => {
            setIsTranslating(true);
            setError('');

            try {
                const result = await translationService.translateText(text, targetLanguage);

                if (result.translatedText && result.translatedText !== text) {
                    setTranslatedText(result.translatedText);
                } else {
                    setTranslatedText('');
                }
            } catch (error) {
                setError(t.translation.error);
                setTranslatedText('');
            } finally {
                setIsTranslating(false);
            }
        };

        // Délai pour éviter trop de requêtes
        const timer = setTimeout(translateText, 1000);
        return () => clearTimeout(timer);
    }, [text, targetLanguage, enabled]);

    if (!enabled || !text?.trim()) return null;

    return (
        <div className="mt-1 p-2 bg-black/40 border-l-2 border-red-700 rounded text-xs">
            {isTranslating ? (
                <div className="text-red-400 animate-pulse font-mono">⚑ {t.translation.translating}</div>
            ) : error ? (
                <div className="text-red-400 font-mono">⚑ {error}</div>
            ) : translatedText ? (
                <div className="text-red-300 font-mono">
                    <span className="text-red-400">⚑ </span>
                    <span className="text-white">{translatedText}</span>
                </div>
            ) : (
                <div className="text-gray-400 font-mono">⚑ {t.translation.noTranslation}</div>
            )}
        </div>
    );
};