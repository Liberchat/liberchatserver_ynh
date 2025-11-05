import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { WelcomeScreen } from './components/WelcomeScreen';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import { UserList } from './components/UserList';
import Header from './components/Header';
import { GroupManager } from './components/GroupManager';
import { GroupChat } from './components/GroupChat';
import { QuickConnectNotification } from './components/QuickConnectNotification';
import { cryptoManager } from './utils/CryptoManager';

interface Message {
  id: number;
  type: 'text' | 'file' | 'system' | 'gif' | 'audio';
  username?: string;
  content?: string;
  fileData?: string;
  fileType?: string;
  gifUrl?: string;
  timestamp: number;
}

interface UserInfo {
  username: string;
  socketId: string;
}

function App() {
  const [socket, setSocket] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [username, setUsername] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [callingUser, setCallingUser] = useState<string>('');
  const [currentView, setCurrentView] = useState<'chat' | 'groups'>('chat');
  const [currentGroup, setCurrentGroup] = useState<number | null>(null);
  const [currentGroupName, setCurrentGroupName] = useState<string>('');
  const [showConnectionSettings, setShowConnectionSettings] = useState(false);
  const [hasError, setHasError] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Gestion d'erreur globale pour éviter l'écran noir
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Erreur JavaScript non gérée:', event.error);
      setHasError(true);
      // Ne pas empêcher le comportement par défaut pour permettre le logging
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Promise rejetée non gérée:', event.reason);
      setHasError(true);
      // Empêcher l'affichage de l'erreur dans la console du navigateur
      event.preventDefault();
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Fonction de récupération d'erreur
  const handleRecoverFromError = () => {
    setHasError(false);
    // Réinitialiser l'état si nécessaire
    if (!Array.isArray(messages)) {
      setMessages([]);
    }
  };

  // Le CryptoManager gère maintenant automatiquement tout le chiffrement
  // Plus besoin de fonctions manuelles ou de gestion de clés utilisateur

  useEffect(() => {
    // Connexion Socket.IO dynamique: IP locale, .onion, ou domaine, jamais localhost en prod
    let socketUrl = '';
    let socketPath = '/socket.io/';
    
    if (import.meta.env.DEV) {
      socketUrl = 'http://localhost:3000';
    } else {
      // Prend l'origine réelle de la page (IP locale, .onion, domaine, etc.)
      let port = window.location.port;
      const portPart = port ? `:${port}` : '';
      socketUrl = `${window.location.protocol}//${window.location.hostname}${portPart}`;
      
      // Utiliser BASE_URL de Vite pour détecter le chemin YunoHost
      const basePath = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';
      console.log('Base path from Vite:', basePath);
      
      if (basePath) {
        socketPath = `${basePath}/socket.io/`;
      } else {
        // Fallback: détection depuis l'URL actuelle
        const currentPath = window.location.pathname;
        if (currentPath.startsWith('/liberchat')) {
          socketPath = '/liberchat/socket.io/';
        } else if (currentPath !== '/' && !currentPath.startsWith('/socket.io')) {
          const pathMatch = currentPath.match(/^(\/[^/]+)/);
          if (pathMatch) {
            socketPath = `${pathMatch[1]}/socket.io/`;
          }
        }
      }
    }
    
    console.log('Socket.IO config:', { socketUrl, socketPath });
    
    const newSocket = io(socketUrl, {
      path: socketPath,
      transports: ['websocket', 'polling'], // Permettre WebSocket et polling
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      upgrade: true, // Permettre l'upgrade vers WebSocket
      rememberUpgrade: false,
      pingTimeout: 60000,
      pingInterval: 25000,
      autoConnect: true
    });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Socket connecté, id:', newSocket.id);
    });
    newSocket.on('disconnect', () => setIsConnected(false));
    
    // Gestion des erreurs de connexion
    newSocket.on('connect_error', (error) => {
      console.error('Erreur de connexion Socket.IO:', error);
      setIsConnected(false);
    });
    
    newSocket.on('reconnect_error', (error) => {
      console.error('Erreur de reconnexion Socket.IO:', error);
    });

    newSocket.on('chat message', (msg: Message) => {
      setMessages(prev => [...prev, msg]);
    });

    newSocket.on('users', (userList: UserInfo[]) => {
      setUsers(userList);
    });

    newSocket.on('userJoined', () => {
      // Ne rien faire ici, le serveur enverra un message système avec id
    });

    newSocket.on('userLeft', (user: string) => {
      // Ne rien faire ici, le serveur enverra un message système avec id
      if (user === callingUser) {
        setCallingUser('');
      }
    });

    return () => {
      newSocket.close();
    };
  }, [callingUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleJoin = (name: string) => {
    setUsername(name);
    socket?.emit('register', name);
  };

  // Connexion automatique si activée
  useEffect(() => {
    const autoConnect = localStorage.getItem('liberchat_auto_connect');
    const savedUsername = localStorage.getItem('liberchat_username');
    
    if (autoConnect === 'true' && savedUsername && socket && !username) {
      // Attendre que la socket soit connectée
      if (socket.connected) {
        handleJoin(savedUsername);
      } else {
        socket.on('connect', () => {
          handleJoin(savedUsername);
        });
      }
    }
  }, [socket, username]);

  // Plus besoin de gérer manuellement les clés - CryptoManager s'en charge automatiquement

  // Chiffrement automatique transparent avec CryptoManager
  const handleSendMessage = async (message: string) => {
    try {
      // Validation du message
      if (!message || typeof message !== 'string' || message.trim() === '') {
        console.warn('Message vide ou invalide, ignoré');
        return;
      }

      // Déterminer le contexte de chiffrement (global ou groupe)
      const context = currentGroup ? `group_${currentGroup}` : 'global';
      
      // Chiffrement automatique par CryptoManager avec gestion d'erreur robuste
      let encrypted;
      try {
        encrypted = await cryptoManager.encryptMessage(message, context);
      } catch (cryptoError) {
        console.error('Erreur de chiffrement, envoi en mode non sécurisé:', cryptoError);
        // En cas d'erreur de chiffrement, envoyer le message en clair avec un avertissement
        const messageData: Omit<Message, 'id'> = {
          type: 'text',
          username,
          content: `[NON CHIFFRÉ] ${message}`,
          timestamp: Date.now()
        };
        socket?.emit('chat message', messageData);
        return;
      }
      
      const messageData: Omit<Message, 'id'> = {
        type: 'text',
        username,
        content: JSON.stringify(encrypted),
        timestamp: Date.now()
      };
      
      socket?.emit('chat message', messageData);
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      // En cas d'erreur générale, essayer d'envoyer le message en mode dégradé
      try {
        const messageData: Omit<Message, 'id'> = {
          type: 'text',
          username,
          content: `[ERREUR] ${message}`,
          timestamp: Date.now()
        };
        socket?.emit('chat message', messageData);
      } catch (fallbackError) {
        console.error('Impossible d\'envoyer le message même en mode dégradé:', fallbackError);
        alert('Impossible d\'envoyer le message. Veuillez vérifier votre connexion.');
      }
    }
  };

  const handleSendFile = async (file: File) => {
    try {
      const reader = new FileReader();
      reader.onload = () => {
        const fileData = reader.result as string;
        const messageData: Omit<Message, 'id'> = {
          type: 'file',
          username,
          fileData,
          fileType: file.type,
          timestamp: Date.now()
        };
        socket?.emit('chat message', messageData);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error processing file:', error);
      alert('Error processing file');
    }
  };

  const handleSendAudio = async (audioBase64: string) => {
    const messageData: Omit<Message, 'id'> = {
      type: 'audio',
      username,
      fileData: audioBase64,
      timestamp: Date.now()
    };
    socket?.emit('chat message', messageData);
  };

  const handleCallUser = (userToCall: string) => {
    setCallingUser(userToCall);
  };

  const handleJoinGroup = (groupId: number) => {
    // Trouver le nom du groupe
    const basePath = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';
    const apiUrl = basePath ? `${basePath}/api/groups` : '/api/groups';
    fetch(apiUrl)
      .then(res => res.json())
      .then(groups => {
        const group = groups.find((g: any) => g.id === groupId);
        if (group) {
          setCurrentGroup(groupId);
          setCurrentGroupName(group.name);
          setCurrentView('groups');
        }
      })
      .catch(console.error);
  };

  const handleLeaveGroup = () => {
    setCurrentGroup(null);
    setCurrentGroupName('');
    setCurrentView('chat');
  };

  // Suppression d'un message
  const handleDeleteMessage = (id: number) => {
    console.log('[CLIENT] Demande suppression id:', id);
    socket?.emit('delete message', { id });
  };

  // Déchiffrement automatique transparent lors de la réception d'un message
  useEffect(() => {
    if (!socket) return;
    
    const handleChatMessage = async (msg: Message) => {
      // Validation du message reçu
      if (!msg || typeof msg !== 'object') {
        console.warn('Message reçu invalide:', msg);
        return;
      }

      if (msg.type === 'text' && msg.content) {
        try {
          // Vérifier si le message est chiffré (format JSON)
          if (msg.content.startsWith('{') && msg.content.includes('iv') && msg.content.includes('content')) {
            const encrypted = JSON.parse(msg.content);
            
            // Déterminer le contexte de déchiffrement
            const context = currentGroup ? `group_${currentGroup}` : 'global';
            
            // Déchiffrement automatique par CryptoManager
            try {
              msg.content = await cryptoManager.decryptMessage(encrypted, context);
            } catch (decryptError) {
              console.warn('Erreur lors du déchiffrement du message:', decryptError);
              // En cas d'erreur de déchiffrement, afficher un message d'erreur
              msg.content = '[Message non déchiffrable]';
            }
          }
          // Si le message ne ressemble pas à du JSON chiffré, le garder tel quel
        } catch (parseError) {
          console.warn('Erreur lors du parsing du message chiffré:', parseError);
          // Si le JSON.parse échoue, on garde le contenu original
          // Cela permet de gérer les messages non chiffrés ou corrompus
        }
      }
      
      // Ajouter le message à la liste de manière sécurisée
      try {
        setMessages((prev: Message[]) => {
          // Vérifier que prev est bien un tableau
          if (!Array.isArray(prev)) {
            console.warn('État des messages corrompu, réinitialisation');
            return [msg];
          }
          return [...prev, msg];
        });
      } catch (stateError) {
        console.error('Erreur lors de la mise à jour de l\'état des messages:', stateError);
        // En cas d'erreur d'état, essayer de réinitialiser
        setMessages([msg]);
      }
    };
    
    socket.on('chat message', handleChatMessage);
    return () => {
      socket.off('chat message', handleChatMessage);
    };
  }, [socket, currentGroup]); // Dépendance sur currentGroup pour le contexte

  useEffect(() => {
    if (!socket) return;
    // Suppression d'un message côté client
    const handleMessageDeleted = ({ id }: { id: number }) => {
      console.log('[CLIENT] Message supprimé reçu id:', id);
      setMessages(prev => prev.filter(msg => msg.id !== id));
    };
    socket.on('message deleted', handleMessageDeleted);
    return () => {
      socket.off('message deleted', handleMessageDeleted);
    };
  }, [socket]);

  // Écran d'erreur de récupération
  if (hasError) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center p-8 bg-gray-800 rounded-lg max-w-md">
          <h2 className="text-2xl font-bold mb-4 text-red-400">Erreur détectée</h2>
          <p className="mb-6 text-gray-300">
            Une erreur s'est produite dans l'application. Cela peut être dû à un problème de chiffrement ou de connexion.
          </p>
          <div className="space-y-3">
            <button
              onClick={handleRecoverFromError}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Réessayer
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
            >
              Recharger la page
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!username) {
    return <WelcomeScreen onJoin={handleJoin} />;
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      <Header 
        currentView={currentView}
        onViewChange={setCurrentView}
        currentGroupName={currentGroupName}
        currentUsername={username}
      />
      
      {/* Notification de connexion rapide */}
      {username && (
        <QuickConnectNotification
          username={username}
          onOpenSettings={() => setShowConnectionSettings(true)}
        />
      )}
      <div className="flex-1 flex overflow-hidden">
        {currentView === 'chat' ? (
          <>
            <UserList 
              users={users} 
              currentUser={username}
              onCallUser={handleCallUser}
            />
            <div className="flex-1 flex flex-col">
              <main className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.filter(msg => typeof msg.id === 'number').map((msg: Message, index: number) => (
                  <ChatMessage 
                    key={msg.id || index} 
                    message={msg} 
                    isOwnMessage={msg.username === username}
                    onDeleteMessage={handleDeleteMessage}
                  />
                ))}
                <div ref={messagesEndRef} />
              </main>
              <ChatInput 
                onSendMessage={handleSendMessage} 
                onSendFile={handleSendFile}
                onSendAudio={handleSendAudio}
                isConnected={isConnected}
                users={users}
                currentUser={username}
              />
            </div>
          </>
        ) : currentGroup ? (
          <GroupChat
            socket={socket}
            username={username}
            groupId={currentGroup}
            groupName={currentGroupName}
            onLeaveGroup={handleLeaveGroup}
          />
        ) : (
          <GroupManager
            socket={socket}
            username={username}
            onJoinGroup={handleJoinGroup}
            currentGroup={currentGroup}
          />
        )}
      </div>
    </div>
  );
}

export default App;