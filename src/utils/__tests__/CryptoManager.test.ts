/**
 * Tests unitaires complets pour CryptoManager
 * 
 * Ces tests vérifient:
 * - La génération de clés automatique
 * - Le chiffrement/déchiffrement transparent
 * - La gestion du cache et de la persistance
 * - La gestion d'erreurs gracieuse
 * - Les performances de chiffrement
 * 
 * Requirements: 3.1, 3.2, 7.1, 7.2
 */

import { CryptoManager, type EncryptedMessage } from '../CryptoManager.ts';

// Configuration pour les tests Node.js
if (typeof window === 'undefined') {
  const { webcrypto } = await import('node:crypto');
  global.window = {
    crypto: {
      subtle: webcrypto.subtle,
      getRandomValues: webcrypto.getRandomValues.bind(webcrypto)
    }
  } as any;
  
  // Mock localStorage pour les tests
  const mockStorage: { [key: string]: string } = {};
  global.localStorage = {
    getItem: (key: string) => mockStorage[key] || null,
    setItem: (key: string, value: string) => { mockStorage[key] = value; },
    removeItem: (key: string) => { delete mockStorage[key]; },
    clear: () => { Object.keys(mockStorage).forEach(key => delete mockStorage[key]); },
    length: 0,
    key: () => null
  } as any;
}

/**
 * Fonction d'assertion avec types
 */
function assert(condition: boolean, message?: string): asserts condition {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

/**
 * Mesure le temps d'exécution d'une fonction
 */
async function measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; time: number }> {
  const start = performance.now();
  const result = await fn();
  const time = performance.now() - start;
  return { result, time };
}

/**
 * Test runner avec gestion des erreurs
 */
async function runTests(): Promise<void> {
  console.log('🧪 Démarrage des tests CryptoManager complets...\n');
  
  let passed = 0;
  let failed = 0;
  const results: Array<{ name: string; success: boolean; time?: number; error?: string }> = [];

  const tests = [
    // Tests de base
    testGenerateGlobalKey,
    testGenerateGroupKey,
    testEncryptDecryptMessage,
    testEncryptDecryptWithContext,
    
    // Tests de gestion d'erreurs
    testInvalidMessageHandling,
    testCorruptedMessageHandling,
    testMissingKeyHandling,
    
    // Tests de cache et persistance
    testKeyCache,
    testKeyPersistence,
    testCacheCleanup,
    testCacheMaxSize,
    
    // Tests de métadonnées
    testKeyMetadata,
    testKeyVersioning,
    testKeyRotation,
    
    // Tests de performance
    testEncryptionPerformance,
    testDecryptionPerformance,
    testCachePerformance,
    
    // Tests de sécurité
    testUniqueIVGeneration,
    testKeyUniqueness,
    testContextIsolation,
    
    // Tests d'intégrité
    testStorageIntegrity,
    testKeyExportImport,
    testReset
  ];

  for (const test of tests) {
    try {
      const { time } = await measureTime(test);
      console.log(`✅ ${test.name} (${time.toFixed(2)}ms)`);
      results.push({ name: test.name, success: true, time });
      passed++;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`❌ ${test.name}: ${errorMessage}`);
      results.push({ name: test.name, success: false, error: errorMessage });
      failed++;
    }
  }

  // Statistiques finales
  console.log(`\n📊 Résultats: ${passed} réussis, ${failed} échoués`);
  
  if (results.length > 0) {
    const avgTime = results
      .filter(r => r.time)
      .reduce((sum, r) => sum + (r.time || 0), 0) / results.filter(r => r.time).length;
    console.log(`⏱️  Temps moyen: ${avgTime.toFixed(2)}ms`);
  }
  
  if (failed > 0) {
    console.log('\n❌ Tests échoués:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`   - ${r.name}: ${r.error}`);
    });
    process.exit(1);
  }
}

// ============================================================================
// TESTS DE BASE
// ============================================================================

async function testGenerateGlobalKey(): Promise<void> {
  const crypto = new CryptoManager();
  const key = await crypto.generateGlobalKey();
  
  assert(key !== null, 'La clé globale doit être générée');
  assert(key.algorithm.name === 'AES-GCM', 'L\'algorithme doit être AES-GCM');
  assert((key.algorithm as AesKeyAlgorithm).length === 256, 'La longueur de clé doit être 256 bits');
  assert(key.type === 'secret', 'Le type de clé doit être secret');
  assert(key.extractable === true, 'La clé doit être extractable pour le stockage');
  assert(key.usages.includes('encrypt'), 'La clé doit permettre le chiffrement');
  assert(key.usages.includes('decrypt'), 'La clé doit permettre le déchiffrement');
}

async function testGenerateGroupKey(): Promise<void> {
  const crypto = new CryptoManager();
  const groupId = 'test-group-123';
  const key = await crypto.generateGroupKey(groupId);
  
  assert(key !== null, 'La clé de groupe doit être générée');
  assert(key.algorithm.name === 'AES-GCM', 'L\'algorithme doit être AES-GCM');
  assert((key.algorithm as AesKeyAlgorithm).length === 256, 'La longueur de clé doit être 256 bits');
  
  // Test avec ID de groupe invalide
  try {
    await crypto.generateGroupKey('');
    assert(false, 'Devrait échouer avec un ID de groupe vide');
  } catch (error) {
    assert(error instanceof Error && error.message.includes('invalide'), 'Erreur appropriée pour ID invalide');
  }
}

async function testEncryptDecryptMessage(): Promise<void> {
  const crypto = new CryptoManager();
  const message = 'Message secret de test avec caractères spéciaux: éàü 🔒';
  
  // Chiffrer le message
  const encrypted = await crypto.encryptMessage(message);
  
  assert(encrypted.iv && encrypted.iv.length === 12, 'L\'IV doit faire 12 bytes');
  assert(encrypted.content && encrypted.content.length > 0, 'Le contenu chiffré ne doit pas être vide');
  assert(encrypted.algorithm === 'AES-GCM', 'L\'algorithme doit être AES-GCM');
  assert(encrypted.keyVersion >= 1, 'La version de clé doit être >= 1');
  assert(typeof encrypted.timestamp === 'number', 'Le timestamp doit être un nombre');
  assert(encrypted.timestamp <= Date.now(), 'Le timestamp doit être récent');
  assert(encrypted.timestamp > Date.now() - 1000, 'Le timestamp doit être très récent');
  
  // Déchiffrer le message
  const decrypted = await crypto.decryptMessage(encrypted);
  
  assert(decrypted === message, 'Le message déchiffré doit correspondre à l\'original');
}

async function testEncryptDecryptWithContext(): Promise<void> {
  const crypto = new CryptoManager();
  const message = 'Message pour groupe spécifique';
  const groupId = 'group-456';
  const context = `group_${groupId}`;
  
  // Chiffrer avec une clé de groupe
  const encrypted = await crypto.encryptMessage(message, context);
  
  assert(encrypted.context === context, 'Le contexte doit être défini');
  
  // Déchiffrer avec la même clé de groupe
  const decrypted = await crypto.decryptMessage(encrypted, context);
  
  assert(decrypted === message, 'Le message doit être déchiffré correctement avec la clé de groupe');
  
  // Vérifier que le déchiffrement automatique utilise le contexte du message
  const decryptedAuto = await crypto.decryptMessage(encrypted);
  assert(decryptedAuto === message, 'Le déchiffrement automatique doit utiliser le contexte du message');
}

// ============================================================================
// TESTS DE GESTION D'ERREURS
// ============================================================================

async function testInvalidMessageHandling(): Promise<void> {
  const crypto = new CryptoManager();
  
  // Test avec message vide
  try {
    await crypto.encryptMessage('');
    assert(false, 'Le chiffrement d\'un message vide devrait échouer');
  } catch (error) {
    assert(error instanceof Error && error.message.includes('invalide'), 'L\'erreur doit mentionner un message invalide');
  }
  
  // Test avec message null/undefined
  try {
    await crypto.encryptMessage(null as any);
    assert(false, 'Le chiffrement d\'un message null devrait échouer');
  } catch (error) {
    assert(error instanceof Error, 'Doit lever une erreur pour message null');
  }
}

async function testCorruptedMessageHandling(): Promise<void> {
  const crypto = new CryptoManager();
  
  // Test avec message chiffré corrompu
  const corruptedMessage: EncryptedMessage = {
    iv: [1, 2, 3],
    content: [4, 5, 6],
    algorithm: 'AES-GCM',
    keyVersion: 1,
    timestamp: Date.now()
  };
  
  const result = await crypto.decryptMessage(corruptedMessage);
  assert(result === '[Message non déchiffrable]', 'Les messages corrompus doivent retourner un message d\'erreur');
  
  // Test avec structure invalide
  const invalidMessage = {
    iv: null,
    content: null,
    algorithm: 'AES-GCM'
  } as any;
  
  const result2 = await crypto.decryptMessage(invalidMessage);
  assert(result2 === '[Message non déchiffrable]', 'Les messages invalides doivent retourner un message d\'erreur');
}

async function testMissingKeyHandling(): Promise<void> {
  const crypto = new CryptoManager();
  
  // Tenter de récupérer une clé inexistante
  const key = await crypto.getKey('nonexistent-context');
  assert(key !== null, 'Une clé doit être générée automatiquement pour un contexte inexistant');
  
  // Vérifier que la clé a été créée et mise en cache
  const key2 = await crypto.getKey('nonexistent-context');
  assert(key === key2, 'La même clé doit être retournée depuis le cache');
}

// ============================================================================
// TESTS DE CACHE ET PERSISTANCE
// ============================================================================

async function testKeyCache(): Promise<void> {
  const crypto = new CryptoManager();
  
  // Générer une clé globale
  const key1 = await crypto.getKey('global');
  const key2 = await crypto.getKey('global');
  
  // Les deux appels doivent retourner la même clé (depuis le cache)
  assert(key1 === key2, 'La clé doit être mise en cache');
  
  // Vérifier que les contextes sont listés
  const contexts = await crypto.listKeyContexts();
  assert(contexts.includes('global'), 'Le contexte global doit être dans la liste');
}

async function testKeyPersistence(): Promise<void> {
  const crypto1 = new CryptoManager();
  
  // Générer et stocker une clé
  const originalKey = await crypto1.generateGlobalKey();
  const message = 'Test de persistance';
  const encrypted = await crypto1.encryptMessage(message);
  
  // Créer une nouvelle instance pour simuler un redémarrage
  const crypto2 = new CryptoManager();
  
  // La clé doit être récupérée depuis le stockage
  const decrypted = await crypto2.decryptMessage(encrypted);
  assert(decrypted === message, 'La clé doit être persistée et récupérable');
}

async function testCacheCleanup(): Promise<void> {
  const crypto = new CryptoManager();
  
  // Générer quelques clés
  await crypto.getKey('global');
  await crypto.getKey('group_test1');
  await crypto.getKey('group_test2');
  
  const contexts = await crypto.listKeyContexts();
  assert(contexts.length >= 3, 'Plusieurs contextes doivent être présents');
  
  // Nettoyer le cache
  crypto.clearCache();
  
  // Les clés doivent toujours être récupérables depuis le stockage
  const key = await crypto.getKey('global');
  assert(key !== null, 'Les clés doivent être récupérables après nettoyage du cache');
}

async function testCacheMaxSize(): Promise<void> {
  const crypto = new CryptoManager();
  
  // Générer beaucoup de clés pour tester la limite du cache
  const promises = [];
  for (let i = 0; i < 60; i++) { // Plus que la limite de 50
    promises.push(crypto.getKey(`group_test_${i}`));
  }
  
  await Promise.all(promises);
  
  // Vérifier que le système fonctionne toujours
  const stats = await crypto.getCacheStats();
  assert(stats.cacheSize <= stats.maxCacheSize, 'Le cache ne doit pas dépasser sa taille maximale');
  assert(stats.totalStoredKeys >= 60, 'Toutes les clés doivent être stockées');
}

// ============================================================================
// TESTS DE MÉTADONNÉES
// ============================================================================

async function testKeyMetadata(): Promise<void> {
  const crypto = new CryptoManager();
  
  // Générer une clé
  await crypto.getKey('global');
  
  // Récupérer les métadonnées
  const metadata = await crypto.getKeyMetadata('global');
  
  assert(metadata !== null, 'Les métadonnées doivent exister');
  assert(metadata.id === 'global', 'L\'ID doit correspondre au contexte');
  assert(metadata.algorithm === 'AES-GCM', 'L\'algorithme doit être AES-GCM');
  assert(metadata.length === 256, 'La longueur doit être 256');
  assert(metadata.version >= 1, 'La version doit être >= 1');
  assert(typeof metadata.created === 'number', 'La date de création doit être un nombre');
  assert(typeof metadata.lastUsed === 'number', 'La dernière utilisation doit être un nombre');
}

async function testKeyVersioning(): Promise<void> {
  const crypto = new CryptoManager();
  const context = 'test-versioning';
  
  // Générer une première clé
  const key1 = await crypto.generateGroupKey(context);
  const metadata1 = await crypto.getKeyMetadata(`group_${context}`);
  
  // Générer une nouvelle clé pour le même contexte
  const key2 = await crypto.generateGroupKey(context);
  const metadata2 = await crypto.getKeyMetadata(`group_${context}`);
  
  assert(metadata2!.version > metadata1!.version, 'La version doit être incrémentée');
  assert(key1 !== key2, 'Les clés doivent être différentes');
}

async function testKeyRotation(): Promise<void> {
  const crypto = new CryptoManager();
  const context = 'group_rotation-test';
  
  // Créer une clé initiale
  await crypto.getKey(context);
  const metadata1 = await crypto.getKeyMetadata(context);
  
  // Attendre un peu pour avoir des timestamps différents
  await new Promise(resolve => setTimeout(resolve, 10));
  
  // Forcer une nouvelle génération
  await crypto.generateGroupKey('rotation-test');
  const metadata2 = await crypto.getKeyMetadata(context);
  
  assert(metadata2!.created >= metadata1!.created, 'La date de création doit être mise à jour');
  assert(metadata2!.version > metadata1!.version, 'La version doit être incrémentée');
}

// ============================================================================
// TESTS DE PERFORMANCE
// ============================================================================

async function testEncryptionPerformance(): Promise<void> {
  const crypto = new CryptoManager();
  const message = 'Message de test pour performance';
  
  // Test de performance du chiffrement
  const { time } = await measureTime(() => crypto.encryptMessage(message));
  
  assert(time < 100, `Le chiffrement doit prendre moins de 100ms (actuel: ${time.toFixed(2)}ms)`);
  
  // Test avec message plus long
  const longMessage = 'A'.repeat(10000);
  const { time: longTime } = await measureTime(() => crypto.encryptMessage(longMessage));
  
  assert(longTime < 200, `Le chiffrement d'un long message doit prendre moins de 200ms (actuel: ${longTime.toFixed(2)}ms)`);
}

async function testDecryptionPerformance(): Promise<void> {
  const crypto = new CryptoManager();
  const message = 'Message de test pour performance de déchiffrement';
  
  // Chiffrer d'abord
  const encrypted = await crypto.encryptMessage(message);
  
  // Test de performance du déchiffrement
  const { time } = await measureTime(() => crypto.decryptMessage(encrypted));
  
  assert(time < 100, `Le déchiffrement doit prendre moins de 100ms (actuel: ${time.toFixed(2)}ms)`);
}

async function testCachePerformance(): Promise<void> {
  const crypto = new CryptoManager();
  
  // Premier accès (génération + stockage)
  const { time: firstAccess } = await measureTime(() => crypto.getKey('cache-perf-test'));
  
  // Deuxième accès (depuis le cache)
  const { time: secondAccess } = await measureTime(() => crypto.getKey('cache-perf-test'));
  
  assert(secondAccess < firstAccess / 2, 'L\'accès depuis le cache doit être au moins 2x plus rapide');
  assert(secondAccess < 10, `L'accès au cache doit être très rapide (actuel: ${secondAccess.toFixed(2)}ms)`);
}

// ============================================================================
// TESTS DE SÉCURITÉ
// ============================================================================

async function testUniqueIVGeneration(): Promise<void> {
  const crypto = new CryptoManager();
  const message = 'Message identique';
  
  // Chiffrer le même message plusieurs fois
  const encrypted1 = await crypto.encryptMessage(message);
  const encrypted2 = await crypto.encryptMessage(message);
  const encrypted3 = await crypto.encryptMessage(message);
  
  // Les IV doivent être uniques
  assert(!arraysEqual(encrypted1.iv, encrypted2.iv), 'Les IV doivent être uniques (1 vs 2)');
  assert(!arraysEqual(encrypted1.iv, encrypted3.iv), 'Les IV doivent être uniques (1 vs 3)');
  assert(!arraysEqual(encrypted2.iv, encrypted3.iv), 'Les IV doivent être uniques (2 vs 3)');
  
  // Les contenus chiffrés doivent être différents
  assert(!arraysEqual(encrypted1.content, encrypted2.content), 'Les contenus chiffrés doivent être différents');
  
  // Mais le déchiffrement doit donner le même résultat
  const decrypted1 = await crypto.decryptMessage(encrypted1);
  const decrypted2 = await crypto.decryptMessage(encrypted2);
  const decrypted3 = await crypto.decryptMessage(encrypted3);
  
  assert(decrypted1 === message, 'Le déchiffrement 1 doit être correct');
  assert(decrypted2 === message, 'Le déchiffrement 2 doit être correct');
  assert(decrypted3 === message, 'Le déchiffrement 3 doit être correct');
}

async function testKeyUniqueness(): Promise<void> {
  const crypto = new CryptoManager();
  
  // Générer plusieurs clés
  const key1 = await crypto.generateGlobalKey();
  const key2 = await crypto.generateGroupKey('group1');
  const key3 = await crypto.generateGroupKey('group2');
  
  // Exporter les clés pour comparaison
  const exported1 = await window.crypto.subtle.exportKey('raw', key1);
  const exported2 = await window.crypto.subtle.exportKey('raw', key2);
  const exported3 = await window.crypto.subtle.exportKey('raw', key3);
  
  // Les clés doivent être différentes
  assert(!arraysEqual(new Uint8Array(exported1), new Uint8Array(exported2)), 'Les clés globale et groupe1 doivent être différentes');
  assert(!arraysEqual(new Uint8Array(exported1), new Uint8Array(exported3)), 'Les clés globale et groupe2 doivent être différentes');
  assert(!arraysEqual(new Uint8Array(exported2), new Uint8Array(exported3)), 'Les clés groupe1 et groupe2 doivent être différentes');
}

async function testContextIsolation(): Promise<void> {
  const crypto = new CryptoManager();
  const message = 'Message secret';
  
  // Chiffrer avec différents contextes
  const encryptedGlobal = await crypto.encryptMessage(message, 'global');
  const encryptedGroup1 = await crypto.encryptMessage(message, 'group_test1');
  const encryptedGroup2 = await crypto.encryptMessage(message, 'group_test2');
  
  // Vérifier que les messages sont différents
  assert(!arraysEqual(encryptedGlobal.content, encryptedGroup1.content), 'Les messages chiffrés avec des contextes différents doivent être différents');
  assert(!arraysEqual(encryptedGroup1.content, encryptedGroup2.content), 'Les messages chiffrés avec des groupes différents doivent être différents');
  
  // Vérifier l'isolation: un message chiffré avec un contexte ne peut pas être déchiffré avec un autre
  const decryptedWrong = await crypto.decryptMessage(encryptedGroup1, 'group_test2');
  assert(decryptedWrong === '[Message non déchiffrable]', 'Un message ne doit pas pouvoir être déchiffré avec une mauvaise clé');
  
  // Mais le déchiffrement avec le bon contexte doit fonctionner
  const decryptedCorrect = await crypto.decryptMessage(encryptedGroup1, 'group_test1');
  assert(decryptedCorrect === message, 'Le déchiffrement avec le bon contexte doit fonctionner');
}

// ============================================================================
// TESTS D'INTÉGRITÉ
// ============================================================================

async function testStorageIntegrity(): Promise<void> {
  const crypto = new CryptoManager();
  
  // Générer quelques clés
  await crypto.getKey('global');
  await crypto.getKey('group_integrity1');
  await crypto.getKey('group_integrity2');
  
  // Vérifier l'intégrité
  const integrity = await crypto.verifyIntegrity();
  
  assert(integrity.valid === true, 'L\'intégrité du stockage doit être valide');
  assert(Array.isArray(integrity.errors), 'Les erreurs doivent être un tableau');
  assert(Array.isArray(integrity.warnings), 'Les avertissements doivent être un tableau');
  assert(integrity.errors.length === 0, 'Il ne doit pas y avoir d\'erreurs d\'intégrité');
}

async function testKeyExportImport(): Promise<void> {
  const crypto1 = new CryptoManager();
  const message = 'Test export/import';
  
  // Générer des clés et chiffrer un message
  await crypto1.getKey('global');
  await crypto1.getKey('group_export_test');
  const encrypted = await crypto1.encryptMessage(message, 'group_export_test');
  
  // Exporter les clés
  const exported = await crypto1.exportKeys();
  
  assert(exported !== null, 'L\'export doit réussir');
  assert(Array.isArray(exported.keys), 'L\'export doit contenir un tableau de clés');
  assert(exported.keys.length >= 2, 'L\'export doit contenir au moins 2 clés');
  
  // Créer une nouvelle instance et importer
  const crypto2 = new CryptoManager();
  await crypto2.reset(); // S'assurer qu'elle est vide
  await crypto2.importKeys(exported);
  
  // Vérifier que le déchiffrement fonctionne
  const decrypted = await crypto2.decryptMessage(encrypted, 'group_export_test');
  assert(decrypted === message, 'Le message doit être déchiffrable après import');
}

async function testReset(): Promise<void> {
  const crypto = new CryptoManager();
  
  // Générer quelques clés
  await crypto.getKey('global');
  await crypto.getKey('group_reset_test');
  
  const contextsBefore = await crypto.listKeyContexts();
  assert(contextsBefore.length >= 2, 'Des clés doivent être présentes avant reset');
  
  // Réinitialiser
  await crypto.reset();
  
  const contextsAfter = await crypto.listKeyContexts();
  assert(contextsAfter.length === 0, 'Aucune clé ne doit être présente après reset');
  
  // Vérifier que de nouvelles clés peuvent être générées
  const newKey = await crypto.getKey('global');
  assert(newKey !== null, 'De nouvelles clés doivent pouvoir être générées après reset');
}

// ============================================================================
// UTILITAIRES
// ============================================================================

function arraysEqual(a: number[] | Uint8Array, b: number[] | Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// Lancer les tests si ce fichier est exécuté directement
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { runTests };