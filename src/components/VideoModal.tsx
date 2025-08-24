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
  const [hasJoined, setHasJoined] = useState(false);
  const videoWindow = useRef<Window | null>(null);

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isWebView = /wv|WebView|; wv\)|Version\/[\d\.]+.*Safari/i.test(navigator.userAgent) || window.navigator.standalone === false;

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

  // Bouton flottant de retour au chat si l'utilisateur a rejoint l'appel
  if (!isOpen && hasJoined) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setShowVideoModal(true)}
          className="bg-red-700 hover:bg-red-600 text-white p-3 rounded-full shadow-lg border-2 border-red-600 font-mono text-sm font-bold transition-all"
          title="Retour au chat"
        >
          💬 Chat
        </button>
      </div>
    );
  }

  if (!isOpen) return null;

  if (isMobile) {
    // Sur mobile, interface vidéo intégrée dans l'app
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-black via-red-950 to-black z-50">
        {/* Header vidéo */}
        <div className="flex justify-between items-center p-4 bg-black/90 border-b-4 border-red-700">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <h2 className="text-white font-mono text-lg font-bold">
              📹 Appel vidéo en cours
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-red-400 text-2xl font-bold transition-colors"
            aria-label="Fermer l'appel vidéo"
          >
            ✕
          </button>
        </div>
        
        {/* Zone vidéo principale */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-black/80 border-4 border-red-700 rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <div className="mb-6">
              <div className="w-20 h-20 bg-red-700 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <span className="text-3xl">📹</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2 font-mono">LiberChat Vidéo</h3>
              <p className="text-red-400 font-mono text-sm mb-4">Salle: {roomName}</p>
            </div>
            
            <div className="space-y-4">
              {!hasJoined ? (
                <button
                  onClick={() => {
                    setHasJoined(true);
                    if (isWebView) {
                      // Pour WebView, ouvrir directement dans la même vue
                      window.location.href = `${jitsiUrl}/${roomName}`;
                    } else {
                      window.open(`${jitsiUrl}/${roomName}`, '_blank');
                    }
                  }}
                  className="w-full bg-gradient-to-r from-red-700 to-red-500 hover:from-red-600 hover:to-red-400 text-white px-6 py-4 rounded-xl font-bold text-lg font-mono transition-all duration-200 shadow-lg border-2 border-red-600 hover:border-red-400"
                >
                  {isWebView ? '🚀 REJOINDRE L\'APPEL' : '🚀 REJOINDRE L\'APPEL'}
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="text-green-400 font-mono text-sm">
                    ✓ Appel en cours
                  </div>
                  <button
                    onClick={() => {
                      if (isWebView) {
                        window.location.href = `${jitsiUrl}/${roomName}`;
                      } else {
                        window.open(`${jitsiUrl}/${roomName}`, '_blank');
                      }
                    }}
                    className="w-full bg-green-700 hover:bg-green-600 text-white px-6 py-3 rounded-xl font-bold font-mono transition-all duration-200 border-2 border-green-600"
                  >
                    🔄 Retourner à l'appel
                  </button>
                </div>
              )}
              
              <button
                onClick={onClose}
                className="w-full bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-xl font-bold font-mono transition-all duration-200 border-2 border-gray-600 hover:border-gray-500"
              >
                ← Retour au chat
              </button>
            </div>
            
            <div className="mt-6 p-4 bg-red-900/30 rounded-lg border border-red-700/50">
              {isWebView ? (
                <>
                  <p className="text-xs text-green-300 font-mono">
                    📱 App mobile détectée
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Ouverture dans l'app intégrée
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs text-red-300 font-mono">
                    ⚠️ Interface sécurisée Jitsi Meet
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Chiffrement de bout en bout activé
                  </p>
                </>
              )}
            </div>
          </div>
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