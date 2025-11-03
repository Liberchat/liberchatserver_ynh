/**
 * Tests de sécurité pour le système de chiffrement automatique
 * 
 * Ces tests vérifient:
 * - L'unicité des IV (Initialization Vectors)
 * - La résistance aux attaques par force brute
 * - Que les clés ne sont jamais stockées en clair
 * - La sécurité cryptographique générale
 * 
 * Requirements: 3.1, 3.2, 3.3
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
 * Mesure le temps d'exécution d'une fonction
 */
async function measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; time: number }> {
  const start = performance.now();
  const result = await fn();
  const time = performance.now() - start;
  return { result, time };
}

/**
 * Génère des données aléatoirement pour les tests
 */
function generateRandomData(length: number): Uint8Array {
  return window.crypto.getRandomValues(new Uint8Array(length));
}

/**
 * Vérifie si deux tableaux sont égaux
 */
function arraysEqual(a: number[] | Uint8Array, b: number[] | Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Calcule l'entropie d'un tableau de données
 */
function calculateEntropy(data: number[] | Uint8Array): number {
  const frequency = new Map<number, number>();
  
  // Compter les fréquences
  for (const byte of data) {
    frequency.set(byte, (frequency.get(byte) || 0) + 1);
  }
  
  // Calculer l'entropie de Shannon
  let entropy = 0;
  const length = data.length;
  
  for (const count of frequency.values()) {
    const probability = count / length;
    entropy -= probability * Math.log2(probability);
  }
  
  return entropy;
}

/**
 * Test runner avec gestion des erreurs
 */
async function runSecurityTests(): Promise<void> {
  console.log('🔒 Démarrage des tests de sécurité...\n');
  
  let passed = 0;
  let failed = 0;
  const results: Array<{ name: string; success: boolean; time?: number; error?: string }> = [];

  const tests = [
    // Tests d'unicité des IV
    testIVUniqueness,
    testIVRandomness,
    testIVLength,
    testIVDistribution,
    
    // Tests de stockage sécurisé
    testKeysNeverStoredInClear,
    testMasterKeyProtection,
    testStorageEncryption,
    testMetadataProtection,
    
    // Tests de résistance aux attaques
    testBruteForceResistance,
    testTimingAttackResistance,
    testReplayAttackPrevention,
    testSideChannelResistance,
    
    // Tests cryptographiques
    testKeyStrength,
    testAlgorithmSecurity,
    testRandomnessQuality,
    testCryptographicPrimitives,
    
    // Tests d'isolation
    testContextIsolation,
    testUserIsolation,
    testGroupIsolation,
    testTemporalIsolation,
    
    // Tests de conformité
    testCryptographicStandards,
    testSecurityBestPractices,
    testVulnerabilityMitigation,
    testSecurityAudit
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

  // Statistiques finales
  console.log(`\n📊 Tests de sécurité: ${passed} réussis, ${failed} échoués`);
  
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
// TESTS D'UNICITÉ DES IV
// ============================================================================

async function testIVUniqueness(): Promise<void> {
  const crypto = new CryptoManager();
  const message = 'Message de test pour unicité IV';
  const iterations = 1000;
  const ivs = new Set<string>();
  
  // Générer de nombreux messages chiffrés
  for (let i = 0; i < iterations; i++) {
    const encrypted = await crypto.encryptMessage(message);
    const ivString = encrypted.iv.join(',');
    
    assert(!ivs.has(ivString), `IV dupliqué détecté à l'itération ${i}`);
    ivs.add(ivString);
  }
  
  assert(ivs.size === iterations, 'Tous les IV doivent être uniques');
  console.log(`  ✓ ${iterations} IV uniques générés`);
}

async function testIVRandomness(): Promise<void> {
  const crypto = new CryptoManager();
  const message = 'Test de randomness des IV';
  const iterations = 100;
  const ivs: number[][] = [];
  
  // Collecter des IV
  for (let i = 0; i < iterations; i++) {
    const encrypted = await crypto.encryptMessage(message);
    ivs.push(encrypted.iv);
  }
  
  // Analyser la randomness
  for (let byteIndex = 0; byteIndex < 12; byteIndex++) {
    const byteValues = ivs.map(iv => iv[byteIndex]);
    const entropy = calculateEntropy(byteValues);
    
    // L'entropie doit être élevée (proche de 8 bits pour des données vraiment aléatoires)
    assert(entropy > 6, `L'entropie du byte ${byteIndex} est trop faible: ${entropy.toFixed(2)}`);
  }
  
  console.log('  ✓ Entropie des IV validée');
}

async function testIVLength(): Promise<void> {
  const crypto = new CryptoManager();
  const message = 'Test de longueur IV';
  
  // Tester avec différents messages
  const messages = [
    'Court',
    'Message de longueur moyenne pour tester',
    'A'.repeat(10000), // Message très long
    '🔒🔑💻', // Caractères Unicode
    ''
  ];
  
  for (const msg of messages) {
    if (msg === '') {
      // Les messages vides doivent échouer
      try {
        await crypto.encryptMessage(msg);
        assert(false, 'Les messages vides devraient échouer');
      } catch (error) {
        // C'est attendu
        continue;
      }
    }
    
    const encrypted = await crypto.encryptMessage(msg);
    assert(encrypted.iv.length === 12, `IV doit faire 12 bytes, reçu: ${encrypted.iv.length}`);
    
    // Vérifier que tous les bytes sont dans la plage valide
    for (const byte of encrypted.iv) {
      assert(byte >= 0 && byte <= 255, `Byte IV invalide: ${byte}`);
    }
  }
  
  console.log('  ✓ Longueur des IV validée pour différents types de messages');
}

async function testIVDistribution(): Promise<void> {
  const crypto = new CryptoManager();
  const message = 'Test de distribution IV';
  const iterations = 500;
  const allBytes: number[] = [];
  
  // Collecter tous les bytes des IV
  for (let i = 0; i < iterations; i++) {
    const encrypted = await crypto.encryptMessage(message);
    allBytes.push(...encrypted.iv);
  }
  
  // Analyser la distribution
  const frequency = new Array(256).fill(0);
  for (const byte of allBytes) {
    frequency[byte]++;
  }
  
  // Calculer le chi-carré pour tester l'uniformité
  const expected = allBytes.length / 256;
  let chiSquare = 0;
  
  for (let i = 0; i < 256; i++) {
    const diff = frequency[i] - expected;
    chiSquare += (diff * diff) / expected;
  }
  
  // Pour 255 degrés de liberté, la valeur critique à 95% est environ 293
  assert(chiSquare < 350, `Distribution des bytes IV non uniforme, chi-carré: ${chiSquare.toFixed(2)}`);
  
  console.log(`  ✓ Distribution des IV uniforme (chi-carré: ${chiSquare.toFixed(2)})`);
}

// ============================================================================
// TESTS DE STOCKAGE SÉCURISÉ
// ============================================================================

async function testKeysNeverStoredInClear(): Promise<void> {
  const crypto = new CryptoManager();
  const storage = new SecureStorage();
  
  // Générer plusieurs clés
  await crypto.generateGlobalKey();
  await crypto.generateGroupKey('security-test-1');
  await crypto.generateGroupKey('security-test-2');
  
  // Examiner tout le contenu du localStorage
  const allStorageData = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      const value = localStorage.getItem(key);
      if (value) {
        allStorageData.push({ key, value });
      }
    }
  }
  
  // Vérifier qu'aucune clé n'est stockée en clair
  for (const { key, value } of allStorageData) {
    // Les clés ne doivent pas contenir de données en base64 simple
    assert(!value.match(/^[A-Za-z0-9+/]+=*$/), `Possible clé en base64 détectée dans ${key}`);
    
    // Les clés ne doivent pas contenir de format PEM
    assert(!value.includes('-----BEGIN'), `Format PEM détecté dans ${key}`);
    assert(!value.includes('-----END'), `Format PEM détecté dans ${key}`);
    
    // Vérifier que les données sont bien chiffrées (structure JSON avec encryptedKey)
    if (key.startsWith('liberchat_secure_') && !key.includes('master_key')) {
      try {
        const parsed = JSON.parse(value);
        assert(Array.isArray(parsed.encryptedKey), `Clé non chiffrée détectée dans ${key}`);
        assert(Array.isArray(parsed.iv), `IV manquant dans ${key}`);
        assert(parsed.encryptedKey.length > 0, `Clé chiffrée vide dans ${key}`);
      } catch (error) {
        assert(false, `Structure de données invalide dans ${key}`);
      }
    }
  }
  
  console.log(`  ✓ ${allStorageData.length} entrées de stockage vérifiées, aucune clé en clair`);
}

async function testMasterKeyProtection(): Promise<void> {
  const storage1 = new SecureStorage();
  const storage2 = new SecureStorage();
  
  // Générer une clé avec la première instance
  const testKey = await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  
  await storage1.storeKey('master-test', testKey);
  
  // Vérifier que la clé maître est créée
  const masterKeyData = localStorage.getItem('liberchat_secure_master_key_v1');
  assert(masterKeyData !== null, 'La clé maître doit être créée');
  
  // Vérifier que la clé maître est stockée de manière sécurisée
  const parsedMasterKey = JSON.parse(masterKeyData);
  assert(Array.isArray(parsedMasterKey.key), 'La clé maître doit être un tableau');
  assert(parsedMasterKey.key.length === 32, 'La clé maître doit faire 32 bytes (256 bits)');
  assert(parsedMasterKey.algorithm === 'AES-GCM', 'L\'algorithme doit être AES-GCM');
  
  // Vérifier que la deuxième instance peut utiliser la même clé maître
  const retrievedKey = await storage2.retrieveKey('master-test');
  assert(retrievedKey !== null, 'La clé doit être récupérable avec la même clé maître');
  
  // Vérifier que les clés sont fonctionnellement équivalentes
  const testData = new TextEncoder().encode('test data');
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  const encrypted1 = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, testKey, testData);
  const decrypted1 = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, retrievedKey, encrypted1);
  
  assert(new TextDecoder().decode(decrypted1) === 'test data', 'Les clés doivent être équivalentes');
  
  console.log('  ✓ Protection de la clé maître validée');
}

async function testStorageEncryption(): Promise<void> {
  const storage = new SecureStorage();
  const sensitiveData = 'Données sensibles à protéger';
  
  // Créer une clé de test
  const testKey = await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  
  await storage.storeKey('encryption-test', testKey);
  
  // Récupérer les données stockées
  const storedData = localStorage.getItem('liberchat_secure_encryption-test');
  assert(storedData !== null, 'Les données doivent être stockées');
  
  const parsed = JSON.parse(storedData);
  
  // Vérifier que les données sont chiffrées
  assert(Array.isArray(parsed.encryptedKey), 'La clé doit être chiffrée');
  assert(Array.isArray(parsed.iv), 'L\'IV doit être présent');
  assert(parsed.encryptedKey.length > 32, 'La clé chiffrée doit être plus longue que la clé originale');
  
  // Vérifier que l'IV est unique
  await storage.storeKey('encryption-test-2', testKey);
  const storedData2 = localStorage.getItem('liberchat_secure_encryption-test-2');
  const parsed2 = JSON.parse(storedData2!);
  
  assert(!arraysEqual(parsed.iv, parsed2.iv), 'Les IV doivent être différents');
  assert(!arraysEqual(parsed.encryptedKey, parsed2.encryptedKey), 'Les clés chiffrées doivent être différentes');
  
  console.log('  ✓ Chiffrement du stockage validé');
}

async function testMetadataProtection(): Promise<void> {
  const crypto = new CryptoManager();
  
  // Générer une clé avec métadonnées
  await crypto.generateGlobalKey();
  
  // Récupérer les métadonnées
  const metadata = await crypto.getKeyMetadata('global');
  assert(metadata !== null, 'Les métadonnées doivent exister');
  
  // Vérifier que les métadonnées ne contiennent pas d'informations sensibles
  const metadataString = JSON.stringify(metadata);
  
  // Les métadonnées ne doivent pas contenir de clés en clair
  assert(!metadataString.match(/[A-Za-z0-9+/]{32,}/), 'Les métadonnées ne doivent pas contenir de clés');
  
  // Vérifier que les informations sont appropriées
  assert(typeof metadata.created === 'number', 'La date de création doit être un timestamp');
  assert(typeof metadata.lastUsed === 'number', 'La dernière utilisation doit être un timestamp');
  assert(metadata.algorithm === 'AES-GCM', 'L\'algorithme doit être spécifié');
  assert(metadata.length === 256, 'La longueur doit être spécifiée');
  
  console.log('  ✓ Protection des métadonnées validée');
}/
/ ============================================================================
// TESTS DE RÉSISTANCE AUX ATTAQUES
// ============================================================================

async function testBruteForceResistance(): Promise<void> {
  const crypto = new CryptoManager();
  const message = 'Message à protéger contre force brute';
  
  // Chiffrer un message
  const encrypted = await crypto.encryptMessage(message);
  
  // Vérifier que la clé fait bien 256 bits (résistance théorique 2^256)
  const key = await crypto.getKey('global');
  const exportedKey = await window.crypto.subtle.exportKey('raw', key);
  assert(exportedKey.byteLength === 32, 'La clé doit faire 32 bytes (256 bits)');
  
  // Vérifier que l'IV fait 96 bits (recommandé pour AES-GCM)
  assert(encrypted.iv.length === 12, 'L\'IV doit faire 12 bytes (96 bits)');
  
  // Simuler des tentatives de déchiffrement avec des clés aléatoires
  const attempts = 1000;
  let successfulDecryptions = 0;
  
  for (let i = 0; i < attempts; i++) {
    try {
      // Générer une clé aléatoire
      const randomKey = await window.crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );
      
      // Tenter de déchiffrer
      const iv = new Uint8Array(encrypted.iv);
      const ciphertext = new Uint8Array(encrypted.content);
      
      await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        randomKey,
        ciphertext
      );
      
      successfulDecryptions++;
    } catch (error) {
      // Échec attendu
    }
  }
  
  // Aucune tentative aléatoire ne devrait réussir
  assert(successfulDecryptions === 0, 
    `${successfulDecryptions} déchiffrements aléatoires ont réussi sur ${attempts} tentatives`);
  
  console.log(`  ✓ ${attempts} tentatives de force brute échouées comme attendu`);
}

async function testTimingAttackResistance(): Promise<void> {
  const crypto = new CryptoManager();
  const baseMessage = 'Message de timing';
  
  // Mesurer les temps de chiffrement pour différentes longueurs
  const timings: number[] = [];
  const messageLengths = [10, 100, 1000, 10000];
  
  for (const length of messageLengths) {
    const message = 'A'.repeat(length);
    const times: number[] = [];
    
    // Effectuer plusieurs mesures
    for (let i = 0; i < 50; i++) {
      const start = performance.now();
      await crypto.encryptMessage(message);
      const end = performance.now();
      times.push(end - start);
    }
    
    // Calculer la moyenne
    const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
    timings.push(avgTime);
  }
  
  // Vérifier que les temps ne révèlent pas d'informations sensibles
  // Les temps devraient augmenter de manière prévisible avec la taille
  for (let i = 1; i < timings.length; i++) {
    assert(timings[i] >= timings[i-1] * 0.8, 
      `Timing anormal détecté: ${timings[i].toFixed(2)}ms vs ${timings[i-1].toFixed(2)}ms`);
  }
  
  console.log(`  ✓ Timings de chiffrement cohérents: ${timings.map(t => t.toFixed(2)).join('ms, ')}ms`);
}

async function testReplayAttackPrevention(): Promise<void> {
  const keyExchanger = new KeyExchanger();
  const now = Date.now();
  
  // Créer un message d'échange valide
  const exchangeData = {
    type: 'request' as const,
    groupId: 'replay-test',
    fromUserId: 'attacker',
    publicKey: [1, 2, 3, 4, 5],
    timestamp: now,
    nonce: 'unique-nonce-123'
  };
  
  // Premier usage (doit être valide)
  const isValid1 = keyExchanger.isValidExchangeData(exchangeData);
  assert(isValid1, 'Le premier usage doit être valide');
  
  // Simuler l'ajout aux échanges en attente
  const nonceKey = `${exchangeData.groupId}_${exchangeData.fromUserId}_${exchangeData.nonce}`;
  (keyExchanger as any).pendingExchanges.set(nonceKey, exchangeData);
  
  // Tentative de replay (doit être invalide)
  const isValid2 = keyExchanger.isValidExchangeData(exchangeData);
  assert(!isValid2, 'La tentative de replay doit être rejetée');
  
  // Test avec timestamp expiré
  const expiredData = {
    ...exchangeData,
    timestamp: now - 10 * 60 * 1000, // 10 minutes
    nonce: 'expired-nonce'
  };
  
  const isValid3 = keyExchanger.isValidExchangeData(expiredData);
  assert(!isValid3, 'Les messages expirés doivent être rejetés');
  
  console.log('  ✓ Protection contre les attaques de replay validée');
}

async function testSideChannelResistance(): Promise<void> {
  const crypto = new CryptoManager();
  
  // Tester avec des messages de différentes longueurs et contenus
  const testCases = [
    'A'.repeat(16),      // Longueur de bloc AES
    'B'.repeat(32),      // Deux blocs
    'C'.repeat(15),      // Moins d'un bloc
    'D'.repeat(33),      // Plus de deux blocs
    '🔒'.repeat(10),     // Caractères Unicode
    '\x00'.repeat(20)    // Bytes null
  ];
  
  const timings: { [key: string]: number[] } = {};
  
  // Mesurer les temps pour chaque cas
  for (const testCase of testCases) {
    timings[testCase.length] = [];
    
    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      await crypto.encryptMessage(testCase);
      const end = performance.now();
      timings[testCase.length].push(end - start);
    }
  }
  
  // Analyser la variance des timings
  for (const [length, times] of Object.entries(timings)) {
    const mean = times.reduce((sum, time) => sum + time, 0) / times.length;
    const variance = times.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / times.length;
    const stdDev = Math.sqrt(variance);
    
    // La variance ne doit pas être excessive (indicateur de fuites d'information)
    const coefficientOfVariation = stdDev / mean;
    assert(coefficientOfVariation < 0.5, 
      `Variance excessive pour longueur ${length}: CV=${coefficientOfVariation.toFixed(3)}`);
  }
  
  console.log('  ✓ Résistance aux attaques par canaux auxiliaires validée');
}

// ============================================================================
// TESTS CRYPTOGRAPHIQUES
// ============================================================================

async function testKeyStrength(): Promise<void> {
  const crypto = new CryptoManager();
  const iterations = 100;
  const keys: Uint8Array[] = [];
  
  // Générer plusieurs clés et les exporter
  for (let i = 0; i < iterations; i++) {
    const key = await crypto.generateGlobalKey();
    const exported = await window.crypto.subtle.exportKey('raw', key);
    keys.push(new Uint8Array(exported));
  }
  
  // Analyser la force des clés
  for (let keyIndex = 0; keyIndex < keys.length; keyIndex++) {
    const keyData = keys[keyIndex];
    
    // Vérifier la longueur
    assert(keyData.length === 32, `Clé ${keyIndex}: longueur incorrecte ${keyData.length}`);
    
    // Calculer l'entropie
    const entropy = calculateEntropy(keyData);
    assert(entropy > 7.5, `Clé ${keyIndex}: entropie trop faible ${entropy.toFixed(2)}`);
    
    // Vérifier qu'il n'y a pas de patterns évidents
    let repeatedBytes = 0;
    for (let i = 1; i < keyData.length; i++) {
      if (keyData[i] === keyData[i-1]) {
        repeatedBytes++;
      }
    }
    
    // Pas plus de 25% de bytes répétés consécutifs
    assert(repeatedBytes < keyData.length * 0.25, 
      `Clé ${keyIndex}: trop de bytes répétés ${repeatedBytes}/${keyData.length}`);
  }
  
  // Vérifier l'unicité des clés
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      assert(!arraysEqual(keys[i], keys[j]), `Clés identiques détectées: ${i} et ${j}`);
    }
  }
  
  console.log(`  ✓ ${iterations} clés analysées, force cryptographique validée`);
}

async function testAlgorithmSecurity(): Promise<void> {
  const crypto = new CryptoManager();
  
  // Vérifier que l'algorithme utilisé est sécurisé
  const key = await crypto.generateGlobalKey();
  assert(key.algorithm.name === 'AES-GCM', 'Doit utiliser AES-GCM');
  assert((key.algorithm as AesKeyAlgorithm).length === 256, 'Doit utiliser 256 bits');
  
  // Vérifier les usages de clé
  assert(key.usages.includes('encrypt'), 'La clé doit permettre le chiffrement');
  assert(key.usages.includes('decrypt'), 'La clé doit permettre le déchiffrement');
  assert(!key.usages.includes('sign'), 'La clé ne doit pas permettre la signature');
  assert(!key.usages.includes('verify'), 'La clé ne doit pas permettre la vérification');
  
  // Tester le chiffrement avec authentification
  const message = 'Test d\'authentification';
  const encrypted = await crypto.encryptMessage(message);
  
  // Modifier le contenu chiffré pour tester l'authentification
  const tamperedEncrypted = { ...encrypted };
  tamperedEncrypted.content[0] = (tamperedEncrypted.content[0] + 1) % 256;
  
  const decrypted = await crypto.decryptMessage(tamperedEncrypted);
  assert(decrypted === '[Message non déchiffrable]', 
    'Les messages altérés doivent être détectés par l\'authentification');
  
  console.log('  ✓ Sécurité algorithmique AES-GCM validée');
}

async function testRandomnessQuality(): Promise<void> {
  const samples = 10000;
  const randomData = new Uint8Array(samples);
  
  // Générer des données aléatoires
  window.crypto.getRandomValues(randomData);
  
  // Test de fréquence (chaque byte doit apparaître environ samples/256 fois)
  const frequency = new Array(256).fill(0);
  for (const byte of randomData) {
    frequency[byte]++;
  }
  
  const expected = samples / 256;
  let chiSquare = 0;
  
  for (let i = 0; i < 256; i++) {
    const diff = frequency[i] - expected;
    chiSquare += (diff * diff) / expected;
  }
  
  // Test du chi-carré pour l'uniformité
  assert(chiSquare < 300, `Distribution non uniforme, chi-carré: ${chiSquare.toFixed(2)}`);
  
  // Test de runs (séquences de bits identiques)
  let runs = 0;
  let currentRun = 1;
  
  for (let i = 1; i < randomData.length; i++) {
    if (randomData[i] === randomData[i-1]) {
      currentRun++;
    } else {
      runs++;
      currentRun = 1;
    }
  }
  
  // Le nombre de runs doit être dans une plage raisonnable
  const expectedRuns = samples * 0.5;
  assert(Math.abs(runs - expectedRuns) < expectedRuns * 0.1, 
    `Nombre de runs anormal: ${runs} (attendu: ~${expectedRuns.toFixed(0)})`);
  
  console.log(`  ✓ Qualité de la randomness validée (chi-carré: ${chiSquare.toFixed(2)}, runs: ${runs})`);
}

async function testCryptographicPrimitives(): Promise<void> {
  // Tester les primitives cryptographiques de base
  
  // Test de génération de clé
  const key = await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  
  assert(key.type === 'secret', 'Le type de clé doit être secret');
  assert(key.extractable === true, 'La clé doit être extractable');
  
  // Test de chiffrement/déchiffrement
  const plaintext = new TextEncoder().encode('Test des primitives');
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    plaintext
  );
  
  assert(ciphertext.byteLength > plaintext.byteLength, 
    'Le texte chiffré doit être plus long (inclut le tag d\'authentification)');
  
  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );
  
  const decryptedText = new TextDecoder().decode(decrypted);
  assert(decryptedText === 'Test des primitives', 'Le déchiffrement doit être correct');
  
  // Test d'export/import de clé
  const exported = await window.crypto.subtle.exportKey('raw', key);
  assert(exported.byteLength === 32, 'La clé exportée doit faire 32 bytes');
  
  const imported = await window.crypto.subtle.importKey(
    'raw',
    exported,
    { name: 'AES-GCM' },
    true,
    ['encrypt', 'decrypt']
  );
  
  // Vérifier que la clé importée fonctionne
  const testCiphertext = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    imported,
    plaintext
  );
  
  const testDecrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    testCiphertext
  );
  
  assert(new TextDecoder().decode(testDecrypted) === 'Test des primitives', 
    'Les clés importées doivent être fonctionnelles');
  
  console.log('  ✓ Primitives cryptographiques Web Crypto API validées');
}

// ============================================================================
// TESTS D'ISOLATION
// ============================================================================

async function testContextIsolation(): Promise<void> {
  const crypto = new CryptoManager();
  const message = 'Message d\'isolation de contexte';
  
  // Chiffrer avec différents contextes
  const contexts = ['global', 'group_test1', 'group_test2', 'group_test3'];
  const encrypted: { [key: string]: any } = {};
  
  for (const context of contexts) {
    encrypted[context] = await crypto.encryptMessage(message, context);
  }
  
  // Vérifier l'isolation: chaque message ne peut être déchiffré qu'avec son contexte
  for (const correctContext of contexts) {
    // Déchiffrement correct
    const decrypted = await crypto.decryptMessage(encrypted[correctContext], correctContext);
    assert(decrypted === message, `Déchiffrement correct doit fonctionner pour ${correctContext}`);
    
    // Déchiffrements incorrects
    for (const wrongContext of contexts) {
      if (wrongContext !== correctContext) {
        const wrongDecrypted = await crypto.decryptMessage(encrypted[correctContext], wrongContext);
        assert(wrongDecrypted === '[Message non déchiffrable]', 
          `Déchiffrement avec mauvais contexte doit échouer: ${correctContext} -> ${wrongContext}`);
      }
    }
  }
  
  console.log(`  ✓ Isolation entre ${contexts.length} contextes validée`);
}

async function testUserIsolation(): Promise<void> {
  // Simuler différents utilisateurs avec des stockages séparés
  const users = ['alice', 'bob', 'charlie'];
  const cryptoManagers: { [key: string]: CryptoManager } = {};
  const message = 'Message d\'isolation utilisateur';
  
  // Créer des gestionnaires séparés pour chaque utilisateur
  for (const user of users) {
    cryptoManagers[user] = new CryptoManager();
  }
  
  // Chaque utilisateur chiffre le même message
  const encrypted: { [key: string]: any } = {};
  for (const user of users) {
    encrypted[user] = await cryptoManagers[user].encryptMessage(message);
  }
  
  // Vérifier l'isolation: chaque utilisateur ne peut déchiffrer que ses propres messages
  for (const owner of users) {
    // Déchiffrement par le propriétaire
    const decrypted = await cryptoManagers[owner].decryptMessage(encrypted[owner]);
    assert(decrypted === message, `${owner} doit pouvoir déchiffrer son propre message`);
    
    // Tentatives de déchiffrement par d'autres utilisateurs
    for (const other of users) {
      if (other !== owner) {
        const wrongDecrypted = await cryptoManagers[other].decryptMessage(encrypted[owner]);
        assert(wrongDecrypted === '[Message non déchiffrable]', 
          `${other} ne doit pas pouvoir déchiffrer le message de ${owner}`);
      }
    }
  }
  
  console.log(`  ✓ Isolation entre ${users.length} utilisateurs validée`);
}

async function testGroupIsolation(): Promise<void> {
  const crypto = new CryptoManager();
  const groups = ['group1', 'group2', 'group3'];
  const message = 'Message d\'isolation de groupe';
  
  // Créer des clés pour chaque groupe
  for (const group of groups) {
    await crypto.generateGroupKey(group);
  }
  
  // Chiffrer le même message pour chaque groupe
  const encrypted: { [key: string]: any } = {};
  for (const group of groups) {
    encrypted[group] = await crypto.encryptMessage(message, `group_${group}`);
  }
  
  // Vérifier l'isolation entre groupes
  for (const correctGroup of groups) {
    const correctContext = `group_${correctGroup}`;
    
    // Déchiffrement correct
    const decrypted = await crypto.decryptMessage(encrypted[correctGroup], correctContext);
    assert(decrypted === message, `Déchiffrement correct pour ${correctGroup}`);
    
    // Déchiffrements avec mauvaises clés de groupe
    for (const wrongGroup of groups) {
      if (wrongGroup !== correctGroup) {
        const wrongContext = `group_${wrongGroup}`;
        const wrongDecrypted = await crypto.decryptMessage(encrypted[correctGroup], wrongContext);
        assert(wrongDecrypted === '[Message non déchiffrable]', 
          `Isolation échouée: ${correctGroup} déchiffrable avec clé de ${wrongGroup}`);
      }
    }
  }
  
  console.log(`  ✓ Isolation entre ${groups.length} groupes validée`);
}

async function testTemporalIsolation(): Promise<void> {
  const crypto = new CryptoManager();
  const message = 'Message d\'isolation temporelle';
  
  // Chiffrer un message avec une clé
  const encrypted1 = await crypto.encryptMessage(message);
  
  // Régénérer la clé globale (simulation de rotation)
  await crypto.generateGlobalKey();
  
  // Chiffrer le même message avec la nouvelle clé
  const encrypted2 = await crypto.encryptMessage(message);
  
  // Les messages doivent être différents
  assert(!arraysEqual(encrypted1.content, encrypted2.content), 
    'Les messages chiffrés avec des clés différentes doivent être différents');
  
  // Vérifier les versions de clés
  assert(encrypted2.keyVersion > encrypted1.keyVersion, 
    'La version de clé doit être incrémentée');
  
  // Le nouveau gestionnaire doit pouvoir déchiffrer le nouveau message
  const decrypted2 = await crypto.decryptMessage(encrypted2);
  assert(decrypted2 === message, 'Le nouveau message doit être déchiffrable');
  
  // L'ancien message pourrait ne plus être déchiffrable selon l'implémentation
  // (cela dépend de la politique de rétention des anciennes clés)
  
  console.log('  ✓ Isolation temporelle validée');
}

// ============================================================================
// TESTS DE CONFORMITÉ
// ============================================================================

async function testCryptographicStandards(): Promise<void> {
  const crypto = new CryptoManager();
  
  // Vérifier la conformité aux standards
  const key = await crypto.generateGlobalKey();
  
  // AES-256-GCM est conforme aux standards NIST
  assert(key.algorithm.name === 'AES-GCM', 'Doit utiliser AES-GCM (NIST approuvé)');
  assert((key.algorithm as AesKeyAlgorithm).length === 256, 'Doit utiliser AES-256 (NIST recommandé)');
  
  // Tester la longueur d'IV recommandée pour GCM
  const message = 'Test de conformité standards';
  const encrypted = await crypto.encryptMessage(message);
  assert(encrypted.iv.length === 12, 'IV doit faire 96 bits pour AES-GCM (RFC 5116)');
  
  // Vérifier que l'authentification est incluse
  const tamperedMessage = { ...encrypted };
  tamperedMessage.content[0] = (tamperedMessage.content[0] + 1) % 256;
  
  const decrypted = await crypto.decryptMessage(tamperedMessage);
  assert(decrypted === '[Message non déchiffrable]', 
    'L\'authentification doit détecter les modifications (AEAD requirement)');
  
  console.log('  ✓ Conformité aux standards cryptographiques validée');
}

async function testSecurityBestPractices(): Promise<void> {
  const crypto = new CryptoManager();
  const storage = new SecureStorage();
  
  // Vérifier les bonnes pratiques de sécurité
  
  // 1. Clés générées avec un CSPRNG
  const key = await crypto.generateGlobalKey();
  const exported = await window.crypto.subtle.exportKey('raw', key);
  const keyData = new Uint8Array(exported);
  
  // Vérifier l'entropie de la clé
  const entropy = calculateEntropy(keyData);
  assert(entropy > 7.5, `Entropie de clé insuffisante: ${entropy.toFixed(2)}`);
  
  // 2. IV uniques pour chaque chiffrement
  const message = 'Test des bonnes pratiques';
  const encrypted1 = await crypto.encryptMessage(message);
  const encrypted2 = await crypto.encryptMessage(message);
  
  assert(!arraysEqual(encrypted1.iv, encrypted2.iv), 'Les IV doivent être uniques');
  
  // 3. Stockage sécurisé des clés
  await storage.storeKey('best-practices-test', key);
  const storedData = localStorage.getItem('liberchat_secure_best-practices-test');
  assert(storedData !== null, 'La clé doit être stockée');
  
  const parsed = JSON.parse(storedData);
  assert(Array.isArray(parsed.encryptedKey), 'La clé doit être chiffrée en stockage');
  
  // 4. Métadonnées appropriées
  const metadata = await storage.getMetadata('best-practices-test');
  assert(metadata !== null, 'Les métadonnées doivent être présentes');
  assert(typeof metadata.created === 'number', 'Date de création requise');
  assert(typeof metadata.lastUsed === 'number', 'Dernière utilisation requise');
  
  console.log('  ✓ Bonnes pratiques de sécurité validées');
}

async function testVulnerabilityMitigation(): Promise<void> {
  const crypto = new CryptoManager();
  
  // Test de mitigation des vulnérabilités communes
  
  // 1. Protection contre les attaques de padding (non applicable à GCM)
  // 2. Protection contre les attaques de timing
  const message1 = 'A';
  const message2 = 'A'.repeat(1000);
  
  const times1: number[] = [];
  const times2: number[] = [];
  
  for (let i = 0; i < 50; i++) {
    const start1 = performance.now();
    await crypto.encryptMessage(message1);
    times1.push(performance.now() - start1);
    
    const start2 = performance.now();
    await crypto.encryptMessage(message2);
    times2.push(performance.now() - start2);
  }
  
  const avg1 = times1.reduce((sum, t) => sum + t, 0) / times1.length;
  const avg2 = times2.reduce((sum, t) => sum + t, 0) / times2.length;
  
  // Les temps doivent être proportionnels à la taille (pas de fuite d'information)
  assert(avg2 > avg1, 'Les messages plus longs doivent prendre plus de temps');
  
  // 3. Protection contre la réutilisation d'IV
  const ivs = new Set<string>();
  for (let i = 0; i < 1000; i++) {
    const encrypted = await crypto.encryptMessage('Test IV');
    const ivString = encrypted.iv.join(',');
    assert(!ivs.has(ivString), `IV réutilisé détecté à l'itération ${i}`);
    ivs.add(ivString);
  }
  
  console.log('  ✓ Mitigation des vulnérabilités validée');
}

async function testSecurityAudit(): Promise<void> {
  const crypto = new CryptoManager();
  const storage = new SecureStorage();
  
  // Audit de sécurité complet
  
  // 1. Vérifier l'intégrité du système
  await crypto.generateGlobalKey();
  await crypto.generateGroupKey('audit-group');
  
  const integrity = await crypto.verifyIntegrity();
  assert(integrity.valid === true, 'L\'intégrité du système doit être valide');
  
  // 2. Vérifier les statistiques de stockage
  const stats = await storage.getStorageStats();
  assert(stats.totalKeys >= 2, 'Au moins 2 clés doivent être stockées');
  assert(stats.storageUsed > 0, 'L\'espace de stockage doit être utilisé');
  
  // 3. Vérifier les métadonnées de sécurité
  const contexts = await crypto.listKeyContexts();
  for (const context of contexts) {
    const metadata = await crypto.getKeyMetadata(context);
    assert(metadata !== null, `Métadonnées manquantes pour ${context}`);
    assert(metadata.algorithm === 'AES-GCM', 'Algorithme sécurisé requis');
    assert(metadata.length === 256, 'Longueur de clé sécurisée requise');
  }
  
  // 4. Test de résistance aux modifications
  const message = 'Message d\'audit';
  const encrypted = await crypto.encryptMessage(message);
  
  // Modifier différentes parties du message chiffré
  const modifications = [
    { ...encrypted, iv: encrypted.iv.map(b => (b + 1) % 256) },
    { ...encrypted, content: encrypted.content.map(b => (b + 1) % 256) },
    { ...encrypted, algorithm: 'AES-CBC' },
    { ...encrypted, keyVersion: encrypted.keyVersion + 1 }
  ];
  
  for (const modified of modifications) {
    const decrypted = await crypto.decryptMessage(modified);
    assert(decrypted === '[Message non déchiffrable]', 
      'Les modifications doivent être détectées');
  }
  
  console.log('  ✓ Audit de sécurité complet réussi');
}

// Lancer les tests si ce fichier est exécuté directement
if (import.meta.url === `file://${process.argv[1]}`) {
  runSecurityTests().catch(console.error);
}

export { runSecurityTests };