import React, { useState, useEffect } from 'react';

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
  onApplyFontSizeImmediately?: () => void;
}

const AccessibilitySettingsModal: React.FC<AccessibilitySettingsProps> = ({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
  onApplyFontSizeImmediately
}) => {
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

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-start sm:items-center justify-center z-50 p-2"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
      role="dialog"
      aria-labelledby="accessibility-title"
      aria-modal="true"
    >
      <div
        className={`adaptive-modal bg-black border-2 border-red-700 rounded-lg w-full overflow-y-auto
          ${localSettings.highContrast ? 'bg-black text-white border-yellow-400' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h2
              id="accessibility-title"
              className={`adaptive-text-lg font-bold ${localSettings.highContrast ? 'text-yellow-400' : 'text-red-400'}`}
            >
              ♿ Accessibilité
            </h2>
            {localSettings.screenReader && (
              <span
                className="bg-green-500 text-white px-2 py-1 rounded adaptive-text-sm font-bold"
                title="Lecteur d'écran actif"
                aria-label="Lecteur d'écran actif"
              >
                🔊 ACTIF
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className={`adaptive-button hover:bg-red-700 rounded transition-colors
              ${localSettings.highContrast ? 'text-yellow-400 hover:bg-yellow-600' : 'text-white hover:bg-red-700'}`}
            aria-label="Fermer les paramètres d'accessibilité"
          >
            ✕
          </button>
        </div>

        <div className="modal-content space-y-4">
          {/* Contraste élevé */}
          <div className="modal-section flex items-center justify-between">
            <label
              htmlFor="high-contrast"
              className={`adaptive-text font-semibold ${localSettings.highContrast ? 'text-yellow-400' : 'text-white'}`}
            >
              🔆 Contraste élevé
            </label>
            <button
              id="high-contrast"
              onClick={() => {
                const newValue = !localSettings.highContrast;
                handleSettingChange('highContrast', newValue);

                // Annonce immédiate
                setTimeout(() => {
                  const announcement = document.createElement('div');
                  announcement.setAttribute('aria-live', 'assertive');
                  announcement.setAttribute('aria-atomic', 'true');
                  announcement.setAttribute('role', 'status');
                  announcement.className = 'sr-only';
                  announcement.textContent = `Contraste élevé ${newValue ? 'activé' : 'désactivé'}`;
                  document.body.appendChild(announcement);
                  setTimeout(() => {
                    if (document.body.contains(announcement)) {
                      document.body.removeChild(announcement);
                    }
                  }, 2000);
                }, 50);
              }}
              className={`adaptive-switch rounded-full transition-colors relative
                ${localSettings.highContrast ? 'bg-yellow-400' : 'bg-gray-600'}`}
              aria-pressed={localSettings.highContrast}
              aria-label={`Contraste élevé ${localSettings.highContrast ? 'activé' : 'désactivé'}`}
              role="switch"
            >
              <div className={`adaptive-switch-thumb bg-white rounded-full absolute transition-transform
                ${localSettings.highContrast ? 'adaptive-switch-thumb active' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Taille de police */}
          <div className="modal-section">
            <label
              className={`block adaptive-text font-semibold mb-2 ${localSettings.highContrast ? 'text-yellow-400' : 'text-white'}`}
            >
              📏 Taille de police
            </label>

            {/* Aperçu de la taille actuelle */}
            <div className={`mb-3 modal-input rounded border ${localSettings.highContrast ? 'border-yellow-400 bg-yellow-900/20' : 'border-red-700 bg-red-900/20'}`}>
              <p
                className={`adaptive-text ${localSettings.highContrast ? 'text-yellow-200' : 'text-gray-300'}`}
                style={{
                  fontSize: localSettings.fontSize === 'small' ? '0.875rem' :
                    localSettings.fontSize === 'normal' ? '1rem' :
                      localSettings.fontSize === 'large' ? '1.25rem' : '1.5rem'
                }}
              >
                Aperçu du texte avec la taille {
                  localSettings.fontSize === 'small' ? 'petite' :
                    localSettings.fontSize === 'normal' ? 'moyenne' :
                      localSettings.fontSize === 'large' ? 'grande' : 'très grande'
                }
              </p>
            </div>

            <div className="adaptive-grid adaptive-grid-2">
              {(['small', 'normal', 'large', 'xlarge'] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => {
                    handleSettingChange('fontSize', size);

                    // Force l'application immédiate des styles
                    setTimeout(() => {
                      onApplyFontSizeImmediately?.();
                    }, 50);

                    // Annonce vocale du changement
                    const sizeNames = {
                      small: 'petite',
                      normal: 'moyenne',
                      large: 'grande',
                      xlarge: 'très grande'
                    };
                    setTimeout(() => {
                      const announcement = document.createElement('div');
                      announcement.setAttribute('aria-live', 'polite');
                      announcement.setAttribute('aria-atomic', 'true');
                      announcement.className = 'sr-only';
                      announcement.textContent = `Taille de police changée vers ${sizeNames[size]}`;
                      document.body.appendChild(announcement);
                      setTimeout(() => {
                        document.body.removeChild(announcement);
                      }, 1000);
                    }, 100);
                  }}
                  className={`adaptive-button rounded border-2 transition-colors relative
                    ${localSettings.fontSize === size
                      ? (localSettings.highContrast ? 'bg-yellow-400 text-black border-yellow-400' : 'bg-red-700 text-white border-red-700')
                      : (localSettings.highContrast ? 'border-yellow-400 text-yellow-400 hover:bg-yellow-400/20' : 'border-red-700 text-white hover:bg-red-700/20')
                    }`}
                  aria-pressed={localSettings.fontSize === size}
                  aria-label={`Définir la taille de police à ${size === 'small' ? 'petite' :
                    size === 'normal' ? 'moyenne' :
                      size === 'large' ? 'grande' : 'très grande'
                    }`}
                  style={{
                    fontSize: size === 'small' ? '0.75rem' :
                      size === 'normal' ? '0.875rem' :
                        size === 'large' ? '1rem' : '1.125rem'
                  }}
                >
                  {size === 'small' && 'Petit'}
                  {size === 'normal' && 'Moyen'}
                  {size === 'large' && 'Grand'}
                  {size === 'xlarge' && 'XL'}
                  {localSettings.fontSize === size && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" aria-hidden="true" />
                  )}
                </button>
              ))}
            </div>

            {/* Indicateur de taille actuelle */}
            <div className={`mt-2 adaptive-text-sm ${localSettings.highContrast ? 'text-yellow-300' : 'text-gray-400'}`}>
              Taille actuelle : {
                localSettings.fontSize === 'small' ? 'Petite (0.875rem)' :
                  localSettings.fontSize === 'normal' ? 'Moyenne (1rem)' :
                    localSettings.fontSize === 'large' ? 'Grande (1.25rem)' : 'Très grande (1.5rem)'
              }
            </div>
          </div>

          {/* Police dyslexie */}
          <div className="modal-section flex items-center justify-between">
            <label
              htmlFor="dyslexia-font"
              className={`adaptive-text font-semibold ${localSettings.highContrast ? 'text-yellow-400' : 'text-white'}`}
            >
              📖 Police dyslexie
            </label>
            <button
              id="dyslexia-font"
              onClick={() => {
                const newValue = !localSettings.dyslexiaFont;
                handleSettingChange('dyslexiaFont', newValue);

                // Annonce immédiate
                setTimeout(() => {
                  const announcement = document.createElement('div');
                  announcement.setAttribute('aria-live', 'assertive');
                  announcement.setAttribute('aria-atomic', 'true');
                  announcement.setAttribute('role', 'status');
                  announcement.className = 'sr-only';
                  announcement.textContent = `Police dyslexie ${newValue ? 'activée' : 'désactivée'}`;
                  document.body.appendChild(announcement);
                  setTimeout(() => {
                    if (document.body.contains(announcement)) {
                      document.body.removeChild(announcement);
                    }
                  }, 2000);
                }, 50);
              }}
              className={`adaptive-switch rounded-full transition-colors relative
                ${localSettings.dyslexiaFont ? (localSettings.highContrast ? 'bg-yellow-400' : 'bg-red-700') : 'bg-gray-600'}`}
              aria-pressed={localSettings.dyslexiaFont}
              aria-label={`Police dyslexie ${localSettings.dyslexiaFont ? 'activée' : 'désactivée'}`}
              role="switch"
            >
              <div className={`adaptive-switch-thumb bg-white rounded-full absolute transition-transform
                ${localSettings.dyslexiaFont ? 'adaptive-switch-thumb active' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Réduction des animations */}
          <div className="modal-section flex items-center justify-between">
            <label
              htmlFor="reduce-motion"
              className={`adaptive-text font-semibold ${localSettings.highContrast ? 'text-yellow-400' : 'text-white'}`}
            >
              🎭 Réduire animations
            </label>
            <button
              id="reduce-motion"
              onClick={() => {
                const newValue = !localSettings.reduceMotion;
                handleSettingChange('reduceMotion', newValue);

                // Annonce immédiate
                setTimeout(() => {
                  const announcement = document.createElement('div');
                  announcement.setAttribute('aria-live', 'assertive');
                  announcement.setAttribute('aria-atomic', 'true');
                  announcement.setAttribute('role', 'status');
                  announcement.className = 'sr-only';
                  announcement.textContent = `Réduction des animations ${newValue ? 'activée' : 'désactivée'}`;
                  document.body.appendChild(announcement);
                  setTimeout(() => {
                    if (document.body.contains(announcement)) {
                      document.body.removeChild(announcement);
                    }
                  }, 2000);
                }, 50);
              }}
              className={`adaptive-switch rounded-full transition-colors relative
                ${localSettings.reduceMotion ? (localSettings.highContrast ? 'bg-yellow-400' : 'bg-red-700') : 'bg-gray-600'}`}
              aria-pressed={localSettings.reduceMotion}
              aria-label={`Réduction des animations ${localSettings.reduceMotion ? 'activée' : 'désactivée'}`}
              role="switch"
            >
              <div className={`adaptive-switch-thumb bg-white rounded-full absolute transition-transform
                ${localSettings.reduceMotion ? 'adaptive-switch-thumb active' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Support lecteur d'écran */}
          <div className="modal-section flex items-center justify-between">
            <label
              htmlFor="screen-reader"
              className={`adaptive-text font-semibold ${localSettings.highContrast ? 'text-yellow-400' : 'text-white'}`}
            >
              🔊 Lecteur d'écran
            </label>
            <button
              id="screen-reader"
              onClick={() => {
                const newValue = !localSettings.screenReader;
                handleSettingChange('screenReader', newValue);

                // Annonce immédiate avec test
                setTimeout(() => {
                  const announcement = document.createElement('div');
                  announcement.setAttribute('aria-live', 'assertive');
                  announcement.setAttribute('aria-atomic', 'true');
                  announcement.setAttribute('role', 'status');
                  announcement.className = 'sr-only';
                  announcement.textContent = newValue
                    ? 'Support lecteur d\'écran activé. Les annonces vocales sont maintenant disponibles.'
                    : 'Support lecteur d\'écran désactivé';
                  document.body.appendChild(announcement);

                  // Notification visuelle pour confirmer le fonctionnement
                  if (newValue) {
                    const visualTest = document.createElement('div');
                    visualTest.style.cssText = `
                      position: fixed;
                      top: 1rem;
                      right: 1rem;
                      background: #22c55e;
                      color: white;
                      padding: 1rem;
                      border-radius: 0.5rem;
                      z-index: 9999;
                      font-size: 1rem;
                      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
                      max-width: 300px;
                    `;
                    visualTest.textContent = '✅ Lecteur d\'écran activé - Test réussi !';
                    document.body.appendChild(visualTest);

                    setTimeout(() => {
                      if (document.body.contains(visualTest)) {
                        document.body.removeChild(visualTest);
                      }
                    }, 4000);
                  }

                  setTimeout(() => {
                    if (document.body.contains(announcement)) {
                      document.body.removeChild(announcement);
                    }
                  }, 3000);
                }, 50);
              }}
              className={`adaptive-switch rounded-full transition-colors relative
                ${localSettings.screenReader ? (localSettings.highContrast ? 'bg-yellow-400' : 'bg-red-700') : 'bg-gray-600'}`}
              aria-pressed={localSettings.screenReader}
              aria-label={`Support lecteur d'écran ${localSettings.screenReader ? 'activé' : 'désactivé'}`}
              role="switch"
            >
              <div className={`adaptive-switch-thumb bg-white rounded-full absolute transition-transform
                ${localSettings.screenReader ? 'adaptive-switch-thumb active' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Navigation clavier */}
          <div className="modal-section flex items-center justify-between">
            <label
              htmlFor="keyboard-nav"
              className={`adaptive-text font-semibold ${localSettings.highContrast ? 'text-yellow-400' : 'text-white'}`}
            >
              ⌨️ Navigation clavier
            </label>
            <button
              id="keyboard-nav"
              onClick={() => {
                const newValue = !localSettings.keyboardNavigation;
                handleSettingChange('keyboardNavigation', newValue);

                // Annonce immédiate
                setTimeout(() => {
                  const announcement = document.createElement('div');
                  announcement.setAttribute('aria-live', 'assertive');
                  announcement.setAttribute('aria-atomic', 'true');
                  announcement.setAttribute('role', 'status');
                  announcement.className = 'sr-only';
                  announcement.textContent = `Navigation clavier ${newValue ? 'activée' : 'désactivée'}`;
                  document.body.appendChild(announcement);
                  setTimeout(() => {
                    if (document.body.contains(announcement)) {
                      document.body.removeChild(announcement);
                    }
                  }, 2000);
                }, 50);
              }}
              className={`adaptive-switch rounded-full transition-colors relative
                ${localSettings.keyboardNavigation ? (localSettings.highContrast ? 'bg-yellow-400' : 'bg-red-700') : 'bg-gray-600'}`}
              aria-pressed={localSettings.keyboardNavigation}
              aria-label={`Navigation clavier ${localSettings.keyboardNavigation ? 'activée' : 'désactivée'}`}
              role="switch"
            >
              <div className={`adaptive-switch-thumb bg-white rounded-full absolute transition-transform
                ${localSettings.keyboardNavigation ? 'adaptive-switch-thumb active' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        {/* Zone de test du lecteur d'écran */}
        {localSettings.screenReader && (
          <div className={`modal-input rounded border-2 ${localSettings.highContrast ? 'border-yellow-400 bg-yellow-900/30' : 'border-green-500 bg-green-900/20'}`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className={`adaptive-text font-bold ${localSettings.highContrast ? 'text-yellow-200' : 'text-green-400'}`}>
                🔊 Test du lecteur d'écran
              </h3>
            </div>
            <div className="space-y-2">

              <button
                onClick={() => {
                  // Test audio alternatif avec beep
                  console.log('🔊 Test audio alternatif');

                  try {
                    // Créer un beep avec Web Audio API
                    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                    const audioContext = new AudioContextClass();
                    const oscillator = audioContext.createOscillator();
                    const gainNode = audioContext.createGain();

                    oscillator.connect(gainNode);
                    gainNode.connect(audioContext.destination);

                    oscillator.frequency.value = 800; // 800 Hz
                    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

                    oscillator.start(audioContext.currentTime);
                    oscillator.stop(audioContext.currentTime + 0.5);

                    console.log('✅ Beep joué');
                  } catch (e) {
                    console.error('❌ Erreur Web Audio:', e);
                    alert('❌ Audio non supporté');
                  }
                }}
                className={`adaptive-button w-full rounded font-bold transition-colors mb-2
                  ${localSettings.highContrast
                    ? 'bg-purple-600 text-white hover:bg-purple-500'
                    : 'bg-purple-600 text-white hover:bg-purple-500'}`}
              >
                🎵 Test audio (beep)
              </button>

              <button
                onClick={() => {
                  const testMessage = 'Ceci est un test du lecteur d\'écran. Si vous entendez ce message, le système fonctionne correctement.';

                  // Créer l'annonce ARIA
                  const announcement = document.createElement('div');
                  announcement.setAttribute('aria-live', 'assertive');
                  announcement.setAttribute('aria-atomic', 'true');
                  announcement.setAttribute('role', 'status');
                  announcement.className = 'sr-only';
                  announcement.textContent = testMessage;
                  document.body.appendChild(announcement);

                  // Synthèse vocale avec solutions multiples
                  if ('speechSynthesis' in window) {
                    console.log('🔊 SpeechSynthesis disponible');

                    // Solution 1: Attendre que les voix se chargent
                    const trySpeak = () => {
                      window.speechSynthesis.cancel();

                      const utterance = new SpeechSynthesisUtterance(testMessage);
                      utterance.lang = 'fr-FR';
                      utterance.rate = 0.9;
                      utterance.pitch = 1;
                      utterance.volume = 1.0;

                      const voices = window.speechSynthesis.getVoices();
                      console.log('🎤 Voix disponibles:', voices.length, voices.map(v => `${v.name} (${v.lang})`));

                      if (voices.length === 0) {
                        console.log('⏳ Aucune voix chargée, attente...');
                        // Réessayer après 1 seconde
                        setTimeout(trySpeak, 1000);
                        return;
                      }

                      const frenchVoice = voices.find(voice =>
                        voice.lang.startsWith('fr') ||
                        voice.name.toLowerCase().includes('french') ||
                        voice.name.toLowerCase().includes('français')
                      );

                      if (frenchVoice) {
                        utterance.voice = frenchVoice;
                        console.log('🇫🇷 Voix française trouvée:', frenchVoice.name);
                      } else {
                        // Utiliser la première voix disponible
                        utterance.voice = voices[0];
                        console.log('🌍 Utilisation de la première voix:', voices[0].name);
                      }

                      // Events pour debug
                      utterance.onstart = () => console.log('🎵 Synthèse vocale démarrée');
                      utterance.onend = () => console.log('✅ Synthèse vocale terminée');
                      utterance.onerror = (e) => {
                        console.error('❌ Erreur synthèse vocale:', e);
                        // Fallback: essayer sans voix spécifique
                        const fallbackUtterance = new SpeechSynthesisUtterance('Test fallback');
                        fallbackUtterance.volume = 1.0;
                        window.speechSynthesis.speak(fallbackUtterance);
                      };

                      console.log('🚀 Lancement de la synthèse vocale...');
                      window.speechSynthesis.speak(utterance);
                    };

                    // Démarrer le processus
                    trySpeak();
                  } else {
                    console.error('❌ SpeechSynthesis non supporté par ce navigateur');
                    // Fallback: notification sonore
                    try {
                      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                      const audioContext = new AudioContextClass();
                      const oscillator = audioContext.createOscillator();
                      const gainNode = audioContext.createGain();

                      oscillator.connect(gainNode);
                      gainNode.connect(audioContext.destination);

                      // Séquence de bips pour simuler la parole
                      [400, 600, 500, 700].forEach((freq, i) => {
                        setTimeout(() => {
                          const osc = audioContext.createOscillator();
                          const gain = audioContext.createGain();
                          osc.connect(gain);
                          gain.connect(audioContext.destination);
                          osc.frequency.value = freq;
                          gain.gain.setValueAtTime(0.2, audioContext.currentTime);
                          gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
                          osc.start(audioContext.currentTime);
                          osc.stop(audioContext.currentTime + 0.2);
                        }, i * 300);
                      });
                    } catch (e) {
                      console.error('❌ Aucune solution audio disponible');
                    }
                  }

                  // Notification visuelle
                  const visualTest = document.createElement('div');
                  visualTest.style.cssText = `
                  position: fixed;
                  top: 50%;
                  left: 50%;
                  transform: translate(-50%, -50%);
                  background: #1f2937;
                  color: #22c55e;
                  padding: 2rem;
                  border-radius: 1rem;
                  border: 3px solid #22c55e;
                  z-index: 10000;
                  font-size: 1.25rem;
                  text-align: center;
                  box-shadow: 0 8px 32px rgba(0,0,0,0.8);
                  max-width: 400px;
                `;
                  visualTest.innerHTML = `
                  <div style="margin-bottom: 1rem; font-size: 2rem;">🔊</div>
                  <div style="font-weight: bold; margin-bottom: 0.5rem;">Test en cours...</div>
                  <div style="font-size: 1rem; opacity: 0.8;">Message vocal + ARIA envoyé</div>
                `;
                  document.body.appendChild(visualTest);

                  setTimeout(() => {
                    if (document.body.contains(announcement)) {
                      document.body.removeChild(announcement);
                    }
                    if (document.body.contains(visualTest)) {
                      document.body.removeChild(visualTest);
                    }
                  }, 5000);
                }}
                className={`adaptive-button w-full rounded font-bold transition-colors
                ${localSettings.highContrast
                    ? 'bg-yellow-600 text-black hover:bg-yellow-500'
                    : 'bg-green-600 text-white hover:bg-green-500'}`}
              >
                🎯 Tester les annonces vocales
              </button>
            </div>
          </div>
        )}

        <div className={`modal-input rounded border ${localSettings.highContrast ? 'border-yellow-400 bg-yellow-900/20' : 'border-red-700 bg-red-900/20'}`}>
          <p className={`adaptive-text-sm ${localSettings.highContrast ? 'text-yellow-200' : 'text-gray-300'}`}>
            💡 <strong>Astuce :</strong> Paramètres sauvegardés localement.
          </p>
        </div>

        <button
          onClick={onClose}
          className={`adaptive-button w-full rounded font-bold transition-colors
            ${localSettings.highContrast
              ? 'bg-yellow-400 text-black hover:bg-yellow-500'
              : 'bg-red-700 text-white hover:bg-red-800'}`}
        >
          Fermer
        </button>
      </div>
    </div>
  );
};

export default AccessibilitySettingsModal;