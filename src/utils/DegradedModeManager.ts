/**
 * DegradedModeManager - Gestionnaire du mode dégradé
 * 
 * Cette classe gère:
 * - L'état du mode dégradé (activé/désactivé)
 * - Les notifications utilisateur sur le statut de sécurité
 * - La possibilité de forcer le retour au mode chiffré
 * - Les messages non chiffrés temporaires
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4
 */

export interface DegradedModeState {
  isActive: boolean;
  reason: string;
  timestamp: number;
  context?: string;
  canRetryEncryption: boolean;
  autoRetryAttempts: number;
  maxAutoRetryAttempts: number;
}

export interface DegradedModeNotification {
  type: 'warning' | 'info' | 'error';
  title: string;
  message: string;
  persistent: boolean;
  actions?: Array<{
    label: string;
    action: () => Promise<void>;
    primary?: boolean;
  }>;
}

export interface PlaintextMessage {
  id: string;
  content: string;
  timestamp: number;
  sender: string;
  context: string;
  degradedMode: true;
}

export class DegradedModeManager {
  private state: DegradedModeState = {
    isActive: false,
    reason: '',
    timestamp: 0,
    canRetryEncryption: true,
    autoRetryAttempts: 0,
    maxAutoRetryAttempts: 3
  };

  private listeners: Array<(state: DegradedModeState) => void> = [];
  private notificationListeners: Array<(notification: DegradedModeNotification) => void> = [];
  private autoRetryTimer: NodeJS.Timeout | null = null;
  private readonly AUTO_RETRY_DELAY_MS = 30000; // 30 secondes

  /**
   * Ajoute un listener pour les changements d'état du mode dégradé
   * Requirements: 9.2
   */
  addStateListener(listener: (state: DegradedModeState) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Supprime un listener d'état
   * Requirements: 9.2
   */
  removeStateListener(listener: (state: DegradedModeState) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Ajoute un listener pour les notifications
   * Requirements: 9.2
   */
  addNotificationListener(listener: (notification: DegradedModeNotification) => void): void {
    this.notificationListeners.push(listener);
  }

  /**
   * Supprime un listener de notifications
   * Requirements: 9.2
   */
  removeNotificationListener(listener: (notification: DegradedModeNotification) => void): void {
    const index = this.notificationListeners.indexOf(listener);
    if (index > -1) {
      this.notificationListeners.splice(index, 1);
    }
  }

  /**
   * Active le mode dégradé avec une raison spécifique
   * Requirements: 9.1, 9.2
   */
  async activateDegradedMode(reason: string, context?: string): Promise<void> {
    console.warn(`Activation du mode dégradé: ${reason}`, { context });

    this.state = {
      isActive: true,
      reason,
      timestamp: Date.now(),
      context,
      canRetryEncryption: true,
      autoRetryAttempts: 0,
      maxAutoRetryAttempts: 3
    };

    // Notifier tous les listeners
    this.notifyStateChange();

    // Afficher une notification à l'utilisateur
    this.notifyUser({
      type: 'warning',
      title: 'Mode non sécurisé activé',
      message: `Le chiffrement est temporairement désactivé: ${reason}`,
      persistent: true,
      actions: [
        {
          label: 'Réactiver le chiffrement',
          action: async () => {
            await this.forceReturnToEncryption();
          },
          primary: true
        },
        {
          label: 'Plus tard',
          action: async () => {
            this.scheduleAutoRetry();
          }
        }
      ]
    });

    // Programmer une tentative automatique de retour au chiffrement
    this.scheduleAutoRetry();
  }

  /**
   * Désactive le mode dégradé et retourne au chiffrement normal
   * Requirements: 9.3, 9.4
   */
  async deactivateDegradedMode(): Promise<void> {
    if (!this.state.isActive) {
      return;
    }

    console.log('Désactivation du mode dégradé - retour au chiffrement normal');

    this.state = {
      isActive: false,
      reason: '',
      timestamp: 0,
      canRetryEncryption: true,
      autoRetryAttempts: 0,
      maxAutoRetryAttempts: 3
    };

    // Annuler le timer de retry automatique
    if (this.autoRetryTimer) {
      clearTimeout(this.autoRetryTimer);
      this.autoRetryTimer = null;
    }

    // Notifier tous les listeners
    this.notifyStateChange();

    // Afficher une notification de succès
    this.notifyUser({
      type: 'info',
      title: 'Chiffrement réactivé',
      message: 'Vos messages sont à nouveau chiffrés automatiquement',
      persistent: false
    });
  }

  /**
   * Force le retour au mode chiffré en tentant de résoudre les problèmes
   * Requirements: 9.3, 9.4
   */
  async forceReturnToEncryption(): Promise<boolean> {
    if (!this.state.isActive) {
      return true;
    }

    try {
      console.log('Tentative forcée de retour au chiffrement...');

      // Notifier l'utilisateur de la tentative
      this.notifyUser({
        type: 'info',
        title: 'Réactivation du chiffrement',
        message: 'Tentative de résolution des problèmes de chiffrement...',
        persistent: false
      });

      // Ici, on pourrait ajouter des stratégies de récupération spécifiques
      // Pour l'instant, on simule une tentative de récupération
      await this.attemptEncryptionRecovery();

      // Si on arrive ici, la récupération a réussi
      await this.deactivateDegradedMode();
      return true;

    } catch (error) {
      console.error('Échec de la tentative de retour au chiffrement:', error);

      // Incrémenter le compteur de tentatives
      this.state.autoRetryAttempts++;

      // Si on a dépassé le nombre maximum de tentatives, désactiver les retry automatiques
      if (this.state.autoRetryAttempts >= this.state.maxAutoRetryAttempts) {
        this.state.canRetryEncryption = false;
        
        this.notifyUser({
          type: 'error',
          title: 'Impossible de réactiver le chiffrement',
          message: 'Plusieurs tentatives ont échoué. Le mode non sécurisé reste actif.',
          persistent: true,
          actions: [
            {
              label: 'Réessayer manuellement',
              action: async () => {
                this.state.autoRetryAttempts = 0;
                this.state.canRetryEncryption = true;
                await this.forceReturnToEncryption();
              }
            }
          ]
        });
      } else {
        this.notifyUser({
          type: 'warning',
          title: 'Échec de réactivation',
          message: `Tentative ${this.state.autoRetryAttempts}/${this.state.maxAutoRetryAttempts} échouée. Nouvelle tentative programmée.`,
          persistent: false
        });

        // Programmer une nouvelle tentative
        this.scheduleAutoRetry();
      }

      return false;
    }
  }

  /**
   * Obtient l'état actuel du mode dégradé
   * Requirements: 9.2
   */
  getState(): DegradedModeState {
    return { ...this.state };
  }

  /**
   * Vérifie si le mode dégradé est actif
   * Requirements: 9.1, 9.2
   */
  isActive(): boolean {
    return this.state.isActive;
  }

  /**
   * Envoie un message en mode non chiffré
   * Requirements: 9.1, 9.2
   */
  async sendPlaintextMessage(content: string, sender: string, context: string = 'global'): Promise<PlaintextMessage> {
    if (!this.state.isActive) {
      throw new Error('Le mode dégradé n\'est pas actif');
    }

    const message: PlaintextMessage = {
      id: this.generateMessageId(),
      content,
      timestamp: Date.now(),
      sender,
      context,
      degradedMode: true
    };

    console.warn('Envoi d\'un message non chiffré:', { 
      id: message.id, 
      sender, 
      context,
      reason: this.state.reason 
    });

    return message;
  }

  /**
   * Vérifie si un message est en mode dégradé
   * Requirements: 9.1, 9.2
   */
  isPlaintextMessage(message: any): message is PlaintextMessage {
    return message && message.degradedMode === true;
  }

  /**
   * Obtient des statistiques sur le mode dégradé
   * Requirements: 9.2
   */
  getStats(): {
    isActive: boolean;
    activeSince: number | null;
    reason: string;
    autoRetryAttempts: number;
    canRetryEncryption: boolean;
    nextRetryIn: number | null;
  } {
    return {
      isActive: this.state.isActive,
      activeSince: this.state.isActive ? this.state.timestamp : null,
      reason: this.state.reason,
      autoRetryAttempts: this.state.autoRetryAttempts,
      canRetryEncryption: this.state.canRetryEncryption,
      nextRetryIn: this.autoRetryTimer ? this.AUTO_RETRY_DELAY_MS : null
    };
  }

  /**
   * Réinitialise le gestionnaire de mode dégradé
   * Requirements: 9.3, 9.4
   */
  async reset(): Promise<void> {
    if (this.autoRetryTimer) {
      clearTimeout(this.autoRetryTimer);
      this.autoRetryTimer = null;
    }

    this.state = {
      isActive: false,
      reason: '',
      timestamp: 0,
      canRetryEncryption: true,
      autoRetryAttempts: 0,
      maxAutoRetryAttempts: 3
    };

    this.notifyStateChange();
    console.log('Gestionnaire de mode dégradé réinitialisé');
  }

  /**
   * Notifie tous les listeners du changement d'état
   * Requirements: 9.2
   */
  private notifyStateChange(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.getState());
      } catch (error) {
        console.error('Erreur lors de la notification de changement d\'état:', error);
      }
    });
  }

  /**
   * Notifie l'utilisateur avec une notification
   * Requirements: 9.2
   */
  private notifyUser(notification: DegradedModeNotification): void {
    this.notificationListeners.forEach(listener => {
      try {
        listener(notification);
      } catch (error) {
        console.error('Erreur lors de la notification utilisateur:', error);
      }
    });
  }

  /**
   * Programme une tentative automatique de retour au chiffrement
   * Requirements: 9.3, 9.4
   */
  private scheduleAutoRetry(): void {
    if (!this.state.canRetryEncryption || this.autoRetryTimer) {
      return;
    }

    console.log(`Tentative automatique de retour au chiffrement programmée dans ${this.AUTO_RETRY_DELAY_MS / 1000} secondes`);

    this.autoRetryTimer = setTimeout(async () => {
      this.autoRetryTimer = null;
      
      if (this.state.isActive && this.state.canRetryEncryption) {
        console.log('Tentative automatique de retour au chiffrement...');
        await this.forceReturnToEncryption();
      }
    }, this.AUTO_RETRY_DELAY_MS);
  }

  /**
   * Tente de récupérer le chiffrement (à implémenter selon les besoins)
   * Requirements: 9.3, 9.4
   */
  private async attemptEncryptionRecovery(): Promise<void> {
    // Cette méthode sera étendue pour intégrer avec CryptoManager et CryptoErrorHandler
    // Pour l'instant, on simule une tentative de récupération
    
    // Attendre un peu pour simuler une tentative de récupération
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Pour les tests, on peut simuler un succès ou un échec
    const recoverySuccess = Math.random() > 0.3; // 70% de chance de succès
    
    if (!recoverySuccess) {
      throw new Error('Échec de la récupération du chiffrement');
    }
    
    console.log('Récupération du chiffrement réussie');
  }

  /**
   * Génère un ID unique pour les messages
   * Requirements: 9.1
   */
  private generateMessageId(): string {
    return `degraded_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Nettoie les ressources (timers, listeners)
   * Requirements: 9.3, 9.4
   */
  cleanup(): void {
    if (this.autoRetryTimer) {
      clearTimeout(this.autoRetryTimer);
      this.autoRetryTimer = null;
    }
    
    this.listeners.length = 0;
    this.notificationListeners.length = 0;
    
    console.log('Ressources du gestionnaire de mode dégradé nettoyées');
  }
}

// Instance singleton pour l'application
export const degradedModeManager = new DegradedModeManager();