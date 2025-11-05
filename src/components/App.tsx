import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { WelcomeScreen } from './WelcomeScreen';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import { UserList } from './UserList';
import Header from './Header';
import { GroupManager } from './GroupManager';
import { GroupChat } from './GroupChat';
import CryptoJS from 'crypto-js';
import { useAccessibility } from '../hooks/useAccessibility';
import { useCustomThemes } from '../hooks/useCustomThemes';
import { cryptoManager } from '../utils/CryptoManager.ts';
import { cryptoErrorHandler, type CryptoError } from '../utils/CryptoErrorHandler.ts';

import useDegradedMode from '../hooks/useDegradedMode.ts';

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
  replyTo?: Message;
  edited?: boolean;
  reactions?: { [emoji: string]: string[] }; // Ajout des réactions
}

interface UserInfo {
  username: string;
  socketId: string;
}

function App() {
  const [socket, setSocket] = useState<ReturnType<typeof io> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [username, setUsername] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [callingUser, setCallingUser] = useState<string>('');
  // State pour la clé symétrique (CryptoKey ou string selon le backend)
  const [symmetricKey, setSymmetricKey] = useState<CryptoKey | string | null>(null);
  const [isFallbackCrypto, setIsFallbackCrypto] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );
  // États pour la gestion des groupes
  const [currentView, setCurrentView] = useState<'chat' | 'groups'>('chat');
  const [currentGroup, setCurrentGroup] = useState<number | null>(null);
  const [currentGroupName, setCurrentGroupName] = useState<string>('');

  // Fonctions de gestion des groupes
  const handleJoinGroup = (groupId: number) => {
    setCurrentGroup(groupId);
    setCurrentGroupName(`Groupe ${groupId}`); // Sera remplacé par le vrai nom
  };

  const handleLeaveGroup = () => {
    setCurrentGroup(null);
    setCurrentGroupName('');
    setCurrentView('groups'); // Retour à la liste des groupes
  };

  const handleViewChange = (view: 'chat' | 'groups') => {
    setCurrentView(view);
    if (view === 'chat') {
      setCurrentGroup(null);
      setCurrentGroupName('');
    }
  };
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [cryptoInitialized, setCryptoInitialized] = useState(false);
  const [cryptoError, setCryptoError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Hook d'accessibilité
  const { settings: accessibilitySettings, updateSettings: updateAccessibilitySettings, announceToScreenReader } = useAccessibility();

  // Hook des thèmes personnalisables
  const {
    themes: customThemes,
    activeTheme: activeCustomTheme,
    applyTheme: applyCustomTheme,
    addTheme: addCustomTheme,
    updateTheme: updateCustomTheme,
    deleteTheme: deleteCustomTheme
  } = useCustomThemes();

  // Hook du mode dégradé
  const {
    isActive: isDegradedMode,
    sendPlaintextMessage,
    isPlaintextMessage,
    activateDegradedMode
  } = useDegradedMode();

  useEffect(() => {
    // Connexion Socket.IO dynamique selon l'environnement
    let socketUrl = '';
    let socketPath = '/socket.io/';

    if (import.meta.env.DEV) {
      // En développement, essaie d'abord le proxy Vite, puis le serveur direct
      socketUrl = window.location.origin;
    } else {
      // Utilise l'origine de la page (supporte HTTPS, Tor, reverse proxy, etc.)
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
      transports: ['polling'], // Forcer polling uniquement pour éviter les erreurs WebSocket
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 30000,
      upgrade: false,
      rememberUpgrade: false,
      autoConnect: true
    });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Socket.IO connecté avec succès');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket.IO déconnecté');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (err: any) => {
      console.error('Erreur de connexion Socket.IO :', err);
      console.log('Configuration utilisée:', { socketUrl, socketPath });
      
      // Réessayer avec une configuration différente si nécessaire
      if (err.message && err.message.includes('404')) {
        console.log('Erreur 404 - Vérification du chemin Socket.IO...');
        // Le chemin pourrait être incorrect, essayer sans le chemin de base
        setTimeout(() => {
          const fallbackSocket = io(socketUrl, {
            path: '/socket.io/',
            transports: ['polling'],
            forceNew: true,
            reconnection: true,
            timeout: 30000
          });
          
          fallbackSocket.on('connect', () => {
            console.log('Connexion fallback réussie');
            setSocket(fallbackSocket);
            setIsConnected(true);
          });
        }, 2000);
      }
    });

    newSocket.on('users', (userList: UserInfo[]) => {
      setUsers(userList);
    });

    newSocket.on('userJoined', (user: string) => {
      const joinMessage = `${user} a rejoint le chat`;
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'system',
        content: joinMessage,
        timestamp: Date.now()
      }]);
      announceToScreenReader(joinMessage);
    });

    newSocket.on('userLeft', (user: string) => {
      const leftMessage = `${user} a quitté le chat`;
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'system',
        content: leftMessage,
        timestamp: Date.now()
      }]);
      announceToScreenReader(leftMessage);
      // Si l'utilisateur qui part était en appel, on termine l'appel
      if (user === callingUser) {
        setCallingUser('');
      }
    });

    return () => {
      newSocket.close();
    };
  }, []);

  // ... rest of the component remains the same
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialisation du système de chiffrement avec gestion d'erreurs
  useEffect(() => {
    const initializeCrypto = async () => {
      try {
        setCryptoError(null);

        // Initialiser le gestionnaire d'erreurs
        cryptoErrorHandler.addErrorListener((notification) => {
          console.warn('Notification d\'erreur crypto:', notification);

          // Si l'erreur nécessite le mode dégradé, l'activer
          if (notification.title.includes('Échec') || notification.type === 'error') {
            activateDegradedMode(`Erreur de chiffrement: ${notification.message}`);
          }
        });

        // Vérifier si on est en mode développement ou production
        const isDevelopment = window.location.hostname === 'localhost' ||
          window.location.hostname === '127.0.0.1' ||
          window.location.port === '5173';

        let globalKey;

        if (isDevelopment) {
          // Mode développement : nettoyer et utiliser la clé déterministe
          await cryptoManager.reset();
          globalKey = await cryptoManager.generateGlobalKey();
        } else {
          // Mode production : utiliser l'échange de clés sécurisé
          if (!username) {
            throw new Error('Nom d\'utilisateur requis pour l\'initialisation des clés de production');
          }
          globalKey = await cryptoManager.initializeProductionKeys(username);
        }

        if (globalKey) {
          setSymmetricKey(globalKey);
          setCryptoInitialized(true);
          setIsFallbackCrypto(false);
        } else {
          throw new Error('Impossible de générer la clé de chiffrement');
        }
      } catch (error) {
        console.error('Erreur lors de l\'initialisation du chiffrement:', error);
        setCryptoError(error instanceof Error ? error.message : 'Erreur inconnue');

        // Activer le mode dégradé
        await activateDegradedMode('Échec d\'initialisation du chiffrement');

        // Utiliser le fallback avec CryptoManager
        try {
          const fallbackKey = await cryptoManager.generateGlobalKey();
          setSymmetricKey(fallbackKey);
          setIsFallbackCrypto(true);
          setCryptoInitialized(true);
        } catch (fallbackError) {
          console.error('Échec du fallback crypto:', fallbackError);
          setCryptoError('Impossible d\'initialiser le chiffrement');
        }
      }
    };

    initializeCrypto();

    return () => {
      // Nettoyer les listeners
      cryptoErrorHandler.clearRetryCounters();
    };
  }, []);

  const handleJoin = async (name: string) => {
    setUsername(name);
    socket?.emit('register', name);

    // Initialiser le chiffrement après la connexion en production
    const isDevelopment = window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.port === '5173';

    if (!isDevelopment && !cryptoInitialized) {
      try {
        const globalKey = await cryptoManager.initializeProductionKeys(name);
        if (globalKey) {
          setSymmetricKey(globalKey);
          setCryptoInitialized(true);
          setIsFallbackCrypto(false);
        }
      } catch (error) {
        console.error('Erreur lors de l\'initialisation des clés de production:', error);
        await activateDegradedMode('Échec d\'initialisation des clés de production');
      }
    }
  };

  const handleSendMessage = async (message: string, replyTo?: Message | null) => {
    if (!socket) return;

    try {
      let messageData: Omit<Message, 'id'> & { replyTo?: Message };

      // Si le mode dégradé est actif, envoyer en texte clair
      if (isDegradedMode) {
        const plaintextMessage = await sendPlaintextMessage(message, username, 'global');
        messageData = {
          type: 'text',
          content: message, // Texte clair
          timestamp: plaintextMessage.timestamp,
          ...(replyTo ? { replyTo } : {})
        };

        // Ajouter un marqueur pour indiquer que c'est un message non chiffré
        (messageData as any).degradedMode = true;
      } else {
        // Mode chiffré normal
        if (!symmetricKey) {
          throw new Error('Clé de chiffrement non disponible');
        }

        const encrypted = await cryptoManager.encryptMessage(message, 'global');
        messageData = {
          type: 'text',
          content: JSON.stringify(encrypted),
          timestamp: Date.now(),
          ...(replyTo ? { replyTo } : {})
        };
      }

      socket.emit('chat message', messageData);
      announceToScreenReader(`Message envoyé: ${message}`);

    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);

      // Gérer l'erreur avec le CryptoErrorHandler
      const cryptoError: CryptoError = {
        name: 'CryptoError',
        message: error instanceof Error ? error.message : 'Erreur inconnue',
        type: 'ENCRYPTION_FAILED',
        context: 'global',
        recoverable: true
      };

      const result = await cryptoErrorHandler.handleError(cryptoError, 'global');

      if (result.action === 'degraded_mode') {
        // Réessayer en mode dégradé
        try {
          const plaintextMessage = await sendPlaintextMessage(message, username, 'global');
          const messageData = {
            type: 'text' as const,
            content: message,
            timestamp: plaintextMessage.timestamp,
            degradedMode: true,
            ...(replyTo ? { replyTo } : {})
          };

          socket.emit('chat message', messageData);
          announceToScreenReader(`Message envoyé en mode non sécurisé: ${message}`);
        } catch (degradedError) {
          console.error('Échec même en mode dégradé:', degradedError);
          announceToScreenReader('Impossible d\'envoyer le message');
        }
      }
    }
  };

  // Correction du type de la prop onSendFile pour chiffrer les fichiers en E2EE
  const handleSendFile = async (file: File) => {
    if (!socket || !isConnected) {
      alert('Connexion au serveur non établie.');
      return;
    }
    if (!symmetricKey) {
      alert('Clé de chiffrement non initialisée.');
      return;
    }
    // Traitement image (redimensionnement/compression sans perte visible)
    let processedFile = file;
    if (file.type.startsWith('image/')) {
      processedFile = await processImageFile(file, 1280);
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const fileData = reader.result as string;
      // Chiffrement du fichier (base64 ou ArrayBuffer)
      let encryptedFile;
      if (window.crypto && window.crypto.subtle && typeof symmetricKey !== 'string') {
        // Web Crypto : on chiffre le contenu base64 comme un message
        encryptedFile = await encryptMessageE2EE(fileData, symmetricKey);
      } else if (typeof symmetricKey === 'string') {
        encryptedFile = encryptMessageFallback(fileData, symmetricKey);
      } else {
        alert('Aucune méthode de chiffrement disponible pour les fichiers.');
        return;
      }
      const messageData = {
        type: 'file',
        fileData: JSON.stringify(encryptedFile),
        fileType: processedFile.type,
        fileName: processedFile.name,
        timestamp: Date.now()
      };
      socket.emit('chat message', messageData);
    };
    reader.readAsDataURL(processedFile); // On lit le fichier en base64 pour compatibilité
  };

  // Ajout de la gestion de l'envoi de messages vocaux
  const handleSendAudio = async (audioBase64: string) => {
    if (!symmetricKey) {
      alert('Clé de chiffrement non initialisée.');
      return;
    }
    const encrypted = await encryptMessageE2EE(audioBase64, symmetricKey);
    const messageData = {
      type: 'audio',
      fileData: JSON.stringify(encrypted),
      fileType: 'audio/webm',
      timestamp: Date.now()
    };
    socket?.emit('chat message', messageData);
  };

  // Déchiffrement lors de la réception d'un fichier
  useEffect(() => {
    if (!socket || !symmetricKey) return;
    const handleChatMessage = async (msg: Message) => {
      if (msg.type === 'text' && msg.content) {
        let decrypted = msg.content;

        console.log('Message reçu:', {
          content: msg.content,
          type: typeof msg.content,
          length: msg.content.length,
          startsWithBrace: msg.content.trim().startsWith('{'),
          endsWithBrace: msg.content.trim().endsWith('}'),
          hasSymmetricKey: !!symmetricKey,
          degradedMode: (msg as any).degradedMode
        });

        try {
          // Vérifier si c'est un message en mode dégradé
          if ((msg as any).degradedMode || isPlaintextMessage(msg)) {
            // Message en texte clair, pas de déchiffrement nécessaire
            console.log('Message en mode dégradé, pas de déchiffrement');
            decrypted = msg.content;
          } else if (
            typeof msg.content === 'string' &&
            msg.content.length > 0 &&
            msg.content.trim().startsWith('{') &&
            msg.content.trim().endsWith('}')
          ) {
            console.log('Tentative de déchiffrement du message...');
            // Message chiffré, tenter le déchiffrement
            const encrypted = JSON.parse(msg.content);
            console.log('Message parsé:', encrypted);
            if (encrypted && encrypted.iv && encrypted.content) {
              if (symmetricKey) {
                console.log('Déchiffrement avec clé symétrique...');
                decrypted = await cryptoManager.decryptMessage(encrypted, 'global');
                console.log('Message déchiffré:', decrypted);
              } else {
                throw new Error('Clé de déchiffrement non disponible');
              }
            }
          } else {
            console.log('Message non chiffré ou format non reconnu');
            // Essayer de déchiffrer même si le format n'est pas reconnu
            if (symmetricKey && msg.content.includes('iv') && msg.content.includes('content')) {
              try {
                console.log('Tentative de déchiffrement forcé...');
                const encrypted = JSON.parse(msg.content);
                if (encrypted && encrypted.iv && encrypted.content) {
                  decrypted = await cryptoManager.decryptMessage(encrypted, 'global');
                  console.log('Déchiffrement forcé réussi:', decrypted);
                }
              } catch (forceError) {
                console.log('Déchiffrement forcé échoué:', forceError);
              }
            }
          }
        } catch (error) {
          console.error('Erreur lors du déchiffrement:', error);

          // Gérer l'erreur de déchiffrement
          const cryptoError: CryptoError = {
            name: 'CryptoError',
            message: error instanceof Error ? error.message : 'Erreur inconnue',
            type: 'DECRYPTION_FAILED',
            context: 'global',
            recoverable: true
          };

          const result = await cryptoErrorHandler.handleError(cryptoError, 'global');

          if (result.success) {
            // Réessayer le déchiffrement si la récupération a réussi
            try {
              const encrypted = JSON.parse(msg.content);
              if (encrypted && encrypted.iv && encrypted.content && symmetricKey) {
                decrypted = await cryptoManager.decryptMessage(encrypted, 'global');
              }
            } catch (retryError) {
              decrypted = '[Message non déchiffrable]';
            }
          } else {
            decrypted = '[Message non déchiffrable]';
          }
        }

        msg.content = decrypted;

        // Annoncer le nouveau message aux lecteurs d'écran
        if (msg.username !== username) {
          const messageType = (msg as any).degradedMode ? ' (non sécurisé)' : '';
          announceToScreenReader(`Nouveau message de ${msg.username}${messageType}: ${decrypted}`);
        }
      } else if (msg.type === 'file' && msg.fileData) {
        let decryptedFile = msg.fileData;
        try {
          if (
            typeof msg.fileData === 'string' &&
            msg.fileData.trim().startsWith('{') &&
            msg.fileData.trim().endsWith('}')
          ) {
            const encrypted = JSON.parse(msg.fileData);
            if (encrypted && encrypted.iv && encrypted.content) {
              decryptedFile = await decryptMessageE2EE(encrypted, symmetricKey);
            }
          }
        } catch (e) {
          // Si déchiffrement impossible, on affiche le contenu brut
        }
        msg.fileData = decryptedFile;
        // Annoncer le nouveau fichier aux lecteurs d'écran
        if (msg.username !== username) {
          announceToScreenReader(`${msg.username} a partagé un fichier: ${msg.fileName}`);
        }
      } else if (msg.type === 'audio' && msg.fileData) {
        let decryptedAudio = msg.fileData;
        try {
          if (
            typeof msg.fileData === 'string' &&
            msg.fileData.trim().startsWith('{') &&
            msg.fileData.trim().endsWith('}')
          ) {
            const encrypted = JSON.parse(msg.fileData);
            if (encrypted && encrypted.iv && encrypted.content) {
              decryptedAudio = await decryptMessageE2EE(encrypted, symmetricKey);
            }
          }
        } catch (e) { }
        // Correction : s'assurer que le dataURL est bien préfixé
        if (typeof decryptedAudio === 'string' && !decryptedAudio.startsWith('data:audio/')) {
          const mime = msg.fileType && msg.fileType.startsWith('audio/') ? msg.fileType : 'audio/webm';
          decryptedAudio = `data:${mime};base64,${decryptedAudio.replace(/^data:[^,]+,/, '')}`;
        }
        msg.fileData = decryptedAudio;
        // Annoncer le nouveau message vocal aux lecteurs d'écran
        if (msg.username !== username) {
          announceToScreenReader(`${msg.username} a envoyé un message vocal`);
        }
      }
      setMessages((prev: Message[]) => [...prev, msg]);
    };
    socket.on('chat message', handleChatMessage);
    // Gestion des réactions
    const handleReactMessage = async (data: { messageId: number, reactions: any[] }) => {
      if (!symmetricKey || !decryptMessageE2EE) return;

      const decryptedReactions: { emoji: string, username: string, action?: string }[] = [];
      for (const encrypted of data.reactions) {
        try {
          const decrypted = await decryptMessageE2EE(encrypted, symmetricKey);
          const obj = JSON.parse(decrypted);
          decryptedReactions.push(obj);
        } catch (e) {
          console.warn('Erreur de déchiffrement de réaction:', e);
        }
      }

      // Regroupe par emoji en tenant compte des actions add/remove
      const reactionsMap: { [emoji: string]: string[] } = {};
      for (const r of decryptedReactions) {
        if (!reactionsMap[r.emoji]) reactionsMap[r.emoji] = [];

        if (r.action === 'remove') {
          // Retirer l'utilisateur de la réaction
          reactionsMap[r.emoji] = reactionsMap[r.emoji].filter(u => u !== r.username);
        } else {
          // Ajouter l'utilisateur (action 'add' ou pas d'action spécifiée)
          if (!reactionsMap[r.emoji].includes(r.username)) {
            reactionsMap[r.emoji].push(r.username);
          }
        }

        // Supprimer les emojis sans utilisateurs
        if (reactionsMap[r.emoji].length === 0) {
          delete reactionsMap[r.emoji];
        }
      }

      setMessages(prevMsgs => prevMsgs.map(m => {
        if (m.id !== data.messageId) return m;
        // Remplacer complètement les réactions au lieu de fusionner
        return { ...m, reactions: Object.keys(reactionsMap).length > 0 ? reactionsMap : undefined };
      }));
    };
    socket.on('react message', handleReactMessage);
    return () => {
      socket.off('chat message', handleChatMessage);
      socket.off('react message', handleReactMessage);
    };
  }, [socket, symmetricKey]);

  // Déconnexion utilisateur
  const handleLogout = () => {
    setUsername('');
    setMessages([]);
    setSymmetricKey(null); // Purge la clé à la déconnexion
    // Régénérer automatiquement une nouvelle clé
    generateSymmetricKey().then(setSymmetricKey);
    // Optionnel : socket?.disconnect();
  };



  // Chiffrement fallback (AES-GCM simulé par AES + IV concaténé)
  function encryptMessageFallback(message: string, keyHex: string) {
    const iv = CryptoJS.lib.WordArray.random(12);
    const encrypted = CryptoJS.AES.encrypt(message, CryptoJS.enc.Hex.parse(keyHex), {
      iv,
      mode: CryptoJS.mode.CBC, // GCM non supporté, CBC par défaut
      padding: CryptoJS.pad.Pkcs7
    });
    return {
      iv: Array.from(CryptoJS.enc.Hex.parse(iv.toString()).words, (w: number) => w >>> 0),
      content: encrypted.ciphertext.toString(CryptoJS.enc.Base64)
    };
  }

  function decryptMessageFallback(encrypted: { iv: number[], content: string }, keyHex: string) {
    try {
      const ivWordArray = CryptoJS.lib.WordArray.create(new Uint8Array(new Uint32Array(encrypted.iv).buffer));
      const cipherParams = CryptoJS.lib.CipherParams.create({
        ciphertext: CryptoJS.enc.Base64.parse(encrypted.content),
        iv: ivWordArray,
        key: CryptoJS.enc.Hex.parse(keyHex),
        algorithm: CryptoJS.algo.AES
      });
      const decrypted = CryptoJS.AES.decrypt(cipherParams, CryptoJS.enc.Hex.parse(keyHex), {
        iv: ivWordArray,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch {
      return encrypted.content;
    }
  }

  // Génération d'une clé symétrique automatique (Web Crypto ou fallback)
  async function generateSymmetricKey() {
    if (window.crypto && window.crypto.subtle) {
      setIsFallbackCrypto(false);
      return await window.crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
    } else {
      setIsFallbackCrypto(true);
      // Génère une clé aléatoire pour crypto-js
      return generateRandomPassword();
    }
  }

  // Chiffrement d'un message (Web Crypto ou fallback)
  async function encryptMessageE2EE(message: string, key: CryptoKey | string) {
    if (window.crypto && window.crypto.subtle && typeof key !== 'string') {
      const enc = new TextEncoder();
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const ciphertext = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        enc.encode(message)
      );
      return {
        iv: Array.from(iv),
        content: Array.from(new Uint8Array(ciphertext))
      };
    } else if (typeof key === 'string') {
      return encryptMessageFallback(message, key);
    } else {
      throw new Error('Aucune méthode de chiffrement disponible');
    }
  }

  // Déchiffrement d'un message (Web Crypto ou fallback)
  async function decryptMessageE2EE(encrypted: { iv: number[], content: any }, key: CryptoKey | string) {
    if (window.crypto && window.crypto.subtle && typeof key !== 'string') {
      try {
        const dec = new TextDecoder();
        const iv = new Uint8Array(encrypted.iv);
        const ciphertext = new Uint8Array(encrypted.content);
        const plaintext = await window.crypto.subtle.decrypt(
          { name: 'AES-GCM', iv },
          key,
          ciphertext
        );
        return dec.decode(plaintext);
      } catch {
        return encrypted.content;
      }
    } else if (typeof key === 'string') {
      return decryptMessageFallback(encrypted, key);
    } else {
      return encrypted.content;
    }
  }

  // Génère une clé aléatoire forte pour le fallback crypto-js
  function generateRandomPassword(length = 32) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+[]{};:,.<>?';
    const array = new Uint32Array(length);
    window.crypto.getRandomValues(array);
    return Array.from(array, x => charset[x % charset.length]).join('');
  }

  // Ajout de la fonction handleDeleteMessage si manquante
  const handleDeleteMessage = (id: number) => {
    if (socket) {
      socket.emit('delete message', { id });
    }
  };

  useEffect(() => {
    if (!socket) return;
    // Suppression d'un message côté client
    const handleMessageDeleted = ({ id }: { id: number }) => {
      console.log('[CLIENT] Message supprimé reçu id:', id, typeof id);
      setMessages(prev => prev.filter(msg => msg.id !== id));
    };
    socket.on('message deleted', handleMessageDeleted);
    return () => {
      socket.off('message deleted', handleMessageDeleted);
    };
  }, [socket]);

  // Gestion de la modification d'un message côté client
  useEffect(() => {
    if (!socket || !symmetricKey) return;
    const handleMessageEdited = async ({ id, content }: { id: number; content: string }) => {
      let decrypted = content;
      try {
        if (
          typeof content === 'string' &&
          content.length > 0 &&
          content.trim().startsWith('{') &&
          content.trim().endsWith('}')
        ) {
          const encrypted = JSON.parse(content);
          if (encrypted && encrypted.iv && encrypted.content) {
            decrypted = await decryptMessageE2EE(encrypted, symmetricKey);
          }
        }
      } catch (e) {
        // Si déchiffrement impossible, on affiche le contenu brut
      }
      setMessages(prev => prev.map(msg =>
        msg.id === id
          ? { ...msg, content: decrypted, edited: true }
          : msg
      ));
    };
    socket.on('message edited', handleMessageEdited);
    return () => {
      socket.off('message edited', handleMessageEdited);
    };
  }, [socket, symmetricKey]);

  const handleReply = (msg: Message) => {
    setReplyTo(msg);
  };

  // Fonction utilitaire pour redimensionner/comprimer une image sans perte visible
  async function processImageFile(file: File, maxWidth = 1280): Promise<File> {
    return new Promise((resolve) => {
      const img = new window.Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        // Format d'origine
        let mime = file.type;
        let quality = 1.0;
        // Si JPEG ou WebP, on peut ajuster la qualité (ici max)
        if (mime === 'image/jpeg' || mime === 'image/webp') {
          quality = 0.98;
        }
        canvas.toBlob((blob) => {
          if (blob) {
            const processedFile = new File([blob], file.name, { type: mime });
            resolve(processedFile);
          } else {
            resolve(file); // fallback
          }
          URL.revokeObjectURL(url);
        }, mime, quality);
      };
      img.onerror = () => {
        resolve(file); // fallback si erreur
        URL.revokeObjectURL(url);
      };
      img.src = url;
    });
  }

  useEffect(() => {
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add(theme === 'dark' ? 'theme-dark' : 'theme-light');
  }, [theme]);

  useEffect(() => {
    if (!socket) return;
    // Gestion de l'indicateur "en train d'écrire"
    const handleTyping = (user: string) => {
      console.log('[TYPING] reçu:', user);
      setTypingUsers(prev => prev.includes(user) ? prev : [...prev, user]);
    };
    const handleStopTyping = (user: string) => {
      console.log('[STOP TYPING] reçu:', user);
      setTypingUsers(prev => prev.filter(u => u !== user));
    };
    socket.on('typing', handleTyping);
    socket.on('stop typing', handleStopTyping);
    return () => {
      socket.off('typing', handleTyping);
      socket.off('stop typing', handleStopTyping);
    };
  }, [socket]);



  if (!username) {
    return (
      <>
        <Header
          accessibilitySettings={accessibilitySettings}
          onAccessibilityChange={updateAccessibilitySettings}
          customThemes={customThemes}
          activeCustomTheme={activeCustomTheme}
          onApplyCustomTheme={applyCustomTheme}
          onAddCustomTheme={addCustomTheme}
          onUpdateCustomTheme={updateCustomTheme}
          onDeleteCustomTheme={deleteCustomTheme}
        />
        <WelcomeScreen onJoin={handleJoin} />
      </>
    );
  }

  // Si le chiffrement n'est pas encore initialisé, afficher un écran de chargement
  if (!cryptoInitialized) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Initialisation sécurisée...</p>
          {cryptoError && (
            <p className="text-red-400 mt-2 text-sm">
              Erreur: {cryptoError}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      {/* Notification du mode dégradé */}
      {isDegradedMode && (
        <div className="bg-yellow-600 text-white p-2 text-center text-sm">
          ⚠️ Mode non sécurisé activé - Les messages ne sont pas chiffrés
        </div>
      )}

      <Header
        onLogout={handleLogout}
        isLoggedIn={!!username}
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        accessibilitySettings={accessibilitySettings}
        onAccessibilityChange={updateAccessibilitySettings}
        customThemes={customThemes}
        activeCustomTheme={activeCustomTheme}
        onApplyCustomTheme={applyCustomTheme}
        onAddCustomTheme={addCustomTheme}
        onUpdateCustomTheme={updateCustomTheme}
        onDeleteCustomTheme={deleteCustomTheme}
        currentView={currentView}
        onViewChange={handleViewChange}
        currentGroupName={currentGroupName}
        currentUsername={username}
      />
      <div className="flex-1 flex flex-col sm:flex-row overflow-hidden min-h-0">
        {currentView === 'chat' ? (
          // Vue Chat Global
          <>
            <aside
              className="hidden sm:block w-full sm:w-64 bg-black border-r-4 border-red-700 flex-shrink-0 z-0"
              role="complementary"
              aria-label="Liste des utilisateurs connectés"
            >
              <UserList users={users} currentUser={username} />
            </aside>
            <div className="flex-1 flex flex-col bg-black/80 border-l-0 sm:border-l-4 border-red-700 min-h-0">
              <main
                className="flex-1 overflow-y-auto p-4 space-y-4"
                role="main"
                aria-label="Messages du chat"
                aria-live="polite"
                aria-atomic="false"
              >
                {messages.filter(msg => typeof msg.id === 'number').map((msg: Message) => (
                  <ChatMessage
                    key={msg.id}
                    message={msg}
                    isOwnMessage={msg.username === username}
                    onDeleteMessage={handleDeleteMessage}
                    onReply={handleReply}
                    socket={socket}
                    symmetricKey={symmetricKey}
                    encryptMessageE2EE={encryptMessageE2EE}
                    encryptMessageFallback={encryptMessageFallback}
                    currentUser={username}
                  />
                ))}
                {/* Indicateur de saisie façon bulle Facebook */}
                {typingUsers.length > 0 && (
                  <div
                    className="flex items-center mb-2"
                    role="status"
                    aria-live="polite"
                    aria-label={typingUsers.length === 1
                      ? `${typingUsers[0]} est en train d'écrire`
                      : `${typingUsers.join(', ')} sont en train d'écrire`}
                  >
                    <div className="flex items-center bg-red-700/90 text-white rounded-full px-4 py-2 shadow-lg animate-pulse">
                      <span className="mr-2">⚑</span>
                      <span className="font-mono">
                        {typingUsers.length === 1
                          ? `${typingUsers[0]} prépare une insurrection...`
                          : `${typingUsers.join(', ')} préparent une insurrection...`}
                      </span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </main>
              <div
                className="flex-shrink-0 sticky bottom-0 z-10 bg-black/95 border-t-2 border-red-700"
                role="region"
                aria-label="Zone de saisie des messages"
              >
                <ChatInput
                  onSendMessage={handleSendMessage}
                  onSendFile={handleSendFile}
                  onSendAudio={handleSendAudio}
                  isConnected={isConnected}
                  users={users}
                  currentUser={username}
                  replyTo={replyTo}
                  onReplyHandled={() => setReplyTo(null)}
                  socket={socket}
                />
              </div>
            </div>
          </>
        ) : currentGroup ? (
          // Vue Chat de Groupe
          <GroupChat
            socket={socket}
            username={username}
            groupId={currentGroup}
            groupName={currentGroupName}
            onLeaveGroup={handleLeaveGroup}
          />
        ) : (
          // Vue Gestion des Groupes
          <GroupManager
            socket={socket}
            username={username}
            onJoinGroup={handleJoinGroup}
            currentGroup={currentGroup}
          />
        )}
      </div>
      {/* Affichage de l'avertissement si fallback JS */}
      {isFallbackCrypto && (
        <div className="fixed top-0 left-0 w-full bg-yellow-900 text-yellow-200 text-center py-2 z-50 font-mono text-xs shadow-lg">
          ⚠️ Chiffrement fallback JS (crypto-js) utilisé: sécurité réduite, changez de navigateur si possible.
        </div>
      )}
    </div>
  );
}

export default App;