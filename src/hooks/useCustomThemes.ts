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
    name: '🏴 Rouge Anarchiste',
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
      .bg-red-700 { background: var(--accent) !important; }
      .text-red-400, .text-red-300 { color: #ff6666 !important; }
    `,
    isActive: false
  },
  {
    id: 'cyberpunk',
    name: '🌌 Révolution Sociale',
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
      .bg-red-700 { background: var(--accent) !important; }
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
    id: 'forest-green',
    name: '🌿 Vert Solidaire',
    css: `
      :root {
        --bg-primary: #0d2818;
        --bg-secondary: #1a4d2e;
        --text-primary: #90ee90;
        --accent: #228b22;
      }
      body { background: var(--bg-primary) !important; color: var(--text-primary) !important; }
      .bg-black, .bg-gray-900, .bg-white { background: var(--bg-secondary) !important; }
      .border-red-700 { border-color: var(--accent) !important; }
      .text-white, .text-black { color: var(--text-primary) !important; }
      .bg-gray-800 { background: var(--bg-secondary) !important; }
      .bg-red-700 { background: var(--accent) !important; }
      .text-red-400, .text-red-300 { color: #32cd32 !important; }
    `,
    isActive: false
  },
  {
    id: 'purple-feminist',
    name: '🔮 Mauve Mystique',
    css: `
      :root {
        --bg-primary: #2d1b3d;
        --bg-secondary: #4a2c5a;
        --text-primary: #dda0dd;
        --accent: #8b008b;
      }
      body { background: var(--bg-primary) !important; color: var(--text-primary) !important; }
      .bg-black, .bg-gray-900, .bg-white { background: var(--bg-secondary) !important; }
      .border-red-700 { border-color: var(--accent) !important; }
      .text-white, .text-black { color: var(--text-primary) !important; }
      .bg-gray-800 { background: var(--bg-secondary) !important; }
      .bg-red-700 { background: var(--accent) !important; }
      .text-red-400, .text-red-300 { color: #da70d6 !important; }
    `,
    isActive: false
  },
  {
    id: 'golden-solidarity',
    name: '🤝 Solidarité Dorée',
    css: `
      :root {
        --bg-primary: #2d2416;
        --bg-secondary: #4a3d1a;
        --text-primary: #ffd700;
        --accent: #ff8c00;
      }
      body { background: var(--bg-primary) !important; color: var(--text-primary) !important; }
      .bg-black, .bg-gray-900, .bg-white { background: var(--bg-secondary) !important; }
      .border-red-700 { border-color: var(--accent) !important; }
      .text-white, .text-black { color: var(--text-primary) !important; }
      .bg-gray-800 { background: var(--bg-secondary) !important; }
      .bg-red-700 { background: var(--accent) !important; }
      .text-red-400, .text-red-300 { color: #ffb347 !important; }
    `,
    isActive: false
  },
  {
    id: 'ocean-blue',
    name: '🌊 Bleu Océan',
    css: `
      :root {
        --bg-primary: #001122;
        --bg-secondary: #003366;
        --text-primary: #87ceeb;
        --accent: #4682b4;
      }
      body { background: var(--bg-primary) !important; color: var(--text-primary) !important; }
      .bg-black, .bg-gray-900, .bg-white { background: var(--bg-secondary) !important; }
      .border-red-700 { border-color: var(--accent) !important; }
      .text-white, .text-black { color: var(--text-primary) !important; }
      .bg-gray-800 { background: var(--bg-secondary) !important; }
      .bg-red-700 { background: var(--accent) !important; }
      .text-red-400, .text-red-300 { color: #add8e6 !important; }
    `,
    isActive: false
  },
  {
    id: 'sunset-orange',
    name: '🌅 Coucher de Soleil',
    css: `
      :root {
        --bg-primary: #2d1a0a;
        --bg-secondary: #4a2c14;
        --text-primary: #ffa500;
        --accent: #ff4500;
      }
      body { background: linear-gradient(135deg, var(--bg-primary), #3d2414) !important; color: var(--text-primary) !important; }
      .bg-black, .bg-gray-900, .bg-white { background: var(--bg-secondary) !important; }
      .border-red-700 { border-color: var(--accent) !important; }
      .text-white, .text-black { color: var(--text-primary) !important; }
      .bg-gray-800 { background: var(--bg-secondary) !important; }
      .bg-red-700 { background: var(--accent) !important; }
      .text-red-400, .text-red-300 { color: #ffb347 !important; }
    `,
    isActive: false
  }
];

export const useCustomThemes = () => {
  const [themes, setThemes] = useState<CustomTheme[]>(DEFAULT_THEMES);
  const [activeTheme, setActiveTheme] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Charger les thèmes depuis le localStorage au démarrage
  useEffect(() => {
    const loadThemes = () => {
      try {
        const saved = localStorage.getItem('liberchat-custom-themes');
        if (saved) {
          const parsed = JSON.parse(saved);

          // Fusionner les thèmes par défaut avec les thèmes sauvegardés
          const savedThemes = parsed.themes || [];
          const mergedThemes = [...DEFAULT_THEMES];

          // Ajouter les thèmes personnalisés qui ne sont pas des thèmes par défaut
          savedThemes.forEach((savedTheme: CustomTheme) => {
            if (!DEFAULT_THEMES.find(defaultTheme => defaultTheme.id === savedTheme.id)) {
              mergedThemes.push(savedTheme);
            }
          });

          setThemes(mergedThemes);
          setActiveTheme(parsed.activeTheme || null);
        }
      } catch (error) {
        console.warn('Erreur lors du chargement des thèmes:', error);
        setThemes(DEFAULT_THEMES);
        setActiveTheme(null);
      } finally {
        setIsLoaded(true);
      }
    };

    loadThemes();
  }, []);

  // Sauvegarder les thèmes dans le localStorage quand ils changent
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem('liberchat-custom-themes', JSON.stringify({
          themes,
          activeTheme,
          version: '1.0' // Pour les futures migrations
        }));
      } catch (error) {
        console.warn('Erreur lors de la sauvegarde des thèmes:', error);
      }
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
    setThemes(prev => prev.map(t => ({ ...t, isActive: t.id === themeId })));
  };

  // Restaurer le thème actif au chargement
  useEffect(() => {
    if (isLoaded && activeTheme) {
      applyTheme(activeTheme);
    }
  }, [isLoaded, activeTheme]);

  const addTheme = (theme: Omit<CustomTheme, 'id' | 'isActive'>) => {
    const newTheme: CustomTheme = {
      ...theme,
      id: `custom-${Date.now()}`,
      isActive: false
    };
    setThemes(prev => [...prev, newTheme]);
    return newTheme.id;
  };

  const updateTheme = (id: string, updates: Partial<CustomTheme>) => {
    setThemes(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const deleteTheme = (id: string) => {
    if (activeTheme === id) {
      applyTheme(null);
    }
    setThemes(prev => prev.filter(t => t.id !== id));
  };

  const resetToDefaults = () => {
    setThemes(DEFAULT_THEMES);
    setActiveTheme(null);
    applyTheme(null);
  };

  return {
    themes,
    activeTheme,
    applyTheme,
    addTheme,
    updateTheme,
    deleteTheme,
    resetToDefaults,
    isLoaded
  };
};