/**
 * Tests unitaires complets pour SecureStorage
 * 
 * Ces tests vérifient:
 * - Le stockage sécurisé des clés avec chiffrement
 * - La gestion des métadonnées
 * - Le nettoyage automatique des clés expirées
 * - L'export/import des clés
 * - La vérification d'intégrité
 * 
 * Requirements: 3.1, 3.2, 7.1, 7.2
 */

import { SecureStorage, type KeyMetadata, type ExportedKeys } from '../SecureStorage.ts';

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
    get length() { return Object.keys(mockStorage).length; },
    key: (index: number) => {
      const keys = Object.keys(mockStorage);
      return keys[index] || null;
    }
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
 * Génère une clé de test
 */
async function generateTestKey(): Promise<CryptoKey> {
  return await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Test runner avec gestion des erreurs
 */
async function runTests(): Promise<void> {
  console.log('🧪 Démarrage des tests SecureStorage complets...\n');
  
  let passed = 0;
  let failed = 0;
  const results: Array<{ name: string; success: boolean; time?: number; error?: string }> = [];

  const tests = [
    // Tests de base
    testStoreAndRetrieveKey,
    testDeleteKey,
    testListKeys,
    testKeyNotFound,
    
    // Tests de métadonnées
    testStoreAndRetrieveMetadata,
    testMetadataNotFound,
    testUpdateLastUsed,
    
    // Tests de sécurité
    testKeyEncryption,
    testMasterKeyGeneration,
    testKeyIsolation,
    
    // Tests de nettoyage
    testCleanupExpiredKeys,
    testCleanupOrphanedKeys,
    testPreserveGlobalKey,
    
    // Tests de statistiques
    testStorageStats,
    testEmptyStorageStats,
    
    // Tests d'export/import
    testExportKeys,
    testImportKeys,
    testExportImportRoundtrip,
    testImportInvalidData,
    
    // Tests d'intégrité
    testVerifyIntegrity,
    testIntegrityWithCorruptedData,
    testIntegrityWithMissingMetadata,
    
    // Tests de performance
    testStoragePerformance,
    testRetrievalPerformance,
    testBulkOperations,
    
    // Tests de réinitialisation
    testReset,
    testResetAndRegenerate
  ];

  for (const test of tests) {
    // Nettoyer le stockage avant chaque test
    localStorage.clear();
    
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

async function testStoreAndRetrieveKey(): Promise<void> {
  const storage = new SecureStorage();
  const keyId = 'test-key';
  const originalKey = await generateTestKey();
  
  // Stocker la clé
  await storage.storeKey(keyId, originalKey);
  
  // Récupérer la clé
  const retrievedKey = await storage.retrieveKey(keyId);
  
  assert(retrievedKey !== null, 'La clé doit être récupérée');
  assert(retrievedKey.algorithm.name === 'AES-GCM', 'L\'algorithme doit être préservé');
  assert(retrievedKey.algorithm.length === 256, 'La longueur doit être préservée');
  
  // Vérifier que les clés sont fonctionnellement équivalentes
  const testData = new TextEncoder().encode('test data');
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  const encrypted1 = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, originalKey, testData);
  const decrypted1 = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, retrievedKey, encrypted1);
  
  assert(new TextDecoder().decode(decrypted1) === 'test data', 'Les clés doivent être fonctionnellement équivalentes');
}

async function testDeleteKey(): Promise<void> {
  const storage = new SecureStorage();
  const keyId = 'test-delete';
  const key = await generateTestKey();
  
  // Stocker puis supprimer
  await storage.storeKey(keyId, key);
  await storage.deleteKey(keyId);
  
  // Vérifier que la clé n'existe plus
  const retrievedKey = await storage.retrieveKey(keyId);
  assert(retrievedKey === null, 'La clé supprimée ne doit plus être récupérable');
  
  // Vérifier que les métadonnées sont aussi supprimées
  const metadata = await storage.getMetadata(keyId);
  assert(metadata === null, 'Les métadonnées doivent aussi être supprimées');
}

async function testListKeys(): Promise<void> {
  const storage = new SecureStorage();
  
  // Stocker plusieurs clés
  const keys = ['key1', 'key2', 'key3'];
  for (const keyId of keys) {
    const key = await generateTestKey();
    await storage.storeKey(keyId, key);
  }
  
  // Lister les clés
  const listedKeys = await storage.listKeys();
  
  assert(listedKeys.length === 3, 'Toutes les clés doivent être listées');
  for (const keyId of keys) {
    assert(listedKeys.includes(keyId), `La clé ${keyId} doit être dans la liste`);
  }
  
  // Vérifier que les clés sont triées
  const sortedKeys = [...listedKeys].sort();
  assert(JSON.stringify(listedKeys) === JSON.stringify(sortedKeys), 'Les clés doivent être triées');
}

async function testKeyNotFound(): Promise<void> {
  const storage = new SecureStorage();
  
  const key = await storage.retrieveKey('nonexistent-key');
  assert(key === null, 'Une clé inexistante doit retourner null');
}

// ============================================================================
// TESTS DE MÉTADONNÉES
// ============================================================================

async function testStoreAndRetrieveMetadata(): Promise<void> {
  const storage = new SecureStorage();
  const keyId = 'test-metadata';
  const now = Date.now();
  
  const metadata: KeyMetadata = {
    id: keyId,
    context: keyId,
    algorithm: 'AES-GCM',
    length: 256,
    created: now,
    lastUsed: now,
    version: 1
  };
  
  await storage.storeMetadata(keyId, metadata);
  const retrieved = await storage.getMetadata(keyId);
  
  assert(retrieved !== null, 'Les métadonnées doivent être récupérées');
  assert(retrieved.id === keyId, 'L\'ID doit correspondre');
  assert(retrieved.algorithm === 'AES-GCM', 'L\'algorithme doit correspondre');
  assert(retrieved.length === 256, 'La longueur doit correspondre');
  assert(retrieved.created === now, 'La date de création doit correspondre');
  assert(retrieved.version === 1, 'La version doit correspondre');
}

async function testMetadataNotFound(): Promise<void> {
  const storage = new SecureStorage();
  
  const metadata = await storage.getMetadata('nonexistent-metadata');
  assert(metadata === null, 'Des métadonnées inexistantes doivent retourner null');
}

async function testUpdateLastUsed(): Promise<void> {
  const storage = new SecureStorage();
  const keyId = 'test-last-used';
  const key = await generateTestKey();
  const initialTime = Date.now();
  
  // Stocker la clé
  await storage.storeKey(keyId, key);
  
  // Attendre un peu
  await new Promise(resolve => setTimeout(resolve, 10));
  
  // Récupérer la clé (doit mettre à jour lastUsed)
  await storage.retrieveKey(keyId);
  
  const metadata = await storage.getMetadata(keyId);
  assert(metadata !== null, 'Les métadonnées doivent exister');
  assert(metadata.lastUsed > initialTime, 'La dernière utilisation doit être mise à jour');
}

// ============================================================================
// TESTS DE SÉCURITÉ
// ============================================================================

async function testKeyEncryption(): Promise<void> {
  const storage = new SecureStorage();
  const keyId = 'test-encryption';
  const key = await generateTestKey();
  
  await storage.storeKey(keyId, key);
  
  // Vérifier que la clé n'est pas stockée en clair
  const storedData = localStorage.getItem('liberchat_secure_test-encryption');
  assert(storedData !== null, 'Des données doivent être stockées');
  
  const parsedData = JSON.parse(storedData);
  assert(Array.isArray(parsedData.encryptedKey), 'La clé doit être chiffrée');
  assert(Array.isArray(parsedData.iv), 'Un IV doit être présent');
  assert(parsedData.encryptedKey.length > 0, 'La clé chiffrée ne doit pas être vide');
  assert(parsedData.iv.length === 12, 'L\'IV doit faire 12 bytes');
  
  // Vérifier que les données ne contiennent pas la clé en clair
  const dataString = JSON.stringify(parsedData);
  assert(!dataString.includes('-----BEGIN'), 'Les données ne doivent pas contenir de clé PEM');
  assert(!dataString.match(/^[A-Za-z0-9+/]+=*$/), 'Les données ne doivent pas être en base64 simple');
}

async function testMasterKeyGeneration(): Promise<void> {
  const storage1 = new SecureStorage();
  const storage2 = new SecureStorage();
  
  const keyId = 'test-master-key';
  const key = await generateTestKey();
  
  // Stocker avec la première instance
  await storage1.storeKey(keyId, key);
  
  // Récupérer avec la deuxième instance (doit utiliser la même clé maître)
  const retrievedKey = await storage2.retrieveKey(keyId);
  
  assert(retrievedKey !== null, 'La clé doit être récupérable avec une autre instance');
  
  // Vérifier que la clé maître est bien stockée
  const masterKeyData = localStorage.getItem('liberchat_secure_master_key_v1');
  assert(masterKeyData !== null, 'La clé maître doit être stockée');
  
  const parsedMasterKey = JSON.parse(masterKeyData);
  assert(Array.isArray(parsedMasterKey.key), 'La clé maître doit être un tableau');
  assert(parsedMasterKey.algorithm === 'AES-GCM', 'L\'algorithme de la clé maître doit être AES-GCM');
}

async function testKeyIsolation(): Promise<void> {
  const storage = new SecureStorage();
  
  // Stocker deux clés différentes
  const key1 = await generateTestKey();
  const key2 = await generateTestKey();
  
  await storage.storeKey('key1', key1);
  await storage.storeKey('key2', key2);
  
  // Récupérer les clés
  const retrieved1 = await storage.retrieveKey('key1');
  const retrieved2 = await storage.retrieveKey('key2');
  
  assert(retrieved1 !== null && retrieved2 !== null, 'Les deux clés doivent être récupérées');
  
  // Vérifier qu'elles sont différentes
  const exported1 = await window.crypto.subtle.exportKey('raw', retrieved1);
  const exported2 = await window.crypto.subtle.exportKey('raw', retrieved2);
  
  const array1 = new Uint8Array(exported1);
  const array2 = new Uint8Array(exported2);
  
  let different = false;
  for (let i = 0; i < array1.length; i++) {
    if (array1[i] !== array2[i]) {
      different = true;
      break;
    }
  }
  
  assert(different, 'Les clés stockées doivent être différentes');
}

// ============================================================================
// TESTS DE NETTOYAGE
// ============================================================================

async function testCleanupExpiredKeys(): Promise<void> {
  const storage = new SecureStorage();
  const now = Date.now();
  const EXPIRY_TIME = 30 * 24 * 60 * 60 * 1000; // 30 jours
  
  // Créer une clé récente
  const recentKey = await generateTestKey();
  await storage.storeKey('recent', recentKey);
  
  // Créer une clé expirée en modifiant ses métadonnées
  const expiredKey = await generateTestKey();
  await storage.storeKey('expired', expiredKey);
  
  const expiredMetadata: KeyMetadata = {
    id: 'expired',
    context: 'expired',
    algorithm: 'AES-GCM',
    length: 256,
    created: now - EXPIRY_TIME - 1000,
    lastUsed: now - EXPIRY_TIME - 1000,
    version: 1
  };
  
  await storage.storeMetadata('expired', expiredMetadata);
  
  // Effectuer le nettoyage
  await storage.cleanup();
  
  // Vérifier les résultats
  const recentStillExists = await storage.retrieveKey('recent');
  const expiredStillExists = await storage.retrieveKey('expired');
  
  assert(recentStillExists !== null, 'La clé récente doit être préservée');
  assert(expiredStillExists === null, 'La clé expirée doit être supprimée');
}

async function testCleanupOrphanedKeys(): Promise<void> {
  const storage = new SecureStorage();
  const key = await generateTestKey();
  
  // Stocker une clé puis supprimer ses métadonnées pour créer une clé orpheline
  await storage.storeKey('orphan', key);
  localStorage.removeItem('liberchat_meta_orphan');
  
  // Effectuer le nettoyage
  await storage.cleanup();
  
  // La clé orpheline doit être supprimée
  const orphanExists = await storage.retrieveKey('orphan');
  assert(orphanExists === null, 'La clé orpheline doit être supprimée');
}

async function testPreserveGlobalKey(): Promise<void> {
  const storage = new SecureStorage();
  const now = Date.now();
  const EXPIRY_TIME = 30 * 24 * 60 * 60 * 1000; // 30 jours
  
  // Créer une clé globale expirée
  const globalKey = await generateTestKey();
  await storage.storeKey('global', globalKey);
  
  const expiredMetadata: KeyMetadata = {
    id: 'global',
    context: 'global',
    algorithm: 'AES-GCM',
    length: 256,
    created: now - EXPIRY_TIME - 1000,
    lastUsed: now - EXPIRY_TIME - 1000,
    version: 1
  };
  
  await storage.storeMetadata('global', expiredMetadata);
  
  // Effectuer le nettoyage
  await storage.cleanup();
  
  // La clé globale doit être préservée même si elle est expirée
  const globalStillExists = await storage.retrieveKey('global');
  assert(globalStillExists !== null, 'La clé globale doit être préservée même si expirée');
}

// ============================================================================
// TESTS DE STATISTIQUES
// ============================================================================

async function testStorageStats(): Promise<void> {
  const storage = new SecureStorage();
  const now = Date.now();
  
  // Créer plusieurs clés avec des timestamps différents
  const keys = ['oldest', 'middle', 'newest'];
  for (let i = 0; i < keys.length; i++) {
    const key = await generateTestKey();
    await storage.storeKey(keys[i], key);
    
    // Modifier les métadonnées pour avoir des timestamps différents
    const metadata: KeyMetadata = {
      id: keys[i],
      context: keys[i],
      algorithm: 'AES-GCM',
      length: 256,
      created: now - (keys.length - i) * 1000,
      lastUsed: now - (keys.length - i) * 500,
      version: 1
    };
    
    await storage.storeMetadata(keys[i], metadata);
  }
  
  const stats = await storage.getStorageStats();
  
  assert(stats.totalKeys === 3, 'Le nombre total de clés doit être correct');
  assert(stats.storageUsed > 0, 'L\'espace utilisé doit être positif');
  assert(stats.oldestKey?.id === 'oldest', 'La clé la plus ancienne doit être identifiée');
  assert(stats.newestKey?.id === 'newest', 'La clé la plus récente doit être identifiée');
  assert(stats.mostUsedKey?.id === 'newest', 'La clé la plus utilisée doit être identifiée');
}

async function testEmptyStorageStats(): Promise<void> {
  const storage = new SecureStorage();
  
  const stats = await storage.getStorageStats();
  
  assert(stats.totalKeys === 0, 'Le stockage vide doit avoir 0 clés');
  assert(stats.storageUsed === 0, 'L\'espace utilisé doit être 0');
  assert(stats.oldestKey === undefined, 'Pas de clé la plus ancienne');
  assert(stats.newestKey === undefined, 'Pas de clé la plus récente');
  assert(stats.mostUsedKey === undefined, 'Pas de clé la plus utilisée');
}

// ============================================================================
// TESTS D'EXPORT/IMPORT
// ============================================================================

async function testExportKeys(): Promise<void> {
  const storage = new SecureStorage();
  
  // Stocker quelques clés
  const keys = ['export1', 'export2'];
  for (const keyId of keys) {
    const key = await generateTestKey();
    await storage.storeKey(keyId, key);
  }
  
  const exported = await storage.exportKeys();
  
  assert(exported.version === '1.0', 'La version d\'export doit être correcte');
  assert(typeof exported.timestamp === 'number', 'Le timestamp doit être présent');
  assert(Array.isArray(exported.keys), 'Les clés doivent être un tableau');
  assert(exported.keys.length === 2, 'Toutes les clés doivent être exportées');
  
  for (const exportedKey of exported.keys) {
    assert(typeof exportedKey.context === 'string', 'Le contexte doit être une chaîne');
    assert(typeof exportedKey.keyData === 'string', 'Les données de clé doivent être une chaîne');
    assert(exportedKey.metadata !== null, 'Les métadonnées doivent être présentes');
  }
}

async function testImportKeys(): Promise<void> {
  const storage1 = new SecureStorage();
  const storage2 = new SecureStorage();
  
  // Créer et exporter des clés
  const key = await generateTestKey();
  await storage1.storeKey('import-test', key);
  const exported = await storage1.exportKeys();
  
  // Importer dans une nouvelle instance
  await storage2.importKeys(exported);
  
  // Vérifier que la clé est importée
  const importedKey = await storage2.retrieveKey('import-test');
  assert(importedKey !== null, 'La clé doit être importée');
  
  const keys = await storage2.listKeys();
  assert(keys.includes('import-test'), 'La clé doit être dans la liste');
}

async function testExportImportRoundtrip(): Promise<void> {
  const storage1 = new SecureStorage();
  const storage2 = new SecureStorage();
  
  // Créer des données de test
  const testMessage = 'Test roundtrip export/import';
  const key = await generateTestKey();
  await storage1.storeKey('roundtrip', key);
  
  // Chiffrer un message avec la clé originale
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const messageData = new TextEncoder().encode(testMessage);
  const encrypted = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, messageData);
  
  // Exporter et importer
  const exported = await storage1.exportKeys();
  await storage2.importKeys(exported);
  
  // Récupérer la clé importée et déchiffrer
  const importedKey = await storage2.retrieveKey('roundtrip');
  assert(importedKey !== null, 'La clé importée doit exister');
  
  const decrypted = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, importedKey, encrypted);
  const decryptedMessage = new TextDecoder().decode(decrypted);
  
  assert(decryptedMessage === testMessage, 'Le message doit être déchiffrable avec la clé importée');
}

async function testImportInvalidData(): Promise<void> {
  const storage = new SecureStorage();
  
  // Test avec données invalides
  try {
    await storage.importKeys(null as any);
    assert(false, 'L\'import de données null devrait échouer');
  } catch (error) {
    assert(error instanceof Error, 'Doit lever une erreur pour données invalides');
  }
  
  // Test avec structure invalide
  try {
    await storage.importKeys({ version: '1.0', timestamp: Date.now() } as any);
    assert(false, 'L\'import sans clés devrait échouer');
  } catch (error) {
    assert(error instanceof Error, 'Doit lever une erreur pour structure invalide');
  }
}

// ============================================================================
// TESTS D'INTÉGRITÉ
// ============================================================================

async function testVerifyIntegrity(): Promise<void> {
  const storage = new SecureStorage();
  
  // Stocker quelques clés valides
  const key1 = await generateTestKey();
  const key2 = await generateTestKey();
  await storage.storeKey('integrity1', key1);
  await storage.storeKey('integrity2', key2);
  
  const integrity = await storage.verifyIntegrity();
  
  assert(integrity.valid === true, 'L\'intégrité doit être valide');
  assert(Array.isArray(integrity.errors), 'Les erreurs doivent être un tableau');
  assert(Array.isArray(integrity.warnings), 'Les avertissements doivent être un tableau');
  assert(integrity.errors.length === 0, 'Il ne doit pas y avoir d\'erreurs');
}

async function testIntegrityWithCorruptedData(): Promise<void> {
  const storage = new SecureStorage();
  
  // Stocker une clé valide
  const key = await generateTestKey();
  await storage.storeKey('valid', key);
  
  // Corrompre les données d'une clé
  localStorage.setItem('liberchat_secure_corrupted', 'invalid json data');
  
  const integrity = await storage.verifyIntegrity();
  
  assert(integrity.valid === false, 'L\'intégrité doit être invalide avec des données corrompues');
  assert(integrity.errors.length > 0, 'Il doit y avoir des erreurs');
  assert(integrity.errors.some(e => e.includes('corrupted')), 'L\'erreur doit mentionner la clé corrompue');
}

async function testIntegrityWithMissingMetadata(): Promise<void> {
  const storage = new SecureStorage();
  
  // Stocker une clé puis supprimer ses métadonnées
  const key = await generateTestKey();
  await storage.storeKey('missing-meta', key);
  localStorage.removeItem('liberchat_meta_missing-meta');
  
  const integrity = await storage.verifyIntegrity();
  
  assert(integrity.valid === true, 'L\'intégrité peut être valide avec des avertissements');
  assert(integrity.warnings.length > 0, 'Il doit y avoir des avertissements');
  assert(integrity.warnings.some(w => w.includes('missing-meta')), 'L\'avertissement doit mentionner les métadonnées manquantes');
}

// ============================================================================
// TESTS DE PERFORMANCE
// ============================================================================

async function testStoragePerformance(): Promise<void> {
  const storage = new SecureStorage();
  const key = await generateTestKey();
  
  const { time } = await measureTime(() => storage.storeKey('perf-store', key));
  
  assert(time < 100, `Le stockage doit prendre moins de 100ms (actuel: ${time.toFixed(2)}ms)`);
}

async function testRetrievalPerformance(): Promise<void> {
  const storage = new SecureStorage();
  const key = await generateTestKey();
  
  // Stocker d'abord
  await storage.storeKey('perf-retrieve', key);
  
  // Mesurer la récupération
  const { time } = await measureTime(() => storage.retrieveKey('perf-retrieve'));
  
  assert(time < 50, `La récupération doit prendre moins de 50ms (actuel: ${time.toFixed(2)}ms)`);
}

async function testBulkOperations(): Promise<void> {
  const storage = new SecureStorage();
  const keyCount = 10;
  
  // Test de stockage en masse
  const storePromises = [];
  for (let i = 0; i < keyCount; i++) {
    const key = generateTestKey();
    storePromises.push(key.then(k => storage.storeKey(`bulk-${i}`, k)));
  }
  
  const { time: storeTime } = await measureTime(() => Promise.all(storePromises));
  assert(storeTime < 1000, `Le stockage en masse doit prendre moins de 1s (actuel: ${storeTime.toFixed(2)}ms)`);
  
  // Test de récupération en masse
  const retrievePromises = [];
  for (let i = 0; i < keyCount; i++) {
    retrievePromises.push(storage.retrieveKey(`bulk-${i}`));
  }
  
  const { time: retrieveTime } = await measureTime(() => Promise.all(retrievePromises));
  assert(retrieveTime < 500, `La récupération en masse doit prendre moins de 500ms (actuel: ${retrieveTime.toFixed(2)}ms)`);
}

// ============================================================================
// TESTS DE RÉINITIALISATION
// ============================================================================

async function testReset(): Promise<void> {
  const storage = new SecureStorage();
  
  // Stocker quelques clés
  const key1 = await generateTestKey();
  const key2 = await generateTestKey();
  await storage.storeKey('reset1', key1);
  await storage.storeKey('reset2', key2);
  
  // Vérifier qu'elles existent
  const keysBefore = await storage.listKeys();
  assert(keysBefore.length >= 2, 'Des clés doivent être présentes avant reset');
  
  // Réinitialiser
  await storage.reset();
  
  // Vérifier que tout est supprimé
  const keysAfter = await storage.listKeys();
  assert(keysAfter.length === 0, 'Aucune clé ne doit être présente après reset');
  
  // Vérifier que la clé maître est aussi supprimée
  const masterKey = localStorage.getItem('liberchat_secure_master_key_v1');
  assert(masterKey === null, 'La clé maître doit être supprimée');
}

async function testResetAndRegenerate(): Promise<void> {
  const storage = new SecureStorage();
  
  // Stocker une clé
  const originalKey = await generateTestKey();
  await storage.storeKey('regen-test', originalKey);
  
  // Réinitialiser
  await storage.reset();
  
  // Stocker une nouvelle clé avec le même ID
  const newKey = await generateTestKey();
  await storage.storeKey('regen-test', newKey);
  
  // Vérifier que la nouvelle clé fonctionne
  const retrievedKey = await storage.retrieveKey('regen-test');
  assert(retrievedKey !== null, 'La nouvelle clé doit être récupérable');
  
  // Vérifier qu'une nouvelle clé maître a été générée
  const masterKey = localStorage.getItem('liberchat_secure_master_key_v1');
  assert(masterKey !== null, 'Une nouvelle clé maître doit être générée');
}

// Lancer les tests si ce fichier est exécuté directement
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { runTests };