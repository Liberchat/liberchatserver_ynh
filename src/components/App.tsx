import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { WelcomeScreen } from './WelcomeScreen';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import { UserList } from './UserList';
import { PrivateChat } from './PrivateChat';
import Header from './Header';
import { TranslationSettings } from './TranslationSettings';
import CryptoJS from 'crypto-js';
import { useAccessibility } from '../hooks/useAccessibility';
import { useCustomThemes } from '../hooks/useCustomThemes';
import { I18nProvider, useI18nContext } from '../contexts/I18nContext';
import { initLibsodium, encryptMessage, decryptMessage, toBase64, fromBase64, isLibsodiumReady } from '../crypto/libsodium-crypto';

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

function AppContent() {
  const { t } = useI18nContext();
  const [socket, setSocket] = useState<ReturnType<typeof io> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [username, setUsername] = useState(() => {
    // Récupère le nom d'utilisateur depuis localStorage
    return localStorage.getItem('liberchat-username') || '';
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [callingUser, setCallingUser] = useState<string>('');
  // State pour la clé symétrique (CryptoKey ou string selon le backend)
  const [symmetricKey, setSymmetricKey] = useState<CryptoKey | string | null>(null);
  const [keyPrompt, setKeyPrompt] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isFallbackCrypto, setIsFallbackCrypto] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [autoTranslationEnabled, setAutoTranslationEnabled] = useState(false);
  const [autoTranslationLanguage, setAutoTranslationLanguage] = useState('fr');
  const [useWasm, setUseWasm] = useState(false);
  const [wasmReady, setWasmReady] = useState(false);
  const [privateChatUser, setPrivateChatUser] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Stockage global des messages privés : { [username]: Message[] }
  const [privateMessages, setPrivateMessages] = useState<Record<string, Message[]>>({});

  // État pour les notifications (Toast)
  const [notification, setNotification] = useState<{ message: string, type: 'info' | 'success' | 'warning' | 'error' } | null>(null);

  // Son de notification (bruit blanc court généré ou URL externe)
  // Utilisation d'un bip simple encodé en base64 pour éviter les dépendances externes
  const playNotificationSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime); // La5
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      }
    } catch (e) {
      console.error("Audio error", e);
    }
  };

  // Gestion globale des messages privés entrants (Stockage + Notification)
  useEffect(() => {
    if (!socket) return;

    const handleGlobalPrivateMessage = (msg: any) => {
      // Adaptation selon si le serveur envoie { message: ... } ou directement le message
      const message = msg.message || msg;

      // Identifier l'interlocuteur (l'autre personne)
      const otherUser = message.from === username ? message.to : message.from;

      // Stocker le message
      setPrivateMessages(prev => {
        const conversation = prev[otherUser] || [];
        // Anti-doublon simple sur ID
        if (conversation.some(m => m.id === message.id)) return prev;

        return {
          ...prev,
          [otherUser]: [...conversation, message]
        };
      });

      // Notification seulement si le message vient d'un autre et qu'on n'est pas déjà en train de lui parler
      if (message.from !== username && message.from !== privateChatUser) {
        playNotificationSound();
        setNotification({
          message: `Nouveau message privé de ${message.from}`,
          type: 'info'
        });
        // Auto-fermeture après 5s
        setTimeout(() => setNotification(null), 5000);
      }
    };

    socket.on('private message', handleGlobalPrivateMessage);

    const handleGlobalPrivateReaction = ({ from, messageId, emoji }: any) => {
      setPrivateMessages(prev => {
        const otherUser = from;
        const conversation = prev[otherUser];
        if (!conversation) return prev;

        return {
          ...prev,
          [otherUser]: conversation.map(msg => {
            if (msg.id !== messageId) return msg;

            const reactions = { ...(msg.reactions || {}) };
            const userReactions = reactions[emoji] || [];

            if (userReactions.includes(from)) {
              reactions[emoji] = userReactions.filter(u => u !== from);
              if (reactions[emoji].length === 0) delete reactions[emoji];
            } else {
              reactions[emoji] = [...userReactions, from];
            }
            return { ...msg, reactions };
          })
        };
      });
    };
    socket.on('private reaction', handleGlobalPrivateReaction);

    return () => {
      socket.off('private message', handleGlobalPrivateMessage);
      socket.off('private reaction', handleGlobalPrivateReaction);
    };
  }, [socket, username, privateChatUser]);

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



  // Initialisation de libsodium (chiffrement sécurisé)
  useEffect(() => {
    if (!wasmReady) {
      // console.log('🔥 Initialisation de libsodium (chiffrement sécurisé)...');

      initLibsodium()
        .then(() => {
          // console.log('✅ Libsodium initialisé avec succès');
          setUseWasm(true);
          setWasmReady(true);
          setSymmetricKey('libsodium-initialized' as any);
          setIsFallbackCrypto(false);
        })
        .catch((error) => {
          console.error('❌ Erreur lors de l\'initialisation de libsodium:', error);
          setUseWasm(false);
          setWasmReady(false);
          setIsFallbackCrypto(true);

          // Fallback sur l'ancien système JavaScript obfusqué
          const _b = (arr: number[]) => arr.map(n => n ^ 0x5A);
          const _d = (n: number) => String.fromCharCode(n);
          const _e = (arr: number[]) => arr.map(_d).join('');

          const _data1 = [8, 63, 44, 53, 54, 47, 46, 51, 53, 52];
          const _data2 = [9, 53, 57, 51, 59, 54, 63];
          const _data3 = [104, 106, 104, 108, 5];
          const _data4 = [22, 51, 56, 63, 40];
          const _data5 = [25, 50, 59, 46, 5, 8772];

          const _parts = [_e(_b(_data1)), _e(_b(_data2)), _e(_b(_data3)), _e(_b(_data4)), _e(_b(_data5))];
          const k = _parts.join('');

          setKeyInput(k);
          generateSymmetricKeyFromPassword(k).then(setSymmetricKey);
        });
    }
  }, [wasmReady]);

  // Sauvegarde du nom d'utilisateur dans localStorage
  useEffect(() => {
    if (username) {
      localStorage.setItem('liberchat-username', username);
    }
  }, [username]);

  // Reconnexion automatique si un nom d'utilisateur est sauvegardé
  useEffect(() => {
    if (username && socket && isConnected && !users.find(u => u.username === username)) {
      socket.emit('register', username);
    }
  }, [username, socket, isConnected, users]);

  // Réinitialisation automatique au premier chargement de la version 6.6
  useEffect(() => {
    const version = localStorage.getItem('liberchat-version');
    if (version !== '6.6') {
      // Nettoyer toutes les anciennes configurations
      localStorage.removeItem('liberchat-custom-themes');
      localStorage.removeItem('liberchat-active-theme');
      localStorage.removeItem('liberchat-accessibility');
      // Marquer la version actuelle
      localStorage.setItem('liberchat-version', '6.6');
    }
  }, []);

  // Si on a un nom sauvegardé au démarrage, on passe directement au chat
  useEffect(() => {
    const savedUsername = localStorage.getItem('liberchat-username');
    if (savedUsername && !username) {
      setUsername(savedUsername);
    }
  }, []);

  useEffect(() => {
    // Connexion Socket.IO dynamique selon l'environnement
    let socketUrl = '';
    let socketPath = '/socket.io/';

    if (import.meta.env.DEV) {
      socketUrl = 'http://localhost:3000';
    } else {
      // Utilise l'origine de la page (supporte HTTPS, Tor, reverse proxy, etc.)
      let port = window.location.port;
      const portPart = port ? `:${port}` : '';
      socketUrl = `${window.location.protocol}//${window.location.hostname}${portPart}`;

      // Détection du chemin YunoHost depuis l'URL actuelle
      const currentPath = window.location.pathname;
      if (currentPath !== '/' && !currentPath.startsWith('/socket.io')) {
        const pathMatch = currentPath.match(/^(\/[^/]+)/);
        if (pathMatch) {
          socketPath = `${pathMatch[1]}/socket.io/`;
        }
      }
    }



    const newSocket = io(socketUrl, {
      path: socketPath,
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: true,
      timeout: 20000
    });
    setSocket(newSocket);

    newSocket.on('connect', () => setIsConnected(true));
    newSocket.on('disconnect', () => setIsConnected(false));
    newSocket.on('connect_error', (err: any) => {
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

  useEffect(() => {
    // Génère la clé symétrique dès que keyInput est défini (chiffrement automatique)
    if (keyInput && !symmetricKey) {
      generateSymmetricKeyFromPassword(keyInput).then(setSymmetricKey);

    }
  }, [keyInput, symmetricKey]);

  const handleJoin = (name: string) => {
    setUsername(name);
    socket?.emit('register', name);
  };

  const handleSendMessage = async (message: string, replyTo?: Message | null) => {
    if (!symmetricKey && !wasmReady) return;

    let encryptedContent: string;

    if (useWasm && wasmReady) {
      // Chiffrement avec libsodium (XChaCha20-Poly1305)
      try {
        const encrypted = await encryptMessage(message);
        encryptedContent = toBase64(encrypted);
      } catch (error) {
        console.error('Erreur de chiffrement libsodium:', error);
        return;
      }
    } else {
      // Fallback sur JavaScript obfusqué
      const encrypted = await encryptMessageE2EE(message, symmetricKey);
      encryptedContent = JSON.stringify(encrypted);
    }

    // On transmet tout l'objet replyTo pour permettre l'affichage complet (image, nom, etc.)
    const messageData: Omit<Message, 'id'> & { replyTo?: Message } = {
      type: 'text',
      username,
      content: encryptedContent,
      timestamp: Date.now(),
      ...(replyTo ? { replyTo } : {})
    };
    socket?.emit('chat message', messageData);
    announceToScreenReader(`Message envoyé: ${message}`);
  };

  // Correction du type de la prop onSendFile pour chiffrer les fichiers en E2EE
  const handleSendFile = async (file: File) => {
    if (!socket || !isConnected) {
      alert(t.messages.connectionNotEstablished);
      return;
    }
    if (!symmetricKey && !wasmReady) {
      alert(t.errors.encryptionKeyNotInitialized);
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
      // Chiffrement du fichier
      let encryptedFileStr;

      if (useWasm && wasmReady) {
        // Chiffrement avec libsodium
        try {
          const encrypted = await encryptMessage(fileData);
          encryptedFileStr = toBase64(encrypted);
        } catch (error) {
          console.error('Erreur chiffrement fichier libsodium:', error);
          return;
        }
      } else if (window.crypto && window.crypto.subtle && typeof symmetricKey !== 'string') {
        // Web Crypto API
        const encrypted = await encryptMessageE2EE(fileData, symmetricKey);
        encryptedFileStr = JSON.stringify(encrypted);
      } else if (typeof symmetricKey === 'string') {
        // Fallback CryptoJS
        encryptedFileStr = JSON.stringify(encryptMessageFallback(fileData, symmetricKey));
      } else {
        alert('Aucune méthode de chiffrement disponible pour les fichiers.');
        return;
      }

      const messageData: Message = {
        id: Date.now(),
        type: 'file',
        username,
        fileData: encryptedFileStr,
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
    if (!symmetricKey && !wasmReady) {
      alert(t.errors.encryptionKeyNotInitialized);
      return;
    }

    let encryptedAudioStr;

    if (useWasm && wasmReady) {
      try {
        const encrypted = await encryptMessage(audioBase64);
        encryptedAudioStr = toBase64(encrypted);
      } catch (error) {
        console.error('Erreur chiffrement audio libsodium:', error);
        return;
      }
    } else {
      const encrypted = await encryptMessageE2EE(audioBase64, symmetricKey);
      encryptedAudioStr = JSON.stringify(encrypted);
    }

    const messageData: Message = {
      id: Date.now(),
      type: 'audio',
      username,
      fileData: encryptedAudioStr,
      fileType: 'audio/webm',
      timestamp: Date.now()
    };
    socket?.emit('chat message', messageData);
  };

  // Déchiffrement lors de la réception d'un fichier
  useEffect(() => {
    if (!socket || (!symmetricKey && !wasmReady)) return;
    const handleChatMessage = async (msg: Message) => {
      if (msg.type === 'text' && msg.content) {
        let decrypted = msg.content;
        try {
          // Essayer d'abord de détecter le format du message
          const isBase64Wasm = typeof msg.content === 'string' &&
            !msg.content.trim().startsWith('{') &&
            msg.content.length > 0;
          const isJsonFormat = typeof msg.content === 'string' &&
            msg.content.trim().startsWith('{') &&
            msg.content.trim().endsWith('}');

          if (isBase64Wasm && useWasm && wasmReady) {
            // Message chiffré avec libsodium (format base64)
            try {
              const encryptedBytes = fromBase64(msg.content);
              decrypted = await decryptMessage(encryptedBytes);
            } catch (libsodiumError) {
              console.error('Erreur déchiffrement libsodium:', libsodiumError);
              console.warn('⚠️ Impossible de déchiffrer ce message');
              decrypted = '[Message chiffré - erreur]';
            }
          } else if (isJsonFormat) {
            // Message chiffré avec JavaScript (format JSON)
            try {
              const encrypted = JSON.parse(msg.content);
              if (encrypted && encrypted.iv && encrypted.content) {
                decrypted = await decryptMessageE2EE(encrypted, symmetricKey);
              }
            } catch (jsonError) {
              console.error('Erreur déchiffrement JSON:', jsonError);
            }
          } else if (isBase64Wasm && !useWasm) {
            // Message libsodium reçu mais libsodium non disponible
            console.warn('⚠️ Message chiffré avec libsodium reçu, mais libsodium non disponible sur cet appareil');
            decrypted = '[Message chiffré - incompatible]';
          }
        } catch (e) {
          // Si déchiffrement impossible, on affiche le contenu brut
          console.error('Erreur de déchiffrement:', e);
        }
        msg.content = decrypted;
        // Annoncer le nouveau message aux lecteurs d'écran
        if (msg.username !== username) {
          announceToScreenReader(`Nouveau message de ${msg.username}: ${decrypted}`);
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
          } else if (useWasm && wasmReady && typeof msg.fileData === 'string' && msg.fileData.length > 0) {
            // Essai déchiffrement libsodium
            try {
              const bytes = fromBase64(msg.fileData);
              decryptedFile = await decryptMessage(bytes);
            } catch (e) { console.error('Erreur decro file libsodium', e); }
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
          } else if (useWasm && wasmReady && typeof msg.fileData === 'string' && msg.fileData.length > 0) {
            // Essai déchiffrement libsodium
            try {
              const bytes = fromBase64(msg.fileData);
              decryptedAudio = await decryptMessage(bytes);
            } catch (e) { console.error('Erreur decro audio libsodium', e); }
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
      // On accepte WASM ou WebCrypto
      if ((!symmetricKey && !wasmReady) || (!decryptMessageE2EE && !decryptMessage)) return;

      const decryptedReactions: { emoji: string, username: string }[] = [];
      for (const encrypted of data.reactions) {
        try {
          // Tentative 1: WASM (String Base64)
          if (useWasm && wasmReady && typeof encrypted === 'string' && !encrypted.trim().startsWith('{')) {
            const raw = fromBase64(encrypted);
            const decrypted = await decryptMessage(raw);
            const obj = JSON.parse(decrypted);
            decryptedReactions.push(obj);
            continue; // Succès
          }

          // Tentative 2: WebCrypto (Object ou JSON String)
          if (symmetricKey) {
            let encryptedObj = encrypted;
            // Si c'est une string JSON (cas WebCrypto stringifié)
            if (typeof encrypted === 'string' && encrypted.trim().startsWith('{')) {
              encryptedObj = JSON.parse(encrypted);
            }

            const decrypted = await decryptMessageE2EE(encryptedObj, symmetricKey);
            const obj = JSON.parse(decrypted);
            decryptedReactions.push(obj);
          }
        } catch (e) {
          // console.log("Fail decrypt reaction", e);
        }
      }
      // Regroupe par emoji
      const reactionsMap: { [emoji: string]: string[] } = {};
      for (const r of decryptedReactions) {
        if (!reactionsMap[r.emoji]) reactionsMap[r.emoji] = [];
        // Eviter doublons
        if (!reactionsMap[r.emoji].includes(r.username)) {
          reactionsMap[r.emoji].push(r.username);
        }
      }
      setMessages(prevMsgs => prevMsgs.map(m => {
        if (m.id !== data.messageId) return m;
        return { ...m, reactions: reactionsMap };
      }));
    };
    socket.on('react message', handleReactMessage);
    return () => {
      socket.off('chat message', handleChatMessage);
      socket.off('react message', handleReactMessage);
    };
  }, [socket, symmetricKey]);

  // Gestion du bouton "Déverrouiller le chat"
  const handleUnlock = () => {
    if (!keyInput.trim()) {
      // Générer une clé aléatoire et l'afficher à l'utilisateur
      const randomKey = generateRandomPassword();
      setGeneratedKey(randomKey);
      setKeyInput(randomKey);
      setCopied(false);
    } else {
      setKeyPrompt(false);
    }
  };

  // Nouvelle fonction pour accès sans chiffrement
  const handleAccessWithoutEncryption = () => {
    setKeyInput('no-encryption');
    setKeyPrompt(false);
  };

  // Nouvelle fonction pour valider l'accès après partage de la clé
  const handleAccessAfterShare = () => {
    setKeyPrompt(false);
    setGeneratedKey(null); // Réinitialise l'état pour éviter tout effet de bord
  };

  // Déconnexion utilisateur
  const handleLogout = (clearLocalData = false) => {
    setUsername(''); // On vide toujours le nom du state pour se déconnecter
    setMessages([]);
    setSymmetricKey(null); // Purge la clé à la déconnexion
    setKeyInput('');
    setGeneratedKey(null);
    setCopied(false);

    // Supprime les données locales si demandé
    if (clearLocalData) {
      localStorage.removeItem('liberchat-username');
      setKeyPrompt(true); // Réaffiche l'écran de saisie de clé seulement si on supprime les données
    } else {
      // Si on garde les données, le nom reste dans localStorage
      // et sera rechargé automatiquement à l'écran de connexion
      setKeyPrompt(false);
    }

    // Optionnel : socket?.disconnect();
  };

  // Expiration automatique de la clé après 2h30min (9000000 ms)
  useEffect(() => {
    if (!symmetricKey) return;
    const timeout = setTimeout(() => {
      setSymmetricKey(null); // Purge la clé
      setKeyPrompt(true);    // Réaffiche l'écran de saisie de clé
      setKeyInput('');
      setGeneratedKey(null);
      setCopied(false);
    }, 9000000); // 2h30min
    return () => clearTimeout(timeout);
  }, [symmetricKey]);

  // Génération d'une "clé" utilisable par crypto-js (string hex) à partir du mot de passe
  function deriveKeyFallback(password: string) {
    return CryptoJS.PBKDF2(password, 'liberchat-salt', {
      keySize: 256 / 32,
      iterations: 100000,
      hasher: CryptoJS.algo.SHA256
    }).toString(CryptoJS.enc.Hex);
  }

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

  // Génération d'une clé symétrique (Web Crypto ou fallback)
  async function generateSymmetricKeyFromPassword(password: string) {
    if (window.crypto && window.crypto.subtle) {
      setIsFallbackCrypto(false);
      const enc = new TextEncoder();
      const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        enc.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );
      return await window.crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: enc.encode('liberchat-salt'),
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
    } else {
      setIsFallbackCrypto(true);
      // Retourne la clé dérivée (string hex) pour crypto-js
      return deriveKeyFallback(password);
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

  // Génère une clé aléatoire forte (32 caractères alphanumériques + symboles)
  function generateRandomPassword(length = 32) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+[]{};:,.<>?';
    const array = new Uint32Array(length);
    window.crypto.getRandomValues(array);
    return Array.from(array, x => charset[x % charset.length]).join('');
  }

  // Ajout de la fonction handleDeleteMessage si manquante
  const handleDeleteMessage = (id: number) => {
    if (socket) {
      socket.emit('delete message', id);
    }
  };

  useEffect(() => {
    if (!socket) return;
    // Suppression d'un message côté client
    const handleMessageDeleted = (id: number) => {
      // Si id est reçu dans un objet (ancien protocole ou erreur), on check
      const messageId = typeof id === 'object' && (id as any).id ? (id as any).id : id;
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
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
      let success = false;

      try {
        // Tentative 1: WASM (Base64 string sans accolades)
        if (useWasm && wasmReady && typeof content === 'string' && !content.trim().startsWith('{')) {
          try {
            const raw = fromBase64(content);
            decrypted = await decryptMessage(raw);
            success = true;
          } catch (e) { }
        }

        // Tentative 2: WebCrypto (JSON string)
        if (!success && symmetricKey && content.trim().startsWith('{')) {
          const encrypted = JSON.parse(content);
          if (encrypted && (encrypted.iv || encrypted.ct)) { // ct pour fallback
            decrypted = await decryptMessageE2EE(encrypted, symmetricKey);
          }
        }
      } catch (e) {
        // Si déchiffrement impossible, on affiche le contenu brut (qui sera affiché en erreur par ChatMessage)
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
  }, [socket, symmetricKey, useWasm, wasmReady]);

  const handleReply = (msg: Message) => {
    setReplyTo(msg);
  };

  const handleTranslationSettingsChange = (enabled: boolean, targetLanguage: string) => {
    setAutoTranslationEnabled(enabled);
    setAutoTranslationLanguage(targetLanguage);
  };

  const handleStartPrivateChat = (username: string) => {
    setPrivateChatUser(username);
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
    // Gestion de l'indicateur "en train d'écrire"
    const handleTyping = (data: any) => {
      const user = typeof data === 'object' && data.username ? data.username : data;
      if (typeof user !== 'string') return;
      setTypingUsers(prev => prev.includes(user) ? prev : [...prev, user]);
    };
    const handleStopTyping = (data: any) => {
      const user = typeof data === 'object' && data.username ? data.username : data;
      setTypingUsers(prev => prev.filter(u => u !== user));
    };
    socket.on('typing', handleTyping);
    socket.on('stop typing', handleStopTyping);
    return () => {
      socket.off('typing', handleTyping);
      socket.off('stop typing', handleStopTyping);
    };
  }, [socket]);

  // Écran de chiffrement supprimé - initialisation automatique

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
          onTranslationSettingsChange={handleTranslationSettingsChange}
        />
        <WelcomeScreen onJoin={handleJoin} />
      </>
    );
  }

  // La clé s'initialise automatiquement en arrière-plan



  // Callbacks de frappe
  const handleTyping = () => { if (isConnected && socket) socket.emit('typing', { room: 'public' }); };
  const handleStopTyping = () => { if (isConnected && socket) socket.emit('stop typing', { room: 'public' }); };

  return (
    <div className={`h-screen flex flex-col bg-gray-900 text-white ${theme === 'dark' ? 'dark' : ''}`}>
      {/* Toast Notification (Nouveau) */}
      {notification && (
        <div className="fixed top-20 right-4 z-50 animate-bounce-in">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border-l-4 bg-black border-red-600 text-white`}>
            <span className="text-xl">💬</span>
            <div>
              <h4 className="font-bold text-sm text-red-500">Notification</h4>
              <p className="text-sm font-mono">{notification.message}</p>
            </div>
            <button
              onClick={() => {
                setNotification(null);
                if (notification.message.includes('message privé')) {
                  const match = notification.message.match(/de (.+)$/);
                  if (match) setPrivateChatUser(match[1]);
                }
              }}
              className="ml-2 text-gray-400 hover:text-white"
            >✕</button>
          </div>
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
        onTranslationSettingsChange={handleTranslationSettingsChange}
      />

      <div className="flex-1 flex flex-col sm:flex-row overflow-hidden min-h-0">
        <aside
          className="hidden sm:block w-full sm:w-64 bg-black border-r-4 border-red-700 flex-shrink-0 z-0"
          role="complementary"
          aria-label="Liste des utilisateurs connectés"
        >
          <UserList
            users={users}
            currentUser={username}
            onStartPrivateChat={(user) => setPrivateChatUser(user)}
          />
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
                encryptMessageWasm={encryptMessage}
                toBase64Wasm={toBase64}
                isWasmReady={useWasm && wasmReady}
                autoTranslationEnabled={autoTranslationEnabled}
                autoTranslationLanguage={autoTranslationLanguage}
              />
            ))}

            {typingUsers.length > 0 && (
              <div className="flex items-center mb-2">
                <div className="flex items-center bg-red-700/90 text-white rounded-full px-4 py-2 shadow-lg animate-pulse">
                  <span className="mr-2">⚑</span>
                  <span className="font-mono">
                    {typingUsers.length === 1
                      ? `${typingUsers[0]} ${t.chat.typingSingle}`
                      : `${typingUsers.join(', ')} ${t.chat.typingMultiple}`}
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </main>

          <div className="flex-shrink-0 z-10 bg-black border-t-2 border-red-700 p-2">
            {replyTo && (
              <div className="px-4 py-2 bg-red-900/30 border-b border-red-800 flex justify-between items-center text-sm mb-2 rounded">
                <span className="text-gray-300 truncate">
                  Réponse à <span className="font-bold text-red-400">{replyTo.username}</span>: {replyTo.content?.substring(0, 50)}...
                </span>
                <button onClick={() => setReplyTo(null)} className="text-red-400 hover:text-white">✕</button>
              </div>
            )}
            <ChatInput
              onSendMessage={handleSendMessage}
              onSendFile={handleSendFile}
              onSendAudio={handleSendAudio}
              isConnected={isConnected && wasmReady}
              users={users}
              currentUser={username}
              replyTo={replyTo}
              onReplyHandled={() => setReplyTo(null)}
              socket={socket}
              onTyping={handleTyping}
              onStopTyping={handleStopTyping}
              autoTranslationEnabled={autoTranslationEnabled}
              autoTranslationLanguage={autoTranslationLanguage}
              onTranslationSettingsChange={handleTranslationSettingsChange}
            />
          </div>

          {!isConnected && (
            <div className="absolute top-0 w-full bg-red-600 text-white text-center py-1 text-sm font-bold z-20">
              {t.messages.reconnecting}
            </div>
          )}
        </div>
      </div>

      {/* UserList pour Mobile (Bouton flottant) */}
      <div className="sm:hidden">
        <UserList
          users={users}
          currentUser={username}
          onStartPrivateChat={(user) => setPrivateChatUser(user)}
          isMobile={true}
        />
      </div>

      {privateChatUser && socket && (
        <PrivateChat
          currentUser={username}
          recipientUser={privateChatUser}
          socket={socket}
          onClose={() => setPrivateChatUser(null)}
          encryptionKey={symmetricKey}
          encryptMessageE2EE={encryptMessageE2EE}
          decryptMessageE2EE={decryptMessageE2EE}
          autoTranslateEnabled={autoTranslationEnabled}
          targetLanguage={autoTranslationLanguage}
          initialMessages={privateMessages[privateChatUser] || []}
          onReact={(messageId, emoji) => {
            // Mise à jour optimiste locale
            setPrivateMessages(prev => {
              const conversation = prev[privateChatUser] || [];
              return {
                ...prev,
                [privateChatUser]: conversation.map(msg => {
                  if (msg.id !== messageId) return msg;
                  const reactions = { ...(msg.reactions || {}) };
                  const userReactions = reactions[emoji] || [];
                  if (userReactions.includes(username)) {
                    reactions[emoji] = userReactions.filter(u => u !== username);
                    if (reactions[emoji].length === 0) delete reactions[emoji];
                  } else {
                    reactions[emoji] = [...userReactions, username];
                  }
                  return { ...msg, reactions };
                })
              };
            });
            // Envoi au serveur
            socket.emit('private reaction', { to: privateChatUser, messageId, emoji });
          }}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <I18nProvider>
      <AppContent />
    </I18nProvider>
  );
}

export default App;