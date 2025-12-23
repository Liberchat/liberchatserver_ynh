import React, { useState, useEffect } from 'react';
import { useI18nContext } from '../contexts/I18nContext';
import {
  X, Sun, Type, BookOpen, Activity, Volume2, Keyboard, Lightbulb,
  Accessibility, CheckCircle2, Circle
} from 'lucide-react';

export interface AccessibilitySettings {
  highContrast: boolean;
  fontSize: 'small' | 'normal' | 'large' | 'xlarge';
  dyslexiaFont: boolean;
  reduceMotion: boolean;
  screenReader: boolean;
  keyboardNavigation: boolean;
}

interface AccessibilitySettingsProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AccessibilitySettings;
  onSettingsChange: (settings: AccessibilitySettings) => void;
}

const AccessibilitySettingsModal: React.FC<AccessibilitySettingsProps> = ({
  isOpen,
  onClose,
  settings,
  onSettingsChange
}) => {
  const { t } = useI18nContext();
  const [localSettings, setLocalSettings] = useState<AccessibilitySettings>(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSettingChange = (key: keyof AccessibilitySettings, value: any) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  const isCompactMode = localSettings.fontSize === 'large' || localSettings.fontSize === 'xlarge';

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
      role="dialog"
      aria-labelledby="accessibility-title"
      aria-modal="true"
    >
      <div
        className={`bg-black border-4 border-red-700 rounded-xl w-full max-h-[90vh] overflow-y-auto ${isCompactMode ? 'p-3 max-w-xs' : 'p-6 max-w-md'
          } ${localSettings.highContrast ? 'bg-black text-white border-yellow-400' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex justify-between items-center border-b border-red-700/50 ${isCompactMode ? 'mb-3 pb-2' : 'mb-6 pb-2'}`}>
          <div className="flex items-center gap-2">
            <Accessibility size={isCompactMode ? 18 : 24} className={localSettings.highContrast ? 'text-yellow-400' : 'text-red-500'} />
            <h2
              id="accessibility-title"
              className={`font-bold uppercase tracking-widest ${isCompactMode ? 'text-sm' : 'text-xl'} ${localSettings.highContrast ? 'text-yellow-400' : 'text-red-400'}`}
            >
              {t.accessibility.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className={`hover:bg-red-700/20 rounded-full p-1 transition-all
              ${localSettings.highContrast ? 'text-yellow-400 hover:bg-yellow-600/20' : 'text-gray-400 hover:text-white'}`}
            aria-label={t.translation.close}
          >
            <X size={24} />
          </button>
        </div>

        <div className={isCompactMode ? 'space-y-4' : 'space-y-6'}>
          {/* Contraste élevé */}
          <div className="flex items-center justify-between gap-4">
            <label
              htmlFor="high-contrast"
              className={`font-semibold flex items-center gap-3 ${localSettings.highContrast ? 'text-yellow-400' : 'text-white'}`}
            >
              <Sun size={18} className={localSettings.highContrast ? 'text-yellow-400' : 'text-orange-400'} />
              {t.accessibility.highContrast}
            </label>
            <button
              id="high-contrast"
              onClick={() => handleSettingChange('highContrast', !localSettings.highContrast)}
              className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0
                ${localSettings.highContrast ? 'bg-yellow-400' : 'bg-gray-600'}`}
              aria-pressed={localSettings.highContrast}
              role="switch"
            >
              <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform
                ${localSettings.highContrast ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Taille de police */}
          <div className="space-y-3">
            <label
              className={`block font-semibold flex items-center gap-3 ${localSettings.highContrast ? 'text-yellow-400' : 'text-white'}`}
            >
              <Type size={18} className={localSettings.highContrast ? 'text-yellow-400' : 'text-blue-400'} />
              {t.accessibility.fontSize}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['small', 'normal', 'large', 'xlarge'] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => handleSettingChange('fontSize', size)}
                  className={`p-2 rounded-lg border-2 transition-all flex items-center justify-center gap-2 font-bold
                    ${localSettings.fontSize === size
                      ? (localSettings.highContrast ? 'bg-yellow-400 text-black border-yellow-400' : 'bg-red-700 text-white border-white shadow-lg shadow-red-900/40 translate-y-[-2px]')
                      : (localSettings.highContrast ? 'border-yellow-400/30 text-yellow-400/70 hover:border-yellow-400 hover:text-yellow-400' : 'border-red-700/30 bg-gray-900/50 text-gray-400 hover:border-red-700 hover:text-white')
                    }`}
                  aria-pressed={localSettings.fontSize === size}
                >
                  {localSettings.fontSize === size ? <CheckCircle2 size={12} /> : <Circle size={12} />}
                  <span className="text-xs uppercase tracking-tighter">
                    {size === 'small' && t.accessibility.fontSizes.small}
                    {size === 'normal' && t.accessibility.fontSizes.medium}
                    {size === 'large' && t.accessibility.fontSizes.large}
                    {size === 'xlarge' && t.accessibility.fontSizes.extraLarge}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Police dyslexie */}
          <div className="flex items-center justify-between gap-4">
            <label
              htmlFor="dyslexia-font"
              className={`font-semibold flex items-center gap-3 ${localSettings.highContrast ? 'text-yellow-400' : 'text-white'}`}
            >
              <BookOpen size={18} className={localSettings.highContrast ? 'text-yellow-400' : 'text-green-400'} />
              {t.accessibility.dyslexiaFont}
            </label>
            <button
              id="dyslexia-font"
              onClick={() => handleSettingChange('dyslexiaFont', !localSettings.dyslexiaFont)}
              className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0
                ${localSettings.dyslexiaFont ? (localSettings.highContrast ? 'bg-yellow-400' : 'bg-red-700') : 'bg-gray-600'}`}
              aria-pressed={localSettings.dyslexiaFont}
              role="switch"
            >
              <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform
                ${localSettings.dyslexiaFont ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Réduction des animations */}
          <div className="flex items-center justify-between gap-4">
            <label
              htmlFor="reduce-motion"
              className={`font-semibold flex items-center gap-3 ${localSettings.highContrast ? 'text-yellow-400' : 'text-white'}`}
            >
              <Activity size={18} className={localSettings.highContrast ? 'text-yellow-400' : 'text-purple-400'} />
              {t.accessibility.reduceAnimations}
            </label>
            <button
              id="reduce-motion"
              onClick={() => handleSettingChange('reduceMotion', !localSettings.reduceMotion)}
              className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0
                ${localSettings.reduceMotion ? (localSettings.highContrast ? 'bg-yellow-400' : 'bg-red-700') : 'bg-gray-600'}`}
              aria-pressed={localSettings.reduceMotion}
              role="switch"
            >
              <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform
                ${localSettings.reduceMotion ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Support lecteur d'écran */}
          <div className="flex items-center justify-between gap-4">
            <label
              htmlFor="screen-reader"
              className={`font-semibold flex items-center gap-3 ${localSettings.highContrast ? 'text-yellow-400' : 'text-white'}`}
            >
              <Volume2 size={18} className={localSettings.highContrast ? 'text-yellow-400' : 'text-cyan-400'} />
              {t.accessibility.screenReader}
            </label>
            <button
              id="screen-reader"
              onClick={() => handleSettingChange('screenReader', !localSettings.screenReader)}
              className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0
                ${localSettings.screenReader ? (localSettings.highContrast ? 'bg-yellow-400' : 'bg-red-700') : 'bg-gray-600'}`}
              aria-pressed={localSettings.screenReader}
              role="switch"
            >
              <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform
                ${localSettings.screenReader ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Navigation clavier */}
          <div className="flex items-center justify-between gap-4">
            <label
              htmlFor="keyboard-nav"
              className={`font-semibold flex items-center gap-3 ${localSettings.highContrast ? 'text-yellow-400' : 'text-white'}`}
            >
              <Keyboard size={18} className={localSettings.highContrast ? 'text-yellow-400' : 'text-gray-400'} />
              {t.accessibility.keyboardNavigation}
            </label>
            <button
              id="keyboard-nav"
              onClick={() => handleSettingChange('keyboardNavigation', !localSettings.keyboardNavigation)}
              className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0
                ${localSettings.keyboardNavigation ? (localSettings.highContrast ? 'bg-yellow-400' : 'bg-red-700') : 'bg-gray-600'}`}
              aria-pressed={localSettings.keyboardNavigation}
              role="switch"
            >
              <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform
                ${localSettings.keyboardNavigation ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        <div className={`mt-6 p-4 rounded-lg border-2 flex items-start gap-3 ${localSettings.highContrast ? 'border-yellow-400 bg-yellow-900/20' : 'border-red-700/50 bg-red-950/20 shadow-inner shadow-black/40'}`}>
          <Lightbulb size={24} className={localSettings.highContrast ? 'text-yellow-400' : 'text-yellow-500 fill-yellow-500/20'} />
          <p className={`text-xs leading-relaxed ${localSettings.highContrast ? 'text-yellow-200' : 'text-gray-300'}`}>
            <strong>{t.accessibility.tip}</strong> {t.accessibility.settingsSavedLocally}
          </p>
        </div>

        <button
          onClick={onClose}
          className={`w-full mt-6 py-3 px-6 rounded-lg font-bold uppercase tracking-widest transition-all border-2 border-transparent hover:border-white shadow-lg
            ${localSettings.highContrast
              ? 'bg-yellow-400 text-black hover:bg-yellow-500'
              : 'bg-red-700 text-white hover:bg-black hover:bg-red-800 shadow-red-900/20'}`}
        >
          {t.translation.close}
        </button>
      </div >
    </div >
  );
};

export default AccessibilitySettingsModal;