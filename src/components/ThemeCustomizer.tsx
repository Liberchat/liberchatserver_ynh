import React, { useState } from 'react';
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
    <div className="fixed inset-0 bg-black/80 flex items-start sm:items-center justify-center z-50 p-2">
      <div className="adaptive-modal bg-gray-900 border-2 border-red-700 rounded-lg w-full overflow-hidden flex flex-col" style={{ maxWidth: '48rem' }}>
        
        {/* Header compact */}
        <div className="modal-header flex justify-between items-center border-b border-red-700/30 bg-black">
          <h2 className="adaptive-text-lg font-bold text-red-400">🎨 Thèmes</h2>
          <div className="flex gap-2">
            {onResetToDefaults && (
              <button
                onClick={() => {
                  if (confirm('Réinitialiser tous les thèmes ?')) {
                    onResetToDefaults();
                  }
                }}
                className="adaptive-button bg-yellow-600 hover:bg-yellow-500 text-white rounded font-bold"
                title="Reset"
              >
                🔄
              </button>
            )}
            <button
              onClick={onClose}
              className="adaptive-button bg-red-600 hover:bg-red-500 text-white rounded font-bold"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Contenu principal avec scroll */}
        <div className="modal-content flex-1 overflow-y-auto space-y-4">
          
          {/* Thème par défaut */}
          <div className="modal-section">
            <h3 className="adaptive-text font-bold mb-2 text-white">THÈME PAR DÉFAUT</h3>
            <button
              onClick={() => onApplyTheme(null)}
              className={`adaptive-button w-full rounded-lg border text-left transition ${
                !activeTheme 
                  ? 'border-red-500 bg-red-700/20 text-red-400' 
                  : 'border-gray-600 bg-gray-800 text-white hover:border-red-500'
              }`}
            >
              <div className="flex justify-between items-center">
                <div className="min-w-0 flex-1">
                  <div className="adaptive-text font-bold truncate">🌙 LiberChat Original</div>
                  <div className="adaptive-text-sm text-gray-400 hidden sm:block">Mode light/dark automatique</div>
                </div>
                {!activeTheme && (
                  <span className="bg-red-500 text-white px-2 py-1 rounded adaptive-text-sm font-bold ml-2">
                    ACTIF
                  </span>
                )}
              </div>
            </button>
          </div>

          {/* Thèmes prédéfinis */}
          <div className="modal-section">
            <h3 className="adaptive-text font-bold mb-2 text-white">THÈMES MILITANTS</h3>
            <div className="adaptive-grid adaptive-grid-1 sm:adaptive-grid-2">
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
                  className={`adaptive-button rounded-lg border text-left transition ${
                    theme.id === activeTheme 
                      ? 'border-red-500 bg-red-700/20 text-red-400' 
                      : 'border-gray-600 bg-gray-800 text-white hover:border-red-500'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex-1 min-w-0">
                      <div className="adaptive-text font-bold truncate">{theme.name}</div>
                      <div className="adaptive-text-sm text-gray-400 hidden sm:block">Prédéfini</div>
                    </div>
                    {theme.id === activeTheme && (
                      <span className="bg-red-500 text-white px-2 py-1 rounded adaptive-text-sm font-bold ml-2">
                        ACTIF
                      </span>
                    )}
                  </div>
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
            <div className="modal-section">
              <h3 className="adaptive-text font-bold mb-2 text-white">VOS CRÉATIONS</h3>
              <div className="space-y-2">
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
                  <div key={theme.id} className={`modal-input rounded-lg border ${
                    theme.id === activeTheme 
                      ? 'border-red-500 bg-red-700/20' 
                      : 'border-gray-600 bg-gray-800'
                  }`}>
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => onApplyTheme(theme.id)}
                        className="flex-1 text-left min-w-0"
                      >
                        <div className="adaptive-text font-bold text-white truncate">{theme.name}</div>
                        <div className="adaptive-text-sm text-gray-400 truncate">
                          {theme.css.length > 50 ? `${theme.css.substring(0, 50)}...` : theme.css}
                        </div>
                      </button>
                      <div className="flex items-center gap-1 ml-2">
                        {theme.id === activeTheme && (
                          <span className="bg-red-500 text-white px-2 py-1 rounded adaptive-text-sm font-bold">
                            ACTIF
                          </span>
                        )}
                        <button
                          onClick={() => startEditing(theme)}
                          className="adaptive-button bg-gray-600 hover:bg-gray-500 text-white rounded"
                          title="Modifier"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => onDeleteTheme(theme.id)}
                          className="adaptive-button bg-red-600 hover:bg-red-500 text-white rounded"
                          title="Supprimer"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bouton créer nouveau thème */}
          {!showCreateForm && (
            <div className="modal-section">
              <button
                onClick={() => setShowCreateForm(true)}
                className="adaptive-button w-full border border-dashed border-gray-600 rounded-lg text-gray-400 hover:border-red-500 hover:text-white transition"
              >
                ➕ Créer un nouveau thème
              </button>
            </div>
          )}

          {/* Formulaire de création/modification */}
          {showCreateForm && (
            <div className="modal-section bg-gray-800 rounded-lg border border-gray-600">
              <h4 className="adaptive-text font-bold mb-3 text-white">
                {editingTheme ? '✏️ Modifier' : '➕ Créer'} un thème
              </h4>
              
              <div className="space-y-3">
                <div>
                  <label className="block adaptive-text-sm font-bold mb-1 text-white">Nom</label>
                  <input
                    type="text"
                    value={newThemeName}
                    onChange={(e) => setNewThemeName(e.target.value)}
                    className="adaptive-input w-full bg-gray-900 border border-gray-600 rounded text-white focus:border-red-500 focus:outline-none"
                    placeholder="Mon thème personnalisé"
                  />
                </div>
                
                <div>
                  <label className="block adaptive-text-sm font-bold mb-1 text-white">CSS</label>
                  <textarea
                    value={newThemeCSS}
                    onChange={(e) => setNewThemeCSS(e.target.value)}
                    className="adaptive-input w-full h-32 bg-gray-900 border border-gray-600 rounded text-white font-mono focus:border-red-500 focus:outline-none resize-none"
                    style={{ fontSize: 'calc(var(--current-font-size) * 0.875)' }}
                    placeholder=":root { --bg-primary: #1a0000; }
body { background: var(--bg-primary) !important; }
.text-white { color: #ff4444 !important; }"
                  />
                </div>
                
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleSaveTheme}
                    disabled={!newThemeName.trim() || !newThemeCSS.trim()}
                    className="adaptive-button flex-1 bg-red-600 hover:bg-red-500 disabled:bg-gray-600 text-white rounded font-bold transition"
                  >
                    {editingTheme ? 'Modifier' : 'Créer'}
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="adaptive-button bg-gray-600 hover:bg-gray-500 text-white rounded font-bold transition"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Aide rapide - masquée sur très petits écrans */}
          <div className="modal-section bg-gray-800 border border-gray-600 rounded-lg hidden sm:block">
            <h4 className="adaptive-text font-bold mb-2 text-gray-300">💡 Aide CSS</h4>
            <div className="adaptive-text-sm text-gray-300 space-y-1">
              <p><code className="bg-gray-700 px-1 rounded adaptive-text-sm">body</code> - Arrière-plan</p>
              <p><code className="bg-gray-700 px-1 rounded adaptive-text-sm">.text-white</code> - Texte</p>
              <p><code className="bg-gray-700 px-1 rounded adaptive-text-sm">.bg-gray-900</code> - Zones</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeCustomizer;