import React, { useEffect } from 'react';

const JitsiReturnPage: React.FC = () => {
  useEffect(() => {
    // Vérifier si on a des données de retour
    const returnUrl = sessionStorage.getItem('liberchat_return_url');
    const roomName = sessionStorage.getItem('liberchat_room_name');
    
    if (returnUrl && roomName) {
      // Nettoyer le sessionStorage
      sessionStorage.removeItem('liberchat_return_url');
      sessionStorage.removeItem('liberchat_room_name');
      sessionStorage.removeItem('liberchat_jitsi_timestamp');
      
      // Rediriger vers l'URL de retour
      setTimeout(() => {
        window.location.href = returnUrl;
      }, 2000);
    } else {
      // Pas de données de retour, rediriger vers la racine
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    }
  }, []);

  const handleManualReturn = () => {
    const returnUrl = sessionStorage.getItem('liberchat_return_url') || '/';
    sessionStorage.removeItem('liberchat_return_url');
    sessionStorage.removeItem('liberchat_room_name');
    sessionStorage.removeItem('liberchat_jitsi_timestamp');
    window.location.href = returnUrl;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-red-950 to-black text-white font-sans flex flex-col items-center justify-center">
      <div className="p-8 bg-black/90 rounded-2xl shadow-2xl flex flex-col items-center border-4 border-red-700 max-w-md">
        <div className="w-20 h-20 bg-red-700 rounded-full flex items-center justify-center mb-6 animate-pulse">
          <span className="text-3xl">📹</span>
        </div>
        
        <h1 className="text-2xl font-bold mb-4 text-red-400 font-mono text-center">
          Appel vidéo terminé
        </h1>
        
        <p className="text-gray-300 text-center mb-6 font-mono">
          Retour au chat LibreChat...
        </p>
        
        <div className="w-full bg-red-900/50 rounded-full h-2 mb-6">
          <div className="bg-red-500 h-2 rounded-full animate-pulse w-full"></div>
        </div>
        
        <button
          onClick={handleManualReturn}
          className="bg-gradient-to-r from-red-700 to-red-500 hover:from-red-600 hover:to-red-400 text-white px-6 py-3 rounded-lg font-bold font-mono transition-all mb-4"
        >
          Retourner au chat maintenant
        </button>
        
        <p className="text-xs text-gray-500 text-center">
          Si vous n'êtes pas redirigé automatiquement,<br/>
          cliquez sur le bouton ci-dessus
        </p>
      </div>
    </div>
  );
};

export default JitsiReturnPage;