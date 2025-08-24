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
    // Sur mobile, afficher Jitsi dans un iframe plein écran
    return (
      <div className="fixed inset-0 bg-black z-50">
        <div className="flex justify-between items-center p-2 bg-black border-b-2 border-red-700">
          <h2 className="text-white font-mono text-sm">
            📹 {roomName}
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:text-red-400 text-xl font-bold"
            aria-label="Fermer l'appel vidéo"
          >
            ✕
          </button>
        </div>
        
        <div className="w-full h-[calc(100%-60px)]">
          <iframe
            src={`${jitsiUrl}/${roomName}`}
            className="w-full h-full border-0"
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            allowFullScreen
            title="Jitsi Meet Video Call"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-presentation allow-camera allow-microphone"
            referrerPolicy="no-referrer-when-downgrade"
            loading="eager"
          />
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