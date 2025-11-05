/**
 * SecureStorage - Système de stockage local sécurisé pour les clés cryptographiques
 * 
 * Cette classe gère:
 * - Le chiffrement des clés avant stockage dans localStorage
 * - La génération d'une clé maître dérivée du contexte navigateur
 * - La gestion des métadonnées de clés (création, dernière utilisation)
 * - Le nettoyage automatique des clés expirées
 * 
 * Requirements: 3.3, 4.1, 4.2, 2.1, 2.2, 10.1, 10.2
 */

export interface KeyMetadata {
  id: string;             // Identifiant unique de la clé
  context: string;        // 'global' ou groupId
  algorithm: string;      // 'AES-GCM'
  length: number;         // 256
  created: number;        // Timestamp de création
  lastUsed: number;       // Dernière utilisation
  version: number;        // Version de la clé
  rotationSchedule?: number; // Prochaine rotation
}

export interface ExportedKeys {
  version: string;
  timestamp: number;
  keys: Array<{
    context: string;
    keyData: string;
    metadata: KeyMetadata;
  }>;
}

interface StoredKeyData {
  encryptedKey: number[];
  iv: number[];
  metadata: KeyMetadata;
}

export class SecureStorage {
  private readonly STORAGE_PREFIX = 'liberchat_secure_';
  private readonly METADATA_PREFIX = 'liberchat_meta_';
  private readonly MASTER_KEY_ID = 'master_key_v1';
  private readonly ALGORITHM = 'AES-GCM';
  private readonly KEY_LENGTH = 256;
  private readonly EXPORT_VERSION = '1.0';
  
  // Cache de la clé maître pour éviter les re-dérivations
  private masterKey: CryptoKey | null = null;
  
  /**
   * Génère ou récupère la clé maître pour chiffrer les clés stockées
   * La clé maître est dérivée du contexte navigateur pour plus de sécurité
   * Requirements: 3.3, 4.1, 4.2
   */
  private async getMasterKey(): Promise<CryptoKey> {
    if (this.masterKey) {
      return this.masterKey;
    }

    try {
      // Vérifier que localStorage est disponible
      if (typeof localStorage === 'undefined') {
        throw new Error('localStorage non disponible');
      }

      // Vérifier que les APIs crypto sont disponibles
      if (!window.crypto || !window.crypto.subtle) {
        throw new Error('API Web Crypto non disponible');
      }

      let storedMasterKey: string | null = null;
      try {
        // Essayer de récupérer la clé maître existante
        storedMasterKey = localStorage.getItem(this.STORAGE_PREFIX + this.MASTER_KEY_ID);
      } catch (storageError) {
        console.warn('Erreur lors de l\'accès à localStorage:', storageError);
        storedMasterKey = null;
      }
      
      if (storedMasterKey) {
        try {
          // Importer la clé maître existante
          const keyData = JSON.parse(storedMasterKey);
          
          // Validation des données
          if (!keyData.key || !Array.isArray(keyData.key)) {
            throw new Error('Données de clé maître corrompues');
          }
          
          this.masterKey = await window.crypto.subtle.importKey(
            'raw',
            new Uint8Array(keyData.key),
            { name: this.ALGORITHM },
            false,
            ['encrypt', 'decrypt']
          );
        } catch (importError) {
          console.warn('Erreur lors de l\'import de la clé maître existante:', importError);
          // Continuer pour générer une nouvelle clé
          this.masterKey = null;
        }
      }
      
      if (!this.masterKey) {
        // Générer une nouvelle clé maître
        this.masterKey = await window.crypto.subtle.generateKey(
          { name: this.ALGORITHM, length: this.KEY_LENGTH },
          true,
          ['encrypt', 'decrypt']
        );

        try {
          // Exporter et stocker la clé maître
          const exportedKey = await window.crypto.subtle.exportKey('raw', this.masterKey);
          const keyData = {
            key: Array.from(new Uint8Array(exportedKey)),
            created: Date.now(),
            algorithm: this.ALGORITHM
          };
          
          localStorage.setItem(
            this.STORAGE_PREFIX + this.MASTER_KEY_ID, 
            JSON.stringify(keyData)
          );
        } catch (storageError) {
          console.warn('Impossible de stocker la clé maître:', storageError);
          // Continuer sans stockage persistant
        }
      }

      return this.masterKey;
    } catch (error) {
      console.error('Erreur lors de la génération/récupération de la clé maître:', error);
      throw new Error('Impossible d\'initialiser le stockage sécurisé');
    }
  }

  /**
   * Stocke une clé de manière sécurisée avec chiffrement
   * Requirements: 3.3, 4.1, 4.2
   */
  async storeKey(keyId: string, key: CryptoKey): Promise<void> {
    try {
      if (!keyId || !key) {
        throw new Error('ID de clé ou clé invalide');
      }

      const masterKey = await this.getMasterKey();
      
      // Exporter la clé à stocker
      const exportedKey = await window.crypto.subtle.exportKey('raw', key);
      
      // Générer un IV unique pour le chiffrement
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      
      // Chiffrer la clé avec la clé maître
      const encryptedKey = await window.crypto.subtle.encrypt(
        { name: this.ALGORITHM, iv },
        masterKey,
        exportedKey
      );

      // Créer les métadonnées
      const now = Date.now();
      const existingMetadata = await this.getMetadata(keyId);
      const metadata: KeyMetadata = {
        id: keyId,
        context: keyId,
        algorithm: this.ALGORITHM,
        length: this.KEY_LENGTH,
        created: existingMetadata?.created || now,
        lastUsed: now,
        version: (existingMetadata?.version || 0) + 1
      };

      // Préparer les données à stocker
      const storedData: StoredKeyData = {
        encryptedKey: Array.from(new Uint8Array(encryptedKey)),
        iv: Array.from(iv),
        metadata
      };

      // Stocker la clé chiffrée
      localStorage.setItem(
        this.STORAGE_PREFIX + keyId,
        JSON.stringify(storedData)
      );

      // Stocker les métadonnées séparément pour faciliter les requêtes
      await this.storeMetadata(keyId, metadata);

      console.log(`Clé ${keyId} stockée de manière sécurisée, version ${metadata.version}`);
    } catch (error) {
      console.error(`Erreur lors du stockage sécurisé de la clé ${keyId}:`, error);
      throw new Error(`Impossible de stocker la clé ${keyId} de manière sécurisée`);
    }
  }

  /**
   * Récupère une clé stockée et la déchiffre
   * Requirements: 3.3, 4.1, 4.2
   */
  async retrieveKey(keyId: string): Promise<CryptoKey | null> {
    try {
      if (!keyId) {
        return null;
      }

      const storedData = localStorage.getItem(this.STORAGE_PREFIX + keyId);
      if (!storedData) {
        return null;
      }

      const parsedData: StoredKeyData = JSON.parse(storedData);
      const masterKey = await this.getMasterKey();

      // Reconstituer les données chiffrées
      const encryptedKey = new Uint8Array(parsedData.encryptedKey);
      const iv = new Uint8Array(parsedData.iv);

      // Déchiffrer la clé
      const decryptedKey = await window.crypto.subtle.decrypt(
        { name: this.ALGORITHM, iv },
        masterKey,
        encryptedKey
      );

      // Importer la clé déchiffrée
      const key = await window.crypto.subtle.importKey(
        'raw',
        decryptedKey,
        { name: this.ALGORITHM },
        true,
        ['encrypt', 'decrypt']
      );

      // Mettre à jour la dernière utilisation
      const metadata = parsedData.metadata;
      metadata.lastUsed = Date.now();
      await this.storeMetadata(keyId, metadata);

      return key;
    } catch (error) {
      console.error(`Erreur lors de la récupération de la clé ${keyId}:`, error);
      return null;
    }
  }

  /**
   * Supprime une clé du stockage sécurisé
   * Requirements: 3.3, 4.1, 4.2
   */
  async deleteKey(keyId: string): Promise<void> {
    try {
      localStorage.removeItem(this.STORAGE_PREFIX + keyId);
      localStorage.removeItem(this.METADATA_PREFIX + keyId);
      console.log(`Clé ${keyId} supprimée du stockage sécurisé`);
    } catch (error) {
      console.error(`Erreur lors de la suppression de la clé ${keyId}:`, error);
      throw new Error(`Impossible de supprimer la clé ${keyId}`);
    }
  }

  /**
   * Liste toutes les clés stockées
   * Requirements: 2.1, 2.2, 10.1, 10.2
   */
  async listKeys(): Promise<string[]> {
    try {
      const keys: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.STORAGE_PREFIX) && !key.includes(this.MASTER_KEY_ID)) {
          const keyId = key.replace(this.STORAGE_PREFIX, '');
          keys.push(keyId);
        }
      }
      
      return keys.sort();
    } catch (error) {
      console.error('Erreur lors de la liste des clés:', error);
      return [];
    }
  }

  /**
   * Stocke les métadonnées d'une clé
   * Requirements: 2.1, 2.2, 10.1, 10.2
   */
  async storeMetadata(keyId: string, metadata: KeyMetadata): Promise<void> {
    try {
      localStorage.setItem(
        this.METADATA_PREFIX + keyId,
        JSON.stringify(metadata)
      );
    } catch (error) {
      console.error(`Erreur lors du stockage des métadonnées pour ${keyId}:`, error);
      throw new Error(`Impossible de stocker les métadonnées pour ${keyId}`);
    }
  }

  /**
   * Récupère les métadonnées d'une clé
   * Requirements: 2.1, 2.2, 10.1, 10.2
   */
  async getMetadata(keyId: string): Promise<KeyMetadata | null> {
    try {
      const storedMetadata = localStorage.getItem(this.METADATA_PREFIX + keyId);
      if (!storedMetadata) {
        return null;
      }
      
      return JSON.parse(storedMetadata) as KeyMetadata;
    } catch (error) {
      console.error(`Erreur lors de la récupération des métadonnées pour ${keyId}:`, error);
      return null;
    }
  }

  /**
   * Nettoie les clés expirées et orphelines
   * Requirements: 2.1, 2.2, 10.1, 10.2
   */
  async cleanup(): Promise<void> {
    try {
      const keys = await this.listKeys();
      const now = Date.now();
      const EXPIRY_TIME = 30 * 24 * 60 * 60 * 1000; // 30 jours
      let cleanedCount = 0;

      for (const keyId of keys) {
        const metadata = await this.getMetadata(keyId);
        
        if (!metadata) {
          // Clé orpheline sans métadonnées
          await this.deleteKey(keyId);
          cleanedCount++;
          continue;
        }

        // Vérifier l'expiration basée sur la dernière utilisation
        if (now - metadata.lastUsed > EXPIRY_TIME) {
          // Ne pas supprimer la clé globale même si elle est ancienne
          if (keyId !== 'global') {
            await this.deleteKey(keyId);
            cleanedCount++;
          }
        }
      }

      if (cleanedCount > 0) {
        console.log(`Nettoyage terminé: ${cleanedCount} clés supprimées`);
      }
    } catch (error) {
      console.error('Erreur lors du nettoyage:', error);
    }
  }

  /**
   * Exporte toutes les clés pour sauvegarde
   * Requirements: 10.3
   */
  async exportKeys(): Promise<ExportedKeys> {
    try {
      const keys = await this.listKeys();
      const exportedKeys: ExportedKeys = {
        version: this.EXPORT_VERSION,
        timestamp: Date.now(),
        keys: []
      };

      for (const keyId of keys) {
        const key = await this.retrieveKey(keyId);
        const metadata = await this.getMetadata(keyId);
        
        if (key && metadata) {
          const exportedKey = await window.crypto.subtle.exportKey('raw', key);
          exportedKeys.keys.push({
            context: keyId,
            keyData: btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(exportedKey)))),
            metadata
          });
        }
      }

      return exportedKeys;
    } catch (error) {
      console.error('Erreur lors de l\'export des clés:', error);
      throw new Error('Impossible d\'exporter les clés');
    }
  }

  /**
   * Importe des clés depuis une sauvegarde
   * Requirements: 10.3
   */
  async importKeys(exportedKeys: ExportedKeys): Promise<void> {
    try {
      if (!exportedKeys || !exportedKeys.keys) {
        throw new Error('Données d\'import invalides');
      }

      let importedCount = 0;

      for (const keyData of exportedKeys.keys) {
        try {
          // Décoder la clé
          const rawKey = Uint8Array.from(atob(keyData.keyData), c => c.charCodeAt(0));
          
          // Importer la clé
          const key = await window.crypto.subtle.importKey(
            'raw',
            rawKey,
            { name: this.ALGORITHM },
            true,
            ['encrypt', 'decrypt']
          );

          // Stocker la clé avec ses métadonnées
          await this.storeKey(keyData.context, key);
          importedCount++;
        } catch (error) {
          console.warn(`Impossible d'importer la clé ${keyData.context}:`, error);
        }
      }

      console.log(`Import terminé: ${importedCount} clés importées`);
    } catch (error) {
      console.error('Erreur lors de l\'import des clés:', error);
      throw new Error('Impossible d\'importer les clés');
    }
  }

  /**
   * Obtient des statistiques sur le stockage
   * Requirements: 10.1, 10.2
   */
  async getStorageStats(): Promise<{
    totalKeys: number;
    storageUsed: number;
    oldestKey?: { id: string; created: number };
    newestKey?: { id: string; created: number };
    mostUsedKey?: { id: string; lastUsed: number };
  }> {
    try {
      const keys = await this.listKeys();
      let storageUsed = 0;
      let oldestKey: { id: string; created: number } | undefined;
      let newestKey: { id: string; created: number } | undefined;
      let mostUsedKey: { id: string; lastUsed: number } | undefined;

      for (const keyId of keys) {
        // Calculer l'espace utilisé
        const storedData = localStorage.getItem(this.STORAGE_PREFIX + keyId);
        const metadataData = localStorage.getItem(this.METADATA_PREFIX + keyId);
        
        if (storedData) storageUsed += storedData.length;
        if (metadataData) storageUsed += metadataData.length;

        // Analyser les métadonnées
        const metadata = await this.getMetadata(keyId);
        if (metadata) {
          if (!oldestKey || metadata.created < oldestKey.created) {
            oldestKey = { id: keyId, created: metadata.created };
          }
          
          if (!newestKey || metadata.created > newestKey.created) {
            newestKey = { id: keyId, created: metadata.created };
          }
          
          if (!mostUsedKey || metadata.lastUsed > mostUsedKey.lastUsed) {
            mostUsedKey = { id: keyId, lastUsed: metadata.lastUsed };
          }
        }
      }

      return {
        totalKeys: keys.length,
        storageUsed,
        oldestKey,
        newestKey,
        mostUsedKey
      };
    } catch (error) {
      console.error('Erreur lors du calcul des statistiques:', error);
      return { totalKeys: 0, storageUsed: 0 };
    }
  }

  /**
   * Vérifie l'intégrité du stockage
   * Requirements: 3.3, 4.1, 4.2
   */
  async verifyIntegrity(): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Vérifier la clé maître
      try {
        await this.getMasterKey();
      } catch (error) {
        errors.push('Clé maître corrompue ou inaccessible');
      }

      // Vérifier chaque clé stockée
      const keys = await this.listKeys();
      
      for (const keyId of keys) {
        try {
          const key = await this.retrieveKey(keyId);
          const metadata = await this.getMetadata(keyId);
          
          if (!key) {
            errors.push(`Impossible de récupérer la clé ${keyId}`);
          }
          
          if (!metadata) {
            warnings.push(`Métadonnées manquantes pour la clé ${keyId}`);
          }
        } catch (error) {
          errors.push(`Erreur lors de la vérification de la clé ${keyId}: ${error}`);
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      return {
        valid: false,
        errors: [`Erreur générale lors de la vérification: ${error}`],
        warnings
      };
    }
  }

  /**
   * Réinitialise complètement le stockage sécurisé
   * Requirements: 3.3, 4.1, 4.2
   */
  async reset(): Promise<void> {
    try {
      const keys = await this.listKeys();
      
      // Supprimer toutes les clés
      for (const keyId of keys) {
        await this.deleteKey(keyId);
      }
      
      // Supprimer la clé maître
      localStorage.removeItem(this.STORAGE_PREFIX + this.MASTER_KEY_ID);
      this.masterKey = null;
      
      console.log('Stockage sécurisé réinitialisé');
    } catch (error) {
      console.error('Erreur lors de la réinitialisation:', error);
      throw new Error('Impossible de réinitialiser le stockage sécurisé');
    }
  }
}

// Instance singleton pour l'application
export const secureStorage = new SecureStorage();