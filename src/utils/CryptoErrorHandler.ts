/**
 * CryptoErrorHandler - Gestionnaire d'erreurs pour le système de chiffrement
 * 
 * Cette classe gère automatiquement:
 * - La récupération automatique en cas d'erreur de chiffrement
 * - La régénération des clés manquantes ou corrompues
 * - Les stratégies de fallback et de resynchronisation
 * - Les notifications utilisateur pour les erreurs récupérables
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 9.1, 9.2, 9.3, 9.4
 */

import { cryptoManager, type EncryptedMessage } from './CryptoManager.ts';
import { secureStorage } from './SecureStorage.ts';

export interface CryptoError extends Error {
  type: 'DECRYPTION_FAILED' | 'KEY_NOT_FOUND' | 'KEY_EXCHANGE_FAILED' | 'STORAGE_ERROR' | 'ENCRYPTION_FAILED' | 'GENERIC_ERROR';
  context?: string;
  originalError?: Error;
  recoverable: boolean;
  retryCount?: number;
}

export interface RecoveryResult {
  success: boolean;
  message: string;
  action?: 'retry' | 'regenerate' | 'resync' | 'degraded_mode';
  data?: any;
}

export interface ErrorNotification {
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  actions?: Array<{
    label: string;
    action: () => Promise<void>;
  }>;
  autoHide?: boolean;
  duration?: number;
}

export class CryptoErrorHandler {
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY_MS = 1000;
  private retryCounters: Map<string, number> = new Map();
  private errorListeners: Array<(notification: ErrorNotification) => void> = [];

  /**
   * Ajoute un listener pour les notifications d'erreur
   * Requirements: 8.4, 9.2
   */
  addErrorListener(listener: (notification: ErrorNotification) => void): void {
    this.errorListeners.push(listener);
  }

  /**
   * Supprime un listener de notifications d'erreur
   * Requirements: 8.4, 9.2
   */
  removeErrorListener(listener: (notification: ErrorNotification) => void): void {
    const index = this.errorListeners.indexOf(listener);
    if (index > -1) {
      this.errorListeners.splice(index, 1);
    }
  }

  /**
   * Émet une notification d'erreur à tous les listeners
   * Requirements: 8.4, 9.2
   */
  private notifyError(notification: ErrorNotification): void {
    this.errorListeners.forEach(listener => {
      try {
        listener(notification);
      } catch (error) {
        console.error('Erreur lors de la notification d\'erreur:', error);
      }
    });
  }

  /**
   * Gestionnaire principal d'erreurs avec stratégies de récupération
   * Requirements: 8.1, 8.2, 8.3, 8.4
   */
  async handleError(error: CryptoError, context: string): Promise<RecoveryResult> {
    console.error(`Erreur cryptographique [${error.type}] dans le contexte ${context}:`, error);

    try {
      switch (error.type) {
        case 'DECRYPTION_FAILED':
          return await this.handleDecryptionFailure(error, context);
        case 'KEY_NOT_FOUND':
          return await this.handleMissingKey(error, context);
        case 'KEY_EXCHANGE_FAILED':
          return await this.handleKeyExchangeFailure(error, context);
        case 'STORAGE_ERROR':
          return await this.handleStorageError(error, context);
        case 'ENCRYPTION_FAILED':
          return await this.handleEncryptionFailure(error, context);
        default:
          return await this.handleGenericError(error, context);
      }
    } catch (recoveryError) {
      console.error('Erreur lors de la récupération:', recoveryError);
      return {
        success: false,
        message: 'Impossible de récupérer de l\'erreur automatiquement',
        action: 'degraded_mode'
      };
    }
  }

  /**
   * Gère les échecs de déchiffrement avec tentatives de récupération
   * Requirements: 8.1, 8.2, 8.3
   */
  async handleDecryptionFailure(error: CryptoError, context: string): Promise<RecoveryResult> {
    const retryKey = `decrypt_${context}`;
    const retryCount = this.getRetryCount(retryKey);

    // Si on a déjà essayé plusieurs fois, passer en mode dégradé
    if (retryCount >= this.MAX_RETRY_ATTEMPTS) {
      this.notifyError({
        type: 'error',
        title: 'Échec de déchiffrement',
        message: 'Impossible de déchiffrer le message après plusieurs tentatives',
        actions: [
          {
            label: 'Régénérer les clés',
            action: async () => {
              await this.regenerateKey(context);
            }
          }
        ]
      });

      return {
        success: false,
        message: 'Échec de déchiffrement persistant',
        action: 'degraded_mode'
      };
    }

    // Stratégie 1: Essayer avec une clé de sauvegarde
    try {
      const backupKey = await this.tryBackupKey(context);
      if (backupKey) {
        this.resetRetryCount(retryKey);
        return {
          success: true,
          message: 'Récupération réussie avec clé de sauvegarde',
          action: 'retry'
        };
      }
    } catch (backupError) {
      console.warn('Échec de récupération avec clé de sauvegarde:', backupError);
    }

    // Stratégie 2: Demander une resynchronisation
    try {
      await this.requestResynchronization(context);
      this.incrementRetryCount(retryKey);
      
      this.notifyError({
        type: 'warning',
        title: 'Resynchronisation en cours',
        message: 'Tentative de resynchronisation des clés de chiffrement',
        autoHide: true,
        duration: 3000
      });

      return {
        success: true,
        message: 'Resynchronisation demandée',
        action: 'resync'
      };
    } catch (resyncError) {
      console.warn('Échec de resynchronisation:', resyncError);
    }

    // Stratégie 3: Régénérer la clé si nécessaire
    this.incrementRetryCount(retryKey);
    
    this.notifyError({
      type: 'warning',
      title: 'Problème de déchiffrement',
      message: 'Tentative de régénération de la clé de chiffrement',
      actions: [
        {
          label: 'Réessayer',
          action: async () => {
            await this.regenerateKey(context);
          }
        }
      ]
    });

    return {
      success: false,
      message: 'Tentative de régénération nécessaire',
      action: 'regenerate'
    };
  }

  /**
   * Gère les clés manquantes en les régénérant
   * Requirements: 8.1, 8.2, 8.3
   */
  async handleMissingKey(error: CryptoError, context: string): Promise<RecoveryResult> {
    try {
      console.log(`Régénération de la clé manquante pour le contexte: ${context}`);
      
      // Régénérer la clé selon le contexte
      let newKey: CryptoKey;
      
      if (context === 'global') {
        newKey = await cryptoManager.generateGlobalKey();
      } else if (context.startsWith('group_')) {
        const groupId = context.replace('group_', '');
        newKey = await cryptoManager.generateGroupKey(groupId);
      } else {
        throw new Error(`Contexte de clé non reconnu: ${context}`);
      }

      this.notifyError({
        type: 'success',
        title: 'Clé régénérée',
        message: `Nouvelle clé de chiffrement créée pour ${context === 'global' ? 'la session' : 'le groupe'}`,
        autoHide: true,
        duration: 3000
      });

      return {
        success: true,
        message: 'Clé régénérée avec succès',
        action: 'retry',
        data: { key: newKey }
      };
    } catch (regenerationError) {
      console.error('Erreur lors de la régénération de clé:', regenerationError);
      
      this.notifyError({
        type: 'error',
        title: 'Échec de régénération',
        message: 'Impossible de créer une nouvelle clé de chiffrement',
        actions: [
          {
            label: 'Mode dégradé',
            action: async () => {
              // Le mode dégradé sera géré par le composant appelant
            }
          }
        ]
      });

      return {
        success: false,
        message: 'Impossible de régénérer la clé',
        action: 'degraded_mode'
      };
    }
  }

  /**
   * Gère les échecs d'échange de clés
   * Requirements: 8.1, 8.2, 8.3
   */
  async handleKeyExchangeFailure(error: CryptoError, context: string): Promise<RecoveryResult> {
    const retryKey = `exchange_${context}`;
    const retryCount = this.getRetryCount(retryKey);

    if (retryCount >= this.MAX_RETRY_ATTEMPTS) {
      this.notifyError({
        type: 'error',
        title: 'Échec d\'échange de clés',
        message: 'Impossible d\'échanger les clés avec les autres membres du groupe',
        actions: [
          {
            label: 'Rejoindre à nouveau',
            action: async () => {
              // L'action sera gérée par le composant appelant
            }
          }
        ]
      });

      return {
        success: false,
        message: 'Échec d\'échange de clés persistant',
        action: 'degraded_mode'
      };
    }

    // Attendre avant de réessayer
    await this.delay(this.RETRY_DELAY_MS * (retryCount + 1));
    this.incrementRetryCount(retryKey);

    this.notifyError({
      type: 'info',
      title: 'Nouvelle tentative d\'échange',
      message: 'Tentative de reconnexion pour l\'échange de clés',
      autoHide: true,
      duration: 2000
    });

    return {
      success: true,
      message: 'Nouvelle tentative d\'échange programmée',
      action: 'retry'
    };
  }

  /**
   * Gère les erreurs de stockage
   * Requirements: 8.1, 8.2, 8.3
   */
  async handleStorageError(error: CryptoError, context: string): Promise<RecoveryResult> {
    try {
      // Vérifier l'intégrité du stockage
      const integrity = await cryptoManager.verifyIntegrity();
      
      if (!integrity.valid) {
        console.warn('Intégrité du stockage compromise, tentative de réparation');
        
        // Essayer de nettoyer et réinitialiser le stockage
        await secureStorage.cleanup();
        
        this.notifyError({
          type: 'warning',
          title: 'Stockage réparé',
          message: 'Le stockage des clés a été nettoyé et réparé',
          autoHide: true,
          duration: 3000
        });

        return {
          success: true,
          message: 'Stockage réparé',
          action: 'retry'
        };
      }

      // Si le stockage est valide mais on a une erreur, essayer de régénérer
      return await this.handleMissingKey(error, context);
    } catch (storageError) {
      console.error('Erreur lors de la réparation du stockage:', storageError);
      
      this.notifyError({
        type: 'error',
        title: 'Erreur de stockage',
        message: 'Problème persistant avec le stockage des clés',
        actions: [
          {
            label: 'Réinitialiser',
            action: async () => {
              await cryptoManager.reset();
            }
          }
        ]
      });

      return {
        success: false,
        message: 'Erreur de stockage non récupérable',
        action: 'degraded_mode'
      };
    }
  }

  /**
   * Gère les échecs de chiffrement
   * Requirements: 8.1, 8.2, 8.3
   */
  async handleEncryptionFailure(error: CryptoError, context: string): Promise<RecoveryResult> {
    try {
      // Vérifier si la clé existe et est valide
      const hasKey = await cryptoManager.hasKey(context);
      
      if (!hasKey) {
        return await this.handleMissingKey(error, context);
      }

      // Essayer de régénérer la clé si elle semble corrompue
      await this.regenerateKey(context);
      
      this.notifyError({
        type: 'info',
        title: 'Clé renouvelée',
        message: 'La clé de chiffrement a été renouvelée',
        autoHide: true,
        duration: 2000
      });

      return {
        success: true,
        message: 'Clé renouvelée pour le chiffrement',
        action: 'retry'
      };
    } catch (encryptionError) {
      console.error('Erreur lors de la récupération du chiffrement:', encryptionError);
      
      this.notifyError({
        type: 'error',
        title: 'Échec de chiffrement',
        message: 'Impossible de chiffrer le message',
        actions: [
          {
            label: 'Mode dégradé',
            action: async () => {
              // Le mode dégradé sera géré par le composant appelant
            }
          }
        ]
      });

      return {
        success: false,
        message: 'Échec de chiffrement non récupérable',
        action: 'degraded_mode'
      };
    }
  }

  /**
   * Gère les erreurs génériques
   * Requirements: 8.1, 8.2, 8.3, 8.4
   */
  async handleGenericError(error: CryptoError, context: string): Promise<RecoveryResult> {
    console.error('Erreur cryptographique générique:', error);
    
    this.notifyError({
      type: 'error',
      title: 'Erreur de chiffrement',
      message: 'Une erreur inattendue s\'est produite avec le système de chiffrement',
      actions: [
        {
          label: 'Réessayer',
          action: async () => {
            // L'action sera gérée par le composant appelant
          }
        },
        {
          label: 'Réinitialiser',
          action: async () => {
            await cryptoManager.reset();
          }
        }
      ]
    });

    return {
      success: false,
      message: 'Erreur générique non récupérable',
      action: 'degraded_mode'
    };
  }

  /**
   * Régénère une clé pour un contexte donné
   * Requirements: 8.2, 8.3
   */
  async regenerateKey(context: string): Promise<void> {
    try {
      // Supprimer l'ancienne clé
      await cryptoManager.removeKey(context);
      
      // Générer une nouvelle clé
      if (context === 'global') {
        await cryptoManager.generateGlobalKey();
      } else if (context.startsWith('group_')) {
        const groupId = context.replace('group_', '');
        await cryptoManager.generateGroupKey(groupId);
      }
      
      console.log(`Clé régénérée pour le contexte: ${context}`);
    } catch (error) {
      console.error(`Erreur lors de la régénération de la clé ${context}:`, error);
      throw error;
    }
  }

  /**
   * Essaie d'utiliser une clé de sauvegarde
   * Requirements: 8.1, 8.2
   */
  private async tryBackupKey(context: string): Promise<boolean> {
    try {
      // Chercher des clés de sauvegarde (versions précédentes)
      const allKeys = await cryptoManager.listKeyContexts();
      const backupKeys = allKeys.filter(key => key.startsWith(`${context}_backup_`));
      
      if (backupKeys.length > 0) {
        // Essayer la sauvegarde la plus récente
        const latestBackup = backupKeys.sort().pop();
        if (latestBackup) {
          const backupKey = await cryptoManager.getKey(latestBackup);
          if (backupKey) {
            // Restaurer la clé de sauvegarde
            await cryptoManager.storeKey(context, backupKey);
            console.log(`Clé restaurée depuis la sauvegarde: ${latestBackup}`);
            return true;
          }
        }
      }
      
      return false;
    } catch (error) {
      console.error('Erreur lors de la tentative de clé de sauvegarde:', error);
      return false;
    }
  }

  /**
   * Demande une resynchronisation des clés
   * Requirements: 8.1, 8.2
   */
  private async requestResynchronization(context: string): Promise<void> {
    // Cette méthode sera étendue quand le KeyExchanger sera intégré
    console.log(`Resynchronisation demandée pour le contexte: ${context}`);
    
    // Pour l'instant, on régénère simplement la clé
    await this.regenerateKey(context);
  }

  /**
   * Obtient le nombre de tentatives pour une opération
   * Requirements: 8.1, 8.3
   */
  private getRetryCount(key: string): number {
    return this.retryCounters.get(key) || 0;
  }

  /**
   * Incrémente le compteur de tentatives
   * Requirements: 8.1, 8.3
   */
  private incrementRetryCount(key: string): void {
    const current = this.getRetryCount(key);
    this.retryCounters.set(key, current + 1);
  }

  /**
   * Remet à zéro le compteur de tentatives
   * Requirements: 8.1, 8.3
   */
  private resetRetryCount(key: string): void {
    this.retryCounters.delete(key);
  }

  /**
   * Attendre un délai spécifié
   * Requirements: 8.1, 8.3
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Crée une erreur cryptographique typée
   * Requirements: 8.1, 8.4
   */
  static createError(
    type: CryptoError['type'],
    message: string,
    context?: string,
    originalError?: Error,
    recoverable: boolean = true
  ): CryptoError {
    const error = new Error(message) as CryptoError;
    error.type = type;
    error.context = context;
    error.originalError = originalError;
    error.recoverable = recoverable;
    return error;
  }

  /**
   * Nettoie les compteurs de tentatives (utile pour les tests)
   * Requirements: 8.1
   */
  clearRetryCounters(): void {
    this.retryCounters.clear();
  }

  /**
   * Obtient les statistiques d'erreurs
   * Requirements: 8.4, 10.1, 10.2
   */
  getErrorStats(): {
    activeRetries: number;
    retryCounters: Record<string, number>;
    listeners: number;
  } {
    return {
      activeRetries: this.retryCounters.size,
      retryCounters: Object.fromEntries(this.retryCounters),
      listeners: this.errorListeners.length
    };
  }
}

// Instance singleton pour l'application
export const cryptoErrorHandler = new CryptoErrorHandler();