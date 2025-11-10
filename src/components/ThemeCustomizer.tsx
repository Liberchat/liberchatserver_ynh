import React, { useState, useEffect } from 'react';
import { CustomTheme } from '../hooks/useCustomThemes';

interface ThemeCustomizerProps {
  isOpen: boolean;
  onClose: () => void;
  themes: CustomTheme[];
  activeTheme: string | null;
  onApplyTheme: (themeId: string | null) => void;
  onAddTheme: (theme: Omit<CustomTheme, 'id' | 'isActive'>) => string;
  onUpdateTheme: (id: string, updates: Partial<CustomTheme>) => void;
  onDeleteTheme: (id: string) => void;
  onResetToDefaults?: () => void;
}

const ThemeCustomizer: React.FC<ThemeCustomizerProps> = ({
  isOpen,
  onClose,
  themes,
  activeTheme,
  onApplyTheme,
  onAddTheme,
  onUpdateTheme,
  onDeleteTheme,
  onResetToDefaults
}) => {
  const [editingTheme, setEditingTheme] = useState<CustomTheme | null>(null);
  const [newThemeName, setNewThemeName] = useState('');
  const [newThemeCSS, setNewThemeCSS] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    // Gérer le scroll du body quand la modale est ouverte/fermée
    if (isOpen) {
      document.body.classList.add('modal-open');
      // Empêcher le scroll sur mobile
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
    } else {
      document.body.classList.remove('modal-open');
      // Restaurer le scroll
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
    }

    // Cleanup au démontage
    return () => {
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveTheme = () => {
    if (editingTheme) {
      onUpdateTheme(editingTheme.id, { name: newThemeName, css: newThemeCSS });
      setEditingTheme(null);
    } else {
      onAddTheme({ name: newThemeName, css: newThemeCSS });
    }
    setNewThemeName('');
    setNewThemeCSS('');
    setShowCreateForm(false);
  };

  const startEditing = (theme: CustomTheme) => {
    setEditingTheme(theme);
    setNewThemeName(theme.name);
    setNewThemeCSS(theme.css);
    setShowCreateForm(true);
  };

  const cancelEditing = () => {
    setEditingTheme(null);
    setNewThemeName('');
    setNewThemeCSS('');
    setShowCreateForm(false);
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 overflow-y-auto">
      <div className="min-h-full flex items-center justify-center p-1">
        <div className="bg-black border border-red-500 rounded-md shadow-2xl w-72 max-h-96 overflow-y-auto">
        
        {/* Header ultra-compact */}
        <div className="flex justify-between items-center border-b border-red-500/50 bg-gray-900 px-2 py-1">
          <span className="text-red-400 font-mono" style={{fontSize: '9px'}}>THÈMES</span>
          <div className="flex gap-1">
            {onResetToDefaults && (
              <button
                onClick={() => {
                  if (confirm('Reset ?')) {
                    onResetToDefaults();
                  }
                }}
                className="bg-yellow-700 hover:bg-yellow-600 text-white rounded-sm"
                style={{fontSize: '8px', padding: '1px 3px', lineHeight: '1'}}
                title="Reset"
              >
                ↻
              </button>
            )}
            <button
              onClick={onClose}
              className="bg-red-700 hover:bg-red-600 text-white rounded-sm"
              style={{fontSize: '8px', padding: '1px 3px', lineHeight: '1'}}
            >
              ×
            </button>
          </div>
        </div>

        {/* Contenu ultra-compact */}
        <div className="p-1 space-y-1">
          
          {/* Thème par défaut */}
          <div>
            <div className="text-gray-400 font-mono mb-1" style={{fontSize: '8px'}}>DÉFAUT</div>
            <button
              onClick={() => onApplyTheme(null)}
              className={`w-full rounded border text-center transition ${
                !activeTheme 
                  ? 'border-red-500 bg-red-900/30 text-red-300' 
                  : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-red-500'
              }`}
              style={{fontSize: '8px', padding: '2px 4px', lineHeight: '1.2'}}
            >
              <div>Original {!activeTheme && '●'}</div>
            </button>
          </div>

          {/* Thèmes prédéfinis */}
          <div>
            <div className="text-gray-400 font-mono mb-1" style={{fontSize: '8px'}}>MILITANTS</div>
            <div className="grid grid-cols-2 gap-1">
              {themes.filter(theme => 
                theme.id.startsWith('anarchist-') || 
                theme.id.startsWith('cyberpunk') || 
                theme.id.startsWith('light-blue') ||
                theme.id.startsWith('forest-green') ||
                theme.id.startsWith('purple-feminist') ||
                theme.id.startsWith('golden-solidarity') ||
                theme.id.startsWith('ocean-blue') ||
                theme.id.startsWith('sunset-orange')
              ).map(theme => (
                <button
                  key={theme.id}
                  onClick={() => onApplyTheme(theme.id)}
                  className={`rounded border text-center transition truncate ${
                    theme.id === activeTheme 
                      ? 'border-red-500 bg-red-900/30 text-red-300' 
                      : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-red-500'
                  }`}
                  style={{fontSize: '7px', padding: '2px 3px', lineHeight: '1.1'}}
                  title={theme.name}
                >
                  {theme.name.split(' ')[0]} {theme.id === activeTheme && '●'}
                </button>
              ))}
            </div>
          </div>

          {/* Thèmes personnalisés */}
          {themes.filter(theme => 
            !theme.id.startsWith('anarchist-') && 
            !theme.id.startsWith('cyberpunk') && 
            !theme.id.startsWith('light-blue') &&
            !theme.id.startsWith('forest-green') &&
            !theme.id.startsWith('purple-feminist') &&
            !theme.id.startsWith('golden-solidarity') &&
            !theme.id.startsWith('ocean-blue') &&
            !theme.id.startsWith('sunset-orange')
          ).length > 0 && (
            <div>
              {themes.filter(theme => 
                !theme.id.startsWith('anarchist-') && 
                !theme.id.startsWith('cyberpunk') && 
                !theme.id.startsWith('light-blue') &&
                !theme.id.startsWith('forest-green') &&
                !theme.id.startsWith('purple-feminist') &&
                !theme.id.startsWith('golden-solidarity') &&
                !theme.id.startsWith('ocean-blue') &&
                !theme.id.startsWith('sunset-orange')
              ).map(theme => (
                <div key={theme.id} className={`flex items-center justify-between rounded border mb-1 ${
                  theme.id === activeTheme 
                    ? 'border-red-500 bg-red-900/30' 
                    : 'border-gray-600 bg-gray-800'
                }`} style={{padding: '2px 4px'}}>
                  <button
                    onClick={() => onApplyTheme(theme.id)}
                    className="flex-1 text-left truncate text-gray-300"
                    style={{fontSize: '7px', lineHeight: '1.1'}}
                  >
                    {theme.name} {theme.id === activeTheme && '●'}
                  </button>
                  <div className="flex gap-1">
                    <button
                      onClick={() => startEditing(theme)}
                      className="bg-gray-600 hover:bg-gray-500 text-white rounded-sm"
                      style={{fontSize: '6px', padding: '1px 2px'}}
                      title="Modifier"
                    >
                      ✏
                    </button>
                    <button
                      onClick={() => onDeleteTheme(theme.id)}
                      className="bg-red-600 hover:bg-red-500 text-white rounded-sm"
                      style={{fontSize: '6px', padding: '1px 2px'}}
                      title="Supprimer"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Bouton créer nouveau thème - micro */}
          {!showCreateForm && (
            <div className="flex justify-center">
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-gray-700 hover:bg-red-600 text-gray-300 hover:text-white border border-gray-500 hover:border-red-500 rounded transition-all duration-200"
                style={{ fontSize: '8px', lineHeight: '1', padding: '2px 4px', minHeight: '16px', minWidth: '32px' }}
                title="Créer un nouveau thème"
              >
                +
              </button>
            </div>
          )}

          {/* Formulaire ultra-compact */}
          {showCreateForm && (
            <div className="bg-gray-800 rounded border border-gray-600 p-1">
              <div className="space-y-1">
                <input
                  type="text"
                  value={newThemeName}
                  onChange={(e) => setNewThemeName(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-600 rounded text-white focus:border-red-500 focus:outline-none"
                  style={{fontSize: '8px', padding: '2px 4px'}}
                  placeholder="Nom"
                />
                
                <textarea
                  value={newThemeCSS}
                  onChange={(e) => setNewThemeCSS(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-600 rounded text-white font-mono focus:border-red-500 focus:outline-none resize-none"
                  style={{fontSize: '7px', padding: '2px 4px', height: '40px'}}
                  placeholder="CSS..."
                />
                
                <div className="flex gap-1">
                  <button
                    onClick={handleSaveTheme}
                    disabled={!newThemeName.trim() || !newThemeCSS.trim()}
                    className="flex-1 bg-red-600 hover:bg-red-500 disabled:bg-gray-600 text-white rounded"
                    style={{fontSize: '7px', padding: '2px 4px'}}
                  >
                    {editingTheme ? 'Mod' : 'OK'}
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="bg-gray-600 hover:bg-gray-500 text-white rounded"
                    style={{fontSize: '7px', padding: '2px 4px'}}
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          )}


        </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeCustomizer;