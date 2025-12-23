import React, { useState } from 'react';
import { CustomTheme } from '../hooks/useCustomThemes';
import { AccessibilitySettings } from './AccessibilitySettings';
import { useI18nContext } from '../contexts/I18nContext';
import {
  X, Pencil, Trash2, Upload, Download, RefreshCw, AlertTriangle,
  Palette, Moon, Flag, Zap, Sun, Leaf, Heart, Waves, Sunrise, Plus
} from 'lucide-react';

interface ThemeCustomizerProps {
  isOpen: boolean;
  onClose: () => void;
  themes: CustomTheme[];
  activeTheme: string | null;
  onApplyTheme: (themeId: string | null) => void;
  onAddTheme: (theme: Omit<CustomTheme, 'id' | 'isActive'>) => string;
  onUpdateTheme: (id: string, updates: Partial<CustomTheme>) => void;
  onDeleteTheme: (id: string) => void;
  accessibilitySettings?: AccessibilitySettings; // Paramètres d'accessibilité optionnels
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
  accessibilitySettings
}) => {
  const { t } = useI18nContext();
  const [editingTheme, setEditingTheme] = useState<CustomTheme | null>(null);
  const [newThemeName, setNewThemeName] = useState('');
  const [newThemeCSS, setNewThemeCSS] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  const exportThemes = () => {
    const dataStr = JSON.stringify({ themes, activeTheme }, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `liberchat-themes-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importThemes = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        if (imported.themes && Array.isArray(imported.themes)) {
          const existingIds = themes.map(t => t.id);
          const newThemes = imported.themes.filter((t: CustomTheme) => !existingIds.includes(t.id));
          newThemes.forEach((theme: CustomTheme) => {
            onAddTheme({ name: theme.name, css: theme.css });
          });
        }
      } catch (error) { }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

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
  };

  const startEditing = (theme: CustomTheme) => {
    setEditingTheme(theme);
    setNewThemeName(theme.name);
    setNewThemeCSS(theme.css);
  };

  const isMobile = window.innerWidth < 640 || accessibilitySettings?.fontSize === 'large' || accessibilitySettings?.fontSize === 'xlarge';

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-2">
      <div className={`bg-gray-900 border border-red-700 rounded p-3 w-full max-h-[80vh] overflow-y-auto ${isMobile ? 'max-w-xs' : 'max-w-md'
        }`}>
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-red-700/50">
          <div className="flex items-center gap-2">
            <Palette size={18} className="text-red-500" />
            <h2 className="text-sm font-bold text-red-400 uppercase tracking-widest">{t.themes.title}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Thèmes */}
        <div className="space-y-1 mb-3">
          <button
            onClick={() => onApplyTheme(null)}
            className={`w-full p-2.5 rounded-lg text-xs text-left flex items-center gap-3 transition-all ${!activeTheme ? 'bg-red-700 text-white shadow-lg shadow-red-900/20' : 'bg-gray-800/50 text-gray-300 hover:bg-gray-800'
              }`}
          >
            <Moon size={14} className={!activeTheme ? 'text-white' : 'text-blue-400'} />
            {t.themes.dark}
          </button>

          <button
            onClick={() => onApplyTheme('anarchist-red')}
            className={`w-full p-2.5 rounded-lg text-xs text-left flex items-center gap-3 transition-all ${activeTheme === 'anarchist-red' ? 'bg-red-700 text-white shadow-lg shadow-red-900/20' : 'bg-gray-800/50 text-gray-300 hover:bg-gray-800'
              }`}
          >
            <Flag size={14} className={activeTheme === 'anarchist-red' ? 'text-white' : 'text-red-500'} />
            {t.themes.anarchistRed}
          </button>

          <button
            onClick={() => onApplyTheme('cyberpunk')}
            className={`w-full p-2.5 rounded-lg text-xs text-left flex items-center gap-3 transition-all ${activeTheme === 'cyberpunk' ? 'bg-red-700 text-white shadow-lg shadow-red-900/20' : 'bg-gray-800/50 text-gray-300 hover:bg-gray-800'
              }`}
          >
            <Zap size={14} className={activeTheme === 'cyberpunk' ? 'text-white' : 'text-purple-400'} />
            {t.themes.equalitySolidarity}
          </button>

          <button
            onClick={() => onApplyTheme('light-blue')}
            className={`w-full p-2.5 rounded-lg text-xs text-left flex items-center gap-3 transition-all ${activeTheme === 'light-blue' ? 'bg-red-700 text-white shadow-lg shadow-red-900/20' : 'bg-gray-800/50 text-gray-300 hover:bg-gray-800'
              }`}
          >
            <Sun size={14} className={activeTheme === 'light-blue' ? 'text-white' : 'text-yellow-400'} />
            {t.themes.lightBlue}
          </button>

          <button
            onClick={() => onApplyTheme('green-solidarity')}
            className={`w-full p-2.5 rounded-lg text-xs text-left flex items-center gap-3 transition-all ${activeTheme === 'green-solidarity' ? 'bg-red-700 text-white shadow-lg shadow-red-900/20' : 'bg-gray-800/50 text-gray-300 hover:bg-gray-800'
              }`}
          >
            <Leaf size={14} className={activeTheme === 'green-solidarity' ? 'text-white' : 'text-green-400'} />
            {t.themes.greenSolidarity}
          </button>

          <button
            onClick={() => onApplyTheme('purple-mystic')}
            className={`w-full p-2.5 rounded-lg text-xs text-left flex items-center gap-3 transition-all ${activeTheme === 'purple-mystic' ? 'bg-red-700 text-white shadow-lg shadow-red-900/20' : 'bg-gray-800/50 text-gray-300 hover:bg-gray-800'
              }`}
          >
            <Heart size={14} className={activeTheme === 'purple-mystic' ? 'text-white' : 'text-pink-400'} />
            {t.themes.feministAnarchism}
          </button>

          <button
            onClick={() => onApplyTheme('warm-solidarity')}
            className={`w-full p-2.5 rounded-lg text-xs text-left flex items-center gap-3 transition-all ${activeTheme === 'warm-solidarity' ? 'bg-red-700 text-white shadow-lg shadow-red-900/20' : 'bg-gray-800/50 text-gray-300 hover:bg-gray-800'
              }`}
          >
            <RefreshCw size={14} className={activeTheme === 'warm-solidarity' ? 'text-white' : 'text-orange-400'} />
            {t.themes.solidarity}
          </button>

          <button
            onClick={() => onApplyTheme('ocean-blue')}
            className={`w-full p-2.5 rounded-lg text-xs text-left flex items-center gap-3 transition-all ${activeTheme === 'ocean-blue' ? 'bg-red-700 text-white shadow-lg shadow-red-900/20' : 'bg-gray-800/50 text-gray-300 hover:bg-gray-800'
              }`}
          >
            <Waves size={14} className={activeTheme === 'ocean-blue' ? 'text-white' : 'text-blue-300'} />
            {t.themes.oceanBlue}
          </button>

          <button
            onClick={() => onApplyTheme('sunset-orange')}
            className={`w-full p-2.5 rounded-lg text-xs text-left flex items-center gap-3 transition-all ${activeTheme === 'sunset-orange' ? 'bg-red-700 text-white shadow-lg shadow-red-900/20' : 'bg-gray-800/50 text-gray-300 hover:bg-gray-800'
              }`}
          >
            <Sunrise size={14} className={activeTheme === 'sunset-orange' ? 'text-white' : 'text-orange-500'} />
            {t.themes.sunset}
          </button>

          {!isMobile && themes.filter(t => !['anarchist-red', 'cyberpunk', 'light-blue', 'green-solidarity', 'purple-mystic', 'warm-solidarity', 'ocean-blue', 'sunset-orange'].includes(t.id)).map(theme => (
            <div key={theme.id} className={`p-2 rounded text-xs ${theme.id === activeTheme ? 'bg-red-700/20 border border-red-700' : 'bg-gray-800'
              }`}>
              <div className="flex justify-between items-center">
                <button
                  onClick={() => onApplyTheme(theme.id)}
                  className="flex-1 text-left text-white"
                >
                  {theme.name}
                </button>
                <div className="flex gap-1">
                  <button
                    onClick={() => startEditing(theme)}
                    className="p-1 text-blue-400 hover:bg-blue-900/30 rounded transition-colors"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={() => onDeleteTheme(theme.id)}
                    className="p-1 text-red-400 hover:bg-red-900/30 rounded transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-1 mb-3">
          {!isMobile && (
            <div className="flex gap-2">
              <button onClick={exportThemes} className="bg-gray-800/80 hover:bg-red-700 text-white p-2 rounded-lg border border-gray-700 flex items-center justify-center transition-all" title="Exporter les thèmes">
                <Upload size={16} />
              </button>
              <label className="bg-gray-800/80 hover:bg-red-700 text-white p-2 rounded-lg border border-gray-700 cursor-pointer flex items-center justify-center transition-all" title="Importer des thèmes">
                <Download size={16} />
                <input type="file" accept=".json" onChange={importThemes} className="hidden" />
              </label>
            </div>
          )}
          <button
            onClick={() => {
              if (confirmReset) {
                localStorage.removeItem('liberchat-custom-themes');
                localStorage.removeItem('liberchat-active-theme');
                onApplyTheme(null);
                setTimeout(() => window.location.reload(), 100);
              } else {
                setConfirmReset(true);
                setTimeout(() => setConfirmReset(false), 3000);
              }
            }}
            className={`text-white rounded-lg flex items-center justify-center transition-all border-2 ${confirmReset
                ? 'bg-red-700 border-red-500 animate-pulse'
                : 'bg-gray-800/80 border-gray-700 hover:bg-red-700 hover:border-white'
              } ${isMobile ? 'p-2' : 'p-2 w-10 h-10'
              }`}
            title={confirmReset ? t.messages.clickToConfirm : t.messages.resetAllThemes}
          >
            {confirmReset ? <AlertTriangle size={18} /> : <RefreshCw size={18} />}
          </button>
        </div>

        {!isMobile && (
          <div className="border-t border-gray-700 pt-3 space-y-2">
            <input
              type="text"
              value={newThemeName}
              onChange={(e) => setNewThemeName(e.target.value)}
              className="w-full p-1 bg-gray-800 border border-gray-600 rounded text-white text-xs"
              placeholder={t.themes.createCustom}
            />

            <textarea
              value={newThemeCSS}
              onChange={(e) => setNewThemeCSS(e.target.value)}
              className="w-full h-12 p-1 bg-gray-800 border border-gray-600 rounded text-white font-mono text-xs"
              placeholder="body { background: #000 !important; }"
            />

            <div className="flex gap-2">
              <button
                onClick={handleSaveTheme}
                disabled={!newThemeName.trim() || !newThemeCSS.trim()}
                className="flex-1 bg-red-700 hover:bg-red-600 disabled:bg-gray-800 disabled:text-gray-500 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all border-2 border-transparent hover:border-white"
              >
                {editingTheme ? <Pencil size={14} /> : <Plus size={14} />}
                {editingTheme ? t.chat.edit : t.themes.createCustom}
              </button>

              {editingTheme && (
                <button
                  onClick={() => {
                    setEditingTheme(null);
                    setNewThemeName('');
                    setNewThemeCSS('');
                  }}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-xs transition-all"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ThemeCustomizer;
