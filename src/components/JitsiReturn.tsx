import React, { useEffect, useState } from 'react';
import { getAndClearReturnState, isReturnStateValid } from '../utils/webview';

interface JitsiReturnProps {
  onReturn: () => void;
}

const JitsiReturn: React.FC<JitsiReturnProps> = ({ onReturn }) => {
  const [countdown, setCountdown] = useState(3);
  const [showManualReturn, setShowManualReturn] = useState(false);

  useEffect(() => {
    // Vérifier si l'état de retour est valide
    if (!isReturnStateValid()) {
      // Pas de données valides, fermer immédiatement
      onReturn();
      return;
    }

    // Compte à rebours automatique
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleReturn();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Afficher le bouton manuel après 5 secondes
    const manualTimer = setTimeout(() => {
      setShowManualReturn(true);
    }, 5000);

    return () => {
      clearInterval(timer);
      clearTimeout(manualTimer);
    };
  }, [onReturn]);

  const handleReturn = () => {
    // Récupérer et nettoyer l'état de retour
    const returnState = getAndClearReturnState();
    
    if (returnState) {
      console.log('Retour de Jitsi:', returnState.roomName);
    }
    
    // Notifier le parent
    onReturn();
  };

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
          Retour au chat dans {countdown} seconde{countdown > 1 ? 's' : ''}...
        </p>
        <div className="w-full bg-red-900/50 rounded-full h-2 mb-4">
          <div 
            className="bg-red-500 h-2 rounded-full transition-all duration-1000" 
            style={{ width: `${((3 - countdown) / 3) * 100}%` }}
          ></div>
        </div>
        
        {showManualReturn && (
          <button
            onClick={handleReturn}
            className="bg-gradient-to-r from-red-700 to-red-500 hover:from-red-600 hover:to-red-400 text-white px-6 py-2 rounded-lg font-bold font-mono transition-all"
          >
            Retourner au chat maintenant
          </button>
        )}
        
        <p className="text-xs text-gray-500 mt-4">
          Si la redirection ne fonctionne pas, fermez cet onglet et revenez au chat
        </p>
      </div>
    </div>
  );
};

export default JitsiReturn;