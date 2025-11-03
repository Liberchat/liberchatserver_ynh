import { useState, useEffect, useRef } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import { ArrowLeft, Users, Lock, AlertTriangle, Loader } from 'lucide-react';
import { cryptoManager } from '../utils/CryptoManager';
import { keyExchanger } from '../utils/KeyExchanger';
import { GroupSecurityIndicator, type SecurityStatus } from './EncryptionIndicator';

interface Message {
  id: number;
  type: 'text' | 'file' | 'system' | 'gif' | 'audio';
  username?: string;
  content?: string;
  fileData?: string;
  fileType?: string;
  fileName?: string;
  gifUrl?: string;
  timestamp: number;
  groupId?: number;
  reactions?: any[];
  edited?: boolean;
}

interface GroupChatProps {
  socket: any;
  username: string;
  groupId: number;
  groupName: string;
  onLeaveGroup: () => void;
  // Plus besoin de symmetricKey - CryptoManager gère automatiquement les clés
}

export function GroupChat({ 
  socket, 
  username, 
  groupId, 
  groupName, 
  onLeaveGroup
}: GroupChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [groupMembers, setGroupMembers] = useState<string[]>([]);
  const [keyExchangeStatus, setKeyExchangeStatus] = useState<'initializing' | 'exchanging' | 'secured' | 'error'>('initializing');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fonction pour obtenir le statut de sécurité détaillé du groupe
  const getGroupSecurityStatus = (): SecurityStatus => {
    const encrypted = keyExchangeStatus === 'secured';
    const keyExchanged = keyExchangeStatus === 'secured' || keyExchangeStatus === 'exchanging';
    
    return {
      encrypted,
      keyExchanged,
      peersVerified: encrypted ? groupMembers.length - 1 : 0, // Tous les membres sauf nous
      algorithm: 'AES-GCM',
      strength: encrypted ? 'strong' : 'weak'
    };
  };

  useEffect(() => {
    if (!socket) return;

    // Initier l'échange de clés automatique lors de l'adhésion au groupe
    const initializeGroupKeyExchange = async () => {
      try {
        setKeyExchangeStatus('exchanging');
        await keyExchanger.joinGroup(groupId.toString(), username);
        console.log(`Échange de clés initié pour le groupe ${groupId}`);
        
        // Vérifier si nous avons déjà une clé pour ce groupe
        const hasKey = await cryptoManager.hasKey(`group_${groupId}`);
        if (hasKey) {
          setKeyExchangeStatus('secured');
        }
      } catch (error) {
        console.error('Erreur lors de l\'initialisation de l\'échange de clés:', error);
        setKeyExchangeStatus('error');
      }
    };

    // Rejoindre le groupe et initier l'échange de clés
    socket.emit('join group', groupId);
    initializeGroupKeyExchange();

    // Écouter les messages du groupe avec déchiffrement automatique
    const handleGroupMessage = async (msg: Message) => {
      try {
        if (msg.type === 'text' && msg.content) {
          console.log('Message de groupe reçu:', {
            content: msg.content,
            type: typeof msg.content,
            length: msg.content.length,
            startsWithBrace: msg.content.trim().startsWith('{'),
            endsWithBrace: msg.content.trim().endsWith('}'),
            degradedMode: (msg as any).degradedMode,
            groupId
          });
          
          // Vérifier si c'est un message en mode dégradé
          if ((msg as any).degradedMode) {
            console.log('Message de groupe en mode dégradé, pas de déchiffrement');
            // Message en clair, pas de déchiffrement nécessaire
            // msg.content reste inchangé
          } else {
            try {
              // Vérifier si le contenu est du JSON chiffré
              if (typeof msg.content === 'string' && 
                  msg.content.trim().startsWith('{') && 
                  msg.content.trim().endsWith('}')) {
                console.log('Tentative de déchiffrement du message de groupe...');
                const encrypted = JSON.parse(msg.content);
                console.log('Message de groupe parsé:', encrypted);
                if (encrypted && encrypted.iv && encrypted.content) {
                  // Utiliser le contexte de groupe pour le déchiffrement
                  const context = `group_${groupId}`;
                  console.log('Déchiffrement avec contexte:', context);
                  msg.content = await cryptoManager.decryptMessage(encrypted, context);
                  console.log('Message de groupe déchiffré:', msg.content);
                }
              } else {
                console.log('Message de groupe non chiffré ou format non reconnu');
                // Essayer de déchiffrer même si le format n'est pas reconnu
                if (msg.content.includes('iv') && msg.content.includes('content')) {
                  try {
                    console.log('Tentative de déchiffrement forcé du message de groupe...');
                    const encrypted = JSON.parse(msg.content);
                    if (encrypted && encrypted.iv && encrypted.content) {
                      const context = `group_${groupId}`;
                      msg.content = await cryptoManager.decryptMessage(encrypted, context);
                      console.log('Déchiffrement forcé de groupe réussi:', msg.content);
                    }
                  } catch (forceError) {
                    console.log('Déchiffrement forcé de groupe échoué:', forceError);
                  }
                }
              }
            } catch (decryptError) {
              console.warn('Erreur lors du déchiffrement du message de groupe:', decryptError);
              // Garder le message original si le déchiffrement échoue
              msg.content = '[Message non déchiffrable]';
            }
          }
        }
        
        setMessages(prev => [...prev, msg]);
      } catch (error) {
        console.error('Erreur lors du traitement du message de groupe:', error);
        // Ajouter le message même en cas d'erreur pour éviter la perte
        setMessages(prev => [...prev, msg]);
      }
    };

    const handleGroupMessages = (data: { groupId: number; messages: Message[] }) => {
      if (data.groupId === groupId) {
        setMessages(data.messages);
      }
    };

    const handleUserJoinedGroup = (data: { groupId: number; username: string }) => {
      if (data.groupId === groupId) {
        setGroupMembers(prev => [...prev.filter(u => u !== data.username), data.username]);
      }
    };

    const handleUserLeftGroup = async (data: { groupId: number; username: string }) => {
      if (data.groupId === groupId) {
        setGroupMembers(prev => prev.filter(u => u !== data.username));
        
        // Gérer la sortie d'un utilisateur du groupe pour l'échange de clés
        try {
          await keyExchanger.leaveGroup(groupId.toString(), data.username);
          console.log(`Utilisateur ${data.username} retiré du groupe ${groupId} pour l'échange de clés`);
        } catch (error) {
          console.error('Erreur lors de la gestion de la sortie de groupe:', error);
        }
      }
    };

    // Gestionnaires pour les événements d'échange de clés
    const handleKeyExchangeRequest = (data: any) => {
      console.log('Demande d\'échange de clés reçue:', data);
      socket.emit('key-exchange-response', data);
    };

    const handleKeyExchangeResponse = async (data: any) => {
      console.log('Réponse d\'échange de clés reçue:', data);
      try {
        await keyExchanger.handleKeyExchange(data);
        setKeyExchangeStatus('secured');
      } catch (error) {
        console.error('Erreur lors du traitement de la réponse d\'échange:', error);
        setKeyExchangeStatus('error');
      }
    };

    const handleKeyDistribution = async (data: any) => {
      console.log('Distribution de clé reçue:', data);
      try {
        await keyExchanger.handleKeyExchange(data);
        setKeyExchangeStatus('secured');
      } catch (error) {
        console.error('Erreur lors du traitement de la distribution de clé:', error);
        setKeyExchangeStatus('error');
      }
    };

    const handleKeyExchangeError = (data: any) => {
      console.error('Erreur d\'échange de clés:', data.error);
      setKeyExchangeStatus('error');
      // Optionnel: afficher une notification à l'utilisateur
    };

    // Configurer les gestionnaires d'événements pour KeyExchanger
    keyExchanger.setEventHandlers({
      onKeyExchangeRequest: (data) => {
        socket.emit('key-exchange-request', data);
      },
      onKeyExchangeResponse: (data) => {
        socket.emit('key-exchange-response', data);
      },
      onKeyDistribution: (data) => {
        socket.emit('key-distribution', data);
      }
    });

    socket.on('group message', handleGroupMessage);
    socket.on('group messages', handleGroupMessages);
    socket.on('user joined group', handleUserJoinedGroup);
    socket.on('user left group', handleUserLeftGroup);
    socket.on('key-exchange-request', handleKeyExchangeRequest);
    socket.on('key-exchange-response', handleKeyExchangeResponse);
    socket.on('key-distribution', handleKeyDistribution);
    socket.on('key-exchange-error', handleKeyExchangeError);

    return () => {
      socket.off('group message', handleGroupMessage);
      socket.off('group messages', handleGroupMessages);
      socket.off('user joined group', handleUserJoinedGroup);
      socket.off('user left group', handleUserLeftGroup);
      socket.off('key-exchange-request', handleKeyExchangeRequest);
      socket.off('key-exchange-response', handleKeyExchangeResponse);
      socket.off('key-distribution', handleKeyDistribution);
      socket.off('key-exchange-error', handleKeyExchangeError);
      
      // Gérer la sortie du groupe pour l'échange de clés
      keyExchanger.leaveGroup(groupId.toString(), username).catch(error => {
        console.error('Erreur lors de la sortie du groupe:', error);
      });
      
      socket.emit('leave group', groupId);
    };
  }, [socket, groupId]); // Plus de dépendance sur symmetricKey

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Chiffrement automatique transparent pour les messages de groupe
  const handleSendMessage = async (message: string) => {
    try {
      if (!socket) {
        console.error('Socket non disponible');
        return;
      }
      
      if (!message.trim()) {
        return;
      }
      
      // Utiliser le contexte de groupe pour le chiffrement
      const context = `group_${groupId}`;
      const encrypted = await cryptoManager.encryptMessage(message, context);
      
      socket.emit('group message', {
        groupId,
        type: 'text',
        content: JSON.stringify(encrypted),
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message de groupe:', error);
      
      // Essayer d'envoyer en mode dégradé si le chiffrement échoue
      try {
        if (socket) {
          socket.emit('group message', {
            groupId,
            type: 'text',
            content: message, // Message en clair
            timestamp: Date.now(),
            degradedMode: true
          });
        }
      } catch (fallbackError) {
        console.error('Erreur même en mode dégradé:', fallbackError);
        alert('Impossible d\'envoyer le message. Veuillez réessayer.');
      }
    }
  };

  const handleSendFile = async (file: File) => {
    try {
      const reader = new FileReader();
      reader.onload = () => {
        const fileData = reader.result as string;
        socket?.emit('group message', {
          groupId,
          type: 'file',
          fileData,
          fileType: file.type,
          fileName: file.name
        });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error processing file:', error);
      alert('Error processing file');
    }
  };

  const handleSendAudio = async (audioBase64: string) => {
    socket?.emit('group message', {
      groupId,
      type: 'audio',
      fileData: audioBase64
    });
  };

  const handleDeleteMessage = (id: number) => {
    // Pour les groupes, on pourrait implémenter une suppression spécifique
    console.log('Delete message in group:', id);
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Header du groupe */}
      <div className="bg-black border-b border-red-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onLeaveGroup}
              className="p-2 hover:bg-red-900 rounded-lg transition-colors text-red-400 hover:text-white"
              title="Quitter la cellule"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">{groupName}</h2>
                {/* Indicateur de sécurité détaillé */}
                <GroupSecurityIndicator 
                  status={getGroupSecurityStatus()}
                  groupName={groupName}
                  memberCount={groupMembers.length}
                  size="md"
                  showDetails={true}
                />
              </div>
              <p className="text-sm text-red-400">
                {groupMembers.length} camarade{groupMembers.length > 1 ? 's' : ''} connecté{groupMembers.length > 1 ? 's' : ''}
                {keyExchangeStatus === 'secured' && ' • Communications sécurisées'}
                {keyExchangeStatus === 'exchanging' && ' • Sécurisation en cours...'}
                {keyExchangeStatus === 'error' && ' • Connexion non sécurisée'}
              </p>
            </div>
          </div>
          <Users className="w-6 h-6 text-red-500" />
        </div>
      </div>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-red-400 py-8">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50 text-red-500" />
            <p>Aucun message dans cette cellule</p>
            <p className="text-sm">Soyez le premier à écrire !</p>
          </div>
        ) : (
          messages.map((msg: Message, index: number) => (
            <ChatMessage 
              key={msg.id || index} 
              message={msg} 
              isOwnMessage={msg.username === username}
              onDeleteMessage={handleDeleteMessage}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Input */}
      <ChatInput 
        onSendMessage={handleSendMessage} 
        onSendFile={handleSendFile}
        onSendAudio={handleSendAudio}
        isConnected={!!socket}
        users={[]} // Pas besoin de la liste des utilisateurs pour les groupes
        currentUser={username}
      />
    </div>
  );
}