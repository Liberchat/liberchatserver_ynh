/**
 * CryptoManager - Gestionnaire centralisé pour le chiffrement automatique transparent
 * 
 * Cette classe gère automatiquement:
 * - La génération de clés AES-GCM 256 bits
 * - Le chiffrement/déchiffrement transparent des messages
 * - La gestion des clés globales et de groupe
 * - Le cache en mémoire pour les performances
 * - La persistance sécurisée des clés via SecureStorage
 */

import { secureStorage, type KeyMetadata } from './SecureStorage.ts';

export interface EncryptedMessage {
  iv: number[];           // Vecteur d'initialisation
  content: number[];      // Contenu chiffré
  algorithm: string;      // 'AES-GCM'
  keyVersion: number;     // Version de la clé utilisée
  timestamp: number;      // Horodatage du chiffrement
  context?: string;       // Contexte (groupe, global)
}

// Réexporter KeyMetadata depuis SecureStorage pour compatibilité
export type { KeyMetadata };

export class CryptoManager {
  private keyCache: Map<string, CryptoKey> = new Map();
  private readonly ALGORITHM = 'AES-GCM';
  private readonly KEY_LENGTH = 256;
  private readonly CACHE_MAX_SIZE = 50; // Limite du cache pour éviter la surcharge mémoire
  private initialized = false;

  /**
   * Initialise le CryptoManager et charge les clés existantes
   * Requirements: 2.1, 2.2, 4.1, 4.2
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Vérifier que les APIs crypto sont disponibles
      if (!window.crypto || !window.crypto.subtle) {
        console.warn('API Web Crypto non disponible, fonctionnement en mode dégradé');
        this.initialized = true;
        return;
      }

      // Charger toutes les clés existantes depuis le stockage sécurisé
      let storedKeys: string[] = [];
      try {
        storedKeys = await secureStorage.listKeys();
      } catch (listError) {
        console.warn('Erreur lors de la liste des clés stockées:', listError);
        storedKeys = [];
      }
      
      let loadedCount = 0;
      for (const keyId of storedKeys) {
        try {
          const key = await secureStorage.retrieveKey(keyId);
          if (key) {
            this.keyCache.set(keyId, key);
            loadedCount++;
          }
        } catch (keyError) {
          console.warn(`Erreur lors du chargement de la clé ${keyId}:`, keyError);
          // Continuer avec les autres clés
        }
      }

      // Nettoyer les clés expirées au démarrage (non bloquant)
      try {
        await secureStorage.cleanup();
      } catch (cleanupError) {
        console.warn('Erreur lors du nettoyage des clés expirées:', cleanupError);
      }
      
      this.initialized = true;
      console.log(`CryptoManager initialisé avec ${loadedCount}/${storedKeys.length} clés chargées`);
    } catch (error) {
      console.error('Erreur lors de l\'initialisation du CryptoManager:', error);
      this.initialized = true; // Continuer même en cas d'erreur pour éviter les blocages
    }
  }

  /**
   * Génère une clé globale AES-GCM 256 bits
   * En développement : utilise une clé déterministe
   * En production : utilise l'échange de clés sécurisé
   * Requirements: 1.1, 1.2, 3.1, 3.2
   */
  async generateGlobalKey(): Promise<CryptoKey> {
    try {
      await this.initialize();

      // Vérifier si on est en mode développement ou production
      const isDevelopment = window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1' ||
                           window.location.port === '5173';

      if (isDevelopment) {
        // Mode développement : clé déterministe pour la compatibilité
        const sharedSecret = 'liberchat-shared-key-v1';
        
        const encoder = new TextEncoder();
        const keyMaterial = await window.crypto.subtle.importKey(
          'raw',
          encoder.encode(sharedSecret),
          { name: 'PBKDF2' },
          false,
          ['deriveKey']
        );

        const key = await window.crypto.subtle.deriveKey(
          {
            name: 'PBKDF2',
            salt: encoder.encode('liberchat-salt'),
            iterations: 100000,
            hash: 'SHA-256'
          },
          keyMaterial,
          { 
            name: this.ALGORITHM, 
            length: this.KEY_LENGTH 
          },
          true,
          ['encrypt', 'decrypt']
        );

        await secureStorage.storeKey('global', key);
        this.keyCache.set('global', key);
        
        console.log('Clé globale générée (mode développement)');
        return key;
      } else {
        // Mode production : utiliser l'échange de clés sécurisé
        throw new Error('En production, utilisez initializeProductionKeys() avec l\'échange de clés');
      }
    } catch (error) {
      console.error('Erreur lors de la génération de la clé globale:', error);
      throw new Error('Impossible de générer la clé de chiffrement globale');
    }
  }

  /**
   * Initialise les clés pour la production avec échange sécurisé
   * Requirements: 1.1, 1.2, 3.1, 3.2, 5.1, 5.2
   */
  async initializeProductionKeys(userId: string): Promise<CryptoKey> {
    try {
      await this.initialize();

      // Importer le KeyExchangeManager dynamiquement pour éviter les dépendances circulaires
      const { keyExchangeManager } = await import('./KeyExchangeManager');

      // Générer une paire de clés ECDH pour cet utilisateur
      const publicKey = await keyExchangeManager.generateKeyPair(userId);

      // Enregistrer la clé publique sur le serveur
      const basePath = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';
      const apiUrl = basePath ? `${basePath}/api/keys/register` : '/api/keys/register';
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          publicKey
        })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'enregistrement de la clé publique');
      }

      // Récupérer les clés publiques des autres utilisateurs
      const basePath2 = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';
      const keysApiUrl = basePath2 ? `${basePath2}/api/keys/public?exclude=${userId}` : `/api/keys/public?exclude=${userId}`;
      const keysResponse = await fetch(keysApiUrl);
      if (!keysResponse.ok) {
        throw new Error('Erreur lors de la récupération des clés publiques');
      }

      const { publicKeys } = await keysResponse.json();

      // Si c'est le premier utilisateur, générer une clé de groupe
      if (Object.keys(publicKeys).length === 0) {
        console.log('Premier utilisateur, génération d\'une clé de groupe...');
        
        const groupKeyData = await keyExchangeManager.generateGroupKey(
          'global',
          [userId],
          userId
        );

        // Enregistrer la clé de groupe sur le serveur
        const basePath3 = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';
        const groupApiUrl = basePath3 ? `${basePath3}/api/keys/group` : '/api/keys/group';
        const groupResponse = await fetch(groupApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            groupId: 'global',
            groupKeyData,
            creatorId: userId
          })
        });

        if (!groupResponse.ok) {
          throw new Error('Erreur lors de l\'enregistrement de la clé de groupe');
        }

        const globalKey = await this.getKey('group_global');
        console.log('Clé globale initialisée pour le premier utilisateur');
        return globalKey;
      } else {
        // Utilisateur suivant : dériver des clés partagées et récupérer la clé de groupe
        console.log(`Dérivation de clés partagées avec ${Object.keys(publicKeys).length} utilisateurs...`);

        // Dériver une clé partagée avec le premier utilisateur disponible
        const firstUserId = Object.keys(publicKeys)[0];
        const firstUserPublicKey = publicKeys[firstUserId];

        await keyExchangeManager.deriveSharedKey(userId, firstUserPublicKey, 'global');

        // Récupérer la clé de groupe existante
        const basePath4 = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';
        const groupGetApiUrl = basePath4 ? `${basePath4}/api/keys/group/global/${userId}` : `/api/keys/group/global/${userId}`;
        const groupResponse = await fetch(groupGetApiUrl);
        if (!groupResponse.ok) {
          throw new Error('Erreur lors de la récupération de la clé de groupe');
        }

        const { groupKeyData } = await groupResponse.json();
        const globalKey = await keyExchangeManager.importGroupKey(groupKeyData, userId);

        console.log('Clé globale importée depuis le groupe existant');
        return globalKey;
      }
    } catch (error) {
      console.error('Erreur lors de l\'initialisation des clés de production:', error);
      throw new Error('Impossible d\'initialiser les clés de production');
    }
  }

  /**
   * Génère une clé spécifique pour un groupe
   * Requirements: 2.1, 2.2, 3.1, 3.2
   */
  async generateGroupKey(groupId: string): Promise<CryptoKey> {
    try {
      await this.initialize();

      if (!groupId || typeof groupId !== 'string') {
        throw new Error('ID de groupe invalide');
      }

      const key = await window.crypto.subtle.generateKey(
        { 
          name: this.ALGORITHM, 
          length: this.KEY_LENGTH 
        },
        true,
        ['encrypt', 'decrypt']
      );

      // Stocker la clé de manière sécurisée et la mettre en cache
      const context = `group_${groupId}`;
      
      // Vérifier la taille du cache et nettoyer si nécessaire
      this.cleanupCacheIfNeeded();
      
      await secureStorage.storeKey(context, key);
      this.keyCache.set(context, key);

      console.log(`Clé générée pour le groupe ${groupId}`);
      return key;
    } catch (error) {
      console.error(`Erreur lors de la génération de la clé pour le groupe ${groupId}:`, error);
      throw new Error(`Impossible de générer la clé de chiffrement pour le groupe ${groupId}`);
    }
  }

  /**
   * Récupère la clé appropriée selon le contexte
   * Requirements: 2.1, 2.2, 3.1, 3.2
   */
  async getKey(context: 'global' | string = 'global'): Promise<CryptoKey | null> {
    try {
      await this.initialize();

      // Vérifier le cache d'abord
      let cachedKey = this.keyCache.get(context);
      if (cachedKey) {
        return cachedKey;
      }

      // Si pas en cache, essayer de charger depuis le stockage sécurisé
      const storedKey = await secureStorage.retrieveKey(context);
      if (storedKey) {
        this.keyCache.set(context, storedKey);
        return storedKey;
      }

      // Si pas trouvé, générer selon le contexte
      if (context === 'global') {
        return await this.generateGlobalKey();
      } else if (context.startsWith('group_')) {
        const groupId = context.replace('group_', '');
        return await this.generateGroupKey(groupId);
      }

      console.warn(`Contexte de clé non reconnu: ${context}`);
      return null;
    } catch (error) {
      console.error(`Erreur lors de la récupération de la clé pour le contexte ${context}:`, error);
      return null;
    }
  }

  /**
   * Chiffre un message avec gestion d'erreurs
   * Requirements: 1.1, 1.2, 3.1, 3.2
   */
  async encryptMessage(message: string, context: string = 'global'): Promise<EncryptedMessage> {
    try {
      if (!message || typeof message !== 'string') {
        throw new Error('Message invalide pour le chiffrement');
      }

      const key = await this.getKey(context);
      if (!key) {
        throw new Error(`Impossible de récupérer la clé pour le contexte ${context}`);
      }

      // Générer un IV unique pour chaque message
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      
      // Encoder le message
      const encoder = new TextEncoder();
      const messageData = encoder.encode(message);

      // Chiffrer
      const ciphertext = await window.crypto.subtle.encrypt(
        { 
          name: this.ALGORITHM, 
          iv 
        },
        key,
        messageData
      );

      // Récupérer la version de la clé depuis les métadonnées
      const metadata = await secureStorage.getMetadata(context);
      const keyVersion = metadata?.version || 1;

      return {
        iv: Array.from(iv),
        content: Array.from(new Uint8Array(ciphertext)),
        algorithm: this.ALGORITHM,
        keyVersion,
        timestamp: Date.now(),
        context: context !== 'global' ? context : undefined
      };
    } catch (error) {
      console.error('Erreur lors du chiffrement du message:', error);
      throw new Error('Échec du chiffrement du message');
    }
  }

  /**
   * Déchiffre un message avec gestion d'erreurs
   * Requirements: 1.1, 1.2, 3.1, 3.2
   */
  async decryptMessage(encrypted: EncryptedMessage, context: string = 'global'): Promise<string> {
    try {
      // Validation stricte des données d'entrée
      if (!encrypted || typeof encrypted !== 'object') {
        console.warn('Message chiffré invalide: objet manquant ou incorrect');
        return '[Message invalide]';
      }

      if (!encrypted.iv || !Array.isArray(encrypted.iv) || encrypted.iv.length === 0) {
        console.warn('Message chiffré invalide: IV manquant ou incorrect');
        return '[Message invalide - IV]';
      }

      if (!encrypted.content || !Array.isArray(encrypted.content) || encrypted.content.length === 0) {
        console.warn('Message chiffré invalide: contenu manquant ou incorrect');
        return '[Message invalide - Contenu]';
      }

      // Utiliser le contexte du message s'il est spécifié
      const messageContext = encrypted.context || context;
      
      let key;
      try {
        key = await this.getKey(messageContext);
      } catch (keyError) {
        console.warn(`Erreur lors de la récupération de la clé pour ${messageContext}:`, keyError);
        return '[Clé indisponible]';
      }
      
      if (!key) {
        console.warn(`Clé non trouvée pour le contexte ${messageContext}`);
        return '[Clé manquante]';
      }

      // Reconstituer les données avec validation
      let iv, ciphertext;
      try {
        iv = new Uint8Array(encrypted.iv);
        ciphertext = new Uint8Array(encrypted.content);
      } catch (arrayError) {
        console.warn('Erreur lors de la reconstitution des données chiffrées:', arrayError);
        return '[Données corrompues]';
      }

      // Validation des tailles
      if (iv.length !== 12) { // AES-GCM utilise un IV de 12 bytes
        console.warn(`Taille d'IV incorrecte: ${iv.length} au lieu de 12`);
        return '[IV invalide]';
      }

      if (ciphertext.length === 0) {
        console.warn('Contenu chiffré vide');
        return '[Contenu vide]';
      }

      // Déchiffrer avec gestion d'erreur spécifique
      let plaintext;
      try {
        plaintext = await window.crypto.subtle.decrypt(
          { 
            name: this.ALGORITHM, 
            iv 
          },
          key,
          ciphertext
        );
      } catch (decryptError) {
        console.warn('Erreur lors du déchiffrement cryptographique:', decryptError);
        return '[Déchiffrement échoué]';
      }

      // Décoder le message avec validation
      try {
        const decoder = new TextDecoder('utf-8', { fatal: true });
        const result = decoder.decode(plaintext);
        
        // Validation du résultat
        if (typeof result !== 'string') {
          console.warn('Résultat du déchiffrement n\'est pas une chaîne');
          return '[Résultat invalide]';
        }
        
        return result;
      } catch (decodeError) {
        console.warn('Erreur lors du décodage du texte déchiffré:', decodeError);
        return '[Décodage échoué]';
      }
    } catch (error) {
      console.error('Erreur générale lors du déchiffrement du message:', error);
      
      // En cas d'erreur générale, retourner un message d'erreur plutôt que de planter
      return '[Erreur de déchiffrement]';
    }
  }

  /**
   * Stocke une clé de manière sécurisée avec métadonnées
   * Requirements: 2.1, 2.2, 4.1, 4.2
   */
  async storeKey(context: string, key: CryptoKey): Promise<void> {
    try {
      await this.initialize();

      // Vérifier la taille du cache et nettoyer si nécessaire
      this.cleanupCacheIfNeeded();
      
      // Stocker dans le stockage sécurisé
      await secureStorage.storeKey(context, key);
      
      // Mettre en cache pour les performances
      this.keyCache.set(context, key);
      
      const metadata = await secureStorage.getMetadata(context);
      console.log(`Clé stockée pour le contexte ${context}, version ${metadata?.version || 1}`);
    } catch (error) {
      console.error(`Erreur lors du stockage de la clé pour ${context}:`, error);
      throw new Error('Impossible de stocker la clé');
    }
  }

  /**
   * Nettoie le cache des clés (utile pour les tests ou la déconnexion)
   * Requirements: 2.1, 2.2
   */
  clearCache(): void {
    this.keyCache.clear();
    console.log('Cache des clés nettoyé');
  }

  /**
   * Réinitialise complètement le stockage et le cache
   * Requirements: 2.1, 2.2, 4.1, 4.2
   */
  async reset(): Promise<void> {
    try {
      await secureStorage.reset();
      this.clearCache();
      this.initialized = false;
      console.log('CryptoManager réinitialisé');
    } catch (error) {
      console.error('Erreur lors de la réinitialisation:', error);
      throw new Error('Impossible de réinitialiser le CryptoManager');
    }
  }

  /**
   * Obtient les métadonnées d'une clé depuis le stockage sécurisé
   * Requirements: 2.1, 2.2, 10.1, 10.2
   */
  async getKeyMetadata(context: string): Promise<KeyMetadata | null> {
    try {
      await this.initialize();
      return await secureStorage.getMetadata(context);
    } catch (error) {
      console.error(`Erreur lors de la récupération des métadonnées pour ${context}:`, error);
      return null;
    }
  }

  /**
   * Liste tous les contextes de clés disponibles
   * Requirements: 2.1, 2.2, 10.1, 10.2
   */
  async listKeyContexts(): Promise<string[]> {
    try {
      await this.initialize();
      return await secureStorage.listKeys();
    } catch (error) {
      console.error('Erreur lors de la liste des contextes de clés:', error);
      return [];
    }
  }

  /**
   * Nettoie le cache si nécessaire (gestion de la mémoire)
   * Requirements: 2.1, 2.2
   */
  private async cleanupCacheIfNeeded(): Promise<void> {
    if (this.keyCache.size >= this.CACHE_MAX_SIZE) {
      // Récupérer les métadonnées pour trier par dernière utilisation
      const contexts = Array.from(this.keyCache.keys());
      const contextsWithMetadata: Array<{ context: string; lastUsed: number }> = [];
      
      for (const context of contexts) {
        const metadata = await secureStorage.getMetadata(context);
        if (metadata) {
          contextsWithMetadata.push({ context, lastUsed: metadata.lastUsed });
        }
      }
      
      // Trier par dernière utilisation (plus ancien en premier)
      contextsWithMetadata.sort((a, b) => a.lastUsed - b.lastUsed);
      
      const toRemove = contextsWithMetadata.slice(0, Math.floor(this.CACHE_MAX_SIZE / 4)); // Supprimer 25%
      
      for (const { context } of toRemove) {
        // Ne pas supprimer la clé globale du cache
        if (context !== 'global') {
          this.keyCache.delete(context);
        }
      }
      
      console.log(`Cache nettoyé: ${toRemove.length} clés supprimées du cache`);
    }
  }

  /**
   * Supprime une clé spécifique du cache et du stockage
   * Requirements: 2.1, 2.2
   */
  async removeKey(context: string): Promise<void> {
    try {
      await secureStorage.deleteKey(context);
      this.keyCache.delete(context);
      console.log(`Clé ${context} supprimée`);
    } catch (error) {
      console.error(`Erreur lors de la suppression de la clé ${context}:`, error);
      throw new Error(`Impossible de supprimer la clé ${context}`);
    }
  }

  /**
   * Obtient les statistiques du stockage et du cache
   * Requirements: 10.1, 10.2
   */
  async getCacheStats(): Promise<{
    cacheSize: number;
    maxCacheSize: number;
    totalStoredKeys: number;
    storageStats: any;
  }> {
    try {
      await this.initialize();
      const storageStats = await secureStorage.getStorageStats();
      
      return {
        cacheSize: this.keyCache.size,
        maxCacheSize: this.CACHE_MAX_SIZE,
        totalStoredKeys: storageStats.totalKeys,
        storageStats
      };
    } catch (error) {
      console.error('Erreur lors du calcul des statistiques:', error);
      return {
        cacheSize: this.keyCache.size,
        maxCacheSize: this.CACHE_MAX_SIZE,
        totalStoredKeys: 0,
        storageStats: null
      };
    }
  }

  /**
   * Vérifie si une clé existe pour un contexte donné
   * Requirements: 2.1, 2.2
   */
  async hasKey(context: string): Promise<boolean> {
    try {
      await this.initialize();
      
      // Vérifier d'abord le cache
      if (this.keyCache.has(context)) {
        return true;
      }
      
      // Vérifier le stockage sécurisé
      const key = await secureStorage.retrieveKey(context);
      if (key) {
        // Mettre en cache si trouvé
        this.keyCache.set(context, key);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`Erreur lors de la vérification de l'existence de la clé ${context}:`, error);
      return false;
    }
  }

  /**
   * Obtient la liste des groupes avec des clés actives
   * Requirements: 2.1, 2.2
   */
  async getActiveGroups(): Promise<string[]> {
    try {
      const contexts = await this.listKeyContexts();
      return contexts
        .filter(context => context.startsWith('group_'))
        .map(context => context.replace('group_', ''));
    } catch (error) {
      console.error('Erreur lors de la récupération des groupes actifs:', error);
      return [];
    }
  }

  /**
   * Supprime toutes les clés de groupe (garde seulement la clé globale)
   * Requirements: 2.1, 2.2
   */
  async clearGroupKeys(): Promise<void> {
    try {
      const contexts = await this.listKeyContexts();
      const groupContexts = contexts.filter(context => context.startsWith('group_'));
      
      for (const context of groupContexts) {
        await this.removeKey(context);
      }
      
      console.log(`${groupContexts.length} clés de groupe supprimées`);
    } catch (error) {
      console.error('Erreur lors de la suppression des clés de groupe:', error);
      throw new Error('Impossible de supprimer les clés de groupe');
    }
  }

  /**
   * Exporte toutes les clés pour sauvegarde
   * Requirements: 10.3
   */
  async exportKeys(): Promise<any> {
    try {
      await this.initialize();
      return await secureStorage.exportKeys();
    } catch (error) {
      console.error('Erreur lors de l\'export des clés:', error);
      throw new Error('Impossible d\'exporter les clés');
    }
  }

  /**
   * Importe des clés depuis une sauvegarde
   * Requirements: 10.3
   */
  async importKeys(exportedKeys: any): Promise<void> {
    try {
      await secureStorage.importKeys(exportedKeys);
      
      // Recharger le cache
      this.clearCache();
      await this.initialize();
      
      console.log('Clés importées avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'import des clés:', error);
      throw new Error('Impossible d\'importer les clés');
    }
  }

  /**
   * Vérifie l'intégrité du stockage
   * Requirements: 3.3, 4.1, 4.2
   */
  async verifyIntegrity(): Promise<any> {
    try {
      await this.initialize();
      return await secureStorage.verifyIntegrity();
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'intégrité:', error);
      return {
        valid: false,
        errors: [`Erreur lors de la vérification: ${error}`],
        warnings: []
      };
    }
  }
}

// Instance singleton pour l'application
export const cryptoManager = new CryptoManager();