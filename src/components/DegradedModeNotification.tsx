/**
 * DegradedModeNotification - Composant de notification du mode dégradé
 * 
 * Ce composant affiche:
 * - Une notification persistante quand le mode dégradé est actif
 * - Les actions disponibles pour l'utilisateur
 * - Le statut des tentatives de récupération
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4
 */

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Shield, ShieldOff, RefreshCw, X } from 'lucide-react';
import { degradedModeManager, type DegradedModeState, type DegradedModeNotification } from '../utils/DegradedModeManager.ts';

interface DegradedModeNotificationProps {
  className?: string;
}

export const DegradedModeNotification: React.FC<DegradedModeNotificationProps> = ({ 
  className = '' 
}) => {
  const [state, setState] = useState<DegradedModeState>(degradedModeManager.getState());
  const [notification, setNotification] = useState<DegradedModeNotification | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Écouter les changements d'état du mode dégradé
    const handleStateChange = (newState: DegradedModeState) => {
      setState(newState);
    };

    // Écouter les notifications
    const handleNotification = (notif: DegradedModeNotification) => {
      setNotification(notif);
      
      // Auto-hide pour les notifications non persistantes
      if (!notif.persistent) {
        setTimeout(() => {
          setNotification(null);
        }, 5000);
      }
    };

    degradedModeManager.addStateListener(handleStateChange);
    degradedModeManager.addNotificationListener(handleNotification);

    return () => {
      degradedModeManager.removeStateListener(handleStateChange);
      degradedModeManager.removeNotificationListener(handleNotification);
    };
  }, []);

  const handleRetryEncryption = async () => {
    setIsRetrying(true);
    try {
      await degradedModeManager.forceReturnToEncryption();
    } catch (error) {
      console.error('Erreur lors de la tentative de retour au chiffrement:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  const handleDismissNotification = () => {
    setNotification(null);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <ShieldOff className="w-5 h-5 text-red-500" />;
      case 'info':
        return <Shield className="w-5 h-5 text-blue-500" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getNotificationBgColor = (type: string) => {
    switch (type) {
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-yellow-50 border-yellow-200';
    }
  };

  // Afficher la notification temporaire si elle existe
  if (notification && !state.isActive) {
    return (
      <div className={`fixed top-4 right-4 z-50 max-w-md ${className}`}>
        <div className={`p-4 rounded-lg border shadow-lg ${getNotificationBgColor(notification.type)}`}>
          <div className="flex items-start space-x-3">
            {getNotificationIcon(notification.type)}
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">{notification.title}</h4>
              <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
              
              {notification.actions && notification.actions.length > 0 && (
                <div className="flex space-x-2 mt-3">
                  {notification.actions.map((action, index) => (
                    <button
                      key={index}
                      onClick={action.action}
                      className={`px-3 py-1 text-sm rounded ${
                        action.primary
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {!notification.persistent && (
              <button
                onClick={handleDismissNotification}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Afficher la notification du mode dégradé si actif
  if (!state.isActive) {
    return null;
  }

  const stats = degradedModeManager.getStats();

  return (
    <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-2xl w-full mx-4 ${className}`}>
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg shadow-lg p-4">
        <div className="flex items-start space-x-3">
          <ShieldOff className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
          
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-yellow-800">
                Mode non sécurisé actif
              </h3>
              
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-yellow-600 hover:text-yellow-800 text-sm"
              >
                {showDetails ? 'Masquer' : 'Détails'}
              </button>
            </div>
            
            <p className="text-sm text-yellow-700 mt-1">
              Vos messages ne sont pas chiffrés temporairement: {state.reason}
            </p>

            {showDetails && (
              <div className="mt-3 p-3 bg-yellow-100 rounded text-xs text-yellow-800">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <strong>Actif depuis:</strong> {new Date(state.timestamp).toLocaleTimeString()}
                  </div>
                  <div>
                    <strong>Tentatives:</strong> {stats.autoRetryAttempts}/{state.maxAutoRetryAttempts}
                  </div>
                  <div>
                    <strong>Contexte:</strong> {state.context || 'Global'}
                  </div>
                  <div>
                    <strong>Retry auto:</strong> {state.canRetryEncryption ? 'Oui' : 'Non'}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center space-x-3 mt-3">
              <button
                onClick={handleRetryEncryption}
                disabled={isRetrying || !state.canRetryEncryption}
                className={`flex items-center space-x-2 px-4 py-2 text-sm rounded-md ${
                  isRetrying || !state.canRetryEncryption
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-yellow-600 text-white hover:bg-yellow-700'
                }`}
              >
                {isRetrying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Réactivation...</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    <span>Réactiver le chiffrement</span>
                  </>
                )}
              </button>

              {stats.nextRetryIn && (
                <span className="text-xs text-yellow-600">
                  Prochaine tentative automatique dans {Math.round(stats.nextRetryIn / 1000)}s
                </span>
              )}
            </div>

            {!state.canRetryEncryption && (
              <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded text-xs text-red-700">
                <AlertTriangle className="w-4 h-4 inline mr-1" />
                Plusieurs tentatives ont échoué. Les tentatives automatiques sont désactivées.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DegradedModeNotification;