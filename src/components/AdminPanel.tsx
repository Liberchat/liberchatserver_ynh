import { useState, useEffect } from 'react';
import { BarChart3, Download, Users, MessageSquare, HardDrive, Clock } from 'lucide-react';

interface Stats {
  totalGroups: number;
  totalMessages: number;
  connectedUsers: number;
  groupsWithMessages: number;
  lastBackup: string;
}

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminPanel({ isOpen, onClose }: AdminPanelProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [backupMessage, setBackupMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadStats();
      const interval = setInterval(loadStats, 30000); // Actualiser toutes les 30 secondes
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const loadStats = async () => {
    try {
      // Détecter le basePath depuis la configuration Vite
      const basePath = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';
      const apiUrl = basePath ? `${basePath}/api/stats` : '/api/stats';
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const statsData = await response.json();
      setStats(statsData);
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
      // Afficher un message d'erreur à l'utilisateur
      setStats({
        totalGroups: 0,
        totalMessages: 0,
        connectedUsers: 0,
        groupsWithMessages: 0,
        lastBackup: new Date().toISOString()
      });
    }
  };

  const createBackup = async () => {
    setIsCreatingBackup(true);
    setBackupMessage('');
    
    try {
      // Détecter le basePath depuis la configuration Vite
      const basePath = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';
      const apiUrl = basePath ? `${basePath}/api/backup` : '/api/backup';
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setBackupMessage(`✅ Sauvegarde créée: ${result.backupPath}`);
        loadStats(); // Recharger les stats
      } else {
        setBackupMessage(`❌ Erreur: ${result.error || 'Erreur inconnue'}`);
      }
    } catch (error) {
      console.error('Erreur lors de la création de la sauvegarde:', error);
      setBackupMessage(`❌ Erreur: ${error.message || 'Erreur de connexion'}`);
    } finally {
      setIsCreatingBackup(false);
      setTimeout(() => setBackupMessage(''), 5000);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-black/95 border-4 border-red-700 rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2 text-white uppercase tracking-wider" style={{ fontFamily: 'Impact, sans-serif' }}>
            <BarChart3 className="w-6 h-6 text-red-500" />
            Panneau d'Administration
          </h2>
          <button
            onClick={onClose}
            className="text-red-400 hover:text-red-300 transition-colors text-xl font-bold"
          >
            ✕
          </button>
        </div>

        {stats ? (
          <div className="space-y-6">
            {/* Statistiques */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-red-900/30 border-2 border-red-700 p-4 rounded-lg text-center">
                <Users className="w-8 h-8 mx-auto mb-2 text-red-400" />
                <div className="text-2xl font-bold text-white">{stats.connectedUsers}</div>
                <div className="text-sm text-red-200">Compagnons connectés</div>
              </div>
              
              <div className="bg-red-900/30 border-2 border-red-700 p-4 rounded-lg text-center">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 text-red-400" />
                <div className="text-2xl font-bold text-white">{stats.totalMessages}</div>
                <div className="text-sm text-red-200">Messages révolutionnaires</div>
              </div>
              
              <div className="bg-red-900/30 border-2 border-red-700 p-4 rounded-lg text-center">
                <HardDrive className="w-8 h-8 mx-auto mb-2 text-red-400" />
                <div className="text-2xl font-bold text-white">{stats.totalGroups}</div>
                <div className="text-sm text-red-200">Cellules créées</div>
              </div>
              
              <div className="bg-red-900/30 border-2 border-red-700 p-4 rounded-lg text-center">
                <Clock className="w-8 h-8 mx-auto mb-2 text-red-400" />
                <div className="text-2xl font-bold text-white">{stats.groupsWithMessages}</div>
                <div className="text-sm text-red-200">Cellules actives</div>
              </div>
            </div>

            {/* Informations détaillées */}
            <div className="bg-black/60 border-2 border-red-800 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-3 text-red-300 uppercase tracking-wider">Informations de la Commune</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-red-200">Dernière sauvegarde:</span>
                  <span className="text-white">{formatDate(stats.lastBackup)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-200">Ratio cellules actives:</span>
                  <span className="text-white">
                    {stats.totalGroups > 0 
                      ? `${Math.round((stats.groupsWithMessages / stats.totalGroups) * 100)}%`
                      : '0%'
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-200">Messages par cellule (moyenne):</span>
                  <span className="text-white">
                    {stats.totalGroups > 0 
                      ? Math.round(stats.totalMessages / stats.totalGroups)
                      : 0
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* Actions de sauvegarde */}
            <div className="bg-black/60 border-2 border-red-800 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-3 text-red-300 uppercase tracking-wider">Arsenal de Sauvegardes</h3>
              <div className="space-y-3">
                <button
                  onClick={createBackup}
                  disabled={isCreatingBackup}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-700 hover:bg-red-600 disabled:bg-gray-800 disabled:text-gray-500 rounded-lg transition-colors text-white font-bold border-2 border-red-600 hover:border-red-500"
                >
                  <Download className="w-4 h-4" />
                  {isCreatingBackup ? 'Sauvegarde en cours...' : 'Créer une sauvegarde révolutionnaire'}
                </button>
                
                {backupMessage && (
                  <div className="p-3 bg-red-900/40 border border-red-700 rounded text-sm text-red-100">
                    {backupMessage}
                  </div>
                )}
                
                <div className="text-xs text-red-300">
                  🔥 Les sauvegardes automatiques protègent la révolution toutes les heures.
                  Les 10 archives les plus récentes sont conservées pour la postérité.
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-red-200">Chargement des statistiques révolutionnaires...</p>
          </div>
        )}
      </div>
    </div>
  );
}