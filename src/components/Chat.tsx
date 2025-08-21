import { useState, useEffect, useRef } from 'react';

interface Message {
  type: 'user' | 'system' | 'audio';
  from?: string;
  content: string;
  timestamp: string;
  fileData?: string; // Ajout de fileData pour les messages audio
}

interface ChatProps {
  socket: any; // Typage temporaire pour éviter l'erreur TS
  username: string;
}

export const Chat = ({ socket, username }: ChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null); // Ajout de l'état pour le typing
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!socket) return;

    // Gestion de la connexion
    const handleConnect = () => {
      console.log('Connected to server');
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      console.log('Disconnected from server');
      setIsConnected(false);
    };

    // Gestion des messages
    const handleChatMessage = (message: Message) => {
      console.log('Received message:', message);
      setMessages(prev => [...prev, message]);
    };

    // Gestion de l'état initial
    const handleInit = (data: { messages: Message[] }) => {
      console.log('Received initial state:', data);
      setMessages(data.messages);
    };

    // Gestion du typing
    const handleTyping = (user: string) => {
      if (user !== username) setTypingUser(user);
    };
    const handleStopTyping = (user: string) => {
      if (user === typingUser) setTypingUser(null);
    };

    // Abonnement aux événements
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('chat message', handleChatMessage);
    socket.on('init', handleInit);
    socket.on('typing', handleTyping);
    socket.on('stop typing', handleStopTyping);

    // Nettoyage des abonnements
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('chat message', handleChatMessage);
      socket.off('init', handleInit);
      socket.off('typing', handleTyping);
      socket.off('stop typing', handleStopTyping);
    };
  }, [socket, username, typingUser]);

  // Défilement automatique
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket) return;

    console.log('Sending message:', newMessage);
    socket.emit('chat message', newMessage);
    setNewMessage('');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${
              msg.type === 'system'
                ? 'justify-center'
                : msg.from === username
                ? 'justify-end'
                : 'justify-start'
            }`}
          >
            <div
              className={`rounded-lg px-4 py-2 max-w-[70%] break-words ${
                msg.type === 'system'
                  ? 'bg-gray-200 text-gray-600 text-sm'
                  : msg.from === username
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-300'
              }`}
            >
              {msg.type === 'user' && msg.from !== username && (
                <div className="text-xs text-gray-600 mb-1">{msg.from}</div>
              )}
              {/* Affichage du contenu du message */}
              {msg.type === 'audio' && msg.fileData ? (
                <audio
                  controls
                  src={msg.fileData}
                  className="w-full mt-1 rounded-lg border-2 border-red-700 bg-black shadow"
                  style={{ minWidth: 180, maxWidth: 320 }}
                  controlsList="nodownload noplaybackrate"
                />
              ) : (
                <div>{msg.content}</div>
              )}
              <div className="text-xs text-right mt-1 opacity-75">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      {/* Indicateur typing au-dessus de la zone de saisie */}
      {typingUser && (
        <div className="px-4 pb-1 text-sm text-gray-500 animate-pulse">
          {typingUser} est en train d'écrire...
        </div>
      )}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex space-x-4">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Tapez votre message..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!isConnected}
            className={`px-6 py-2 rounded-lg ${
              isConnected
                ? 'bg-blue-500 hover:bg-blue-600 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Envoyer
          </button>
        </div>
      </form>
    </div>
  );
};
