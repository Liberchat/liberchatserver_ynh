import React, { useState } from 'react';
import icon from '../../icon.png';
import AccessibilitySettingsModal, { AccessibilitySettings } from './AccessibilitySettings';
import ThemeCustomizer from './ThemeCustomizer';
import { CustomTheme } from '../hooks/useCustomThemes';

interface HeaderProps {
  onLogout?: (clearLocalData?: boolean) => void;
  isLoggedIn?: boolean;
  accessibilitySettings?: AccessibilitySettings;
  onAccessibilityChange?: (settings: AccessibilitySettings) => void;
  onApplyFontSizeImmediately?: () => void;
  // Thèmes personnalisables
  customThemes?: CustomTheme[];
  activeCustomTheme?: string | null;
  onApplyCustomTheme?: (themeId: string | null) => void;
  onAddCustomTheme?: (theme: Omit<CustomTheme, 'id' | 'isActive'>) => string;
  onUpdateCustomTheme?: (id: string, updates: Partial<CustomTheme>) => void;
  onDeleteCustomTheme?: (id: string) => void;
  onResetCustomThemes?: () => void;
}

const Header: React.FC<HeaderProps & { theme?: 'light' | 'dark', onToggleTheme?: () => void }> = ({ 
  onLogout, 
  isLoggedIn = true, 
  theme, 
  onToggleTheme, 
  accessibilitySettings, 
  onAccessibilityChange,
  onApplyFontSizeImmediately,
  customThemes,
  activeCustomTheme,
  onApplyCustomTheme,
  onAddCustomTheme,
  onUpdateCustomTheme,
  onDeleteCustomTheme,
  onResetCustomThemes
}) => {
  const [showAccessibilityModal, setShowAccessibilityModal] = useState(false);
  const [showThemeCustomizer, setShowThemeCustomizer] = useState(false);
  const [showLogoutMenu, setShowLogoutMenu] = useState(false);
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
            onLogout?.(false);
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onToggleTheme, onLogout]);

  // Fermer le menu de déconnexion quand on clique ailleurs
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      if (showLogoutMenu && !target.closest('.logout-menu-container')) {
        setShowLogoutMenu(false);
      }
    };

    if (showLogoutMenu) {
      document.addEventListener('click', handleClickOutside);
    }
    
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showLogoutMenu]);

  return (
    <header 
      className="w-full bg-black border-b-4 border-red-700 px-1 sm:px-4 py-1.5 sm:py-3 flex items-center justify-between shadow-lg z-10 sticky top-0 left-0"
      style={{ minHeight: 48 }}
      role="banner"
      aria-label="En-tête de l'application LiberChat"
    >
      <div className="flex items-center gap-1 sm:gap-4 min-w-0">
        <img src={icon} alt="Liberchat Logo" className="h-7 w-7 sm:h-10 sm:w-10 flex-shrink-0 border-2 border-white rounded-full bg-black shadow-md" />
        <h1 className="text-sm sm:text-2xl font-extrabold text-white uppercase tracking-wide sm:tracking-widest" style={{ fontFamily: 'Impact, sans-serif', letterSpacing: '0.05em', minWidth: 'fit-content', maxWidth: '50vw', whiteSpace: 'nowrap', overflow: 'visible' }}>
          LiberChat
        </h1>
        <span className="ml-1 px-1 py-0.5 bg-red-700 text-white text-[10px] sm:text-xs rounded uppercase tracking-wider font-bold shadow hidden sm:inline commune-badge">Commune</span>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Bouton Thèmes personnalisables */}
        {customThemes && onApplyCustomTheme && (
          <button
            onClick={() => setShowThemeCustomizer(true)}
            className={`flex items-center gap-1 sm:gap-2 px-1 sm:px-3 py-1 rounded-full shadow border-2 border-red-700 font-bold font-mono transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-700 text-xs sm:text-base ${theme === 'dark' ? 'bg-black/80 text-white hover:bg-white hover:text-red-700' : 'bg-white/90 text-black hover:bg-red-700 hover:text-white'}`}
            title="Thèmes personnalisables"
            aria-label="Ouvrir les thèmes personnalisables"
            style={{ fontSize: '10px' }}
          >
            <span className="inline-flex items-center" style={{ fontSize: '10px' }}>🖍️ <span className="ml-1 hidden sm:inline">Thèmes</span></span>
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
            style={{ fontSize: '10px' }}
          >
            <span className="inline-flex items-center" style={{ fontSize: '10px' }}>♿ <span className="ml-1 hidden sm:inline">Accessibilité</span></span>
          </button>
        )}
        
        {onToggleTheme && theme && (
          <button
            onClick={onToggleTheme}
            className={`flex items-center gap-1 sm:gap-2 px-1 sm:px-3 py-1 rounded-full shadow border-2 border-red-700 font-bold font-mono transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-700
              ${theme === 'dark' ? 'bg-black/80 text-white hover:bg-white hover:text-red-700' : 'bg-white/90 text-black hover:bg-red-700 hover:text-white'} text-xs sm:text-base`}
            style={{ fontSize: '10px' }}
            title={theme === 'dark' ? 'Passer en thème clair' : 'Passer en thème sombre'}
            aria-label={theme === 'dark' ? 'Passer en thème clair' : 'Passer en thème sombre'}
            data-shortcut="Alt+T"
          >
            {theme === 'dark' ? (
              <span className="inline-flex items-center" style={{ fontSize: '10px' }}>☀️ <span className="ml-1 hidden sm:inline">Clair</span></span>
            ) : (
              <span className="inline-flex items-center" style={{ fontSize: '10px' }}>🌙 <span className="ml-1 hidden sm:inline">Sombre</span></span>
            )}
          </button>
        )}
        {isLoggedIn && onLogout && (
          <div className="relative logout-menu-container">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowLogoutMenu(!showLogoutMenu);
              }}
              className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-red-700 to-black text-white font-bold rounded border border-white hover:from-black hover:to-red-700 transition-all shadow"
              aria-label="Menu de déconnexion"
              data-shortcut="Alt+Q"
              title="Déconnexion"
              style={{ fontSize: '12px' }}
            >
              <span className="text-sm sm:text-base" style={{ fontSize: '12px' }}>⍈</span>
            </button>
            {showLogoutMenu && (
              <div 
                className="absolute right-0 top-full mt-1 bg-black border-2 border-red-700 rounded shadow-lg z-50 min-w-48 sm:min-w-52 logout-dropdown"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={(e) => { 
                    e.stopPropagation();
                    onLogout?.(false); 
                    setShowLogoutMenu(false); 
                  }}
                  className="block w-full px-3 py-2 text-left text-white hover:bg-red-700 transition text-xs font-mono"
                >
                  Se déconnecter (garder le nom)
                </button>
                <button
                  onClick={(e) => { 
                    e.stopPropagation();
                    onLogout?.(true); 
                    setShowLogoutMenu(false); 
                  }}
                  className="block w-full px-3 py-2 text-left text-white hover:bg-red-700 transition text-xs font-mono border-t border-red-700"
                >
                  Oublier mes données
                </button>
              </div>
            )}
          </div>
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
          onResetToDefaults={onResetCustomThemes}
        />
      )}

      {/* Modal des paramètres d'accessibilité */}
      {accessibilitySettings && onAccessibilityChange && (
        <AccessibilitySettingsModal
          isOpen={showAccessibilityModal}
          onClose={() => setShowAccessibilityModal(false)}
          settings={accessibilitySettings}
          onSettingsChange={onAccessibilityChange}
          onApplyFontSizeImmediately={onApplyFontSizeImmediately}
        />
      )}
    </header>
  );
};

export default Header;
