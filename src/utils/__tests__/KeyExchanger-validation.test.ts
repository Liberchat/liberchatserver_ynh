/**
 * Tests de validation pour KeyExchanger
 * Requirements: 3.1, 3.2, 7.1, 7.2
 */

import { KeyExchanger, type KeyExchangeData } from '../KeyExchanger.ts';

// Configuration pour les tests Node.js
if (typeof window === 'undefined') {
  const { webcrypto } = await import('node:crypto');
  global.window = {
    crypto: {
      subtle: webcrypto.subtle,
      getRandomValues: webcrypto.getRandomValues.bind(webcrypto)
    }
  } as any;
  
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

function assert(condition: boolean, message?: string): asserts condition {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

async function measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; time: number }> {
  const start = performance.now();
  const result = await fn();
  const time = performance.now() - start;
  return { result, time };
}

// ============================================================================
// TESTS DE VALIDATION
// ============================================================================

async function testValidateExchangeData(): Promise<void> {
  const keyExchanger = new KeyExchanger();
  const now = Date.now();
  
  // Données valides
  const validData: KeyExchangeData = {
    type: 'request',
    groupId: 'test-group',
    fromUserId: 'user123',
    publicKey: Array.from(new Uint8Array(65)), // Taille typique pour P-256
    timestamp: now,
    nonce: 'unique-nonce-123'
  };
  
  const isValid = keyExchanger.isValidExchangeData(validData);
  assert(isValid, 'Les données valides doivent passer la validation');
  
  // Test avec champs manquants
  const invalidData1 = { ...validData, groupId: '' };
  assert(!keyExchanger.isValidExchangeData(invalidData1), 'Doit échouer avec groupId vide');
  
  const invalidData2 = { ...validData, fromUserId: '' };
  assert(!keyExchanger.isValidExchangeData(invalidData2), 'Doit échouer avec fromUserId vide');
  
  const invalidData3 = { ...validData, publicKey: [] };
  assert(!keyExchanger.isValidExchangeData(invalidData3), 'Doit échouer avec publicKey vide');
  
  const invalidData4 = { ...validData, nonce: '' };
  assert(!keyExchanger.isValidExchangeData(invalidData4), 'Doit échouer avec nonce vide');
}

async function testValidateTimestamp(): Promise<void> {
  const keyExchanger = new KeyExchanger();
  const now = Date.now();
  
  // Timestamp récent (valide)
  const recentData: KeyExchangeData = {
    type: 'request',
    groupId: 'test-group',
    fromUserId: 'user123',
    publicKey: [1, 2, 3],
    timestamp: now - 1000, // 1 seconde
    nonce: 'recent-nonce'
  };
  
  assert(keyExchanger.isValidExchangeData(recentData), 'Un timestamp récent doit être valide');
  
  // Timestamp trop ancien (invalide)
  const oldData: KeyExchangeData = {
    type: 'request',
    groupId: 'test-group',
    fromUserId: 'user123',
    publicKey: [1, 2, 3],
    timestamp: now - 10 * 60 * 1000, // 10 minutes
    nonce: 'old-nonce'
  };
  
  assert(!keyExchanger.isValidExchangeData(oldData), 'Un timestamp trop ancien doit être invalide');
}

async function testValidateNonce(): Promise<void> {
  const keyExchanger = new KeyExchanger();
  const now = Date.now();
  
  const baseData: KeyExchangeData = {
    type: 'request',
    groupId: 'test-group',
    fromUserId: 'user123',
    publicKey: [1, 2, 3],
    timestamp: now,
    nonce: 'unique-nonce'
  };
  
  // Premier usage du nonce (valide)
  assert(keyExchanger.isValidExchangeData(baseData), 'Le premier usage d\'un nonce doit être valide');
  
  // Simuler l'ajout du nonce aux échanges en attente
  const nonceKey = `${baseData.groupId}_${baseData.fromUserId}_${baseData.nonce}`;
  (keyExchanger as any).pendingExchanges.set(nonceKey, baseData);
  
  // Deuxième usage du même nonce (invalide)
  assert(!keyExchanger.isValidExchangeData(baseData), 'La réutilisation d\'un nonce doit être invalide');
}

// ============================================================================
// TESTS DE SÉCURITÉ
// ============================================================================

async function testNonceUniqueness(): Promise<void> {
  const keyExchanger = new KeyExchanger();
  
  // Générer plusieurs nonces
  const nonces = new Set<string>();
  for (let i = 0; i < 100; i++) {
    const nonce = (keyExchanger as any).generateNonce();
    assert(typeof nonce === 'string', 'Le nonce doit être une chaîne');
    assert(nonce.length > 0, 'Le nonce ne doit pas être vide');
    assert(!nonces.has(nonce), `Le nonce doit être unique (collision à l'index ${i})`);
    nonces.add(nonce);
  }
  
  assert(nonces.size === 100, 'Tous les nonces doivent être uniques');
}

async function testTimestampValidation(): Promise<void> {
  const keyExchanger = new KeyExchanger();
  const now = Date.now();
  
  // Test avec différents timestamps
  const testCases = [
    { timestamp: now, expected: true, description: 'timestamp actuel' },
    { timestamp: now - 1000, expected: true, description: 'timestamp récent (1s)' },
    { timestamp: now - 4 * 60 * 1000, expected: true, description: 'timestamp limite (4min)' },
    { timestamp: now - 6 * 60 * 1000, expected: false, description: 'timestamp expiré (6min)' },
    { timestamp: now + 1000, expected: true, description: 'timestamp futur proche' }
  ];
  
  for (const testCase of testCases) {
    const data: KeyExchangeData = {
      type: 'request',
      groupId: 'test-timestamp',
      fromUserId: 'user',
      publicKey: [1, 2, 3],
      timestamp: testCase.timestamp,
      nonce: `nonce-${testCase.timestamp}`
    };
    
    const isValid = keyExchanger.isValidExchangeData(data);
    assert(isValid === testCase.expected, `Validation incorrecte pour ${testCase.description}`);
  }
}

async function testReplayAttackPrevention(): Promise<void> {
  const keyExchanger = new KeyExchanger();
  const now = Date.now();
  
  const data: KeyExchangeData = {
    type: 'request',
    groupId: 'test-replay',
    fromUserId: 'attacker',
    publicKey: [1, 2, 3],
    timestamp: now,
    nonce: 'replay-nonce'
  };
  
  // Premier usage (valide)
  assert(keyExchanger.isValidExchangeData(data), 'Le premier usage doit être valide');
  
  // Simuler l'ajout aux échanges en attente
  const nonceKey = `${data.groupId}_${data.fromUserId}_${data.nonce}`;
  (keyExchanger as any).pendingExchanges.set(nonceKey, data);
  
  // Tentative de replay (invalide)
  assert(!keyExchanger.isValidExchangeData(data), 'La tentative de replay doit être rejetée');
}

// ============================================================================
// TESTS DE PERFORMANCE
// ============================================================================

async function testKeyGenerationPerformance(): Promise<void> {
  const keyExchanger = new KeyExchanger();
  
  const { time } = await measureTime(() => keyExchanger.generateKeyPair('perf-test'));
  
  assert(time < 100, `La génération de clés doit prendre moins de 100ms (actuel: ${time.toFixed(2)}ms)`);
}

async function testKeyDerivationPerformance(): Promise<void> {
  const keyExchanger = new KeyExchanger();
  
  // Générer deux paires de clés
  const keyPair1 = await keyExchanger.generateKeyPair('perf1');
  const keyPair2 = await keyExchanger.generateKeyPair('perf2');
  
  const { time } = await measureTime(() => 
    keyExchanger.deriveSharedSecret(keyPair2.publicKey, keyPair1.privateKey)
  );
  
  assert(time < 50, `La dérivation de secret doit prendre moins de 50ms (actuel: ${time.toFixed(2)}ms)`);
}

// Test runner
async function runValidationTests(): Promise<void> {
  console.log('🧪 Tests de validation KeyExchanger...\n');
  
  const tests = [
    testValidateExchangeData,
    testValidateTimestamp,
    testValidateNonce,
    testNonceUniqueness,
    testTimestampValidation,
    testReplayAttackPrevention,
    testKeyGenerationPerformance,
    testKeyDerivationPerformance
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    localStorage.clear();
    
    try {
      const { time } = await measureTime(test);
      console.log(`✅ ${test.name} (${time.toFixed(2)}ms)`);
      passed++;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`❌ ${test.name}: ${errorMessage}`);
      failed++;
    }
  }

  console.log(`\n📊 Validation: ${passed} réussis, ${failed} échoués`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runValidationTests().catch(console.error);
}

export { runValidationTests };