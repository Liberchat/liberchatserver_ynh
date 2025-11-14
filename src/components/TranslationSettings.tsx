import React, { useState, useEffect } from 'react';
import { translationService, TranslationLanguage } from '../services/translationService';

interface TranslationSettingsProps {
  onSettingsChange: (enabled: boolean, targetLanguage: string) => void;
}

export const TranslationSettings: React.FC<TranslationSettingsProps> = ({ 
  onSettingsChange 
}) => {
  const [enabled, setEnabled] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState('fr');
  const [languages, setLanguages] = useState<TranslationLanguage[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [serviceStatus, setServiceStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionError, setConnectionError] = useState<string>('');

  useEffect(() => {
    setLanguages(translationService.getSupportedLanguages());
    
    // Charger les paramètres sauvegardés
    const savedEnabled = localStorage.getItem('autoTranslationEnabled') === 'true';
    const savedLanguage = localStorage.getItem('autoTranslationLanguage') || 'fr';
    
    setEnabled(savedEnabled);
    setTargetLanguage(savedLanguage);
    onSettingsChange(savedEnabled, savedLanguage);

    // Vérifier le statut du service
    const checkServiceStatus = async () => {
      setServiceStatus('checking');
      const isAvailable = await translationService.isServiceAvailable();
      setServiceStatus(isAvailable ? 'available' : 'unavailable');
    };
    
    checkServiceStatus();
  }, [onSettingsChange]);

  const handleEnabledChange = (newEnabled: boolean) => {
    setEnabled(newEnabled);
    localStorage.setItem('autoTranslationEnabled', newEnabled.toString());
    onSettingsChange(newEnabled, targetLanguage);
  };

  const handleLanguageChange = (newLanguage: string) => {
    setTargetLanguage(newLanguage);
    localStorage.setItem('autoTranslationLanguage', newLanguage);
    onSettingsChange(enabled, newLanguage);
  };

  const testConnection = async () => {
    setTestingConnection(true);
    setConnectionError('');
    
    try {
      const result = await translationService.testConnection();
      if (result.success) {
        setServiceStatus('available');
        setConnectionError('');
      } else {
        setServiceStatus('unavailable');
        setConnectionError(result.error || 'Erreur inconnue');
      }
    } catch (error) {
      setServiceStatus('unavailable');
      setConnectionError(error instanceof Error ? error.message : 'Erreur de test');
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowSettings(!showSettings)}
        className={`flex-shrink-0 w-10 h-10 p-0 rounded-lg border-2 border-white transition-colors flex items-center justify-center ${
          enabled 
            ? 'bg-red-700 text-white' 
            : 'bg-black text-red-400 hover:bg-red-700/20'
        }`}
        style={{ aspectRatio: '1 / 1', minWidth: 40, minHeight: 40 }}
        title="Paramètres de traduction automatique"
      >
        🌐
      </button>

      {showSettings && (
        <div className="absolute bottom-full right-0 mb-2 bg-black/95 border-2 border-red-700 rounded-lg shadow-2xl p-4 min-w-[250px] max-w-[90vw] z-50 
                        sm:right-0 
                        max-sm:right-0 max-sm:transform max-sm:-translate-x-1/2 max-sm:left-1/2">
          <h3 className="text-red-400 font-bold mb-3 font-mono tracking-wider">🌐 TRADUCTION LIBRE</h3>
          
          <div className="mb-3">
            <label className="flex items-center gap-2 text-white font-mono">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => handleEnabledChange(e.target.checked)}
                className="rounded border-red-700 bg-black text-red-700 focus:ring-red-700"
              />
              Activer la traduction automatique
            </label>
          </div>

          {enabled && (
            <div className="mb-3">
              <label className="block text-red-300 text-sm mb-1 font-mono">
                Traduire vers :
              </label>
              <select
                value={targetLanguage}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="w-full p-2 bg-black text-white rounded border-2 border-red-700 focus:ring-2 focus:ring-red-600 font-mono"
              >
                {languages.map((lang) => (
                  <option key={lang.code} value={lang.code} className="bg-black text-white">
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="text-xs text-red-300 font-mono space-y-1">
            <div>
              {enabled 
                ? `⚑ Messages traduits en ${languages.find(l => l.code === targetLanguage)?.name || targetLanguage}`
                : '⚑ Traduction désactivée'
              }
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${
                  serviceStatus === 'checking' ? 'bg-yellow-500 animate-pulse' :
                  serviceStatus === 'available' ? 'bg-green-500' : 'bg-red-500'
                }`}></span>
                <span className="text-xs">
                  {serviceStatus === 'checking' ? 'Vérification...' :
                   serviceStatus === 'available' ? 'Service disponible' : 'Service indisponible'}
                </span>
              </div>
              <button
                onClick={testConnection}
                disabled={testingConnection}
                className="text-xs px-2 py-1 bg-red-700 hover:bg-red-600 disabled:opacity-50 rounded border border-white"
              >
                {testingConnection ? '...' : 'Test'}
              </button>
            </div>
            {connectionError && (
              <div className="text-xs text-red-400 mt-1 p-1 bg-red-900/20 rounded border border-red-700">
                Erreur: {connectionError}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Overlay pour fermer */}
      {showSettings && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowSettings(false)}
        />
      )}
    </div>
  );
};