import { useState, useEffect } from 'react';
import { Settings, Zap, User, Eye, RefreshCw, X, Shield, Activity } from 'lucide-react';
import { CryptoDiagnostics } from './CryptoDiagnostics';
import { KeyBackupManager } from './KeyBackupManager';
import { SecurityReportGenerator } from './SecurityReportGenerator';

interface ConnectionSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  currentUsername?: string;
}

export function ConnectionSettings({ isOpen, onClose, currentUsername }: ConnectionSettingsProps) {
  const [autoConnect, setAutoConnect] = useState(false);
  const [savedUsername, setSavedUsername] = useState('');
  const [rememberUsername, setRememberUsername] = useState(false);
  const [activeTab, setActiveTab] = useState<'connection' | 'security'>('connection');

  useEffect(() => {
    if (isOpen) {
      // Charger les paramètres sauvegardés
      const autoConnectSetting = localStorage.getItem('liberchat_auto_connect') === 'true';
      const saved = localStorage.getItem('liberchat_username') || '';
      const remember = localStorage.getItem('liberchat_remember_username') === 'true';
      
      setAutoConnect(autoConnectSetting);
      setSavedUsername(saved);
      setRememberUsername(remember);
    }
  }, [isOpen]);

  const handleSaveSettings = () => {
    // Sauvegarder les paramètres
    localStorage.setItem('liberchat_auto_connect', autoConnect.toString());
    localStorage.setItem('liberchat_remember_username', rememberUsername.toString());
    
    if (rememberUsername && currentUsername) {
      localStorage.setItem('liberchat_username', currentUsername);
    } else if (!rememberUsername) {
      localStorage.removeItem('liberchat_username');
    }
    
    onClose();
  };

  const handleClearData = () => {
    localStorage.removeItem('liberchat_username');
    localStorage.removeItem('liberchat_auto_connect');
    localStorage.removeItem('liberchat_remember_username');
    
    setSavedUsername('');
    setAutoConnect(false);
    setRememberUsername(false);
  };

  const generateRandomName = () => {
    const adjectives = ['Rouge', 'Libre', 'Rebel', 'Fier', 'Brave', 'Solidaire', 'Révolu', 'Militant', 'Camarade', 'Anarcho'];
    const nouns = ['Loup', 'Aigle', 'Lion', 'Phénix', 'Tigre', 'Ours', 'Faucon', 'Panthère', 'Corbeau', 'Renard'];
    const numbers = Math.floor(Math.random() * 999) + 1;
    
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    
    return `${adj}${noun}${numbers}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-black/95 border-4 border-red-700 rounded-xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col">
        <div className="flex items-center justify-between mb-6 p-6 pb-0">
          <h2 className="text-xl font-bold flex items-center gap-2 text-white uppercase tracking-wider" style={{ fontFamily: 'Impact, sans-serif' }}>
            <Settings className="w-6 h-6 text-red-500" />
            Paramètres de la Commune
          </h2>
          <button
            onClick={onClose}
            className="text-red-400 hover:text-red-300 transition-colors text-xl font-bold"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Onglets */}
        <div className="flex mb-0 border-b-2 border-red-800 px-6">
          <button
            onClick={() => setActiveTab('connection')}
            className={`px-4 py-2 font-bold transition-colors border-b-2 uppercase tracking-wider ${
              activeTab === 'connection'
                ? 'text-red-300 border-red-500 bg-red-900/30'
                : 'text-red-200 border-transparent hover:text-white hover:bg-red-900/20'
            }`}
          >
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Connexion
            </div>
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-4 py-2 font-bold transition-colors border-b-2 uppercase tracking-wider ${
              activeTab === 'security'
                ? 'text-red-300 border-red-500 bg-red-900/30'
                : 'text-red-200 border-transparent hover:text-white hover:bg-red-900/20'
            }`}
          >
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Sécurité
            </div>
          </button>
        </div>

        {/* Contenu des onglets */}
        <div className="flex-1 overflow-y-auto p-6 pt-6">
        {activeTab === 'connection' && (
          <div className="space-y-6">
            {/* Nom d'utilisateur actuel */}
            {currentUsername && (
              <div className="p-3 bg-red-900/30 border-2 border-red-700 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-red-400" />
                  <span className="text-sm font-medium text-red-200">Compagnon connecté :</span>
                </div>
                <div className="text-lg font-bold text-white">{currentUsername}</div>
              </div>
            )}

            {/* Mémoriser le nom d'utilisateur */}
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberUsername}
                  onChange={(e) => setRememberUsername(e.target.checked)}
                  className="w-4 h-4 text-red-600 bg-black border-red-600 rounded focus:ring-red-500"
                />
                <div>
                  <div className="font-medium text-white">Mémoriser mon nom révolutionnaire</div>
                  <div className="text-sm text-red-200">
                    Sauvegarder le nom de compagnon pour les prochaines connexions
                  </div>
                </div>
              </label>
            </div>

            {/* Connexion automatique */}
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoConnect}
                  onChange={(e) => setAutoConnect(e.target.checked)}
                  disabled={!rememberUsername}
                  className="w-4 h-4 text-red-600 bg-black border-red-600 rounded focus:ring-red-500 disabled:opacity-50"
                />
                <div>
                  <div className="font-medium flex items-center gap-2 text-white">
                    <Zap className="w-4 h-4 text-red-400" />
                    Connexion révolutionnaire automatique
                  </div>
                  <div className="text-sm text-red-200">
                    Rejoindre automatiquement la commune avec le nom mémorisé
                  </div>
                </div>
              </label>
            </div>

            {/* Nom sauvegardé */}
            {savedUsername && (
              <div className="p-3 bg-black/60 border-2 border-red-800 rounded-lg">
                <div className="text-sm text-red-200 mb-1">Nom révolutionnaire sauvegardé :</div>
                <div className="font-medium text-white">{savedUsername}</div>
              </div>
            )}

            {/* Actions rapides */}
            <div className="space-y-3">
              <div className="text-sm font-medium text-red-300 uppercase tracking-wider">Arsenal révolutionnaire :</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    const randomName = generateRandomName();
                    setSavedUsername(randomName);
                    localStorage.setItem('liberchat_username', randomName);
                  }}
                  className="p-2 bg-red-800 hover:bg-red-700 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm border border-red-600 hover:border-red-500"
                >
                  <RefreshCw className="w-4 h-4" />
                  Nom aléatoire
                </button>
                <button
                  onClick={() => {
                    const anonymousName = `Anonyme${Math.floor(Math.random() * 9999) + 1}`;
                    setSavedUsername(anonymousName);
                    localStorage.setItem('liberchat_username', anonymousName);
                  }}
                  className="p-2 bg-black hover:bg-red-900 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm border border-red-800 hover:border-red-600"
                >
                  <Eye className="w-4 h-4" />
                  Anonyme
                </button>
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="flex gap-3 pt-4 border-t-2 border-red-800">
              <button
                onClick={handleClearData}
                className="flex-1 py-2 px-4 bg-red-700 hover:bg-red-600 text-white rounded-lg transition-colors text-sm font-bold border-2 border-red-600 hover:border-red-500"
              >
                Purger les données
              </button>
              <button
                onClick={handleSaveSettings}
                className="flex-1 py-2 px-4 bg-red-800 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-bold border-2 border-red-600 hover:border-red-500"
              >
                Sauvegarder la révolution
              </button>
            </div>

            {/* Aide */}
            <div className="text-xs text-red-300 bg-red-900/40 border border-red-700 p-3 rounded-lg">
              🔥 <strong>Conseil révolutionnaire :</strong> Avec la connexion automatique activée, vous rejoindrez instantanément la commune sans saisir votre nom !
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-8">
            {/* Diagnostic cryptographique */}
            <CryptoDiagnostics />
            
            {/* Séparateur */}
            <div className="border-t border-red-800"></div>
            
            {/* Sauvegarde et restauration */}
            <KeyBackupManager />
            
            {/* Séparateur */}
            <div className="border-t border-red-800"></div>
            
            {/* Rapport de sécurité */}
            <SecurityReportGenerator />
            
            {/* Séparateur */}
            <div className="border-t border-red-800"></div>
            
            {/* Actions de maintenance */}
            <div className="bg-gray-900 border border-red-800 p-4 rounded-lg">
              <h4 className="font-medium mb-3 flex items-center gap-2 text-red-400">
                <Activity className="w-5 h-5 text-red-500" />
                Actions de Maintenance Révolutionnaire
              </h4>
              
              <div className="space-y-3">
                <button
                  onClick={async () => {
                    if (confirm('Voulez-vous vraiment purger toutes les clés de cellule révolutionnaire ?\n\nCette action ne supprimera pas la clé globale mais vous devrez rejoindre à nouveau toutes vos cellules.')) {
                      try {
                        const { cryptoManager } = await import('../utils/CryptoManager');
                        await cryptoManager.clearGroupKeys();
                        alert('Toutes les clés de cellule ont été purgées.');
                      } catch (error) {
                        console.error('Erreur lors de la purge des clés de cellule:', error);
                        alert('Erreur lors de la purge des clés de cellule.');
                      }
                    }
                  }}
                  className="w-full py-2 px-4 bg-red-700 hover:bg-red-600 text-white rounded-lg transition-colors text-sm border border-red-600 font-bold"
                >
                  🔥 Purger les clés de cellule
                </button>
                
                <button
                  onClick={async () => {
                    if (confirm('Voulez-vous vraiment déclencher une révolution cryptographique complète ?\n\n🚩 ATTENTION RÉVOLUTIONNAIRE: Cette action supprimera TOUTES vos clés et vous ne pourrez plus déchiffrer vos anciens messages !')) {
                      try {
                        const { cryptoManager } = await import('../utils/CryptoManager');
                        await cryptoManager.reset();
                        alert('La révolution cryptographique a été déclenchée.');
                      } catch (error) {
                        console.error('Erreur lors de la révolution:', error);
                        alert('Erreur lors de la révolution cryptographique.');
                      }
                    }
                  }}
                  className="w-full py-2 px-4 bg-red-900 hover:bg-red-800 text-white rounded-lg transition-colors text-sm border border-red-800 font-bold"
                >
                  🚩 Révolution Cryptographique
                </button>
              </div>
              
              <div className="mt-3 p-3 bg-red-900/40 border border-red-600/60 rounded-lg">
                <div className="text-sm text-red-200">
                  🚩 <strong>Avertissement Révolutionnaire:</strong> Ces actions de maintenance révolutionnaire peuvent affecter votre capacité à déchiffrer les communications existantes. 
                  Assurez-vous d'avoir effectué une sauvegarde révolutionnaire récente avant de procéder à la révolution.
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}