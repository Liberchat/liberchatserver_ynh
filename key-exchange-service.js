/**
 * Service d'échange de clés sécurisé pour la production
 * 
 * Gère :
 * - L'échange initial de clés publiques entre utilisateurs
 * - La distribution des clés de groupe
 * - La rotation automatique des clés
 * - L'audit des accès aux clés
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

class KeyExchangeService {
  constructor() {
    this.publicKeys = new Map(); // userId -> publicKey
    this.groupKeys = new Map(); // groupId -> GroupKeyData
    this.keyRotationSchedule = new Map(); // groupId -> nextRotationTime
    this.accessLog = [];
    
    // Rotation automatique toutes les 24h en production
    this.ROTATION_INTERVAL = 24 * 60 * 60 * 1000; // 24 heures
    
    this.loadPersistedData();
    this.startKeyRotationScheduler();
  }

  /**
   * Enregistre la clé publique d'un utilisateur
   */
  registerPublicKey(userId, publicKey, socketId) {
    try {
      // Validation de la clé publique
      if (!publicKey || !publicKey.kty || publicKey.kty !== 'EC') {
        throw new Error('Clé publique invalide');
      }

      this.publicKeys.set(userId, {
        publicKey,
        socketId,
        timestamp: Date.now()
      });

      this.logAccess('REGISTER_PUBLIC_KEY', userId, socketId);
      console.log(`Clé publique enregistrée pour ${userId}`);
      
      this.persistData();
      return true;
    } catch (error) {
      console.error(`Erreur lors de l'enregistrement de la clé pour ${userId}:`, error);
      return false;
    }
  }

  /**
   * Récupère la clé publique d'un utilisateur
   */
  getPublicKey(userId) {
    const userData = this.publicKeys.get(userId);
    return userData ? userData.publicKey : null;
  }

  /**
   * Récupère toutes les clés publiques pour l'échange initial
   */
  getAllPublicKeys(excludeUserId = null) {
    const keys = {};
    for (const [userId, userData] of this.publicKeys.entries()) {
      if (userId !== excludeUserId) {
        keys[userId] = userData.publicKey;
      }
    }
    return keys;
  }

  /**
   * Enregistre une clé de groupe
   */
  registerGroupKey(groupId, groupKeyData, creatorId) {
    try {
      // Validation des données de groupe
      if (!groupKeyData.encryptedKey || !groupKeyData.authorizedUsers) {
        throw new Error('Données de clé de groupe invalides');
      }

      // Vérifier que le créateur est autorisé
      if (!groupKeyData.authorizedUsers.includes(creatorId)) {
        throw new Error('Créateur non autorisé pour ce groupe');
      }

      this.groupKeys.set(groupId, {
        ...groupKeyData,
        createdBy: creatorId,
        createdAt: Date.now()
      });

      // Programmer la rotation de clé
      this.scheduleKeyRotation(groupId);

      this.logAccess('REGISTER_GROUP_KEY', creatorId, null, groupId);
      console.log(`Clé de groupe enregistrée pour ${groupId} par ${creatorId}`);
      
      this.persistData();
      return true;
    } catch (error) {
      console.error(`Erreur lors de l'enregistrement de la clé de groupe ${groupId}:`, error);
      return false;
    }
  }

  /**
   * Récupère une clé de groupe pour un utilisateur autorisé
   */
  getGroupKey(groupId, userId) {
    try {
      const groupKeyData = this.groupKeys.get(groupId);
      
      if (!groupKeyData) {
        throw new Error(`Clé de groupe ${groupId} non trouvée`);
      }

      // Vérifier l'autorisation
      if (!groupKeyData.authorizedUsers.includes(userId)) {
        this.logAccess('UNAUTHORIZED_GROUP_ACCESS', userId, null, groupId);
        throw new Error(`Utilisateur ${userId} non autorisé pour le groupe ${groupId}`);
      }

      this.logAccess('GET_GROUP_KEY', userId, null, groupId);
      return groupKeyData;
    } catch (error) {
      console.error(`Erreur lors de la récupération de la clé de groupe ${groupId} pour ${userId}:`, error);
      return null;
    }
  }

  /**
   * Ajoute un utilisateur à un groupe existant
   */
  addUserToGroup(groupId, userId, requesterId) {
    try {
      const groupKeyData = this.groupKeys.get(groupId);
      
      if (!groupKeyData) {
        throw new Error(`Groupe ${groupId} non trouvé`);
      }

      // Vérifier que le demandeur est autorisé (membre existant)
      if (!groupKeyData.authorizedUsers.includes(requesterId)) {
        throw new Error(`Utilisateur ${requesterId} non autorisé à modifier le groupe ${groupId}`);
      }

      // Ajouter le nouvel utilisateur
      if (!groupKeyData.authorizedUsers.includes(userId)) {
        groupKeyData.authorizedUsers.push(userId);
        groupKeyData.version += 1;
        groupKeyData.lastModified = Date.now();

        this.logAccess('ADD_USER_TO_GROUP', requesterId, null, groupId, { addedUser: userId });
        console.log(`Utilisateur ${userId} ajouté au groupe ${groupId} par ${requesterId}`);
        
        this.persistData();
        return true;
      }

      return false; // Utilisateur déjà dans le groupe
    } catch (error) {
      console.error(`Erreur lors de l'ajout de ${userId} au groupe ${groupId}:`, error);
      return false;
    }
  }

  /**
   * Supprime un utilisateur d'un groupe
   */
  removeUserFromGroup(groupId, userId, requesterId) {
    try {
      const groupKeyData = this.groupKeys.get(groupId);
      
      if (!groupKeyData) {
        throw new Error(`Groupe ${groupId} non trouvé`);
      }

      // Vérifier que le demandeur est autorisé
      if (!groupKeyData.authorizedUsers.includes(requesterId)) {
        throw new Error(`Utilisateur ${requesterId} non autorisé à modifier le groupe ${groupId}`);
      }

      // Supprimer l'utilisateur
      const userIndex = groupKeyData.authorizedUsers.indexOf(userId);
      if (userIndex > -1) {
        groupKeyData.authorizedUsers.splice(userIndex, 1);
        groupKeyData.version += 1;
        groupKeyData.lastModified = Date.now();

        // Forcer la rotation de clé pour sécurité
        this.scheduleKeyRotation(groupId, true);

        this.logAccess('REMOVE_USER_FROM_GROUP', requesterId, null, groupId, { removedUser: userId });
        console.log(`Utilisateur ${userId} supprimé du groupe ${groupId} par ${requesterId}`);
        
        this.persistData();
        return true;
      }

      return false; // Utilisateur pas dans le groupe
    } catch (error) {
      console.error(`Erreur lors de la suppression de ${userId} du groupe ${groupId}:`, error);
      return false;
    }
  }

  /**
   * Programme la rotation d'une clé de groupe
   */
  scheduleKeyRotation(groupId, immediate = false) {
    const rotationTime = immediate ? Date.now() + 1000 : Date.now() + this.ROTATION_INTERVAL;
    this.keyRotationSchedule.set(groupId, rotationTime);
    
    console.log(`Rotation programmée pour le groupe ${groupId} à ${new Date(rotationTime)}`);
  }

  /**
   * Démarre le planificateur de rotation des clés
   */
  startKeyRotationScheduler() {
    setInterval(() => {
      const now = Date.now();
      
      for (const [groupId, rotationTime] of this.keyRotationSchedule.entries()) {
        if (now >= rotationTime) {
          this.performKeyRotation(groupId);
          this.keyRotationSchedule.delete(groupId);
        }
      }
    }, 60000); // Vérifier toutes les minutes
  }

  /**
   * Effectue la rotation d'une clé de groupe
   */
  performKeyRotation(groupId) {
    try {
      const groupKeyData = this.groupKeys.get(groupId);
      
      if (!groupKeyData) {
        console.warn(`Tentative de rotation pour un groupe inexistant: ${groupId}`);
        return;
      }

      // Incrémenter la version pour invalider l'ancienne clé
      groupKeyData.version += 1;
      groupKeyData.lastRotation = Date.now();
      
      // Programmer la prochaine rotation
      this.scheduleKeyRotation(groupId);

      this.logAccess('KEY_ROTATION', 'SYSTEM', null, groupId);
      console.log(`Rotation de clé effectuée pour le groupe ${groupId}, nouvelle version: ${groupKeyData.version}`);
      
      this.persistData();

      // Notifier tous les clients du groupe de la rotation
      this.notifyKeyRotation(groupId, groupKeyData.version);
    } catch (error) {
      console.error(`Erreur lors de la rotation de clé pour ${groupId}:`, error);
    }
  }

  /**
   * Notifie les clients d'une rotation de clé
   */
  notifyKeyRotation(groupId, newVersion) {
    // Cette méthode sera appelée par le serveur principal pour notifier les clients
    console.log(`Notification de rotation de clé pour ${groupId}, version ${newVersion}`);
  }

  /**
   * Enregistre un accès dans le journal d'audit
   */
  logAccess(action, userId, socketId, groupId = null, metadata = {}) {
    const logEntry = {
      timestamp: Date.now(),
      action,
      userId,
      socketId,
      groupId,
      metadata,
      ip: 'unknown' // Sera rempli par le serveur principal
    };

    this.accessLog.push(logEntry);

    // Garder seulement les 10000 dernières entrées
    if (this.accessLog.length > 10000) {
      this.accessLog = this.accessLog.slice(-10000);
    }
  }

  /**
   * Récupère le journal d'audit pour un groupe ou utilisateur
   */
  getAuditLog(filter = {}) {
    let filteredLog = this.accessLog;

    if (filter.userId) {
      filteredLog = filteredLog.filter(entry => entry.userId === filter.userId);
    }

    if (filter.groupId) {
      filteredLog = filteredLog.filter(entry => entry.groupId === filter.groupId);
    }

    if (filter.action) {
      filteredLog = filteredLog.filter(entry => entry.action === filter.action);
    }

    if (filter.since) {
      filteredLog = filteredLog.filter(entry => entry.timestamp >= filter.since);
    }

    return filteredLog.slice(-100); // Retourner les 100 dernières entrées
  }

  /**
   * Sauvegarde les données sur disque
   */
  persistData() {
    try {
      const data = {
        publicKeys: Array.from(this.publicKeys.entries()),
        groupKeys: Array.from(this.groupKeys.entries()),
        keyRotationSchedule: Array.from(this.keyRotationSchedule.entries()),
        accessLog: this.accessLog.slice(-1000) // Sauvegarder seulement les 1000 dernières entrées
      };

      writeFileSync('data/key-exchange-data.json', JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des données d\'échange de clés:', error);
    }
  }

  /**
   * Charge les données depuis le disque
   */
  loadPersistedData() {
    try {
      if (existsSync('data/key-exchange-data.json')) {
        const data = JSON.parse(readFileSync('data/key-exchange-data.json', 'utf8'));
        
        this.publicKeys = new Map(data.publicKeys || []);
        this.groupKeys = new Map(data.groupKeys || []);
        this.keyRotationSchedule = new Map(data.keyRotationSchedule || []);
        this.accessLog = data.accessLog || [];

        console.log(`Données d'échange de clés chargées: ${this.publicKeys.size} clés publiques, ${this.groupKeys.size} groupes`);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données d\'échange de clés:', error);
    }
  }

  /**
   * Nettoie les données expirées
   */
  cleanup() {
    const now = Date.now();
    const EXPIRY_TIME = 30 * 24 * 60 * 60 * 1000; // 30 jours

    // Nettoyer les clés publiques expirées
    for (const [userId, userData] of this.publicKeys.entries()) {
      if (now - userData.timestamp > EXPIRY_TIME) {
        this.publicKeys.delete(userId);
        console.log(`Clé publique expirée supprimée pour ${userId}`);
      }
    }

    // Nettoyer les logs d'audit anciens
    this.accessLog = this.accessLog.filter(entry => now - entry.timestamp < EXPIRY_TIME);

    this.persistData();
  }
}

export const keyExchangeService = new KeyExchangeService();

// Nettoyage automatique toutes les 24h
setInterval(() => {
  keyExchangeService.cleanup();
}, 24 * 60 * 60 * 1000);