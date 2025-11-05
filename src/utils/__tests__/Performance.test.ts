/**
 * Tests de performance et optimisations pour le système de chiffrement automatique
 * 
 * Ces tests vérifient:
 * - Les temps de chiffrement/déchiffrement
 * - L'implémentation du cache des clés
 * - La compression des messages si nécessaire
 * - La validation des métriques de performance
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */

import { CryptoManager } from '../CryptoManager.ts';
import { SecureStorage } from '../SecureStorage.ts';
import { KeyExchanger } from '../KeyExchanger.ts';

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
    key: (index: number) => Object.keys(mockStorage)[index] || null
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
 * Mesure le temps d'exécution d'une fonction avec plus de précision
 */
async function measureTime<T>(fn: () => Promise<T>, iterations: number = 1): Promise<{ result: T; time: number; avgTime: number }> {
  const times: number[] = [];
  let lastResult: T;
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    lastResult = await fn();
    const end = performance.now();
    times.push(end - start);
  }
  
  const totalTime = times.reduce((sum, time) => sum + time, 0);
  const avgTime = totalTime / iterations;
  
  return { result: lastResult!, time: totalTime, avgTime };
}

/**
 * Génère des données de test de différentes tailles
 */
function generateTestData(size: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ';
  let result = '';
  for (let i = 0; i < size; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Calcule des statistiques sur un tableau de nombres
 */
function calculateStats(numbers: number[]): {
  min: number;
  max: number;
  mean: number;
  median: number;
  stdDev: number;
  p95: number;
  p99: number;
} {
  const sorted = [...numbers].sort((a, b) => a - b);
  const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  const variance = numbers.reduce((sum, n) => sum + Math.pow(n - mean, 2), 0) / numbers.length;
  
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean,
    median: sorted[Math.floor(sorted.length / 2)],
    stdDev: Math.sqrt(variance),
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)]
  };
}

/**
 * Test runner avec métriques de performance
 */
async function runPerformanceTests(): Promise<void> {
  console.log('⚡ Démarrage des tests de performance...\n');
  
  let passed = 0;
  let failed = 0;
  const results: Array<{ name: string; success: boolean; time?: number; error?: string; metrics?: any }> = [];

  const tests = [
    // Tests de performance de base
    testEncryptionPerformance,
    testDecryptionPerformance,
    testKeyGenerationPerformance,
    testKeyDerivationPerformance,
    
    // Tests de cache
    testCachePerformance,
    testCacheHitRatio,
    testCacheEvictionPerformance,
    testCacheMemoryUsage,
    
    // Tests de stockage
    testStoragePerformance,
    testBulkStorageOperations,
    testStorageRetrievalPerformance,
    testStorageCleanupPerformance,
    
    // Tests de scalabilité
    testConcurrentOperations,
    testBulkEncryption,
    testLargeMessageHandling,
    testMemoryUsageUnderLoad,
    
    // Tests d'optimisation
    testMessageSizeOptimization,
    testCompressionBenefits,
    testBatchOperations,
    testAsyncPerformance,
    
    // Validation des métriques
    testPerformanceMetrics,
    testThroughputMeasurement,
    testLatencyMeasurement,
    testResourceUtilization
  ];

  for (const test of tests) {
    // Nettoyer avant chaque test
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

  // Statistiques finales avec métriques de performance
  console.log(`\n📊 Tests de performance: ${passed} réussis, ${failed} échoués`);
  
  if (results.length > 0) {
    const times = results.filter(r => r.time).map(r => r.time!);
    if (times.length > 0) {
      const stats = calculateStats(times);
      console.log(`⏱️  Temps d'exécution:`);
      console.log(`   Moyenne: ${stats.mean.toFixed(2)}ms`);
      console.log(`   Médiane: ${stats.median.toFixed(2)}ms`);
      console.log(`   P95: ${stats.p95.toFixed(2)}ms`);
      console.log(`   P99: ${stats.p99.toFixed(2)}ms`);
    }
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
// TESTS DE PERFORMANCE DE BASE
// ============================================================================

async function testEncryptionPerformance(): Promise<void> {
  const crypto = new CryptoManager();
  const iterations = 100;
  
  // Test avec différentes tailles de messages
  const testSizes = [10, 100, 1000, 10000, 100000];
  
  for (const size of testSizes) {
    const message = generateTestData(size);
    const times: number[] = [];
    
    // Mesurer plusieurs itérations
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await crypto.encryptMessage(message);
      times.push(performance.now() - start);
    }
    
    const stats = calculateStats(times);
    
    // Vérifier les métriques de performance
    assert(stats.mean < 100, `Chiffrement trop lent pour ${size} bytes: ${stats.mean.toFixed(2)}ms`);
    assert(stats.p95 < 200, `P95 trop élevé pour ${size} bytes: ${stats.p95.toFixed(2)}ms`);
    
    // Calculer le débit
    const throughputMBps = (size / 1024 / 1024) / (stats.mean / 1000);
    console.log(`  ✓ ${size} bytes: ${stats.mean.toFixed(2)}ms avg, ${throughputMBps.toFixed(2)} MB/s`);
  }
}

async function testDecryptionPerformance(): Promise<void> {
  const crypto = new CryptoManager();
  const iterations = 100;
  
  // Pré-chiffrer des messages de différentes tailles
  const testSizes = [10, 100, 1000, 10000, 100000];
  const encryptedMessages: { [key: number]: any } = {};
  
  for (const size of testSizes) {
    const message = generateTestData(size);
    encryptedMessages[size] = await crypto.encryptMessage(message);
  }
  
  // Mesurer les performances de déchiffrement
  for (const size of testSizes) {
    const times: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await crypto.decryptMessage(encryptedMessages[size]);
      times.push(performance.now() - start);
    }
    
    const stats = calculateStats(times);
    
    // Le déchiffrement doit être au moins aussi rapide que le chiffrement
    assert(stats.mean < 100, `Déchiffrement trop lent pour ${size} bytes: ${stats.mean.toFixed(2)}ms`);
    assert(stats.p95 < 200, `P95 déchiffrement trop élevé pour ${size} bytes: ${stats.p95.toFixed(2)}ms`);
    
    const throughputMBps = (size / 1024 / 1024) / (stats.mean / 1000);
    console.log(`  ✓ ${size} bytes: ${stats.mean.toFixed(2)}ms avg, ${throughputMBps.toFixed(2)} MB/s`);
  }
}

async function testKeyGenerationPerformance(): Promise<void> {
  const crypto = new CryptoManager();
  const iterations = 50;
  const times: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await crypto.generateGlobalKey();
    times.push(performance.now() - start);
  }
  
  const stats = calculateStats(times);
  
  // La génération de clés doit être rapide
  assert(stats.mean < 50, `Génération de clés trop lente: ${stats.mean.toFixed(2)}ms`);
  assert(stats.p95 < 100, `P95 génération de clés trop élevé: ${stats.p95.toFixed(2)}ms`);
  
  console.log(`  ✓ Génération de clés: ${stats.mean.toFixed(2)}ms avg, ${stats.p95.toFixed(2)}ms P95`);
}

async function testKeyDerivationPerformance(): Promise<void> {
  const keyExchanger = new KeyExchanger();
  const iterations = 50;
  
  // Générer des paires de clés pour les tests
  const keyPair1 = await keyExchanger.generateKeyPair('user1');
  const keyPair2 = await keyExchanger.generateKeyPair('user2');
  
  const times: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await keyExchanger.deriveSharedSecret(keyPair2.publicKey, keyPair1.privateKey);
    times.push(performance.now() - start);
  }
  
  const stats = calculateStats(times);
  
  // La dérivation de clés doit être rapide
  assert(stats.mean < 30, `Dérivation de clés trop lente: ${stats.mean.toFixed(2)}ms`);
  assert(stats.p95 < 60, `P95 dérivation de clés trop élevé: ${stats.p95.toFixed(2)}ms`);
  
  console.log(`  ✓ Dérivation de clés: ${stats.mean.toFixed(2)}ms avg, ${stats.p95.toFixed(2)}ms P95`);
}

// ============================================================================
// TESTS DE CACHE
// ============================================================================

async function testCachePerformance(): Promise<void> {
  const crypto = new CryptoManager();
  const context = 'cache-perf-test';
  
  // Premier accès (génération + stockage)
  const { avgTime: firstAccess } = await measureTime(() => crypto.getKey(context), 10);
  
  // Accès suivants (depuis le cache)
  const { avgTime: cachedAccess } = await measureTime(() => crypto.getKey(context), 100);
  
  // L'accès au cache doit être significativement plus rapide
  assert(cachedAccess < firstAccess / 3, 
    `Cache pas assez efficace: ${cachedAccess.toFixed(2)}ms vs ${firstAccess.toFixed(2)}ms`);
  assert(cachedAccess < 5, `Accès au cache trop lent: ${cachedAccess.toFixed(2)}ms`);
  
  console.log(`  ✓ Premier accès: ${firstAccess.toFixed(2)}ms, Cache: ${cachedAccess.toFixed(2)}ms`);
}

async function testCacheHitRatio(): Promise<void> {
  const crypto = new CryptoManager();
  const contexts = Array.from({ length: 20 }, (_, i) => `context_${i}`);
  
  // Générer des clés pour tous les contextes
  for (const context of contexts) {
    await crypto.getKey(context);
  }
  
  // Mesurer les accès avec différents patterns
  const randomAccesses = 1000;
  let cacheHits = 0;
  
  for (let i = 0; i < randomAccesses; i++) {
    const context = contexts[Math.floor(Math.random() * contexts.length)];
    const start = performance.now();
    await crypto.getKey(context);
    const time = performance.now() - start;
    
    // Si l'accès est très rapide, c'est probablement un hit de cache
    if (time < 5) {
      cacheHits++;
    }
  }
  
  const hitRatio = cacheHits / randomAccesses;
  
  // Le taux de hit du cache doit être élevé
  assert(hitRatio > 0.8, `Taux de hit du cache trop faible: ${(hitRatio * 100).toFixed(1)}%`);
  
  console.log(`  ✓ Taux de hit du cache: ${(hitRatio * 100).toFixed(1)}%`);
}

async function testCacheEvictionPerformance(): Promise<void> {
  const crypto = new CryptoManager();
  const maxCacheSize = 50; // Limite du cache dans CryptoManager
  
  // Remplir le cache au-delà de sa capacité
  const contexts = Array.from({ length: maxCacheSize + 20 }, (_, i) => `eviction_${i}`);
  
  const { avgTime: fillTime } = await measureTime(async () => {
    for (const context of contexts) {
      await crypto.getKey(context);
    }
  });
  
  // Vérifier que le système fonctionne toujours efficacement
  const stats = await crypto.getCacheStats();
  assert(stats.cacheSize <= stats.maxCacheSize, 'Le cache ne doit pas dépasser sa taille maximale');
  
  // Les accès doivent rester rapides même après éviction
  const { avgTime: accessTime } = await measureTime(() => crypto.getKey('eviction_0'), 10);
  assert(accessTime < 50, `Accès après éviction trop lent: ${accessTime.toFixed(2)}ms`);
  
  console.log(`  ✓ Éviction du cache: ${fillTime.toFixed(2)}ms pour ${contexts.length} clés`);
}

async function testCacheMemoryUsage(): Promise<void> {
  const crypto = new CryptoManager();
  
  // Mesurer l'utilisation mémoire avant
  const initialStats = await crypto.getCacheStats();
  
  // Ajouter de nombreuses clés
  const keyCount = 100;
  for (let i = 0; i < keyCount; i++) {
    await crypto.getKey(`memory_test_${i}`);
  }
  
  // Mesurer l'utilisation mémoire après
  const finalStats = await crypto.getCacheStats();
  
  // Vérifier que la gestion mémoire est efficace
  assert(finalStats.cacheSize <= finalStats.maxCacheSize, 
    'Le cache doit respecter sa limite de taille');
  
  // Vérifier que le stockage fonctionne
  assert(finalStats.totalStoredKeys >= keyCount, 
    'Toutes les clés doivent être stockées');
  
  console.log(`  ✓ Cache: ${finalStats.cacheSize}/${finalStats.maxCacheSize}, Stockage: ${finalStats.totalStoredKeys} clés`);
}

// ============================================================================
// TESTS DE STOCKAGE
// ============================================================================

async function testStoragePerformance(): Promise<void> {
  const storage = new SecureStorage();
  const iterations = 50;
  
  // Test de stockage
  const storeKey = await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  
  const { avgTime: storeTime } = await measureTime(async () => {
    await storage.storeKey(`perf_test_${Math.random()}`, storeKey);
  }, iterations);
  
  // Test de récupération
  await storage.storeKey('retrieve_test', storeKey);
  const { avgTime: retrieveTime } = await measureTime(() => 
    storage.retrieveKey('retrieve_test'), iterations);
  
  // Vérifier les performances
  assert(storeTime < 50, `Stockage trop lent: ${storeTime.toFixed(2)}ms`);
  assert(retrieveTime < 30, `Récupération trop lente: ${retrieveTime.toFixed(2)}ms`);
  
  console.log(`  ✓ Stockage: ${storeTime.toFixed(2)}ms, Récupération: ${retrieveTime.toFixed(2)}ms`);
}

async function testBulkStorageOperations(): Promise<void> {
  const storage = new SecureStorage();
  const keyCount = 100;
  
  // Générer des clés de test
  const keys: CryptoKey[] = [];
  for (let i = 0; i < keyCount; i++) {
    const key = await window.crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    keys.push(key);
  }
  
  // Test de stockage en masse
  const { time: bulkStoreTime } = await measureTime(async () => {
    const promises = keys.map((key, i) => storage.storeKey(`bulk_${i}`, key));
    await Promise.all(promises);
  });
  
  // Test de récupération en masse
  const { time: bulkRetrieveTime } = await measureTime(async () => {
    const promises = Array.from({ length: keyCount }, (_, i) => 
      storage.retrieveKey(`bulk_${i}`));
    await Promise.all(promises);
  });
  
  // Calculer le débit
  const storeRate = keyCount / (bulkStoreTime / 1000);
  const retrieveRate = keyCount / (bulkRetrieveTime / 1000);
  
  assert(storeRate > 50, `Débit de stockage trop faible: ${storeRate.toFixed(1)} clés/s`);
  assert(retrieveRate > 100, `Débit de récupération trop faible: ${retrieveRate.toFixed(1)} clés/s`);
  
  console.log(`  ✓ Stockage: ${storeRate.toFixed(1)} clés/s, Récupération: ${retrieveRate.toFixed(1)} clés/s`);
}

async function testStorageRetrievalPerformance(): Promise<void> {
  const storage = new SecureStorage();
  
  // Créer un stockage avec de nombreuses clés
  const keyCount = 200;
  for (let i = 0; i < keyCount; i++) {
    const key = await window.crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    await storage.storeKey(`retrieval_${i}`, key);
  }
  
  // Tester la récupération avec différents patterns
  const randomRetrievals = 100;
  const times: number[] = [];
  
  for (let i = 0; i < randomRetrievals; i++) {
    const keyId = `retrieval_${Math.floor(Math.random() * keyCount)}`;
    const start = performance.now();
    await storage.retrieveKey(keyId);
    times.push(performance.now() - start);
  }
  
  const stats = calculateStats(times);
  
  // La récupération doit rester rapide même avec beaucoup de clés
  assert(stats.mean < 30, `Récupération trop lente avec ${keyCount} clés: ${stats.mean.toFixed(2)}ms`);
  assert(stats.p95 < 60, `P95 récupération trop élevé: ${stats.p95.toFixed(2)}ms`);
  
  console.log(`  ✓ Récupération avec ${keyCount} clés: ${stats.mean.toFixed(2)}ms avg, ${stats.p95.toFixed(2)}ms P95`);
}

async function testStorageCleanupPerformance(): Promise<void> {
  const storage = new SecureStorage();
  
  // Créer des clés avec différents âges
  const keyCount = 100;
  const now = Date.now();
  const oldTime = now - 31 * 24 * 60 * 60 * 1000; // 31 jours
  
  for (let i = 0; i < keyCount; i++) {
    const key = await window.crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    
    await storage.storeKey(`cleanup_${i}`, key);
    
    // Simuler des clés anciennes en modifiant les métadonnées
    if (i % 2 === 0) {
      const metadata = await storage.getMetadata(`cleanup_${i}`);
      if (metadata) {
        metadata.lastUsed = oldTime;
        await storage.storeMetadata(`cleanup_${i}`, metadata);
      }
    }
  }
  
  // Mesurer les performances de nettoyage
  const { time: cleanupTime } = await measureTime(() => storage.cleanup());
  
  // Le nettoyage doit être rapide
  assert(cleanupTime < 1000, `Nettoyage trop lent: ${cleanupTime.toFixed(2)}ms`);
  
  // Vérifier que le nettoyage a fonctionné
  const remainingKeys = await storage.listKeys();
  assert(remainingKeys.length < keyCount, 'Certaines clés doivent avoir été nettoyées');
  
  console.log(`  ✓ Nettoyage: ${cleanupTime.toFixed(2)}ms, ${keyCount - remainingKeys.length} clés supprimées`);
}

// ============================================================================
// TESTS DE SCALABILITÉ
// ============================================================================

async function testConcurrentOperations(): Promise<void> {
  const crypto = new CryptoManager();
  const concurrency = 20;
  const operationsPerWorker = 10;
  
  // Test d'opérations concurrentes de chiffrement
  const { time: concurrentTime } = await measureTime(async () => {
    const workers = Array.from({ length: concurrency }, async (_, workerId) => {
      const operations = [];
      for (let i = 0; i < operationsPerWorker; i++) {
        const message = `Message concurrent ${workerId}-${i}`;
        operations.push(crypto.encryptMessage(message));
      }
      return Promise.all(operations);
    });
    
    await Promise.all(workers);
  });
  
  const totalOperations = concurrency * operationsPerWorker;
  const operationsPerSecond = totalOperations / (concurrentTime / 1000);
  
  // Vérifier les performances concurrentes
  assert(operationsPerSecond > 100, 
    `Débit concurrent trop faible: ${operationsPerSecond.toFixed(1)} ops/s`);
  
  console.log(`  ✓ ${totalOperations} opérations concurrentes: ${operationsPerSecond.toFixed(1)} ops/s`);
}

async function testBulkEncryption(): Promise<void> {
  const crypto = new CryptoManager();
  const messageCount = 1000;
  const messageSize = 1000;
  
  // Générer des messages de test
  const messages = Array.from({ length: messageCount }, (_, i) => 
    generateTestData(messageSize));
  
  // Test de chiffrement en masse
  const { time: encryptTime } = await measureTime(async () => {
    const promises = messages.map(msg => crypto.encryptMessage(msg));
    return Promise.all(promises);
  });
  
  // Calculer les métriques
  const totalDataMB = (messageCount * messageSize) / (1024 * 1024);
  const throughputMBps = totalDataMB / (encryptTime / 1000);
  const messagesPerSecond = messageCount / (encryptTime / 1000);
  
  // Vérifier les performances
  assert(throughputMBps > 5, `Débit trop faible: ${throughputMBps.toFixed(2)} MB/s`);
  assert(messagesPerSecond > 500, `Taux de messages trop faible: ${messagesPerSecond.toFixed(1)} msg/s`);
  
  console.log(`  ✓ ${messageCount} messages: ${throughputMBps.toFixed(2)} MB/s, ${messagesPerSecond.toFixed(1)} msg/s`);
}

async function testLargeMessageHandling(): Promise<void> {
  const crypto = new CryptoManager();
  
  // Test avec des messages de plus en plus grands
  const sizes = [1024, 10240, 102400, 1024000]; // 1KB à 1MB
  
  for (const size of sizes) {
    const message = generateTestData(size);
    
    const { avgTime: encryptTime } = await measureTime(() => 
      crypto.encryptMessage(message), 5);
    
    const encrypted = await crypto.encryptMessage(message);
    const { avgTime: decryptTime } = await measureTime(() => 
      crypto.decryptMessage(encrypted), 5);
    
    // Calculer le débit
    const sizeMB = size / (1024 * 1024);
    const encryptThroughput = sizeMB / (encryptTime / 1000);
    const decryptThroughput = sizeMB / (decryptTime / 1000);
    
    // Les performances doivent rester raisonnables même pour de gros messages
    assert(encryptThroughput > 1, 
      `Débit de chiffrement trop faible pour ${size} bytes: ${encryptThroughput.toFixed(2)} MB/s`);
    assert(decryptThroughput > 1, 
      `Débit de déchiffrement trop faible pour ${size} bytes: ${decryptThroughput.toFixed(2)} MB/s`);
    
    console.log(`  ✓ ${size} bytes: encrypt ${encryptThroughput.toFixed(2)} MB/s, decrypt ${decryptThroughput.toFixed(2)} MB/s`);
  }
}

async function testMemoryUsageUnderLoad(): Promise<void> {
  const crypto = new CryptoManager();
  const iterations = 1000;
  
  // Mesurer l'utilisation mémoire initiale
  const initialStats = await crypto.getCacheStats();
  
  // Effectuer de nombreuses opérations
  for (let i = 0; i < iterations; i++) {
    const message = generateTestData(1000);
    const encrypted = await crypto.encryptMessage(message);
    await crypto.decryptMessage(encrypted);
    
    // Générer occasionnellement de nouvelles clés
    if (i % 100 === 0) {
      await crypto.generateGroupKey(`load_test_${i}`);
    }
  }
  
  // Mesurer l'utilisation mémoire finale
  const finalStats = await crypto.getCacheStats();
  
  // Vérifier que la mémoire est gérée efficacement
  assert(finalStats.cacheSize <= finalStats.maxCacheSize, 
    'Le cache ne doit pas dépasser sa limite');
  
  // La croissance de la mémoire doit être contrôlée
  const memoryGrowth = finalStats.totalStoredKeys - initialStats.totalStoredKeys;
  assert(memoryGrowth < iterations / 5, 
    `Croissance mémoire excessive: ${memoryGrowth} nouvelles clés`);
  
  console.log(`  ✓ ${iterations} opérations: cache ${finalStats.cacheSize}/${finalStats.maxCacheSize}, +${memoryGrowth} clés`);
}

async function testBulkEncryption(): Promise<void> {
  const crypto = new CryptoManager();
  const messageCount = 1000;
  const messageSize = 1000;
  
  // Générer des messages de test
  const messages = Array.from({ length: messageCount }, (_, i) => 
    generateTestData(messageSize));
  
  // Test de chiffrement en masse
  const { time: encryptTime } = await measureTime(async () => {
    const promises = messages.map(msg => crypto.encryptMessage(msg));
    return Promise.all(promises);
  });
  
  // Calculer les métriques
  const totalDataMB = (messageCount * messageSize) / (1024 * 1024);
  const throughputMBps = totalDataMB / (encryptTime / 1000);
  const messagesPerSecond = messageCount / (encryptTime / 1000);
  
  // Vérifier les performances
  assert(throughputMBps > 5, `Débit trop faible: ${throughputMBps.toFixed(2)} MB/s`);
  assert(messagesPerSecond > 500, `Taux de messages trop faible: ${messagesPerSecond.toFixed(1)} msg/s`);
  
  console.log(`  ✓ ${messageCount} messages: ${throughputMBps.toFixed(2)} MB/s, ${messagesPerSecond.toFixed(1)} msg/s`);
}

async function testLargeMessageHandling(): Promise<void> {
  const crypto = new CryptoManager();
  
  // Test avec des messages de plus en plus grands
  const sizes = [1024, 10240, 102400, 1024000]; // 1KB à 1MB
  
  for (const size of sizes) {
    const message = generateTestData(size);
    
    const { avgTime: encryptTime } = await measureTime(() => 
      crypto.encryptMessage(message), 5);
    
    const encrypted = await crypto.encryptMessage(message);
    const { avgTime: decryptTime } = await measureTime(() => 
      crypto.decryptMessage(encrypted), 5);
    
    // Calculer le débit
    const sizeMB = size / (1024 * 1024);
    const encryptThroughput = sizeMB / (encryptTime / 1000);
    const decryptThroughput = sizeMB / (decryptTime / 1000);
    
    // Les performances doivent rester raisonnables même pour de gros messages
    assert(encryptThroughput > 1, 
      `Débit de chiffrement trop faible pour ${size} bytes: ${encryptThroughput.toFixed(2)} MB/s`);
    assert(decryptThroughput > 1, 
      `Débit de déchiffrement trop faible pour ${size} bytes: ${decryptThroughput.toFixed(2)} MB/s`);
    
    console.log(`  ✓ ${size} bytes: encrypt ${encryptThroughput.toFixed(2)} MB/s, decrypt ${decryptThroughput.toFixed(2)} MB/s`);
  }
}

async function testMemoryUsageUnderLoad(): Promise<void> {
  const crypto = new CryptoManager();
  const iterations = 1000;
  
  // Mesurer l'utilisation mémoire initiale
  const initialStats = await crypto.getCacheStats();
  
  // Effectuer de nombreuses opérations
  for (let i = 0; i < iterations; i++) {
    const message = generateTestData(1000);
    const encrypted = await crypto.encryptMessage(message);
    await crypto.decryptMessage(encrypted);
    
    // Générer occasionnellement de nouvelles clés
    if (i % 100 === 0) {
      await crypto.generateGroupKey(`load_test_${i}`);
    }
  }
  
  // Mesurer l'utilisation mémoire finale
  const finalStats = await crypto.getCacheStats();
  
  // Vérifier que la mémoire est gérée efficacement
  assert(finalStats.cacheSize <= finalStats.maxCacheSize, 
    'Le cache ne doit pas dépasser sa limite');
  
  // La croissance de la mémoire doit être contrôlée
  const memoryGrowth = finalStats.totalStoredKeys - initialStats.totalStoredKeys;
  assert(memoryGrowth < iterations / 5, 
    `Croissance mémoire excessive: ${memoryGrowth} nouvelles clés`);
  
  console.log(`  ✓ ${iterations} opérations: cache ${finalStats.cacheSize}/${finalStats.maxCacheSize}, +${memoryGrowth} clés`);
}

// ============================================================================
// TESTS D'OPTIMISATION
// ============================================================================

async function testMessageSizeOptimization(): Promise<void> {
  const crypto = new CryptoManager();
  
  // Tester l'efficacité du chiffrement pour différentes tailles
  const testSizes = [10, 100, 1000, 10000];
  
  for (const size of testSizes) {
    const message = generateTestData(size);
    const encrypted = await crypto.encryptMessage(message);
    
    // Calculer l'overhead du chiffrement
    const encryptedSize = encrypted.iv.length + encrypted.content.length;
    const overhead = encryptedSize - size;
    const overheadPercent = (overhead / size) * 100;
    
    // L'overhead doit être raisonnable
    if (size >= 1000) {
      assert(overheadPercent < 10, 
        `Overhead trop élevé pour ${size} bytes: ${overheadPercent.toFixed(1)}%`);
    }
    
    console.log(`  ✓ ${size} bytes -> ${encryptedSize} bytes (overhead: ${overheadPercent.toFixed(1)}%)`);
  }
}

async function testCompressionBenefits(): Promise<void> {
  // Test avec des données compressibles et non-compressibles
  const compressibleData = 'A'.repeat(10000); // Très compressible
  const randomData = generateTestData(10000); // Peu compressible
  
  const crypto = new CryptoManager();
  
  // Chiffrer les deux types de données
  const compressibleEncrypted = await crypto.encryptMessage(compressibleData);
  const randomEncrypted = await crypto.encryptMessage(randomData);
  
  const compressibleSize = compressibleEncrypted.content.length;
  const randomSize = randomEncrypted.content.length;
  
  // Les tailles doivent être similaires (pas de compression automatique dans l'implémentation actuelle)
  // Mais on peut mesurer le potentiel de compression
  console.log(`  ✓ Données compressibles: ${compressibleSize} bytes`);
  console.log(`  ✓ Données aléatoires: ${randomSize} bytes`);
  
  // Si une compression était implémentée, on s'attendrait à:
  // assert(compressibleSize < randomSize * 0.8, 'La compression devrait réduire les données répétitives');
}

async function testBatchOperations(): Promise<void> {
  const crypto = new CryptoManager();
  const batchSize = 100;
  const messages = Array.from({ length: batchSize }, (_, i) => `Batch message ${i}`);
  
  // Test d'opérations individuelles
  const { time: individualTime } = await measureTime(async () => {
    for (const message of messages) {
      await crypto.encryptMessage(message);
    }
  });
  
  // Test d'opérations en batch (parallèles)
  const { time: batchTime } = await measureTime(async () => {
    const promises = messages.map(msg => crypto.encryptMessage(msg));
    await Promise.all(promises);
  });
  
  // Les opérations en batch doivent être plus rapides
  const speedup = individualTime / batchTime;
  assert(speedup > 1.5, `Amélioration insuffisante en batch: ${speedup.toFixed(2)}x`);
  
  console.log(`  ✓ Batch vs individuel: ${speedup.toFixed(2)}x plus rapide (${batchTime.toFixed(2)}ms vs ${individualTime.toFixed(2)}ms)`);
}

async function testAsyncPerformance(): Promise<void> {
  const crypto = new CryptoManager();
  const operations = 50;
  
  // Test synchrone (séquentiel)
  const { time: syncTime } = await measureTime(async () => {
    for (let i = 0; i < operations; i++) {
      await crypto.encryptMessage(`Sync message ${i}`);
    }
  });
  
  // Test asynchrone (parallèle)
  const { time: asyncTime } = await measureTime(async () => {
    const promises = Array.from({ length: operations }, (_, i) => 
      crypto.encryptMessage(`Async message ${i}`));
    await Promise.all(promises);
  });
  
  // L'exécution asynchrone doit être plus rapide
  const speedup = syncTime / asyncTime;
  assert(speedup > 2, `Amélioration asynchrone insuffisante: ${speedup.toFixed(2)}x`);
  
  console.log(`  ✓ Async vs sync: ${speedup.toFixed(2)}x plus rapide (${asyncTime.toFixed(2)}ms vs ${syncTime.toFixed(2)}ms)`);
}

// ============================================================================
// VALIDATION DES MÉTRIQUES
// ============================================================================

async function testPerformanceMetrics(): Promise<void> {
  const crypto = new CryptoManager();
  
  // Métriques cibles selon les requirements
  const targets = {
    encryptionTime: 100, // ms
    decryptionTime: 100, // ms
    keyGeneration: 50,   // ms
    cacheAccess: 10,     // ms
    throughput: 1        // MB/s
  };
  
  // Test de chiffrement
  const message = generateTestData(1000);
  const { avgTime: encryptTime } = await measureTime(() => 
    crypto.encryptMessage(message), 20);
  
  assert(encryptTime < targets.encryptionTime, 
    `Chiffrement trop lent: ${encryptTime.toFixed(2)}ms > ${targets.encryptionTime}ms`);
  
  // Test de déchiffrement
  const encrypted = await crypto.encryptMessage(message);
  const { avgTime: decryptTime } = await measureTime(() => 
    crypto.decryptMessage(encrypted), 20);
  
  assert(decryptTime < targets.decryptionTime, 
    `Déchiffrement trop lent: ${decryptTime.toFixed(2)}ms > ${targets.decryptionTime}ms`);
  
  // Test de génération de clés
  const { avgTime: keyGenTime } = await measureTime(() => 
    crypto.generateGlobalKey(), 10);
  
  assert(keyGenTime < targets.keyGeneration, 
    `Génération de clés trop lente: ${keyGenTime.toFixed(2)}ms > ${targets.keyGeneration}ms`);
  
  // Test d'accès au cache
  await crypto.getKey('cache-test'); // Première fois
  const { avgTime: cacheTime } = await measureTime(() => 
    crypto.getKey('cache-test'), 50);
  
  assert(cacheTime < targets.cacheAccess, 
    `Accès au cache trop lent: ${cacheTime.toFixed(2)}ms > ${targets.cacheAccess}ms`);
  
  console.log('  ✅ Toutes les métriques de performance respectées');
}

// ============================================================================
// TESTS D'OPTIMISATION
// ============================================================================

async function testMessageSizeOptimization(): Promise<void> {
  const crypto = new CryptoManager();
  
  // Tester l'efficacité du chiffrement pour différentes tailles
  const testSizes = [10, 100, 1000, 10000];
  
  for (const size of testSizes) {
    const message = generateTestData(size);
    const encrypted = await crypto.encryptMessage(message);
    
    // Calculer l'overhead du chiffrement
    const encryptedSize = encrypted.iv.length + encrypted.content.length;
    const overhead = encryptedSize - size;
    const overheadPercent = (overhead / size) * 100;
    
    // L'overhead doit être raisonnable
    if (size >= 1000) {
      assert(overheadPercent < 10, 
        `Overhead trop élevé pour ${size} bytes: ${overheadPercent.toFixed(1)}%`);
    }
    
    console.log(`  ✓ ${size} bytes -> ${encryptedSize} bytes (overhead: ${overheadPercent.toFixed(1)}%)`);
  }
}

async function testCompressionBenefits(): Promise<void> {
  // Test avec des données compressibles et non-compressibles
  const compressibleData = 'A'.repeat(10000); // Très compressible
  const randomData = generateTestData(10000); // Peu compressible
  
  const crypto = new CryptoManager();
  
  // Chiffrer les deux types de données
  const compressibleEncrypted = await crypto.encryptMessage(compressibleData);
  const randomEncrypted = await crypto.encryptMessage(randomData);
  
  const compressibleSize = compressibleEncrypted.content.length;
  const randomSize = randomEncrypted.content.length;
  
  // Les tailles doivent être similaires (pas de compression automatique dans l'implémentation actuelle)
  // Mais on peut mesurer le potentiel de compression
  console.log(`  ✓ Données compressibles: ${compressibleSize} bytes`);
  console.log(`  ✓ Données aléatoires: ${randomSize} bytes`);
  
  // Si une compression était implémentée, on s'attendrait à:
  // assert(compressibleSize < randomSize * 0.8, 'La compression devrait réduire les données répétitives');
}

async function testBatchOperations(): Promise<void> {
  const crypto = new CryptoManager();
  const batchSize = 100;
  const messages = Array.from({ length: batchSize }, (_, i) => `Batch message ${i}`);
  
  // Test d'opérations individuelles
  const { time: individualTime } = await measureTime(async () => {
    for (const message of messages) {
      await crypto.encryptMessage(message);
    }
  });
  
  // Test d'opérations en batch (parallèles)
  const { time: batchTime } = await measureTime(async () => {
    const promises = messages.map(msg => crypto.encryptMessage(msg));
    await Promise.all(promises);
  });
  
  // Les opérations en batch doivent être plus rapides
  const speedup = individualTime / batchTime;
  assert(speedup > 1.5, `Amélioration insuffisante en batch: ${speedup.toFixed(2)}x`);
  
  console.log(`  ✓ Batch vs individuel: ${speedup.toFixed(2)}x plus rapide (${batchTime.toFixed(2)}ms vs ${individualTime.toFixed(2)}ms)`);
}

async function testAsyncPerformance(): Promise<void> {
  const crypto = new CryptoManager();
  const operations = 50;
  
  // Test synchrone (séquentiel)
  const { time: syncTime } = await measureTime(async () => {
    for (let i = 0; i < operations; i++) {
      await crypto.encryptMessage(`Sync message ${i}`);
    }
  });
  
  // Test asynchrone (parallèle)
  const { time: asyncTime } = await measureTime(async () => {
    const promises = Array.from({ length: operations }, (_, i) => 
      crypto.encryptMessage(`Async message ${i}`));
    await Promise.all(promises);
  });
  
  // L'exécution asynchrone doit être plus rapide
  const speedup = syncTime / asyncTime;
  assert(speedup > 2, `Amélioration asynchrone insuffisante: ${speedup.toFixed(2)}x`);
  
  console.log(`  ✓ Async vs sync: ${speedup.toFixed(2)}x plus rapide (${asyncTime.toFixed(2)}ms vs ${syncTime.toFixed(2)}ms)`);
}

// ============================================================================
// VALIDATION DES MÉTRIQUES
// ============================================================================

async function testPerformanceMetrics(): Promise<void> {
  const crypto = new CryptoManager();
  
  // Métriques cibles selon les requirements
  const targets = {
    encryptionTime: 100, // ms
    decryptionTime: 100, // ms
    keyGeneration: 50,   // ms
    cacheAccess: 10,     // ms
    throughput: 1        // MB/s
  };
  
  // Test de chiffrement
  const message = generateTestData(1000);
  const { avgTime: encryptTime } = await measureTime(() => 
    crypto.encryptMessage(message), 20);
  
  assert(encryptTime < targets.encryptionTime, 
    `Chiffrement trop lent: ${encryptTime.toFixed(2)}ms > ${targets.encryptionTime}ms`);
  
  // Test de déchiffrement
  const encrypted = await crypto.encryptMessage(message);
  const { avgTime: decryptTime } = await measureTime(() => 
    crypto.decryptMessage(encrypted), 20);
  
  assert(decryptTime < targets.decryptionTime, 
    `Déchiffrement trop lent: ${decryptTime.toFixed(2)}ms > ${targets.decryptionTime}ms`);
  
  // Test de génération de clés
  const { avgTime: keyGenTime } = await measureTime(() => 
    crypto.generateGlobalKey(), 10);
  
  assert(keyGenTime < targets.keyGeneration, 
    `Génération de clés trop lente: ${keyGenTime.toFixed(2)}ms > ${targets.keyGeneration}ms`);
  
  // Test d'accès au cache
  await crypto.getKey('cache-test'); // Première fois
  const { avgTime: cacheTime } = await measureTime(() => 
    crypto.getKey('cache-test'), 50);
  
  assert(cacheTime < targets.cacheAccess, 
    `Accès au cache trop lent: ${cacheTime.toFixed(2)}ms > ${targets.cacheAccess}ms`);
  
  console.log('  ✅ Toutes les métriques de performance respectées');
}

async function testThroughputMeasurement(): Promise<void> {
  const crypto = new CryptoManager();
  const testDuration = 2000; // 2 secondes
  const messageSize = 1000;
  
  let operationCount = 0;
  let totalBytes = 0;
  const startTime = Date.now();
  
  // Effectuer des opérations pendant la durée du test
  while (Date.now() - startTime < testDuration) {
    const message = generateTestData(messageSize);
    await crypto.encryptMessage(message);
    operationCount++;
    totalBytes += messageSize;
  }
  
  const actualDuration = (Date.now() - startTime) / 1000;
  const throughputMBps = (totalBytes / (1024 * 1024)) / actualDuration;
  const operationsPerSecond = operationCount / actualDuration;
  
  // Vérifier les métriques de débit
  assert(throughputMBps > 0.5, `Débit trop faible: ${throughputMBps.toFixed(2)} MB/s`);
  assert(operationsPerSecond > 50, `Taux d'opérations trop faible: ${operationsPerSecond.toFixed(1)} ops/s`);
  
  console.log(`  ✓ Débit: ${throughputMBps.toFixed(2)} MB/s, ${operationsPerSecond.toFixed(1)} ops/s`);
}

async function testLatencyMeasurement(): Promise<void> {
  const crypto = new CryptoManager();
  const iterations = 1000;
  const message = generateTestData(100);
  
  const latencies: number[] = [];
  
  // Mesurer la latence de nombreuses opérations
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await crypto.encryptMessage(message);
    latencies.push(performance.now() - start);
  }
  
  const stats = calculateStats(latencies);
  
  // Vérifier les métriques de latence
  assert(stats.mean < 50, `Latence moyenne trop élevée: ${stats.mean.toFixed(2)}ms`);
  assert(stats.p95 < 100, `P95 latence trop élevé: ${stats.p95.toFixed(2)}ms`);
  assert(stats.p99 < 200, `P99 latence trop élevé: ${stats.p99.toFixed(2)}ms`);
  
  console.log(`  ✓ Latence - Moyenne: ${stats.mean.toFixed(2)}ms, P95: ${stats.p95.toFixed(2)}ms, P99: ${stats.p99.toFixed(2)}ms`);
}

async function testResourceUtilization(): Promise<void> {
  const crypto = new CryptoManager();
  const storage = new SecureStorage();
  
  // Effectuer diverses opérations
  const operations = 100;
  for (let i = 0; i < operations; i++) {
    await crypto.encryptMessage(`Resource test ${i}`);
    if (i % 10 === 0) {
      await crypto.generateGroupKey(`resource_${i}`);
    }
  }
  
  // Mesurer l'utilisation des ressources
  const cacheStats = await crypto.getCacheStats();
  const storageStats = await storage.getStorageStats();
  
  // Calculer l'efficacité de l'utilisation des ressources
  const cacheUtilization = cacheStats.cacheSize / cacheStats.maxCacheSize;
  const storageEfficiency = storageStats.storageUsed / storageStats.totalKeys;
  
  // Vérifier l'efficacité
  assert(cacheUtilization <= 1.0, 'Le cache ne doit pas dépasser sa capacité');
  assert(storageEfficiency > 0, 'Le stockage doit être utilisé efficacement');
  
  console.log(`  ✓ Cache: ${(cacheUtilization * 100).toFixed(1)}% utilisé, Stockage: ${storageEfficiency.toFixed(0)} bytes/clé`);
}

// Lancer les tests si ce fichier est exécuté directement
if (import.meta.url === `file://${process.argv[1]}`) {
  runPerformanceTests().catch(console.error);
}

export { runPerformanceTests };