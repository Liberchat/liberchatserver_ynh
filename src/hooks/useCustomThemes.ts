import { useState, useEffect } from 'react';

export interface CustomTheme {
  id: string;
  name: string;
  css: string;
  isActive: boolean;
}

const DEFAULT_THEMES: CustomTheme[] = [
  {
    id: 'anarchist-red',
    name: '🚩🏴 Anarchisme',
    css: `
      :root {
        --bg-primary: #1a0000;
        --bg-secondary: #330000;
        --text-primary: #ff4444;
        --accent: #cc0000;
      }
      body { background: var(--bg-primary) !important; color: var(--text-primary) !important; }
      .bg-black, .bg-gray-900, .bg-white { background: var(--bg-secondary) !important; }
      .border-red-700 { border-color: var(--accent) !important; }
      .text-white, .text-black { color: var(--text-primary) !important; }
      .bg-gray-800 { background: var(--bg-secondary) !important; }
    `,
    isActive: false
  },
  {
    id: 'cyberpunk',
    name: '🌆 Cyberpunk',
    css: `
      :root {
        --bg-primary: #0a0a0a;
        --bg-secondary: #1a1a2e;
        --text-primary: #00ff41;
        --accent: #ff0080;
      }
      body { background: linear-gradient(45deg, var(--bg-primary), var(--bg-secondary)) !important; color: var(--text-primary) !important; }
      .bg-black, .bg-gray-900, .bg-white { background: var(--bg-secondary) !important; }
      .border-red-700 { border-color: var(--accent) !important; }
      .text-red-400, .text-red-300 { color: var(--accent) !important; }
      .text-white, .text-black { color: var(--text-primary) !important; }
      .bg-gray-800 { background: var(--bg-secondary) !important; }
    `,
    isActive: false
  },
  {
    id: 'light-blue',
    name: '☀️ Bleu Clair',
    css: `
      :root {
        --bg-primary: #e3f2fd;
        --bg-secondary: #bbdefb;
        --text-primary: #0d47a1;
        --accent: #1976d2;
      }
      body { background: var(--bg-primary) !important; color: var(--text-primary) !important; }
      .bg-black, .bg-gray-900, .bg-white, .bg-gray-800 { background: var(--bg-secondary) !important; }
      .border-red-700 { border-color: var(--accent) !important; }
      .text-white, .text-black, .text-red-400, .text-red-300 { color: var(--text-primary) !important; }
      .bg-red-700 { background: var(--accent) !important; }
    `,
    isActive: false
  },
  {
    id: 'green-solidarity',
    name: '🌿 Vert Solidaire',
    css: `
      :root {
        --bg-primary: #1b5e20;
        --bg-secondary: #2e7d32;
        --text-primary: #a5d6a7;
        --accent: #4caf50;
      }
      body { background: var(--bg-primary) !important; color: var(--text-primary) !important; }
      .bg-black, .bg-gray-900, .bg-white, .bg-gray-800 { background: var(--bg-secondary) !important; }
      .border-red-700 { border-color: var(--accent) !important; }
      .text-white, .text-black, .text-red-400, .text-red-300 { color: var(--text-primary) !important; }
      .bg-red-700 { background: var(--accent) !important; }
    `,
    isActive: false
  },
  {
    id: 'purple-mystic',
    name: '🔮 Mauve Mystique',
    css: `
      :root {
        --bg-primary: #4a148c;
        --bg-secondary: #6a1b9a;
        --text-primary: #ce93d8;
        --accent: #9c27b0;
      }
      body { background: var(--bg-primary) !important; color: var(--text-primary) !important; }
      .bg-black, .bg-gray-900, .bg-white, .bg-gray-800 { background: var(--bg-secondary) !important; }
      .border-red-700 { border-color: var(--accent) !important; }
      .text-white, .text-black, .text-red-400, .text-red-300 { color: var(--text-primary) !important; }
      .bg-red-700 { background: var(--accent) !important; }
    `,
    isActive: false
  },
  {
    id: 'warm-solidarity',
    name: '🤝 Solidarité',
    css: `
      :root {
        --bg-primary: #bf360c;
        --bg-secondary: #d84315;
        --text-primary: #ffab91;
        --accent: #ff5722;
      }
      body { background: var(--bg-primary) !important; color: var(--text-primary) !important; }
      .bg-black, .bg-gray-900, .bg-white, .bg-gray-800 { background: var(--bg-secondary) !important; }
      .border-red-700 { border-color: var(--accent) !important; }
      .text-white, .text-black, .text-red-400, .text-red-300 { color: var(--text-primary) !important; }
      .bg-red-700 { background: var(--accent) !important; }
    `,
    isActive: false
  },
  {
    id: 'ocean-blue',
    name: '🌊 Bleu Océan',
    css: `
      :root {
        --bg-primary: #0d47a1;
        --bg-secondary: #1565c0;
        --text-primary: #90caf9;
        --accent: #2196f3;
      }
      body { background: var(--bg-primary) !important; color: var(--text-primary) !important; }
      .bg-black, .bg-gray-900, .bg-white, .bg-gray-800 { background: var(--bg-secondary) !important; }
      .border-red-700 { border-color: var(--accent) !important; }
      .text-white, .text-black, .text-red-400, .text-red-300 { color: var(--text-primary) !important; }
      .bg-red-700 { background: var(--accent) !important; }
    `,
    isActive: false
  },
  {
    id: 'sunset-orange',
    name: '🌅 Coucher de Soleil',
    css: `
      :root {
        --bg-primary: #e65100;
        --bg-secondary: #f57c00;
        --text-primary: #ffcc02;
        --accent: #ff9800;
      }
      body { background: var(--bg-primary) !important; color: var(--text-primary) !important; }
      .bg-black, .bg-gray-900, .bg-white, .bg-gray-800 { background: var(--bg-secondary) !important; }
      .border-red-700 { border-color: var(--accent) !important; }
      .text-white, .text-black, .text-red-400, .text-red-300 { color: var(--text-primary) !important; }
      .bg-red-700 { background: var(--accent) !important; }
    `,
    isActive: false
  }
];

export const useCustomThemes = () => {
  const [themes, setThemes] = useState<CustomTheme[]>(DEFAULT_THEMES);
  const [activeTheme, setActiveTheme] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Chargement initial depuis localStorage
  useEffect(() => {
    const saved = localStorage.getItem('liberchat-custom-themes');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setThemes(parsed.themes || DEFAULT_THEMES);
        setActiveTheme(parsed.activeTheme || null);
        
        // Réappliquer le thème actif au chargement
        if (parsed.activeTheme) {
          const theme = (parsed.themes || DEFAULT_THEMES).find((t: CustomTheme) => t.id === parsed.activeTheme);
          if (theme) {
            const existingStyle = document.getElementById('custom-theme-style');
            if (existingStyle) existingStyle.remove();
            
            const style = document.createElement('style');
            style.id = 'custom-theme-style';
            style.textContent = theme.css;
            document.head.appendChild(style);
          }
        }
      } catch (e) {
        console.warn('Erreur lors du chargement des thèmes:', e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Sauvegarde automatique dans localStorage
  useEffect(() => {
    if (!isLoaded) return; // Évite la sauvegarde lors du chargement initial
    
    try {
      localStorage.setItem('liberchat-custom-themes', JSON.stringify({
        themes,
        activeTheme,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.error('Erreur lors de la sauvegarde des thèmes:', e);
    }
  }, [themes, activeTheme, isLoaded]);

  const applyTheme = (themeId: string | null) => {
    // Supprimer l'ancien thème
    const existingStyle = document.getElementById('custom-theme-style');
    if (existingStyle) {
      existingStyle.remove();
    }

    if (themeId) {
      const theme = themes.find(t => t.id === themeId);
      if (theme) {
        const style = document.createElement('style');
        style.id = 'custom-theme-style';
        style.textContent = theme.css;
        document.head.appendChild(style);
      }
    }

    setActiveTheme(themeId);
    setThemes(prev => {
      const updated = prev.map(t => ({ ...t, isActive: t.id === themeId }));
      // Sauvegarde immédiate du thème actif
      try {
        localStorage.setItem('liberchat-custom-themes', JSON.stringify({
          themes: updated,
          activeTheme: themeId,
          timestamp: Date.now()
        }));
      } catch (e) {
        console.error('Erreur lors de la sauvegarde du thème actif:', e);
      }
      return updated;
    });
  };

  const addTheme = (theme: Omit<CustomTheme, 'id' | 'isActive'>) => {
    const newTheme: CustomTheme = {
      ...theme,
      id: `custom-${Date.now()}`,
      isActive: false
    };
    setThemes(prev => {
      const updated = [...prev, newTheme];
      // Sauvegarde immédiate
      try {
        localStorage.setItem('liberchat-custom-themes', JSON.stringify({
          themes: updated,
          activeTheme,
          timestamp: Date.now()
        }));
      } catch (e) {
        console.error('Erreur lors de la sauvegarde du nouveau thème:', e);
      }
      return updated;
    });
    return newTheme.id;
  };

  const updateTheme = (id: string, updates: Partial<CustomTheme>) => {
    setThemes(prev => {
      const updated = prev.map(t => t.id === id ? { ...t, ...updates } : t);
      // Sauvegarde immédiate
      try {
        localStorage.setItem('liberchat-custom-themes', JSON.stringify({
          themes: updated,
          activeTheme,
          timestamp: Date.now()
        }));
      } catch (e) {
        console.error('Erreur lors de la sauvegarde de la modification du thème:', e);
      }
      return updated;
    });
  };

  const deleteTheme = (id: string) => {
    if (activeTheme === id) {
      applyTheme(null);
    }
    setThemes(prev => prev.filter(t => t.id !== id));
  };

  return {
    themes,
    activeTheme,
    applyTheme,
    addTheme,
    updateTheme,
    deleteTheme
  };
};