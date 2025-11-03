/**
 * useDegradedMode - Hook React pour le mode dégradé
 * 
 * Ce hook fournit:
 * - L'état actuel du mode dégradé
 * - Les fonctions pour activer/désactiver le mode
 * - Les statistiques et informations de debug
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  degradedModeManager, 
  type DegradedModeState, 
  type DegradedModeNotification,
  type PlaintextMessage 
} from '../utils/DegradedModeManager.ts';

export interface UseDegradedModeReturn {
  // État
  state: DegradedModeState;
  isActive: boolean;
  stats: ReturnType<typeof degradedModeManager.getStats>;
  
  // Actions
  activateDegradedMode: (reason: string, context?: string) => Promise<void>;
  deactivateDegradedMode: () => Promise<void>;
  forceReturnToEncryption: () => Promise<boolean>;
  sendPlaintextMessage: (content: string, sender: string, context?: string) => Promise<PlaintextMessage>;
  
  // Utilitaires
  isPlaintextMessage: (message: any) => message is PlaintextMessage;
  reset: () => Promise<void>;
}

export const useDegradedMode = (): UseDegradedModeReturn => {
  const [state, setState] = useState<DegradedModeState>(degradedModeManager.getState());
  const [stats, setStats] = useState(degradedModeManager.getStats());

  // Mettre à jour l'état quand le mode dégradé change
  useEffect(() => {
    const handleStateChange = (newState: DegradedModeState) => {
      setState(newState);
      setStats(degradedModeManager.getStats());
    };

    degradedModeManager.addStateListener(handleStateChange);

    return () => {
      degradedModeManager.removeStateListener(handleStateChange);
    };
  }, []);

  // Mettre à jour les stats périodiquement (pour les timers)
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(degradedModeManager.getStats());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const activateDegradedMode = useCallback(async (reason: string, context?: string) => {
    await degradedModeManager.activateDegradedMode(reason, context);
  }, []);

  const deactivateDegradedMode = useCallback(async () => {
    await degradedModeManager.deactivateDegradedMode();
  }, []);

  const forceReturnToEncryption = useCallback(async () => {
    return await degradedModeManager.forceReturnToEncryption();
  }, []);

  const sendPlaintextMessage = useCallback(async (content: string, sender: string, context: string = 'global') => {
    return await degradedModeManager.sendPlaintextMessage(content, sender, context);
  }, []);

  const isPlaintextMessage = useCallback((message: any): message is PlaintextMessage => {
    return degradedModeManager.isPlaintextMessage(message);
  }, []);

  const reset = useCallback(async () => {
    await degradedModeManager.reset();
  }, []);

  return {
    state,
    isActive: state.isActive,
    stats,
    activateDegradedMode,
    deactivateDegradedMode,
    forceReturnToEncryption,
    sendPlaintextMessage,
    isPlaintextMessage,
    reset
  };
};

export default useDegradedMode;