import React, { useEffect } from 'react';

interface JitsiReturnProps {
  onReturn: () => void;
}

const JitsiReturn: React.FC<JitsiReturnProps> = ({ onReturn }) => {
  useEffect(() => {
    // Vérifier si on revient de Jitsi
    const returnUrl = sessionStorage.getItem('liberchat_return_url');
    const roomName = sessionStorage.getItem('liberchat_room_name');
    
    if (returnUrl && roomName) {
      // Nettoyer le sessionStorage
      sessionStorage.removeItem('liberchat_return_url');
      sessionStorage.removeItem('liberchat_room_name');
      
      // Notifier le parent
      onReturn();
      
      // Rediriger vers l'URL de retour si nécessaire
      if (window.location.href !== returnUrl) {
        window.location.href = returnUrl;
      }
    }
  }, [onReturn]);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-gradient-to-br from-red-900 to-black p-8 rounded-2xl border-4 border-red-700 text-center max-w-md">
        <div className="w-16 h-16 bg-red-700 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
          <span className="text-2xl">📹</span>
        </div>
        <h2 className="text-white font-mono text-xl font-bold mb-2">
          Retour de l'appel vidéo
        </h2>
        <p className="text-gray-400 text-sm mb-4">
          Redirection vers le chat...
        </p>
        <div className="w-full bg-red-900/50 rounded-full h-2">
          <div className="bg-red-500 h-2 rounded-full animate-pulse" style={{ width: '100%' }}></div>
        </div>
      </div>
    </div>
  );
};

export default JitsiReturn;