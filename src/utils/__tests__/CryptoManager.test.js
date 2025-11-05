/**
 * Tests unitaires pour CryptoManager
 * 
 * Ces tests vérifient les fonctionnalités de base du chiffrement automatique
 * Requirements: 1.1, 1.2, 3.1, 3.2
 */

import { CryptoManager } from '../CryptoManager.js';

// Polyfill pour les tests Node.js
if (typeof window === 'undefined') {
  global.window = {
    crypto: {
      subtle: crypto.webcrypto.subtle,
      getRandomValues: crypto.webcrypto.getRandomValues.bind(crypto.webcrypto)
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

/**
 * Test runner simple
 */
async function runTests() {
  console.log('🧪 Démarrage des tests CryptoManager...\n');
  
  let passed = 0;
  let failed = 0;

  const tests = [
    testGenerateGlobalKey,
    testGenerateGroupKey,
    testEncryptDecryptMessage,
    testEncryptDecryptWithDifferentKeys,
    testInvalidMessageHandling,
    testKeyCache,
    testKeyMetadata,
    testClearCache
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
 * Test: génération de clé globale
 */
async function testGenerateGlobalKey() {
  const crypto = new CryptoManager();
  const key = await crypto.generateGlobalKey();
  
  assert(key !== null, 'La clé globale doit être générée');
  assert(key.algorithm.name === 'AES-GCM', 'L\'algorithme doit être AES-GCM');
  assert(key.algorithm.length === 256, 'La longueur de clé doit être 256 bits');
}

/**
 * Test: génération de clé de groupe
 */
async function testGenerateGroupKey() {
  const crypto = new CryptoManager();
  const groupId = 'test-group-123';
  const key = await crypto.generateGroupKey(groupId);
  
  assert(key !== null, 'La clé de groupe doit être générée');
  assert(key.algorithm.name === 'AES-GCM', 'L\'algorithme doit être AES-GCM');
  assert(key.algorithm.length === 256, 'La longueur de clé doit être 256 bits');
}

/**
 * Test: chiffrement et déchiffrement d'un message
 */
async function testEncryptDecryptMessage() {
  const crypto = new CryptoManager();
  const message = 'Message secret de test';
  
  // Chiffrer le message
  const encrypted = await crypto.encryptMessage(message);
  
  assert(encrypted.iv && encrypted.iv.length === 12, 'L\'IV doit faire 12 bytes');
  assert(encrypted.content && encrypted.content.length > 0, 'Le contenu chiffré ne doit pas être vide');
  assert(encrypted.algorithm === 'AES-GCM', 'L\'algorithme doit être AES-GCM');
  assert(encrypted.keyVersion === 1, 'La version de clé doit être 1');
  assert(typeof encrypted.timestamp === 'number', 'Le timestamp doit être un nombre');
  
  // Déchiffrer le message
  const decrypted = await crypto.decryptMessage(encrypted);
  
  assert(decrypted === message, 'Le message déchiffré doit correspondre à l\'original');
}

/**
 * Test: chiffrement avec des clés différentes
 */
async function testEncryptDecryptWithDifferentKeys() {
  const crypto = new CryptoManager();
  const message = 'Message pour groupe';
  const groupId = 'group-456';
  
  // Chiffrer avec une clé de groupe
  const encrypted = await crypto.encryptMessage(message, `group_${groupId}`);
  
  assert(encrypted.context === `group_${groupId}`, 'Le contexte doit être défini');
  
  // Déchiffrer avec la même clé de groupe
  const decrypted = await crypto.decryptMessage(encrypted, `group_${groupId}`);
  
  assert(decrypted === message, 'Le message doit être déchiffré correctement avec la clé de groupe');
}

/**
 * Test: gestion des messages invalides
 */
async function testInvalidMessageHandling() {
  const crypto = new CryptoManager();
  
  // Test avec message vide
  try {
    await crypto.encryptMessage('');
    assert(false, 'Le chiffrement d\'un message vide devrait échouer');
  } catch (error) {
    assert(error.message.includes('invalide'), 'L\'erreur doit mentionner un message invalide');
  }
  
  // Test avec message chiffré corrompu
  const corruptedMessage = {
    iv: [1, 2, 3],
    content: [4, 5, 6],
    algorithm: 'AES-GCM',
    keyVersion: 1,
    timestamp: Date.now()
  };
  
  const result = await crypto.decryptMessage(corruptedMessage);
  assert(result === '[Message non déchiffrable]', 'Les messages corrompus doivent retourner un message d\'erreur');
}

/**
 * Test: cache des clés
 */
async function testKeyCache() {
  const crypto = new CryptoManager();
  
  // Générer une clé globale
  const key1 = await crypto.getKey('global');
  const key2 = await crypto.getKey('global');
  
  // Les deux appels doivent retourner la même clé (depuis le cache)
  assert(key1 === key2, 'La clé doit être mise en cache');
  
  // Vérifier que les contextes sont listés
  const contexts = crypto.listKeyContexts();
  assert(contexts.includes('global'), 'Le contexte global doit être dans la liste');
}

/**
 * Test: métadonnées des clés
 */
async function testKeyMetadata() {
  const crypto = new CryptoManager();
  
  // Générer une clé
  await crypto.getKey('global');
  
  // Récupérer les métadonnées
  const metadata = crypto.getKeyMetadata('global');
  
  assert(metadata !== null, 'Les métadonnées doivent exister');
  assert(metadata.id === 'global', 'L\'ID doit correspondre au contexte');
  assert(metadata.algorithm === 'AES-GCM', 'L\'algorithme doit être AES-GCM');
  assert(metadata.length === 256, 'La longueur doit être 256');
  assert(metadata.version === 1, 'La version doit être 1');
}

/**
 * Test: nettoyage du cache
 */
async function testClearCache() {
  const crypto = new CryptoManager();
  
  // Générer quelques clés
  await crypto.getKey('global');
  await crypto.getKey('group_test');
  
  assert(crypto.listKeyContexts().length === 2, 'Deux contextes doivent être présents');
  
  // Nettoyer le cache
  crypto.clearCache();
  
  assert(crypto.listKeyContexts().length === 0, 'Le cache doit être vide après nettoyage');
  assert(crypto.getKeyMetadata('global') === null, 'Les métadonnées doivent être supprimées');
}

// Lancer les tests si ce fichier est exécuté directement
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { runTests };