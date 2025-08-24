import React, { useEffect, useRef, useState } from 'react';

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomName: string;
  jitsiUrl?: string;
}

const VideoModal: React.FC<VideoModalProps> = ({ 
  isOpen, 
  onClose, 
  roomName, 
  jitsiUrl = 'https://meet.jit.si' 
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const videoWindow = useRef<Window | null>(null);

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  const openVideoWindow = () => {
    const meetUrl = `${jitsiUrl}/${roomName}`;
    
    if (!isMobile) {
      // Sur desktop, ouvrir dans une popup
      videoWindow.current = window.open(
        meetUrl,
        'jitsi-meet',
        'width=1200,height=800,resizable=yes,scrollbars=no,status=no,location=no,toolbar=no,menubar=no'
      );
      
      // Surveiller la fermeture de la fenêtre
      const checkClosed = setInterval(() => {
        if (videoWindow.current?.closed) {
          clearInterval(checkClosed);
          onClose();
        }
      }, 1000);
    }
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      openVideoWindow();
    }
    
    return () => {
      if (videoWindow.current && !videoWindow.current.closed) {
        videoWindow.current.close();
      }
    };
  }, [isOpen, roomName, jitsiUrl]);

  if (!isOpen) return null;

  if (isMobile) {
    // Sur mobile, overlay avec bouton pour ouvrir Jitsi
    return (
      <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4">
        <div className="bg-black border-2 border-red-700 rounded-lg p-6 text-center max-w-sm w-full">
          <h3 className="text-white font-mono text-lg mb-4">📹 Appel vidéo</h3>
          <p className="text-gray-300 mb-6 text-sm">Salle: {roomName}</p>
          
          <div className="space-y-3">
            <button
              onClick={() => {
                window.open(`${jitsiUrl}/${roomName}`, '_blank');
                onClose();
              }}
              className="w-full bg-red-700 hover:bg-red-600 text-white px-4 py-3 rounded font-bold text-lg"
            >
              Rejoindre l'appel
            </button>
            
            <button
              onClick={onClose}
              className="w-full bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded font-bold"
            >
              Annuler
            </button>
          </div>
          
          <p className="text-xs text-gray-400 mt-4">
            L'appel s'ouvrira dans un nouvel onglet
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-black border-2 border-red-700 rounded-lg p-4 shadow-lg">
        <div className="flex items-center gap-3">
          <span className="text-white font-mono text-sm">
            📹 Appel en cours
          </span>
          <button
            onClick={() => {
              if (videoWindow.current && !videoWindow.current.closed) {
                videoWindow.current.focus();
              } else {
                openVideoWindow();
              }
            }}
            className="bg-red-700 hover:bg-red-600 text-white px-3 py-1 rounded text-sm font-bold transition-colors"
          >
            Rejoindre
          </button>
          <button
            onClick={onClose}
            className="text-white hover:text-red-400 font-bold transition-colors"
            aria-label="Fermer l'appel"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoModal;