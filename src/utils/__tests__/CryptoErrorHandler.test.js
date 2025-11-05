/**
 * Tests pour CryptoErrorHandler
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

import { CryptoErrorHandler } from '../CryptoErrorHandler.ts';

// Polyfill pour les tests Node.js
if (typeof window === 'undefined') {
  const { webcrypto } = await import('node:crypto');
  global.window = {
    crypto: {
      subtle: webcrypto.subtle,
      getRandomValues: webcrypto.getRandomValues.bind(webcrypto)
    }
  };
}

/**
 * Fonction d'assertion simple
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// Mock simple du CryptoManager pour les tests
const mockCryptoManager = {
  generateGlobalKey: async () => ({ algorithm: { name: 'AES-GCM', length: 256 } }),
  generateGroupKey: async (groupId) => ({ algorithm: { name: 'AES-GCM', length: 256 } }),
  getKey: async (context) => ({ algorithm: { name: 'AES-GCM', length: 256 } }),
  hasKey: async (context) => true,
  removeKey: async (context) => {},
  storeKey: async (context, key) => {},
  listKeyContexts: async () => [],
  verifyIntegrity: async () => ({ valid: true }),
  reset: async () => {}
};

/**
 * Test runner simple
 */
async function runTests() {
  console.log('🧪 Démarrage des tests CryptoErrorHandler...\n');
  
  let passed = 0;
  let failed = 0;

  const tests = [
    testErrorCreation,
    testNotificationListeners,
    testMissingKeyHandling,
    testDecryptionFailureHandling,
    testStorageErrorHandling,
    testEncryptionFailureHandling,
    testKeyExchangeFailureHandling,
    testMainErrorHandler,
    testKeyRegeneration,
    testErrorStats
  ];

  for (const test of tests) {
    try {
      await test();
      console.log(`✅ ${test.name}`);
      passed++;
    } catch (error) {
      console.log(`❌ ${test.name}: ${error.message}`);
      failed++;
    }
  }

  console.log(`\n📊 Résultats: ${passed} réussis, ${failed} échoués`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

/**
 * Test: création d'erreurs typées
 */
async function testErrorCreation() {
  const originalError = new Error('Erreur originale');
  const cryptoError = CryptoErrorHandler.createError(
    'DECRYPTION_FAILED',
    'Test error',
    'global',
    originalError,
    true
  );

  assert(cryptoError.type === 'DECRYPTION_FAILED', 'Le type d\'erreur doit être correct');
  assert(cryptoError.message === 'Test error', 'Le message doit être correct');
  assert(cryptoError.context === 'global', 'Le contexte doit être correct');
  assert(cryptoError.originalError === originalError, 'L\'erreur originale doit être préservée');
  assert(cryptoError.recoverable === true, 'L\'erreur doit être marquée comme récupérable');
}

/**
 * Test: gestion des listeners de notification
 */
async function testNotificationListeners() {
  const errorHandler = new CryptoErrorHandler();
  let notificationReceived = false;
  
  const listener = (notification) => {
    notificationReceived = true;
    assert(notification.type, 'La notification doit avoir un type');
    assert(notification.title, 'La notification doit avoir un titre');
    assert(notification.message, 'La notification doit avoir un message');
  };

  errorHandler.addErrorListener(listener);
  
  const stats = errorHandler.getErrorStats();
  assert(stats.listeners === 1, 'Un listener doit être enregistré');

  // Déclencher une notification via handleMissingKey
  const error = CryptoErrorHandler.createError('KEY_NOT_FOUND', 'Test', 'global');
  await errorHandler.handleMissingKey(error, 'global');
  
  assert(notificationReceived, 'Une notification doit avoir été reçue');

  errorHandler.removeErrorListener(listener);
  const statsAfterRemoval = errorHandler.getErrorStats();
  assert(statsAfterRemoval.listeners === 0, 'Le listener doit être supprimé');
}

/**
 * Test: gestion des clés manquantes
 */
async function testMissingKeyHandling() {
  const errorHandler = new CryptoErrorHandler();
  
  // Test avec clé globale
  const error = CryptoErrorHandler.createError('KEY_NOT_FOUND', 'Clé globale manquante', 'global');
  const result = await errorHandler.handleMissingKey(error, 'global');

  assert(result.success === true, 'La régénération de clé globale doit réussir');
  assert(result.action === 'retry', 'L\'action doit être retry');
  
  // Test avec clé de groupe
  const groupError = CryptoErrorHandler.createError('KEY_NOT_FOUND', 'Clé de groupe manquante', 'group_test');
  const groupResult = await errorHandler.handleMissingKey(groupError, 'group_test');

  assert(groupResult.success === true, 'La régénération de clé de groupe doit réussir');
  assert(groupResult.action === 'retry', 'L\'action doit être retry');
}

/**
 * Test: gestion des échecs de déchiffrement
 */
async function testDecryptionFailureHandling() {
  const errorHandler = new CryptoErrorHandler();
  
  const error = CryptoErrorHandler.createError('DECRYPTION_FAILED', 'Échec de déchiffrement', 'global');
  const result = await errorHandler.handleDecryptionFailure(error, 'global');

  // Le premier échec devrait essayer la resynchronisation
  assert(result.success === true || result.action === 'resync' || result.action === 'regenerate', 
    'Le premier échec doit essayer une récupération');
}

/**
 * Test: gestion des erreurs de stockage
 */
async function testStorageErrorHandling() {
  const errorHandler = new CryptoErrorHandler();
  
  const error = CryptoErrorHandler.createError('STORAGE_ERROR', 'Erreur de stockage', 'global');
  const result = await errorHandler.handleStorageError(error, 'global');

  assert(result !== null, 'Le gestionnaire doit retourner un résultat');
  assert(typeof result.success === 'boolean', 'Le résultat doit avoir un statut success');
  assert(result.action, 'Le résultat doit avoir une action');
}

/**
 * Test: gestion des échecs de chiffrement
 */
async function testEncryptionFailureHandling() {
  const errorHandler = new CryptoErrorHandler();
  
  const error = CryptoErrorHandler.createError('ENCRYPTION_FAILED', 'Échec de chiffrement', 'global');
  const result = await errorHandler.handleEncryptionFailure(error, 'global');

  assert(result !== null, 'Le gestionnaire doit retourner un résultat');
  assert(typeof result.success === 'boolean', 'Le résultat doit avoir un statut success');
  assert(result.action, 'Le résultat doit avoir une action');
}

/**
 * Test: gestion des échecs d'échange de clés
 */
async function testKeyExchangeFailureHandling() {
  const errorHandler = new CryptoErrorHandler();
  
  const error = CryptoErrorHandler.createError('KEY_EXCHANGE_FAILED', 'Échec d\'échange', 'group_test');
  
  const startTime = Date.now();
  const result = await errorHandler.handleKeyExchangeFailure(error, 'group_test');
  const endTime = Date.now();

  assert(result.success === true, 'Le premier échec d\'échange doit réessayer');
  assert(result.action === 'retry', 'L\'action doit être retry');
  assert(endTime - startTime >= 1000, 'Il doit y avoir un délai d\'au moins 1 seconde');
}

/**
 * Test: gestionnaire principal d'erreurs
 */
async function testMainErrorHandler() {
  const errorHandler = new CryptoErrorHandler();
  
  const decryptionError = CryptoErrorHandler.createError('DECRYPTION_FAILED', 'Test', 'global');
  const keyError = CryptoErrorHandler.createError('KEY_NOT_FOUND', 'Test', 'global');
  const genericError = CryptoErrorHandler.createError('GENERIC_ERROR', 'Erreur inconnue', 'global');

  const result1 = await errorHandler.handleError(decryptionError, 'global');
  const result2 = await errorHandler.handleError(keyError, 'global');
  const result3 = await errorHandler.handleError(genericError, 'global');

  assert(result1 !== null, 'Le gestionnaire doit traiter les erreurs de déchiffrement');
  assert(result2.success === true, 'Les clés manquantes doivent être régénérées');
  assert(result3.success === false, 'Les erreurs génériques doivent passer en mode dégradé');
  assert(result3.action === 'degraded_mode', 'L\'action doit être degraded_mode pour les erreurs génériques');
}

/**
 * Test: régénération de clés
 */
async function testKeyRegeneration() {
  const errorHandler = new CryptoErrorHandler();
  
  // Test régénération clé globale
  await errorHandler.regenerateKey('global');
  
  // Test régénération clé de groupe
  await errorHandler.regenerateKey('group_test');
  
  // Si on arrive ici sans erreur, c'est que ça fonctionne
  assert(true, 'La régénération de clés doit fonctionner sans erreur');
}

/**
 * Test: statistiques d'erreurs
 */
async function testErrorStats() {
  const errorHandler = new CryptoErrorHandler();
  
  const stats = errorHandler.getErrorStats();
  
  assert(typeof stats.activeRetries === 'number', 'activeRetries doit être un nombre');
  assert(typeof stats.listeners === 'number', 'listeners doit être un nombre');
  assert(typeof stats.retryCounters === 'object', 'retryCounters doit être un objet');
  
  // Test nettoyage des compteurs
  errorHandler.clearRetryCounters();
  const statsAfterClear = errorHandler.getErrorStats();
  assert(statsAfterClear.activeRetries === 0, 'Les compteurs doivent être nettoyés');
}

// Lancer les tests si ce fichier est exécuté directement
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { runTests };