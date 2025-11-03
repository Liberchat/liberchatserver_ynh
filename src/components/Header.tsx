import React, { useState } from 'react';
import icon from '../../icon.png';
import AccessibilitySettingsModal, { AccessibilitySettings } from './AccessibilitySettings';
import ThemeCustomizer from './ThemeCustomizer';

import { ConnectionSettings } from './ConnectionSettings';
import { CustomTheme } from '../hooks/useCustomThemes';

interface HeaderProps {
  onLogout?: () => void;
  isLoggedIn?: boolean;
  accessibilitySettings?: AccessibilitySettings;
  onAccessibilityChange?: (settings: AccessibilitySettings) => void;
  // Thèmes personnalisables
  customThemes?: CustomTheme[];
  activeCustomTheme?: string | null;
  onApplyCustomTheme?: (themeId: string | null) => void;
  onAddCustomTheme?: (theme: Omit<CustomTheme, 'id' | 'isActive'>) => string;
  onUpdateCustomTheme?: (id: string, updates: Partial<CustomTheme>) => void;
  onDeleteCustomTheme?: (id: string) => void;
  // Navigation groupes
  currentView?: 'chat' | 'groups';
  onViewChange?: (view: 'chat' | 'groups') => void;
  currentGroupName?: string;
  // Paramètres de connexion
  currentUsername?: string;
}

const Header: React.FC<HeaderProps & { theme?: 'light' | 'dark', onToggleTheme?: () => void }> = ({
  onLogout,
  isLoggedIn = true,
  theme,
  onToggleTheme,
  accessibilitySettings,
  onAccessibilityChange,
  customThemes,
  activeCustomTheme,
  onApplyCustomTheme,
  onAddCustomTheme,
  onUpdateCustomTheme,
  onDeleteCustomTheme,
  currentView = 'chat',
  onViewChange,
  currentGroupName,
  currentUsername
}) => {
  const [showAccessibilityModal, setShowAccessibilityModal] = useState(false);
  const [showThemeCustomizer, setShowThemeCustomizer] = useState(false);
  const [showConnectionSettings, setShowConnectionSettings] = useState(false);


  // Gestion des raccourcis clavier
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey) {
        switch (e.key.toLowerCase()) {
          case 'a':
            e.preventDefault();
            setShowAccessibilityModal(true);
            break;
          case 't':
            e.preventDefault();
            onToggleTheme?.();
            break;
          case 'q':
            e.preventDefault();
            onLogout?.();
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onToggleTheme, onLogout]);



  return (
    <>
      <header
        className="w-full bg-black border-b-4 border-red-700 shadow-lg z-10 sticky top-0 left-0 overflow-hidden"
        style={{ minHeight: 60 }}
        role="banner"
        aria-label="En-tête de l'application LiberChat"
      >
        {/* Ligne principale */}
        <div className="flex items-center justify-between px-2 sm:px-4 py-2 sm:py-3">
          {/* Section gauche : Logo + Titre */}
          <div className="flex items-center gap-1 sm:gap-3 min-w-0 flex-1">
            <img src={icon} alt="Liberchat Logo" className="h-7 w-7 sm:h-10 sm:w-10 flex-shrink-0 border-2 border-white rounded-full bg-black shadow-md" />
            <h1 className="text-xs sm:text-2xl font-extrabold text-white uppercase tracking-wider truncate" style={{ fontFamily: 'Impact, sans-serif' }}>
              LiberChat
            </h1>
            <span className="px-1 sm:px-2 py-0.5 bg-red-700 text-white text-[7px] sm:text-xs rounded uppercase tracking-wider font-bold shadow border border-red-500 flex-shrink-0">
              Commune
            </span>
          </div>

          {/* Section droite : Boutons essentiels */}
          <div className="flex items-center gap-0.5 sm:gap-2 flex-shrink-0">
            {/* Thème - toujours visible */}
            <button
              onClick={onToggleTheme}
              className={`p-1.5 sm:px-3 sm:py-1 rounded-full shadow border-2 border-red-700 font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-700 ${theme === 'dark' ? 'bg-black/80 text-white hover:bg-white hover:text-red-700' : 'bg-white/90 text-black hover:bg-red-700 hover:text-white'}`}
              title={theme === 'dark' ? 'Passer en thème clair' : 'Passer en thème sombre'}
              aria-label={theme === 'dark' ? 'Passer en thème clair' : 'Passer en thème sombre'}
              data-shortcut="Alt+T"
            >
              <span className="text-sm sm:hidden">{theme === 'dark' ? '☀️' : '🌙'}</span>
              <span className="hidden sm:flex items-center gap-1 text-xs">
                {theme === 'dark' ? '☀️ Clair' : '🌙 Sombre'}
              </span>
            </button>

            {/* Accessibilité - toujours visible */}
            <button
              onClick={() => setShowAccessibilityModal(true)}
              className={`p-1.5 sm:px-3 sm:py-1 rounded-full shadow border-2 border-red-700 font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-700 ${theme === 'dark' ? 'bg-black/80 text-white hover:bg-white hover:text-red-700' : 'bg-white/90 text-black hover:bg-red-700 hover:text-white'}`}
              title="Paramètres d'accessibilité"
              aria-label="Ouvrir les paramètres d'accessibilité"
              data-shortcut="Alt+A"
            >
              <span className="text-sm sm:hidden">♿</span>
              <span className="hidden sm:flex items-center gap-1 text-xs">♿ Accessibilité</span>
            </button>

            {/* Thèmes personnalisables - toujours visible */}
            <button
              onClick={() => setShowThemeCustomizer(true)}
              className={`p-1.5 sm:px-3 sm:py-1 rounded-full shadow border-2 border-red-700 font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-700 ${theme === 'dark' ? 'bg-black/80 text-white hover:bg-white hover:text-red-700' : 'bg-white/90 text-black hover:bg-red-700 hover:text-white'}`}
              title="Thèmes personnalisables"
              aria-label="Ouvrir les thèmes personnalisables"
            >
              <span className="text-sm sm:hidden">🖍️</span>
              <span className="hidden sm:flex items-center gap-1 text-xs">🖍️ Thèmes</span>
            </button>

            {/* Connexion - toujours visible si utilisateur connecté */}
            {currentUsername && (
              <button
                onClick={() => setShowConnectionSettings(true)}
                className={`p-1.5 sm:px-3 sm:py-1 rounded-full shadow border-2 border-red-700 font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-700 ${theme === 'dark' ? 'bg-black/80 text-white hover:bg-white hover:text-red-700' : 'bg-white/90 text-black hover:bg-red-700 hover:text-white'}`}
                title="Paramètres de connexion"
                aria-label="Ouvrir les paramètres de connexion"
              >
                <span className="text-sm sm:hidden">🔧</span>
                <span className="hidden sm:flex items-center gap-1 text-xs">🔧 Connexion</span>
              </button>
            )}

            {/* Déconnexion - compact */}
            {isLoggedIn && onLogout && (
              <button
                onClick={onLogout}
                className="px-1.5 sm:px-2 py-1 text-[10px] sm:text-xs bg-gradient-to-r from-red-700 to-black text-white font-bold rounded border border-white hover:from-black hover:to-red-700 transition-all uppercase tracking-wider shadow"
                aria-label="Se déconnecter du chat"
                data-shortcut="Alt+Q"
              >
                <span className="sm:hidden">✕</span>
                <span className="hidden sm:inline">Déconnexion</span>
              </button>
            )}


          </div>
        </div>

        {/* Ligne secondaire : Navigation et groupe actuel */}
        {(onViewChange || currentGroupName) && (
          <div className="flex items-center justify-between px-2 sm:px-4 py-1 border-t border-red-800/50 bg-gray-900/30">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {/* Navigation Chat/Groupes */}
              {onViewChange && (
                <div className="flex items-center gap-0.5 bg-gray-800 rounded-lg p-0.5 border border-red-800">
                  <button
                    onClick={() => onViewChange('chat')}
                    className={`px-2 sm:px-3 py-1 text-xs rounded font-medium transition-all duration-200 ${currentView === 'chat'
                      ? 'bg-red-700 text-white shadow-lg shadow-red-700/50'
                      : 'bg-transparent text-red-300 hover:bg-red-900/50 hover:text-white'
                      }`}
                  >
                    💬 <span className="hidden sm:inline">Chat</span>
                  </button>
                  <button
                    onClick={() => onViewChange('groups')}
                    className={`px-2 sm:px-3 py-1 text-xs rounded font-medium transition-all duration-200 ${currentView === 'groups'
                      ? 'bg-red-700 text-white shadow-lg shadow-red-700/50'
                      : 'bg-transparent text-red-300 hover:bg-red-900/50 hover:text-white'
                      }`}
                  >
                    👥 <span className="hidden sm:inline">Cellules</span>
                  </button>
                </div>
              )}

              {/* Nom du groupe actuel */}
              {currentGroupName && (
                <span className="px-2 py-1 bg-red-800 text-white text-xs rounded border border-red-600 font-medium truncate max-w-32 sm:max-w-48">
                  🔴 {currentGroupName}
                </span>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Modales */}
      <ThemeCustomizer
        isOpen={showThemeCustomizer}
        onClose={() => setShowThemeCustomizer(false)}
        themes={customThemes || []}
        activeTheme={activeCustomTheme || null}
        onApplyTheme={onApplyCustomTheme || (() => { })}
        onAddTheme={onAddCustomTheme || (() => '')}
        onUpdateTheme={onUpdateCustomTheme || (() => { })}
        onDeleteTheme={onDeleteCustomTheme || (() => { })}
      />

      <AccessibilitySettingsModal
        isOpen={showAccessibilityModal}
        onClose={() => setShowAccessibilityModal(false)}
        settings={accessibilitySettings || {
          fontSize: 'normal',
          highContrast: false,
          dyslexiaFont: false,
          reduceMotion: false,
          screenReader: false,
          keyboardNavigation: false
        }}
        onSettingsChange={onAccessibilityChange || (() => { })}
      />



      <ConnectionSettings
        isOpen={showConnectionSettings}
        onClose={() => setShowConnectionSettings(false)}
        currentUsername={currentUsername}
      />
    </>
  );
};

export default Header;