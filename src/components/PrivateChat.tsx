import { useState, useEffect, useRef } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import { useI18nContext } from '../contexts/I18nContext';

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
    reactions?: { [emoji: string]: string[] };
    isPrivate?: boolean;
    to?: string;
    from?: string;
    encrypted?: any;
}

interface PrivateChatProps {
    currentUser: string;
    recipientUser: string;
    socket: any;
    onClose: () => void;
    encryptionKey: CryptoKey | string | null;
    encryptMessageE2EE: (message: string, key: CryptoKey | string) => Promise<any>;
    decryptMessageE2EE: (encrypted: any, key: CryptoKey | string) => Promise<string>;
    onDeleteMessage?: (id: number) => void;
    onReply?: (msg: Message) => void;
    onReact?: (messageId: number, emoji: string) => void;
    autoTranslateEnabled?: boolean;
    targetLanguage?: string;
    initialMessages?: Message[];
}

export const PrivateChat = ({
    currentUser,
    recipientUser,
    socket,
    onClose,
    encryptionKey,
    encryptMessageE2EE,
    decryptMessageE2EE,
    onDeleteMessage,
    onReply,
    onReact,
    autoTranslateEnabled = false,
    targetLanguage = 'fr',
    initialMessages = []
}: PrivateChatProps) => {
    const { t } = useI18nContext();
    const [messages, setMessages] = useState<Message[]>([]);
    const [replyTo, setReplyTo] = useState<Message | null>(null);
    const [isTyping, setIsTyping] = useState(false);

    // États locaux pour la traduction dans le chat privé
    const [localAutoTranslate, setLocalAutoTranslate] = useState(autoTranslateEnabled);
    const [localTargetLang, setLocalTargetLang] = useState(targetLanguage);
    const [showTranslateSettings, setShowTranslateSettings] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Scroll automatique vers le bas
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Synchroniser avec les messages venant de App (prop)
    // Synchroniser avec les messages venant de App (prop)
    useEffect(() => {
        if (!initialMessages) return;

        setMessages(prev => {
            const updated = [...prev];
            let hasChanges = false;

            for (const serverMsg of initialMessages) {
                // 1. Chercher si le message existe déjà par ID exact
                const indexById = updated.findIndex(m => m.id === serverMsg.id);

                if (indexById !== -1) {
                    // Message existe déjà : mise à jour si nécessaire (réactions, etc.)
                    // On compare une version stringifiée pour détecter les changements profonds (reactions)
                    if (JSON.stringify(updated[indexById]) !== JSON.stringify(serverMsg)) {
                        updated[indexById] = serverMsg;
                        hasChanges = true;
                    }
                    continue;
                }

                // 2. Si pas trouvé par ID, chercher doublon optimiste (envoyé par moi)
                let replaced = false;
                if (serverMsg.from === currentUser) {
                    const indexOptimistic = updated.findIndex(m =>
                        m.from === currentUser &&
                        m.type === serverMsg.type &&
                        (m.content === serverMsg.content || (m.fileData && m.fileData === serverMsg.fileData)) &&
                        // ID optimiste est timestamp (grand), ID serveur est seq (petit)
                        m.id > 1000000000000 && serverMsg.id < 1000000000000
                    );

                    if (indexOptimistic !== -1) {
                        // On remplace le message optimiste (mauvais ID) par le vrai message serveur (bon ID)
                        updated[indexOptimistic] = serverMsg;
                        hasChanges = true;
                        replaced = true;
                    }
                }

                if (!replaced) {
                    updated.push(serverMsg);
                    hasChanges = true;
                }
            }

            if (!hasChanges) return prev;
            return updated.sort((a, b) => a.timestamp - b.timestamp);
        });
    }, [initialMessages, currentUser]);

    // Écouter les événements de frappe (typing)
    useEffect(() => {
        const handlePrivateTyping = ({ from }: { from: string }) => {
            if (from === recipientUser) {
                setIsTyping(true);
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000);
            }
        };

        const handlePrivateStopTyping = ({ from }: { from: string }) => {
            if (from === recipientUser) {
                setIsTyping(false);
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            }
        };

        socket.on('private typing', handlePrivateTyping);
        socket.on('private stop typing', handlePrivateStopTyping);

        return () => {
            socket.off('private typing', handlePrivateTyping);
            socket.off('private stop typing', handlePrivateStopTyping);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        };
    }, [socket, recipientUser]);

    // Déchiffrement des messages entrants (E2EE)
    useEffect(() => {
        if (!encryptionKey || !decryptMessageE2EE) return;

        let mounted = true;

        const decryptPendingMessages = async () => {
            const msgsToDecrypt = messages.filter(m =>
                m.encrypted &&
                ((m.type === 'text' && !m.content) || (m.type !== 'text' && !m.fileData))
            );

            if (msgsToDecrypt.length === 0) return;

            const updates: { id: number, content?: string, fileData?: string }[] = [];

            for (const msg of msgsToDecrypt) {
                try {
                    const decrypted = await decryptMessageE2EE(msg.encrypted, encryptionKey);
                    if (decrypted) {
                        if (msg.type === 'text') {
                            updates.push({ id: msg.id, content: decrypted });
                        } else {
                            updates.push({ id: msg.id, fileData: decrypted });
                        }
                    }
                } catch (e) {
                    console.error("Erreur de déchiffrement pour le message", msg.id, e);
                }
            }

            if (mounted && updates.length > 0) {
                setMessages(prev => prev.map(m => {
                    const update = updates.find(u => u.id === m.id);
                    if (update) {
                        return { ...m, ...update };
                    }
                    return m;
                }));
            }
        };

        decryptPendingMessages();

        return () => { mounted = false; };
    }, [messages, encryptionKey, decryptMessageE2EE]);

    const handleSendMessage = async (message: string, replyToMsg?: Message | null) => {
        if (!message.trim() || !encryptionKey) return;

        const timestamp = Date.now();
        const messageId = timestamp;

        try {
            const encrypted = await encryptMessageE2EE(message, encryptionKey);

            const messageData: Message = {
                id: messageId,
                from: currentUser,
                to: recipientUser,
                username: currentUser,
                type: 'text',
                content: message,
                encrypted: encrypted,
                replyTo: replyToMsg,
                timestamp: timestamp
            };

            setMessages(prev => [...prev, messageData]);

            socket.emit('private message', {
                to: recipientUser,
                message: messageData
            });

            setReplyTo(null);
        } catch (error) {
            console.error('Erreur lors de l\'envoi du message privé:', error);
        }
    };

    const handleSendFile = async (file: File) => {
        if (!encryptionKey) return;

        const timestamp = Date.now();
        const messageId = timestamp;

        const reader = new FileReader();
        reader.onload = async () => {
            try {
                const base64 = reader.result as string;
                const encrypted = await encryptMessageE2EE(base64, encryptionKey);

                const messageData: Message = {
                    id: messageId,
                    from: currentUser,
                    to: recipientUser,
                    username: currentUser,
                    type: 'file',
                    fileData: base64,
                    fileType: file.type,
                    fileName: file.name,
                    encrypted: encrypted,
                    timestamp: timestamp
                };

                setMessages(prev => [...prev, messageData]);

                socket.emit('private message', {
                    to: recipientUser,
                    message: messageData
                });
            } catch (error) {
                console.error('Erreur lors de l\'envoi du fichier:', error);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleSendAudio = async (audioBase64: string) => {
        if (!encryptionKey) return;

        const timestamp = Date.now();
        const messageId = timestamp;

        try {
            const encrypted = await encryptMessageE2EE(audioBase64, encryptionKey);

            const messageData: Message = {
                id: messageId,
                from: currentUser,
                to: recipientUser,
                username: currentUser,
                type: 'audio',
                content: audioBase64,
                fileData: audioBase64,
                fileType: 'audio/webm',
                encrypted: encrypted,
                timestamp: timestamp
            };

            setMessages(prev => [...prev, messageData]);

            socket.emit('private message', {
                to: recipientUser,
                message: messageData
            });
        } catch (error) {
            console.error('Erreur lors de l\'envoi du message vocal:', error);
        }
    };

    const handleTyping = () => {
        socket.emit('private typing', { to: recipientUser });
    };

    const handleStopTyping = () => {
        socket.emit('private stop typing', { to: recipientUser });
    };

    const handleReplyLocal = (msg: Message) => {
        setReplyTo(msg);
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-gradient-to-br from-black via-red-950/20 to-black border-2 border-red-700 rounded-lg shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col">
                <div className="flex items-center justify-between p-4 border-b-2 border-red-700 bg-gradient-to-r from-red-900/40 to-black">
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse shadow-lg shadow-green-500/50"></div>
                        <h2 className="text-xl font-bold text-white font-mono">
                            💬 {t.privateChat?.title || 'Message privé avec'} <span className="text-red-400">{recipientUser}</span>
                        </h2>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className="text-white hover:text-red-400 transition-colors p-2 hover:bg-red-700/20 rounded-lg"
                            aria-label="Fermer"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-red-700 scrollbar-track-black">
                    {messages.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                                <div className="text-6xl mb-4">🔒</div>
                                <p className="text-gray-400 font-mono">
                                    {t.privateChat?.noMessages || 'Aucun message. Commencez la conversation !'}
                                </p>
                            </div>
                        </div>
                    ) : (
                        messages.map((msg) => (
                            <ChatMessage
                                key={msg.id}
                                message={msg}
                                isOwnMessage={msg.from === currentUser || msg.username === currentUser}
                                onDeleteMessage={onDeleteMessage}
                                onReply={handleReplyLocal}
                                socket={socket}
                                symmetricKey={encryptionKey}
                                encryptMessageE2EE={encryptMessageE2EE}
                                encryptMessageFallback={undefined}
                                autoTranslationEnabled={localAutoTranslate}
                                autoTranslationLanguage={localTargetLang}
                            />
                        ))
                    )}
                    {isTyping && (
                        <div className="flex items-center gap-2 text-gray-400 text-sm font-mono">
                            <div className="flex gap-1">
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                            <span>{recipientUser} {t.typing || 'est en train d\'écrire'}...</span>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="border-t-2 border-red-700 bg-black/50 relative">
                    {showTranslateSettings && (
                        <div className="absolute bottom-full left-4 mb-2 z-50">
                            {/* Overlay pour fermer en cliquant ailleurs (d'abord dans le DOM ou z-index inférieur) */}
                            <div
                                className="fixed inset-0 z-40 bg-transparent"
                                onClick={() => setShowTranslateSettings(false)}
                            ></div>

                            {/* Menu de contenu (z-index supérieur) */}
                            <div className="bg-black border-2 border-red-700 rounded-xl shadow-2xl p-4 w-72 relative z-50">
                                <h3 className="text-white font-bold mb-3 font-mono text-center border-b border-red-900 pb-2">
                                    Traduction
                                </h3>
                                <div className="space-y-4">
                                    <label className="flex items-center justify-between cursor-pointer group">
                                        <span className="text-gray-300 font-mono text-sm group-hover:text-white transition-colors">
                                            Activer
                                        </span>
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={localAutoTranslate}
                                                onChange={(e) => setLocalAutoTranslate(e.target.checked)}
                                            />
                                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-red-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-700"></div>
                                        </div>
                                    </label>

                                    {localAutoTranslate && (
                                        <div className="space-y-1">
                                            <label className="block text-gray-400 text-xs font-mono mb-1">
                                                Langue cible:
                                            </label>
                                            <select
                                                value={localTargetLang}
                                                onChange={(e) => setLocalTargetLang(e.target.value)}
                                                className="w-full bg-black border border-red-900 text-white text-sm rounded-lg focus:ring-red-500 focus:border-red-500 block p-2.5 font-mono"
                                            >
                                                <option value="fr">Français</option>
                                                <option value="en">English</option>
                                                <option value="es">Español</option>
                                                <option value="de">Deutsch</option>
                                                <option value="it">Italiano</option>
                                                <option value="pt">Português</option>
                                                <option value="ru">Русский</option>
                                                <option value="zh">中文</option>
                                                <option value="ja">日本語</option>
                                                <option value="ar">العربية</option>
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    {replyTo && (
                        <div className="p-2 bg-red-900/20 border-b border-red-700/50 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-gray-300">
                                <span className="text-red-400">↩️</span>
                                <span>Réponse à <strong>{replyTo.username}</strong>: {replyTo.content?.substring(0, 50)}...</span>
                            </div>
                            <button
                                onClick={() => setReplyTo(null)}
                                className="text-gray-400 hover:text-white"
                            >
                                ✕
                            </button>
                        </div>
                    )}
                    <ChatInput
                        onSendMessage={(msg) => handleSendMessage(msg, replyTo)}
                        onSendFile={handleSendFile}
                        onSendAudio={handleSendAudio}
                        isConnected={true}
                        users={[]}
                        currentUser={currentUser}
                        replyTo={replyTo}
                        onReplyHandled={() => setReplyTo(null)}
                        socket={socket}
                        autoTranslationEnabled={localAutoTranslate}
                        autoTranslationLanguage={localTargetLang}
                        onToggleTranslationSettings={() => setShowTranslateSettings(!showTranslateSettings)}
                        onTyping={handleTyping}
                        onStopTyping={handleStopTyping}
                        disabled={!encryptionKey}
                        placeholder={encryptionKey ? `Message privé à ${recipientUser}...` : 'Chiffrement requis...'}
                    />
                </div>
            </div>
        </div>
    );
};
