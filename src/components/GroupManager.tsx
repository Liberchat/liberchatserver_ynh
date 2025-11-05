import { useState, useEffect } from 'react';
import { Users, Plus, MessageCircle, X } from 'lucide-react';
import { GroupSecurityIndicator, type SecurityStatus } from './EncryptionIndicator';

interface Group {
  id: number;
  name: string;
  memberCount: number;
  createdAt: number;
  createdBy: string;
  securityStatus?: SecurityStatus; // Statut de sécurité du groupe
}

interface GroupManagerProps {
  socket: any;
  username: string;
  onJoinGroup: (groupId: number) => void;
  currentGroup: number | null;
  getGroupSecurityStatus?: (groupId: number) => SecurityStatus; // Fonction pour obtenir le statut de sécurité
}

export function GroupManager({ socket, username, onJoinGroup, currentGroup, getGroupSecurityStatus }: GroupManagerProps) {
  const [groups, setGroups] = useState<Group[]>([]);


  useEffect(() => {
    loadGroups();
  }, []);

  // Fonction pour obtenir le statut de sécurité d'un groupe
  const getSecurityStatus = (group: Group): SecurityStatus => {
    if (getGroupSecurityStatus) {
      return getGroupSecurityStatus(group.id);
    }
    
    // Statut par défaut basé sur la présence d'une clé
    return {
      encrypted: false, // Par défaut, considérer comme non chiffré
      keyExchanged: false,
      peersVerified: 0,
      algorithm: 'AES-GCM',
      strength: 'weak'
    };
  };

  const loadGroups = async () => {
    try {
      // Utiliser socket.io pour charger les groupes
      if (socket) {
        socket.emit('get groups');
        socket.once('groups list', (groupsData: Group[]) => {
          setGroups(groupsData || []);
        });
      }
    } catch (error) {
      console.error('Erreur lors du chargement des cellules:', error);
      setGroups([]);
    }
  };



  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-black border-r border-red-800 w-full sm:w-80 md:w-80 lg:w-80 flex flex-col">
      {/* Avertissement développement */}
      <div className="p-2 sm:p-3 bg-yellow-900/30 border-b border-yellow-700/50">
        <div className="flex items-start gap-2">
          <span className="text-yellow-500 text-sm flex-shrink-0">⚠️</span>
          <div className="text-xs sm:text-sm text-yellow-300">
            <p className="font-medium mb-1">Fonctionnalités en cours de développement</p>
            <p className="text-yellow-400/80">Les groupes ne sont pas encore complètement implémentés.</p>
          </div>
        </div>
      </div>
      
      <div className="p-3 sm:p-4 border-b border-red-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base sm:text-lg font-semibold flex items-center gap-1 sm:gap-2 text-red-400 min-w-0 flex-1">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 flex-shrink-0" />
            <span className="truncate">Cellules Révolutionnaires</span>
          </h2>
          <button
            disabled={true}
            className="p-2 bg-gray-700 cursor-not-allowed rounded-lg transition-colors text-gray-400 flex-shrink-0 ml-2"
            title="Création temporairement désactivée - En cours de développement"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Message explicatif pour la création désactivée */}
        <div className="p-3 bg-gray-900/50 border border-gray-700 rounded-lg">
          <div className="flex items-center gap-2 text-gray-400">
            <Plus className="w-4 h-4" />
            <span className="text-sm">Création de cellules temporairement désactivée</span>
          </div>
          <p className="text-xs text-gray-500 mt-1 ml-6">
            Cette fonctionnalité sera disponible dans une prochaine version.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-2 space-y-2">
          {groups.length === 0 ? (
            <div className="text-center text-red-400 py-6 sm:py-8">
              <Users className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 opacity-50 text-red-500" />
              <p className="text-sm sm:text-base">Aucune cellule disponible</p>
              <p className="text-xs sm:text-sm text-gray-500">Les groupes seront bientôt disponibles</p>
            </div>
          ) : (
            groups.map((group) => (
              <div
                key={group.id}
                className={`p-2 sm:p-3 rounded-lg border cursor-pointer transition-all ${
                  currentGroup === group.id
                    ? 'bg-red-900 border-red-600 shadow-lg shadow-red-900/50'
                    : 'bg-gray-900 border-red-800 hover:bg-gray-800 hover:border-red-700'
                }`}
                onClick={() => onJoinGroup(group.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-start gap-1 sm:gap-2 flex-1 min-w-0">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate text-red-300 text-sm sm:text-base leading-tight">{group.name}</h3>
                      <div className="mt-1">
                        <GroupSecurityIndicator 
                          status={getSecurityStatus(group)}
                          groupName={group.name}
                          memberCount={group.memberCount}
                          size="sm"
                        />
                      </div>
                    </div>
                  </div>
                  <MessageCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                </div>
                <div className="text-xs sm:text-sm text-gray-300 space-y-1">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <span className="text-red-400">{group.memberCount} compagnon·e{group.memberCount > 1 ? '·s' : ''}</span>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {formatDate(group.createdAt)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    Formée par {group.createdBy}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}