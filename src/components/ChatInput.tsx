import React, { useState, FormEvent, ChangeEvent, useRef } from 'react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { UserList } from './UserList';

// Définition locale du type Message (copié de App.tsx)
type Message = {
  id: number;
  type: 'text' | 'file' | 'system' | 'gif' | 'audio';
  username?: string;
  content?: string;
  fileData?: string;
  fileType?: string;
  fileName?: string;
  gifUrl?: string;
  timestamp: number;
};

interface ChatInputProps {
  onSendMessage: (message: string, replyTo?: Message | null) => void;
  onSendFile: (file: File) => Promise<void>;
  onSendAudio: (audioBase64: string) => void;
  isConnected: boolean;
  users: Array<{ username: string; socketId: string }>;
  currentUser: string;
  replyTo?: Message | null;
  onReplyHandled?: () => void;
  socket?: any; // Ajout du socket en prop
}

interface EmojiData {
  native: string;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, onSendFile, onSendAudio, isConnected, users, currentUser, replyTo, onReplyHandled, socket }) => {
  const [message, setMessage] = useState<string>('');
  const [showEmoji, setShowEmoji] = useState<boolean>(false);
  const [recording, setRecording] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string>('');
  const [showMentions, setShowMentions] = useState<boolean>(false);
  const [mentionIndex, setMentionIndex] = useState<number>(0);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [audioPreview, setAudioPreview] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);

  const filteredUsers = users.filter(u =>
    mentionQuery && u.username.toLowerCase().includes(mentionQuery.toLowerCase()) && u.username !== currentUser
  );

  const handleEmojiSelect = (emoji: EmojiData) => {
    setMessage(prev => prev + emoji.native);
    setShowEmoji(false);
  };

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    if (message.trim() && isConnected) {
      onSendMessage(message, replyTo);
      setMessage('');
      setShowMentions(false);
      setMentionQuery('');
      if (onReplyHandled) onReplyHandled(); // Ferme le mode réponse après envoi
    }
  };

  const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      alert('Le fichier est trop volumineux (max 50MB)');
      return;
    }
    if (!file.type.startsWith('image/')) {
      alert('Seules les images sont acceptées');
      return;
    }
    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSendImage = async () => {
    if (selectedImage) {
      await onSendFile(selectedImage);
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setSelectedImage(null);
      setImagePreview(null);
    }
  };

  const handleCancelImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setSelectedImage(null);
    setImagePreview(null);
  };

  const startRecording = async () => {
    let mimeType = '';
    const isElectron = typeof navigator === 'object' && navigator.userAgent.toLowerCase().includes('electron');
    const isFirefox = typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('firefox');
    const isSafari = typeof navigator !== 'undefined' && /safari/i.test(navigator.userAgent) && !/chrome|chromium|android/i.test(navigator.userAgent);
    const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
    // Options pour améliorer la qualité audio (si supporté)
    const audioConstraints = {
      audio: {
        sampleRate: 48000, // 48kHz, standard WebRTC/Opus
        channelCount: 2,   // stéréo
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    };
    // Cas Android : certains navigateurs ne supportent que webm ou rien
    if (isAndroid) {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
      } else if (window.MediaRecorder && MediaRecorder.isTypeSupported('audio/3gpp')) {
        mimeType = 'audio/3gpp';
      } else {
        alert("L'enregistrement audio n'est pas supporté sur ce navigateur Android. Essayez Chrome ou Firefox mobile.");
        return;
      }
    } else if (isElectron) {
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/wav')) {
        mimeType = 'audio/wav';
        console.warn('[Vocal] Electron: fallback audio/wav');
      } else {
        mimeType = '';
        alert('Aucun format audio compatible trouvé pour Electron.');
        return;
      }
    } else if (isFirefox && MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
      mimeType = 'audio/ogg;codecs=opus';
    } else if (isSafari && MediaRecorder.isTypeSupported('audio/mp4')) {
      mimeType = 'audio/mp4';
    } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      mimeType = 'audio/webm;codecs=opus';
    } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
      mimeType = 'audio/ogg;codecs=opus';
    } else if (MediaRecorder.isTypeSupported('audio/webm')) {
      mimeType = 'audio/webm';
    } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
      mimeType = 'audio/ogg';
    } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
      mimeType = 'audio/mp4';
    } else if (MediaRecorder.isTypeSupported('audio/wav')) {
      mimeType = 'audio/wav';
      console.warn('[Vocal] Fallback audio/wav (hors Electron)');
    } else {
      alert('Aucun format audio compatible trouvé sur ce navigateur. Essayez de mettre à jour votre navigateur ou d\'en utiliser un autre.');
      return;
    }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia(audioConstraints);
    } catch (err) {
      alert('Impossible d\'accéder au micro.');
      return;
    }
    try {
      mediaRecorderRef.current = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    } catch (err) {
      alert("Impossible de démarrer l'enregistrement audio sur ce navigateur. Essayez Chrome ou Firefox mobile.");
      return;
    }
    audioChunks.current = [];
    mediaRecorderRef.current.ondataavailable = e => audioChunks.current.push(e.data);
    mediaRecorderRef.current.onstop = async () => {
      const blob = new Blob(audioChunks.current, { type: mimeType || 'audio/webm' });
      console.log('[Vocal] Type MIME:', blob.type, '| Taille:', blob.size, '| Android:', isAndroid);
      setAudioBlob(blob);
      setAudioPreview(URL.createObjectURL(blob));
    };
    mediaRecorderRef.current.start();
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  // Détection mobile (hors SSR)
  const isMobile = typeof window !== 'undefined' && /android|iphone|ipad|ipod|opera mini|iemobile|mobile/i.test(navigator.userAgent);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setMessage(val);
    // Désactive totalement la suggestion de mention sur mobile
    if (isMobile) {
      setShowMentions(false);
      setMentionQuery('');
      return;
    }
    // Détection de @ pour suggestions (desktop uniquement)
    const match = val.slice(0, e.target.selectionStart ?? 0).match(/@([\w-]*)$/);
    if (match) {
      setMentionQuery(match[1]);
      setShowMentions(true);
      setMentionIndex(0);
    } else {
      setShowMentions(false);
      setMentionQuery('');
    }
  };

  const handleMentionSelect = (username: string) => {
    if (!inputRef.current) return;
    const val = message;
    const caret = inputRef.current.selectionStart ?? val.length;
    const before = val.slice(0, caret).replace(/@([\w-]*)$/, `@${username} `);
    const after = val.slice(caret);
    setMessage(before + after);
    setShowMentions(false);
    setMentionQuery('');
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(before.length, before.length);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showMentions && filteredUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex(i => (i + 1) % filteredUsers.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex(i => (i - 1 + filteredUsers.length) % filteredUsers.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        setShowMentions(false);
        setMentionQuery('');
        // handleMentionSelect(filteredUsers[mentionIndex].username); // désactivé pour mobile
      } else if (e.key === 'Escape') {
        setShowMentions(false);
      }
    } else if (e.key === 'Enter') {
      setShowMentions(false);
      setMentionQuery('');
    }
  };

  React.useEffect(() => {
    // Ne pré-remplit plus le champ avec @username lors d'une réponse
    if (replyTo) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replyTo]);

  // Ferme la liste des mentions si le message est vidé (après envoi)
  React.useEffect(() => {
    if (!message) {
      setShowMentions(false);
      setMentionQuery('');
    }
  }, [message]);

  // Empêche l'ouverture de la liste des mentions sur mobile lors du focus
  React.useEffect(() => {
    if (isMobile && inputRef.current) {
      const input = inputRef.current;
      const handleFocus = () => {
        setShowMentions(false);
        setMentionQuery('');
      };
      input.addEventListener('focus', handleFocus);
      return () => input.removeEventListener('focus', handleFocus);
    }
  }, [isMobile]);

  // Gestion de l'indicateur "en train d'écrire"
  const handleTyping = () => {
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    if (message.trim() && socket) {
      socket.emit('typing');
      typingTimeout.current = setTimeout(() => {
        socket.emit('stop typing');
      }, 2000);
    }
  };

  const handleSendAudioPreview = () => {
    if (audioBlob) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        onSendAudio(base64);
        if (audioPreview) URL.revokeObjectURL(audioPreview);
        setAudioPreview(null);
        setAudioBlob(null);
      };
      reader.readAsDataURL(audioBlob);
    }
  };
  const handleCancelAudio = () => {
    if (audioPreview) URL.revokeObjectURL(audioPreview);
    setAudioPreview(null);
    setAudioBlob(null);
  };

  return (
    <form onSubmit={handleSubmit} className="sticky bottom-0 left-0 w-full max-w-full min-h-[56px] flex flex-wrap items-end gap-2 bg-black border-t-4 border-red-700 p-2 sm:p-4 relative z-50">
      {/* Affichage du message cité façon messagerie moderne */}
      {replyTo && (
        <div className="absolute -top-20 left-0 w-full flex items-center justify-between px-3 py-2 bg-black/90 border-l-4 border-red-700 rounded-t-lg rounded-b-sm shadow-lg" style={{minHeight:'48px'}}>
          <div className="flex items-center gap-2 max-w-[80%]">
            {replyTo.type === 'file' && replyTo.fileData && replyTo.fileType && replyTo.fileType.startsWith('image/') ? (
              <>
                <img src={replyTo.fileData} alt="miniature" className="w-12 h-12 object-cover rounded border-2 border-white bg-black" style={{maxWidth:48,maxHeight:48}} />
                <div className="flex flex-col min-w-0">
                  <span className="text-xs text-red-400 font-mono mb-0.5 truncate">{replyTo.username}</span>
                  {replyTo.fileName && (
                    <span className="text-xs text-gray-200 font-mono break-words truncate">{replyTo.fileName}</span>
                  )}
                </div>
              </>
            ) : replyTo.type === 'audio' && replyTo.fileData ? (
              <>
                <span className="text-2xl mr-2">🎤</span>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs text-red-400 font-mono mb-0.5 truncate">{replyTo.username}</span>
                  <span className="text-xs text-gray-200 font-mono break-words truncate">{replyTo.fileName || 'Message vocal'}</span>
                </div>
              </>
            ) : (
              <div className="flex flex-col min-w-0">
                <span className="text-xs text-red-400 font-mono mb-0.5 truncate">{replyTo.username}</span>
                <span className="text-xs text-gray-200 font-mono truncate">
                  {replyTo.type === 'text' ? (replyTo.content?.slice(0, 80) || '') : replyTo.type === 'gif' ? '[GIF]' : ''}
                </span>
              </div>
            )}
          </div>
          <button type="button" onClick={() => onReplyHandled && onReplyHandled()} className="ml-2 text-gray-400 hover:text-red-500 p-0.5 rounded focus:outline-none" title="Annuler la réponse" aria-label="Annuler la réponse">×</button>
        </div>
      )}
      {/* Aperçu de l'image à envoyer */}
      {imagePreview && (
        <div className="w-full flex flex-col items-center mb-2">
          <div className="bg-black border-2 border-red-700 rounded-lg shadow-lg p-2 flex flex-col items-center">
            <img src={imagePreview} alt="Aperçu" className="max-h-48 rounded-lg border-2 border-white shadow mb-2 bg-black" style={{objectFit:'contain', background:'#000'}} />
            <div className="flex gap-2">
              <button type="button" onClick={handleSendImage} className="px-4 py-2 bg-red-700 text-white rounded-lg border-2 border-white hover:bg-black hover:text-red-700 transition-colors font-mono">Envoyer</button>
              <button type="button" onClick={handleCancelImage} className="px-4 py-2 bg-black text-red-700 rounded-lg border-2 border-red-700 hover:bg-red-700 hover:text-white transition-colors font-mono">Annuler</button>
            </div>
          </div>
        </div>
      )}
      {/* Aperçu de l'audio à envoyer */}
      {audioPreview && (
        <div className="w-full flex flex-col items-center mb-2">
          <div className="bg-black border-2 border-red-700 rounded-lg shadow-lg p-2 flex flex-col items-center">
            <audio src={audioPreview} controls className="w-full max-w-xs mb-2 rounded border-2 border-white bg-black" />
            <div className="flex gap-2">
              <button type="button" onClick={handleSendAudioPreview} className="px-4 py-2 bg-red-700 text-white rounded-lg border-2 border-white hover:bg-black hover:text-red-700 transition-colors font-mono">Envoyer</button>
              <button type="button" onClick={handleCancelAudio} className="px-4 py-2 bg-black text-red-700 rounded-lg border-2 border-red-700 hover:bg-red-700 hover:text-white transition-colors font-mono">Annuler</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2 w-full sm:w-auto order-1 sm:order-none">
        <button
          type="button"
          onClick={() => setShowEmoji((v) => !v)}
          className="flex-shrink-0 p-2 h-10 bg-black border-2 border-white rounded-lg hover:bg-red-700/20 transition-colors"
        >
          😀
        </button>
        <label className="flex-shrink-0 cursor-pointer p-2 h-10 bg-red-700 text-white rounded-lg border-2 border-white hover:bg-black hover:text-red-700 transition-colors">
          📎
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
            disabled={!isConnected}
          />
        </label>
        <button
          type="button"
          onClick={recording ? stopRecording : startRecording}
          className={`flex-shrink-0 w-10 h-10 p-0 rounded-lg border-2 border-white transition-colors flex items-center justify-center ${recording ? 'bg-red-700 text-white' : 'bg-black text-red-700 hover:bg-red-700/20'}`}
          style={{ aspectRatio: '1 / 1', minWidth: 40, minHeight: 40 }}
          disabled={!isConnected || !!audioPreview}
        >
          {recording ? '⏹️' : '🎤'}
        </button>
        <div className="block sm:hidden">
          <UserList users={users} currentUser={currentUser} isMobile={true} inChatInput={true} />
        </div>
      </div>

      <div className="flex-1 relative order-3 sm:order-none">
        <input
          ref={inputRef}
          type="text"
          value={message}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onKeyPress={(e: React.KeyboardEvent) => { handleTyping(); if (e.key === 'Enter' && !e.shiftKey) handleSubmit(); }}
          className="w-full px-3 py-2 bg-black border-2 border-red-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 text-white placeholder-gray-400 text-sm sm:text-base font-mono shadow"
          style={{ fontSize: '16px' }}
          placeholder={isConnected ? "Écrivez un message révolutionnaire..." : "Connexion au serveur..."}
          maxLength={500}
          autoComplete="off"
          disabled={!isConnected}
        />

        {showEmoji && (
          <div
            className="absolute z-50 border-4 border-red-700 rounded-2xl shadow-2xl bg-black/95 p-2 anarchist-emoji-picker"
            style={{
              left: 0,
              bottom: '110%',
              maxWidth: '100vw',
              minWidth: 260,
              right: 'auto',
            }}
          >
            <div className="text-center text-red-500 font-mono font-bold mb-2 text-lg tracking-widest">⚑ EMOJIS LIBRES</div>
            <Picker 
              data={data} 
              onEmojiSelect={handleEmojiSelect}
              theme="dark"
              previewPosition="none"
              skinTonePosition="none"
              className="anarchist-emoji-inner"
            />
          </div>
        )}

        {showMentions && filteredUsers.length > 0 && (
          <div className="absolute bottom-full left-0 mb-2 z-50 bg-black border-2 border-red-700 rounded-lg shadow-lg w-64 max-h-48 overflow-y-auto">
            {filteredUsers.map((u, i) => (
              <div
                key={u.username}
                className={`px-3 py-2 cursor-pointer font-mono text-white ${i === mentionIndex ? 'bg-red-700/80' : 'hover:bg-red-700/40'}`}
                onMouseDown={e => { e.preventDefault(); handleMentionSelect(u.username); }}
              >
                @{u.username}
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={!message.trim() || !isConnected}
        className="flex-shrink-0 px-4 py-2 h-10 bg-red-700 text-white rounded-lg border-2 border-white hover:bg-black hover:text-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed order-2 sm:order-none w-full sm:w-auto"
      >
        Envoyer
      </button>
    </form>
  );
};

export default ChatInput;

/* Ajout de styles anarchistes pour le picker d'emojis */
// Dans le même fichier ou dans le CSS global :
// .anarchist-emoji-picker { font-family: 'Fira Mono', monospace; border-style: dashed; box-shadow: 0 0 16px 4px #b91c1c; }
// .anarchist-emoji-inner .epr-emoji-category-label { color: #b91c1c !important; font-weight: bold; letter-spacing: 2px; }
// .anarchist-emoji-inner .epr-emoji { filter: grayscale(0.2) contrast(1.2); }
// .anarchist-emoji-inner .epr-search { background: #1a1a1a; color: #b91c1c; border: 1px dashed #b91c1c; }
// .anarchist-emoji-inner .epr-preview { background: #1a1a1a; color: #fff; border: none; }