import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Send, ArrowLeft, Check, CheckCheck, Paperclip, Mic, Square, Image as ImageIcon } from 'lucide-react';
import { useI18nContext } from '../contexts/I18nContext';
import { AutoTranslation } from './AutoTranslation';
import { TranslationSettings } from './TranslationSettings';

interface PrivateMessage {
  id: number;
  type: 'text' | 'file' | 'audio';
  from: string;
  to: string;
  content?: string;
  fileData?: string;
  fileType?: string;
  fileName?: string;
  timestamp: number;
  replyTo?: PrivateMessage;
  read?: boolean;
}

interface PrivateChatProps {
  socket: any;
  currentUser: string;
  targetUser: string;
  onClose: () => void;
  symmetricKey: CryptoKey | string | null;
  encryptMessageE2EE: (msg: string, key: CryptoKey | string) => Promise<any>;
  decryptMessageE2EE: (encrypted: any, key: CryptoKey | string) => Promise<string>;
  useWasm: boolean;
  wasmReady: boolean;
  encryptWasm?: (msg: string) => Promise<Uint8Array>;
  decryptWasm?: (encrypted: Uint8Array) => Promise<string>;
  uint8ArrayToBase64?: (arr: Uint8Array) => string;
  base64ToUint8Array?: (str: string) => Uint8Array;
  autoTranslationEnabled?: boolean;
  autoTranslationLanguage?: string;
  onTranslationSettingsChange?: (enabled: boolean, language: string) => void;
}

const PrivateChat: React.FC<PrivateChatProps> = ({
  socket,
  currentUser,
  targetUser,
  onClose,
  symmetricKey,
  encryptMessageE2EE,
  decryptMessageE2EE,
  useWasm,
  wasmReady,
  encryptWasm,
  decryptWasm,
  uint8ArrayToBase64,
  base64ToUint8Array,
  autoTranslationEnabled = false,
  autoTranslationLanguage = 'fr',
  onTranslationSettingsChange
}) => {
  const { t } = useI18nContext();
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [localAutoTranslate, setLocalAutoTranslate] = useState(autoTranslationEnabled);
  const [localTranslateLang, setLocalTranslateLang] = useState(autoTranslationLanguage);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sync avec les props
  useEffect(() => {
    setLocalAutoTranslate(autoTranslationEnabled);
    setLocalTranslateLang(autoTranslationLanguage);
  }, [autoTranslationEnabled, autoTranslationLanguage]);

  const handleTranslationChange = (enabled: boolean, language: string) => {
    setLocalAutoTranslate(enabled);
    setLocalTranslateLang(language);
    onTranslationSettingsChange?.(enabled, language);
  };

  // Fonction de déchiffrement
  const decryptContent = useCallback(async (content: string): Promise<string> => {
    if (!content) return content;
    
    try {
      const isJsonFormat = typeof content === 'string' &&
        content.trim().startsWith('{') &&
        content.trim().endsWith('}');

      if (isJsonFormat && symmetricKey && symmetricKey !== 'wasm-initialized') {
        try {
          const encrypted = JSON.parse(content);
          if (encrypted && encrypted.iv && encrypted.content) {
            const decrypted = await decryptMessageE2EE(encrypted, symmetricKey);
            return decrypted;
          }
        } catch (jsonError) {
          console.error('Erreur déchiffrement JSON:', jsonError);
        }
      }
    } catch (e) {
      console.error('Erreur déchiffrement générale:', e);
    }
    
    return content;
  }, [symmetricKey, decryptMessageE2EE]);

  // Fonction de chiffrement
  const encryptContent = useCallback(async (content: string): Promise<string> => {
    if (symmetricKey && symmetricKey !== 'wasm-initialized') {
      try {
        const encrypted = await encryptMessageE2EE(content, symmetricKey);
        return JSON.stringify(encrypted);
      } catch (e) {
        console.error('Erreur chiffrement E2EE:', e);
      }
    }
    
    if (useWasm && wasmReady && encryptWasm && uint8ArrayToBase64) {
      try {
        const encrypted = await encryptWasm(content);
        return uint8ArrayToBase64(encrypted);
      } catch (e) {
        console.error('Erreur chiffrement WASM:', e);
      }
    }
    
    return content;
  }, [symmetricKey, encryptMessageE2EE, useWasm, wasmReady, encryptWasm, uint8ArrayToBase64]);

  // Charger l'historique au montage
  useEffect(() => {
    if (socket && targetUser) {
      socket.emit('get private history', { with: targetUser });
    }
  }, [socket, targetUser]);

  // Écouter les événements
  useEffect(() => {
    if (!socket) return;

    const handlePrivateMessage = async (msg: PrivateMessage) => {
      if ((msg.from === targetUser && msg.to === currentUser) ||
          (msg.from === currentUser && msg.to === targetUser)) {
        
        if (msg.from === currentUser) {
          setMessages(prev => {
            const lastTempMsg = prev.find(m => 
              m.from === currentUser && 
              m.to === targetUser && 
              Math.abs(m.timestamp - msg.timestamp) < 5000
            );
            
            if (lastTempMsg) {
              return prev.map(m => 
                m.id === lastTempMsg.id ? { ...m, id: msg.id } : m
              );
            }
            return prev;
          });
          return;
        }
        
        // Déchiffrer le contenu
        let decryptedContent = msg.content || '';
        let decryptedFileData = msg.fileData || '';
        
        if (msg.content) {
          decryptedContent = await decryptContent(msg.content);
        }
        if (msg.fileData) {
          decryptedFileData = await decryptContent(msg.fileData);
        }
        
        const decryptedMsg = { ...msg, content: decryptedContent, fileData: decryptedFileData };
        
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, decryptedMsg];
        });

        socket.emit('mark private read', { from: targetUser });
      }
    };

    const handlePrivateHistory = async (data: { with: string; messages: PrivateMessage[] }) => {
      if (data.with === targetUser) {
        const decryptedMessages: PrivateMessage[] = [];
        
        for (const msg of data.messages) {
          let decryptedContent = msg.content || '';
          let decryptedFileData = msg.fileData || '';
          
          if (msg.content) {
            decryptedContent = await decryptContent(msg.content);
          }
          if (msg.fileData) {
            decryptedFileData = await decryptContent(msg.fileData);
          }
          decryptedMessages.push({ ...msg, content: decryptedContent, fileData: decryptedFileData });
        }
        
        setMessages(decryptedMessages);
        socket.emit('mark private read', { from: targetUser });
      }
    };

    const handlePrivateTyping = (data: { from: string }) => {
      if (data.from === targetUser) setOtherTyping(true);
    };

    const handlePrivateStopTyping = (data: { from: string }) => {
      if (data.from === targetUser) setOtherTyping(false);
    };

    const handlePrivateDeleted = (data: { id: number; with: string }) => {
      if (data.with === targetUser) {
        setMessages(prev => prev.filter(m => m.id !== data.id));
      }
    };

    const handleMessagesRead = (data: { by: string }) => {
      if (data.by === targetUser) {
        setMessages(prev => prev.map(m => 
          m.from === currentUser ? { ...m, read: true } : m
        ));
      }
    };

    socket.on('private message', handlePrivateMessage);
    socket.on('private history', handlePrivateHistory);
    socket.on('private typing', handlePrivateTyping);
    socket.on('private stop typing', handlePrivateStopTyping);
    socket.on('private message deleted', handlePrivateDeleted);
    socket.on('private messages read', handleMessagesRead);

    return () => {
      socket.off('private message', handlePrivateMessage);
      socket.off('private history', handlePrivateHistory);
      socket.off('private typing', handlePrivateTyping);
      socket.off('private stop typing', handlePrivateStopTyping);
      socket.off('private message deleted', handlePrivateDeleted);
      socket.off('private messages read', handleMessagesRead);
    };
  }, [socket, targetUser, currentUser, decryptContent]);

  // Scroll automatique
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Gestion de la saisie
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    
    if (!isTyping) {
      setIsTyping(true);
      socket?.emit('private typing', { to: targetUser });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket?.emit('private stop typing', { to: targetUser });
    }, 2000);
  };

  // Envoi du message texte
  const handleSend = async () => {
    if (!inputValue.trim() || !socket) return;

    const messageText = inputValue.trim();
    
    try {
      const encryptedContent = await encryptContent(messageText);
      
      socket.emit('private message', {
        to: targetUser,
        content: encryptedContent,
        type: 'text'
      });

      const tempMessage: PrivateMessage = {
        id: Date.now(),
        type: 'text',
        from: currentUser,
        to: targetUser,
        content: messageText,
        timestamp: Date.now(),
        read: false
      };
      
      setMessages(prev => [...prev, tempMessage]);
      setInputValue('');
      setIsTyping(false);
      socket.emit('private stop typing', { to: targetUser });
    } catch (e) {
      console.error('Erreur envoi MP:', e);
    }
  };

  // Envoi de fichier/image
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !socket) return;

    // Vérifier la taille (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert(t.messages.fileTooLarge);
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const fileData = reader.result as string;
      
      try {
        const encryptedFileData = await encryptContent(fileData);
        
        socket.emit('private message', {
          to: targetUser,
          fileData: encryptedFileData,
          fileType: file.type,
          fileName: file.name,
          type: 'file'
        });

        const tempMessage: PrivateMessage = {
          id: Date.now(),
          type: 'file',
          from: currentUser,
          to: targetUser,
          fileData: fileData,
          fileType: file.type,
          fileName: file.name,
          timestamp: Date.now(),
          read: false
        };
        
        setMessages(prev => [...prev, tempMessage]);
      } catch (e) {
        console.error('Erreur envoi fichier:', e);
      }
    };
    reader.readAsDataURL(file);
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Enregistrement audio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = async () => {
          const audioData = reader.result as string;
          
          try {
            const encryptedAudio = await encryptContent(audioData);
            
            socket?.emit('private message', {
              to: targetUser,
              fileData: encryptedAudio,
              fileType: 'audio/webm',
              type: 'audio'
            });

            const tempMessage: PrivateMessage = {
              id: Date.now(),
              type: 'audio',
              from: currentUser,
              to: targetUser,
              fileData: audioData,
              fileType: 'audio/webm',
              timestamp: Date.now(),
              read: false
            };
            
            setMessages(prev => [...prev, tempMessage]);
          } catch (e) {
            console.error('Erreur envoi audio:', e);
          }
        };
        reader.readAsDataURL(audioBlob);
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (e) {
      console.error('Erreur accès micro:', e);
      alert(t.messages.microphoneAccessDenied);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Rendu d'un message
  const renderMessageContent = (msg: PrivateMessage) => {
    if (msg.type === 'audio' && msg.fileData) {
      return (
        <audio controls className="max-w-full" src={msg.fileData}>
          {t.chat.audioNotSupported}
        </audio>
      );
    }
    
    if (msg.type === 'file' && msg.fileData) {
      if (msg.fileType?.startsWith('image/')) {
        return (
          <img 
            src={msg.fileData} 
            alt={msg.fileName || 'Image'} 
            className="max-w-full rounded-lg cursor-pointer hover:opacity-90"
            onClick={() => setImagePreview(msg.fileData || null)}
          />
        );
      }
      return (
        <a 
          href={msg.fileData} 
          download={msg.fileName}
          className="flex items-center gap-2 text-red-300 hover:text-red-200 underline"
        >
          <Paperclip size={16} />
          {msg.fileName || 'Fichier'}
        </a>
      );
    }
    
    return (
      <>
        <p className="break-words">{msg.content}</p>
        {localAutoTranslate && msg.content && msg.from !== currentUser && (
          <AutoTranslation 
            text={msg.content} 
            targetLanguage={localTranslateLang}
            enabled={localAutoTranslate}
          />
        )}
      </>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-lg h-[85vh] bg-black border-2 border-red-700 rounded-xl flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-red-900/30 border-b border-red-700">
          <button onClick={onClose} className="p-2 hover:bg-red-700/30 rounded-lg transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 text-center">
            <h2 className="font-bold text-white">{targetUser}</h2>
            <p className="text-xs text-red-400">{t.privateChat?.title || 'Message privé'}</p>
          </div>
          <div className="flex items-center gap-2">
            <TranslationSettings 
              onSettingsChange={handleTranslationChange}
              variant="chat-input"
            />
            <button onClick={onClose} className="p-2 hover:bg-red-700/30 rounded-lg transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <p>{t.privateChat?.noMessages || 'Aucun message. Commencez la conversation !'}</p>
            </div>
          )}
          
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.from === currentUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                msg.from === currentUser
                  ? 'bg-red-700 text-white rounded-br-sm'
                  : 'bg-gray-800 text-white rounded-bl-sm'
              }`}>
                {renderMessageContent(msg)}
                <div className={`flex items-center gap-1 mt-1 text-xs ${
                  msg.from === currentUser ? 'text-red-200 justify-end' : 'text-gray-400'
                }`}>
                  <span>{formatTime(msg.timestamp)}</span>
                  {msg.from === currentUser && (
                    msg.read ? <CheckCheck size={14} className="text-green-400" /> : <Check size={14} />
                  )}
                </div>
              </div>
            </div>
          ))}

          {otherTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-800 rounded-2xl px-4 py-2 rounded-bl-sm">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-red-700 bg-black/50">
          {isRecording ? (
            <div className="flex items-center justify-between bg-red-900/50 rounded-full px-4 py-2">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-white">{formatRecordingTime(recordingTime)}</span>
              </div>
              <button onClick={stopRecording} className="p-2 bg-red-700 rounded-full hover:bg-red-600">
                <Square size={18} />
              </button>
            </div>
          ) : (
            <div className="flex gap-2 items-center">
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*,audio/*,video/*,.pdf,.doc,.docx" />
              
              <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-400 hover:text-white transition-colors">
                <Paperclip size={20} />
              </button>
              
              <button onClick={startRecording} className="p-2 text-gray-400 hover:text-white transition-colors">
                <Mic size={20} />
              </button>
              
              <input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder={t.chat.messageInput}
                className="flex-1 bg-gray-900 border border-red-700/50 rounded-full px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
              />
              
              <button
                onClick={handleSend}
                disabled={!inputValue.trim()}
                className="p-3 bg-red-700 hover:bg-red-600 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-full transition-colors"
              >
                <Send size={18} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal aperçu image */}
      {imagePreview && (
        <div className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4" onClick={() => setImagePreview(null)}>
          <img src={imagePreview} alt="Aperçu" className="max-w-full max-h-full object-contain" />
          <button className="absolute top-4 right-4 p-2 bg-red-700 rounded-full" onClick={() => setImagePreview(null)}>
            <X size={24} />
          </button>
        </div>
      )}
    </div>
  );
};

export default PrivateChat;
