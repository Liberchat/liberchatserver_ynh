import React, { useState, useEffect } from 'react';
import { User, Zap, RefreshCw, Eye } from 'lucide-react';
import icon from '../../icon.png';

interface WelcomeScreenProps {
  onJoin: (username: string) => void;
  showLogout?: boolean;
  onLogout?: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onJoin, showLogout, onLogout }) => {
  const [username, setUsername] = useState('');
  const [savedUsername, setSavedUsername] = useState('');
  const [showQuickOptions, setShowQuickOptions] = useState(false);

  // Charger le nom sauvegardé au démarrage
  useEffect(() => {
    const saved = localStorage.getItem('liberchat_username');
    if (saved) {
      setSavedUsername(saved);
      setShowQuickOptions(true);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      // Sauvegarder le nom pour la prochaine fois
      localStorage.setItem('liberchat_username', username.trim());
      onJoin(username.trim());
    }
  };

  const handleQuickJoin = (name: string) => {
    localStorage.setItem('liberchat_username', name);
    onJoin(name);
  };

  const generateRandomName = () => {
    const adjectives = ['Rouge', 'Libre', 'Rebel', 'Fier', 'Brave', 'Solidaire', 'Révolu', 'Militant', 'Camarade', 'Anarcho'];
    const nouns = ['Loup', 'Aigle', 'Lion', 'Phénix', 'Tigre', 'Ours', 'Faucon', 'Panthère', 'Corbeau', 'Renard'];
    const numbers = Math.floor(Math.random() * 999) + 1;
    
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    
    return `${adj}${noun}${numbers}`;
  };

  const handleRandomName = () => {
    const randomName = generateRandomName();
    setUsername(randomName);
  };

  const handleAnonymousJoin = () => {
    const anonymousName = `Anonyme${Math.floor(Math.random() * 9999) + 1}`;
    handleQuickJoin(anonymousName);
  };

  return (
    <div 
      className="fixed inset-0 bg-gradient-to-br from-black via-red-900 to-black flex items-center justify-center p-2 sm:p-4"
      role="main"
      aria-label="Écran d'accueil LiberChat"
    >
      <div 
        className="w-full max-w-md bg-black/90 rounded-xl shadow-2xl p-4 sm:p-8 border-4 border-red-700 relative flex flex-col items-center"
        role="dialog"
        aria-labelledby="welcome-title"
        aria-describedby="welcome-description"
      >
        <div className="flex flex-col items-center mb-6 sm:mb-8">
          <img src={icon} alt="Logo LiberChat" className="w-20 h-20 sm:w-24 sm:h-24 mb-3 sm:mb-4 drop-shadow-lg border-4 border-white rounded-full bg-black" />
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white mb-2 tracking-widest uppercase text-center" style={{ fontFamily: 'Impact, sans-serif', letterSpacing: '0.15em' }}>
            LiberChat
          </h1>
          <p className="text-red-400 text-center text-base sm:text-lg font-semibold mb-1 uppercase tracking-wider">
            Ni dieu, ni maître, ni patron, ni État
          </p>
          <p className="text-gray-300 text-center text-xs sm:text-sm italic">
            La communication libre, par et pour le peuple
          </p>
        </div>
        {/* Options de connexion rapide */}
        {showQuickOptions && savedUsername && (
          <div className="w-full mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg">
            <p className="text-red-200 text-sm mb-2 text-center">Connexion rapide :</p>
            <button
              onClick={() => handleQuickJoin(savedUsername)}
              className="w-full py-2 bg-red-700 hover:bg-red-600 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4" />
              Continuer en tant que {savedUsername}
            </button>
          </div>
        )}

        {/* Boutons de connexion rapide */}
        <div className="w-full mb-4 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleAnonymousJoin}
              className="py-2 px-3 bg-black hover:bg-red-900 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-1 text-sm border border-red-800 hover:border-red-600"
              title="Rejoindre anonymement"
            >
              <Eye className="w-4 h-4" />
              Anonyme
            </button>
            <button
              onClick={handleRandomName}
              className="py-2 px-3 bg-red-800 hover:bg-red-700 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-1 text-sm border border-red-600 hover:border-red-500"
              title="Générer un nom aléatoire"
            >
              <RefreshCw className="w-4 h-4" />
              Aléatoire
            </button>
          </div>
        </div>

        <form 
          onSubmit={handleSubmit} 
          className="space-y-3 sm:space-y-4 w-full"
          role="form"
          aria-label="Formulaire de connexion au chat"
        >
          <div>
            <label 
              htmlFor="username" 
              className="block text-xs sm:text-sm font-bold text-red-200 mb-2 uppercase tracking-wider"
            >
              Nom de camarade
            </label>
            <div className="relative">
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 sm:px-4 sm:py-2 bg-black border-2 border-red-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 text-white placeholder-gray-400 text-base sm:text-lg font-mono pr-12"
                placeholder="Nom révolutionnaire"
                maxLength={24}
                autoFocus={!showQuickOptions}
                aria-describedby="username-help"
                aria-invalid={username.length > 0 && username.length < 3 ? 'true' : 'false'}
              />
              <User className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-red-400" />
            </div>
            <div className="flex justify-between items-center mt-1">
              <div 
                id="username-help" 
                className="text-xs text-gray-400"
              >
                {username.length > 0 && username.length < 3 
                  ? `${3 - username.length} caractère(s) minimum`
                  : username.length > 0 
                    ? `${username.length}/24 caractères`
                    : '3-24 caractères'
                }
              </div>
              {savedUsername && (
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem('liberchat_username');
                    setSavedUsername('');
                    setShowQuickOptions(false);
                  }}
                  className="text-xs text-red-400 hover:text-red-300 underline"
                >
                  Oublier
                </button>
              )}
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-2 bg-gradient-to-r from-red-700 to-black text-white font-bold rounded-lg shadow-lg hover:from-black hover:to-red-700 transition-all text-base sm:text-lg uppercase tracking-widest border-2 border-white focus:ring-2 focus:ring-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={username.length < 3}
            aria-describedby="join-button-help"
          >
            Rejoindre la Commune !
          </button>
          <div 
            id="join-button-help" 
            className="sr-only"
          >
            Cliquez pour rejoindre le chat avec le nom d'utilisateur saisi
          </div>
        </form>
      </div>
      <div className="pointer-events-none select-none fixed bottom-2 left-0 w-full flex justify-center z-50">
        <span className="text-xs sm:text-xs text-gray-400 italic text-center block bg-black/70 px-2 sm:px-3 py-1 rounded-full">
          © 2025 – Vive l’entraide, vive la solidarité !
        </span>
      </div>
    </div>
  );
};