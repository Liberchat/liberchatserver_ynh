import React, { useState } from 'react';
import icon from '../../icon.png';
import AccessibilitySettingsModal, { AccessibilitySettings } from './AccessibilitySettings';
import ThemeCustomizer from './ThemeCustomizer';
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
  onDeleteCustomTheme
}) => {
  const [showAccessibilityModal, setShowAccessibilityModal] = useState(false);
  const [showThemeCustomizer, setShowThemeCustomizer] = useState(false);
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
    <header 
      className="w-full bg-black border-b-4 border-red-700 px-1 sm:px-4 py-1.5 sm:py-3 flex items-center justify-between shadow-lg z-10 sticky top-0 left-0"
      style={{ minHeight: 48 }}
      role="banner"
      aria-label="En-tête de l'application LiberChat"
    >
      <div className="flex items-center gap-1 sm:gap-4 min-w-0">
        <img src={icon} alt="Liberchat Logo" className="h-7 w-7 sm:h-10 sm:w-10 flex-shrink-0 border-2 border-white rounded-full bg-black shadow-md" />
        <h1 className="text-base sm:text-2xl font-extrabold text-white uppercase tracking-widest truncate" style={{ fontFamily: 'Impact, sans-serif', letterSpacing: '0.15em', maxWidth: '40vw' }}>
          LiberChat
        </h1>
        <span className="ml-1 px-1 py-0.5 bg-red-700 text-white text-[10px] sm:text-xs rounded uppercase tracking-wider font-bold shadow hidden sm:inline">Commune</span>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Bouton Thèmes personnalisables */}
        {customThemes && onApplyCustomTheme && (
          <button
            onClick={() => setShowThemeCustomizer(true)}
            className={`flex items-center gap-1 sm:gap-2 px-1 sm:px-3 py-1 rounded-full shadow border-2 border-red-700 font-bold font-mono transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-700 text-xs sm:text-base ${theme === 'dark' ? 'bg-black/80 text-white hover:bg-white hover:text-red-700' : 'bg-white/90 text-black hover:bg-red-700 hover:text-white'}`}
            title="Thèmes personnalisables"
            aria-label="Ouvrir les thèmes personnalisables"
          >
            <span className="inline-flex items-center">🖍️ <span className="ml-1 hidden sm:inline">Thèmes</span></span>
          </button>
        )}

        {/* Bouton Accessibilité */}
        {accessibilitySettings && onAccessibilityChange && (
          <button
            onClick={() => setShowAccessibilityModal(true)}
            className={`keyboard-shortcut flex items-center gap-1 sm:gap-2 px-1 sm:px-3 py-1 rounded-full shadow border-2 border-red-700 font-bold font-mono transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-700 text-xs sm:text-base ${theme === 'dark' ? 'bg-black/80 text-white hover:bg-white hover:text-red-700' : 'bg-white/90 text-black hover:bg-red-700 hover:text-white'}`}
            title="Paramètres d'accessibilité"
            aria-label="Ouvrir les paramètres d'accessibilité"
            data-shortcut="Alt+A"
          >
            <span className="inline-flex items-center">♿ <span className="ml-1 hidden sm:inline">Accessibilité</span></span>
          </button>
        )}
        
        {onToggleTheme && theme && (
          <button
            onClick={onToggleTheme}
            className={`flex items-center gap-1 sm:gap-2 px-1 sm:px-3 py-1 rounded-full shadow border-2 border-red-700 font-bold font-mono transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-700
              ${theme === 'dark' ? 'bg-black/80 text-white hover:bg-white hover:text-red-700' : 'bg-white/90 text-black hover:bg-red-700 hover:text-white'} text-xs sm:text-base`}
            style={{ fontSize: undefined }}
            title={theme === 'dark' ? 'Passer en thème clair' : 'Passer en thème sombre'}
            aria-label={theme === 'dark' ? 'Passer en thème clair' : 'Passer en thème sombre'}
            data-shortcut="Alt+T"
          >
            {theme === 'dark' ? (
              <span className="inline-flex items-center">☀️ <span className="ml-1 hidden sm:inline">Clair</span></span>
            ) : (
              <span className="inline-flex items-center">🌙 <span className="ml-1 hidden sm:inline">Sombre</span></span>
            )}
          </button>
        )}
        {isLoggedIn && onLogout && (
          <button
            onClick={onLogout}
            className="px-1 sm:px-2 py-0.5 text-[10px] sm:text-xs bg-gradient-to-r from-red-700 to-black text-white font-bold rounded border border-white hover:from-black hover:to-red-700 transition-all uppercase tracking-widest shadow ml-0 sm:ml-4 min-w-0 w-auto"
            aria-label="Se déconnecter du chat"
            data-shortcut="Alt+Q"
          >
            Déconnexion
          </button>
        )}
      </div>
      
      {/* Modal des thèmes personnalisables */}
      {customThemes && onApplyCustomTheme && onAddCustomTheme && onUpdateCustomTheme && onDeleteCustomTheme && (
        <ThemeCustomizer
          isOpen={showThemeCustomizer}
          onClose={() => setShowThemeCustomizer(false)}
          themes={customThemes}
          activeTheme={activeCustomTheme}
          onApplyTheme={onApplyCustomTheme}
          onAddTheme={onAddCustomTheme}
          onUpdateTheme={onUpdateCustomTheme}
          onDeleteTheme={onDeleteCustomTheme}
        />
      )}

      {/* Modal des paramètres d'accessibilité */}
      {accessibilitySettings && onAccessibilityChange && (
        <AccessibilitySettingsModal
          isOpen={showAccessibilityModal}
          onClose={() => setShowAccessibilityModal(false)}
          settings={accessibilitySettings}
          onSettingsChange={onAccessibilityChange}
        />
      )}
    </header>
  );
};

export default Header;
