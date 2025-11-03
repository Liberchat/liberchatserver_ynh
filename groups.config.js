// Configuration du système de groupes
export const GROUPS_CONFIG = {
  // Limites
  MAX_GROUP_NAME_LENGTH: 50,
  MIN_GROUP_NAME_LENGTH: 3,
  MAX_GROUPS_PER_USER: 10,
  MAX_MEMBERS_PER_GROUP: 50,
  MAX_MESSAGES_PER_GROUP: 100,
  
  // Sauvegarde
  BACKUP_INTERVAL: 60 * 60 * 1000, // 1 heure
  SAVE_INTERVAL: 5 * 60 * 1000,    // 5 minutes
  MAX_BACKUPS: 10,
  
  // Sécurité
  ENABLE_GROUP_ENCRYPTION: true,
  ENABLE_MESSAGE_VALIDATION: true,
  ENABLE_XSS_PROTECTION: true,
  
  // Fonctionnalités
  ENABLE_FILE_SHARING: true,
  ENABLE_AUDIO_MESSAGES: true,
  ENABLE_MESSAGE_REACTIONS: true,
  ENABLE_MESSAGE_EDITING: true,
  ENABLE_MESSAGE_DELETION: true,
  
  // Interface
  SHOW_MEMBER_COUNT: true,
  SHOW_CREATION_DATE: true,
  SHOW_CREATOR_NAME: true,
  ENABLE_GROUP_SEARCH: true,
  
  // Notifications
  NOTIFY_USER_JOIN: true,
  NOTIFY_USER_LEAVE: true,
  NOTIFY_NEW_MESSAGE: true,
  
  // Modération
  ENABLE_GROUP_MODERATION: false,
  AUTO_DELETE_EMPTY_GROUPS: false,
  GROUP_INACTIVITY_TIMEOUT: 7 * 24 * 60 * 60 * 1000, // 7 jours
};

// Validation des noms de groupes
export const validateGroupName = (name) => {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Le nom du groupe est requis' };
  }
  
  if (name.length < GROUPS_CONFIG.MIN_GROUP_NAME_LENGTH) {
    return { 
      valid: false, 
      error: `Le nom doit contenir au moins ${GROUPS_CONFIG.MIN_GROUP_NAME_LENGTH} caractères` 
    };
  }
  
  if (name.length > GROUPS_CONFIG.MAX_GROUP_NAME_LENGTH) {
    return { 
      valid: false, 
      error: `Le nom ne peut pas dépasser ${GROUPS_CONFIG.MAX_GROUP_NAME_LENGTH} caractères` 
    };
  }
  
  // Caractères interdits
  const forbiddenChars = /[<>\"'&]/;
  if (forbiddenChars.test(name)) {
    return { 
      valid: false, 
      error: 'Le nom contient des caractères interdits' 
    };
  }
  
  return { valid: true };
};

// Utilitaires pour les groupes
export const groupUtils = {
  // Générer un ID unique pour un groupe
  generateGroupId: (existingGroups) => {
    const ids = Array.from(existingGroups.keys());
    return Math.max(...ids, 0) + 1;
  },
  
  // Vérifier si un utilisateur peut rejoindre un groupe
  canUserJoinGroup: (group, userId, userGroups) => {
    if (group.members.has(userId)) {
      return { allowed: false, reason: 'Déjà membre du groupe' };
    }
    
    if (group.members.size >= GROUPS_CONFIG.MAX_MEMBERS_PER_GROUP) {
      return { allowed: false, reason: 'Groupe complet' };
    }
    
    const userGroupCount = userGroups.get(userId)?.size || 0;
    if (userGroupCount >= GROUPS_CONFIG.MAX_GROUPS_PER_USER) {
      return { allowed: false, reason: 'Limite de groupes atteinte' };
    }
    
    return { allowed: true };
  },
  
  // Nettoyer les anciens messages d'un groupe
  cleanOldMessages: (group) => {
    if (group.messages.length > GROUPS_CONFIG.MAX_MESSAGES_PER_GROUP) {
      const toRemove = group.messages.length - GROUPS_CONFIG.MAX_MESSAGES_PER_GROUP;
      group.messages.splice(0, toRemove);
    }
  },
  
  // Formater les informations d'un groupe pour l'API
  formatGroupForAPI: (group) => ({
    id: group.id,
    name: group.name,
    memberCount: group.members.size,
    messageCount: group.messages.length,
    createdAt: group.createdAt,
    createdBy: group.createdBy,
    lastActivity: group.messages.length > 0 
      ? Math.max(...group.messages.map(m => m.timestamp))
      : group.createdAt
  })
};

export default GROUPS_CONFIG;