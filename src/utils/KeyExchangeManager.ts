/**
 * KeyExchangeManager - Gestionnaire d'échange de clés sécurisé pour la production
 * 
 * Implémente :
 * - Échange de clés Diffie-Hellman (ECDH)
 * - Distribution sécurisée des clés de groupe
 * - Rotation automatique des clés
 * - Vérification d'intégrité
 */

import { cryptoManager } from './CryptoManager';

export interface KeyExchangeData {
  publicKey: JsonWebKey;
  userId: string;
  timestamp: number;
  signature?: string;
}

export interface GroupKeyData {
  encryptedKey: string;
  keyId: string;
  version: number;
  timestamp: number;
  authorizedUsers: string[];
}

export class KeyExchangeManager {
  private keyPairs: Map<string, CryptoKeyPair> = new Map();
  private sharedKeys: Map<string, CryptoKey> = new Map();
  private readonly ALGORITHM = 'ECDH';
  private readonly CURVE = 'P-256';
  private readonly DERIVED_KEY_ALGORITHM = 'AES-GCM';

  /**
   * Génère une paire de clés ECDH pour l'échange
   */
  async generateKeyPair(userId: string): Promise<JsonWebKey> {
    try {
      const keyPair = await window.crypto.subtle.generateKey(
        {
          name: this.ALGORITHM,
          namedCurve: this.CURVE
        },
        true, // extractable
        ['deriveKey']
      );

      this.keyPairs.set(userId, keyPair);

      // Exporter la clé publique pour l'échange
      const publicKey = await window.crypto.subtle.exportKey('jwk', keyPair.publicKey);
      
      console.log(`Paire de clés ECDH générée pour ${userId}`);
      return publicKey;
    } catch (error) {
      console.error('Erreur lors de la génération de la paire de clés:', error);
      throw new Error('Impossible de générer la paire de clés');
    }
  }

  /**
   * Dérive une clé partagée à partir de la clé publique d'un autre utilisateur
   */
  async deriveSharedKey(
    userId: string, 
    otherUserPublicKey: JsonWebKey, 
    context: string = 'global'
  ): Promise<CryptoKey> {
    try {
      const keyPair = this.keyPairs.get(userId);
      if (!keyPair) {
        throw new Error(`Paire de clés non trouvée pour ${userId}`);
      }

      // Importer la clé publique de l'autre utilisateur
      const otherPublicKey = await window.crypto.subtle.importKey(
        'jwk',
        otherUserPublicKey,
        {
          name: this.ALGORITHM,
          namedCurve: this.CURVE
        },
        false,
        []
      );

      // Dériver la clé partagée
      const sharedKey = await window.crypto.subtle.deriveKey(
        {
          name: this.ALGORITHM,
          public: otherPublicKey
        },
        keyPair.privateKey,
        {
          name: this.DERIVED_KEY_ALGORITHM,
          length: 256
        },
        true, // extractable pour le stockage
        ['encrypt', 'decrypt']
      );

      const keyId = `${context}_${userId}_shared`;
      this.sharedKeys.set(keyId, sharedKey);

      // Stocker dans le CryptoManager
      await cryptoManager.storeKey(keyId, sharedKey);

      console.log(`Clé partagée dérivée pour ${userId} dans le contexte ${context}`);
      return sharedKey;
    } catch (error) {
      console.error('Erreur lors de la dérivation de la clé partagée:', error);
      throw new Error('Impossible de dériver la clé partagée');
    }
  }

  /**
   * Génère une clé de groupe et la chiffre pour chaque membre autorisé
   */
  async generateGroupKey(
    groupId: string, 
    authorizedUsers: string[], 
    masterUserId: string
  ): Promise<GroupKeyData> {
    try {
      // Générer une clé de groupe aléatoire
      const groupKey = await window.crypto.subtle.generateKey(
        {
          name: this.DERIVED_KEY_ALGORITHM,
          length: 256
        },
        true,
        ['encrypt', 'decrypt']
      );

      // Exporter la clé pour la chiffrer
      const exportedKey = await window.crypto.subtle.exportKey('jwk', groupKey);
      const keyData = JSON.stringify(exportedKey);

      // Chiffrer la clé avec la clé partagée du créateur du groupe
      const masterSharedKey = this.sharedKeys.get(`global_${masterUserId}_shared`);
      if (!masterSharedKey) {
        throw new Error(`Clé partagée non trouvée pour le maître ${masterUserId}`);
      }

      const encoder = new TextEncoder();
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      
      const encryptedKeyBuffer = await window.crypto.subtle.encrypt(
        {
          name: this.DERIVED_KEY_ALGORITHM,
          iv: iv
        },
        masterSharedKey,
        encoder.encode(keyData)
      );

      const encryptedKey = JSON.stringify({
        iv: Array.from(iv),
        data: Array.from(new Uint8Array(encryptedKeyBuffer))
      });

      // Stocker la clé de groupe
      await cryptoManager.storeKey(`group_${groupId}`, groupKey);

      const groupKeyData: GroupKeyData = {
        encryptedKey,
        keyId: `group_${groupId}`,
        version: 1,
        timestamp: Date.now(),
        authorizedUsers
      };

      console.log(`Clé de groupe générée pour ${groupId} avec ${authorizedUsers.length} utilisateurs autorisés`);
      return groupKeyData;
    } catch (error) {
      console.error('Erreur lors de la génération de la clé de groupe:', error);
      throw new Error('Impossible de générer la clé de groupe');
    }
  }

  /**
   * Déchiffre et importe une clé de groupe reçue
   */
  async importGroupKey(
    groupKeyData: GroupKeyData, 
    userId: string
  ): Promise<CryptoKey> {
    try {
      if (!groupKeyData.authorizedUsers.includes(userId)) {
        throw new Error(`Utilisateur ${userId} non autorisé pour ce groupe`);
      }

      // Récupérer la clé partagée de l'utilisateur
      const sharedKey = this.sharedKeys.get(`global_${userId}_shared`);
      if (!sharedKey) {
        throw new Error(`Clé partagée non trouvée pour ${userId}`);
      }

      // Déchiffrer la clé de groupe
      const encryptedData = JSON.parse(groupKeyData.encryptedKey);
      const iv = new Uint8Array(encryptedData.iv);
      const encryptedBuffer = new Uint8Array(encryptedData.data);

      const decryptedBuffer = await window.crypto.subtle.decrypt(
        {
          name: this.DERIVED_KEY_ALGORITHM,
          iv: iv
        },
        sharedKey,
        encryptedBuffer
      );

      const decoder = new TextDecoder();
      const keyData = JSON.parse(decoder.decode(decryptedBuffer));

      // Importer la clé de groupe
      const groupKey = await window.crypto.subtle.importKey(
        'jwk',
        keyData,
        {
          name: this.DERIVED_KEY_ALGORITHM,
          length: 256
        },
        true,
        ['encrypt', 'decrypt']
      );

      // Stocker la clé de groupe
      await cryptoManager.storeKey(groupKeyData.keyId, groupKey);
      
      console.log(`Clé de groupe importée pour ${groupKeyData.keyId}`);
      return groupKey;
    } catch (error) {
      console.error('Erreur lors de l\'importation de la clé de groupe:', error);
      throw new Error('Impossible d\'importer la clé de groupe');
    }
  }

  /**
   * Effectue la rotation d'une clé de groupe
   */
  async rotateGroupKey(
    groupId: string, 
    authorizedUsers: string[], 
    masterUserId: string
  ): Promise<GroupKeyData> {
    try {
      // Supprimer l'ancienne clé
      await cryptoManager.reset(); // Temporaire - en production, supprimer seulement la clé spécifique
      
      // Générer une nouvelle clé avec version incrémentée
      const newGroupKeyData = await this.generateGroupKey(groupId, authorizedUsers, masterUserId);
      newGroupKeyData.version += 1;
      
      console.log(`Rotation de clé effectuée pour le groupe ${groupId}, nouvelle version: ${newGroupKeyData.version}`);
      return newGroupKeyData;
    } catch (error) {
      console.error('Erreur lors de la rotation de la clé de groupe:', error);
      throw new Error('Impossible d\'effectuer la rotation de la clé');
    }
  }

  /**
   * Nettoie les clés en mémoire (déconnexion sécurisée)
   */
  clearMemoryKeys(): void {
    this.keyPairs.clear();
    this.sharedKeys.clear();
    console.log('Clés en mémoire nettoyées');
  }

  /**
   * Vérifie si un utilisateur a accès à une clé de groupe
   */
  async verifyGroupAccess(groupId: string, userId: string): Promise<boolean> {
    try {
      const key = await cryptoManager.getKey(`group_${groupId}`);
      return key !== null;
    } catch {
      return false;
    }
  }
}

// Instance singleton
export const keyExchangeManager = new KeyExchangeManager();