import React, { useState, useEffect } from 'react';
import { translationService } from '../services/translationService';

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
  const [translatedText, setTranslatedText] = useState<string>('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    console.log('🌐 AutoTranslation useEffect:', { enabled, text: text?.substring(0, 20), targetLanguage });
    
    if (!enabled || !text?.trim() || text.length < 2) {
      setTranslatedText('');
      return;
    }

    const translateText = async () => {
      setIsTranslating(true);
      setError('');
      
      try {
        console.log('🌐 Début traduction automatique...');
        const result = await translationService.translateText(text, targetLanguage);
        console.log('🌐 Résultat traduction:', result);
        
        if (result.translatedText && result.translatedText !== text) {
          setTranslatedText(result.translatedText);
        } else {
          setTranslatedText('');
        }
      } catch (error) {
        console.error('🌐 Erreur de traduction automatique:', error);
        setError('Erreur de traduction');
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
        <div className="text-red-400 animate-pulse font-mono">⚑ Traduction...</div>
      ) : error ? (
        <div className="text-red-400 font-mono">⚑ {error}</div>
      ) : translatedText ? (
        <div className="text-red-300 font-mono">
          <span className="text-red-400">⚑ </span>
          <span className="text-white">{translatedText}</span>
        </div>
      ) : (
        <div className="text-gray-400 font-mono">⚑ Pas de traduction</div>
      )}
    </div>
  );
};