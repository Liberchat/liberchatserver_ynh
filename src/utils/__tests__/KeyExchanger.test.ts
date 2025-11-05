/**
 * Tests unitaires complets pour KeyExchanger
 * 
 * Ces tests vérifient:
 * - La génération de paires de clés ECDH
 * - La dérivation de secrets partagés
 * - L'échange de clés pour les groupes
 * - La gestion des pairs et la vérification
 * - La rotation des clés de groupe
 * - La sécurité des échanges
 * 
 * Requirements: 3.1, 3.2, 7.1, 7.2
 */

import { KeyExchanger, type KeyExchangeData, type PeerInfo, type GroupKeyInfo } from '../KeyExchanger.ts';

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
 * Test runner avec gestion des erreurs
 */
async function runTests(): Promise<void> {
  console.log('🧪 Démarrage des tests KeyExchanger complets...\n');
  
  let passed = 0;
  let failed = 0;
  const results: Array<{ name: string; success: boolean; time?: number; error?: string }> = [];

  const tests = [
    // Tests de base
    testGenerateKeyPair,
    testDeriveSharedSecret,
    testSignAndVerifyMessage,
    
    // Tests d'échange de clés
    testJoinGroup,
    testJoinGroupInvalidParams,
    testLeaveGroup,
    testRotateGroupKey,
    
    // Tests de validation
    testValidateExchangeData,
    testValidateTimestamp,
    testValidateNonce,
    
    // Tests de gestion des pairs
    testPeerManagement,
    testPeerVerification,
    testPeerCleanup,
    
    // Tests de gestion des groupes
    testGroupKeyManagement,
    testGroupParticipants,
    
    // Tests de sécurité
    testNonceUniqueness,
    testTimestampValidation,
    testReplayAttackPrevention,
    
    // Tests de performance
    testKeyGenerationPerformance,
    testKeyDerivationPerformance,
    
    // Tests utilitaires
    testGetGroupInfo,
    testGetVerifiedPeers,
    testCleanup,
    testReset
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
// 
============================================================================
// TESTS DE BASE
// ============================================================================

async function testGenerateKeyPair(): Promise<void> {
  const keyExchanger = new KeyExchanger();
  const context = 'test-context';
  
  const keyPair = await keyExchanger.generateKeyPair(context);
  
  assert(keyPair !== null, 'La paire de clés doit être générée');
  assert(keyPair.publicKey !== null, 'La clé publique doit exister');
  assert(keyPair.privateKey !== null, 'La clé privée doit exister');
  assert(keyPair.publicKey.algorithm.name === 'ECDH', 'L\'algorithme doit être ECDH');
  assert(keyPair.publicKey.algorithm.namedCurve === 'P-256', 'La courbe doit être P-256');
  assert(keyPair.publicKey.type === 'public', 'Le type de clé publique doit être correct');
  assert(keyPair.privateKey.type === 'private', 'Le type de clé privée doit être correct');
  assert(keyPair.publicKey.extractable === true, 'La clé publique doit être extractable');
  assert(keyPair.privateKey.usages.includes('deriveKey'), 'La clé privée doit permettre la dérivation');
}

async function testDeriveSharedSecret(): Promise<void> {
  const keyExchanger = new KeyExchanger();
  
  // Générer deux paires de clés pour simuler l'échange
  const keyPair1 = await keyExchanger.generateKeyPair('user1');
  const keyPair2 = await keyExchanger.generateKeyPair('user2');
  
  // Dériver le secret partagé dans les deux sens
  const sharedSecret1 = await keyExchanger.deriveSharedSecret(keyPair2.publicKey, keyPair1.privateKey);
  const sharedSecret2 = await keyExchanger.deriveSharedSecret(keyPair1.publicKey, keyPair2.privateKey);
  
  assert(sharedSecret1 !== null, 'Le secret partagé 1 doit être généré');
  assert(sharedSecret2 !== null, 'Le secret partagé 2 doit être généré');
  assert(sharedSecret1.algorithm.name === 'AES-GCM', 'L\'algorithme doit être AES-GCM');
  assert(sharedSecret1.algorithm.length === 256, 'La longueur doit être 256 bits');
  
  // Vérifier que les secrets sont identiques
  const exported1 = await window.crypto.subtle.exportKey('raw', sharedSecret1);
  const exported2 = await window.crypto.subtle.exportKey('raw', sharedSecret2);
  
  const array1 = new Uint8Array(exported1);
  const array2 = new Uint8Array(exported2);
  
  assert(array1.length === array2.length, 'Les secrets doivent avoir la même longueur');
  for (let i = 0; i < array1.length; i++) {
    assert(array1[i] === array2[i], `Les secrets doivent être identiques à l'index ${i}`);
  }
}

async function testSignAndVerifyMessage(): Promise<void> {
  const keyExchanger = new KeyExchanger();
  
  // Générer une paire de clés pour la signature
  const keyPair = await keyExchanger.generateKeyPair('signer');
  const message = new TextEncoder().encode('Message à signer');
  
  // Signer le message
  const signature = await keyExchanger.signMessage(message, keyPair.privateKey);
  
  assert(signature instanceof ArrayBuffer, 'La signature doit être un ArrayBuffer');
  assert(signature.byteLength > 0, 'La signature ne doit pas être vide');
  
  // Note: La vérification nécessiterait une clé publique de signature séparée
  // Dans l'implémentation actuelle, signMessage génère sa propre paire de clés
  // Ce test vérifie donc principalement que la signature est générée sans erreur
}

// ============================================================================
// TESTS D'ÉCHANGE DE CLÉS
// ============================================================================

async function testJoinGroup(): Promise<void> {
  const keyExchanger = new KeyExchanger();
  let requestReceived: KeyExchangeData | null = null;
  
  // Configurer le callback pour capturer la demande
  keyExchanger.setEventHandlers({
    onKeyExchangeRequest: (data) => {
      requestReceived = data;
    }
  });
  
  const groupId = 'test-group';
  const userId = 'user123';
  
  await keyExchanger.joinGroup(groupId, userId);
  
  assert(requestReceived !== null, 'Une demande d\'échange doit être générée');
  assert(requestReceived.type === 'request', 'Le type doit être "request"');
  assert(requestReceived.groupId === groupId, 'L\'ID de groupe doit correspondre');
  assert(requestReceived.fromUserId === userId, 'L\'ID utilisateur doit correspondre');
  assert(Array.isArray(requestReceived.publicKey), 'La clé publique doit être un tableau');
  assert(requestReceived.publicKey.length > 0, 'La clé publique ne doit pas être vide');
  assert(typeof requestReceived.nonce === 'string', 'Le nonce doit être une chaîne');
  assert(requestReceived.nonce.length > 0, 'Le nonce ne doit pas être vide');
  assert(typeof requestReceived.timestamp === 'number', 'Le timestamp doit être un nombre');
  assert(requestReceived.timestamp <= Date.now(), 'Le timestamp doit être récent');
}

async function testJoinGroupInvalidParams(): Promise<void> {
  const keyExchanger = new KeyExchanger();
  
  // Test avec ID de groupe vide
  try {
    await keyExchanger.joinGroup('', 'user123');
    assert(false, 'Devrait échouer avec un ID de groupe vide');
  } catch (error) {
    assert(error instanceof Error, 'Doit lever une erreur');
    assert(error.message.includes('requis'), 'L\'erreur doit mentionner les paramètres requis');
  }
  
  // Test avec ID utilisateur vide
  try {
    await keyExchanger.joinGroup('group123', '');
    assert(false, 'Devrait échouer avec un ID utilisateur vide');
  } catch (error) {
    assert(error instanceof Error, 'Doit lever une erreur');
    assert(error.message.includes('requis'), 'L\'erreur doit mentionner les paramètres requis');
  }
}

async function testLeaveGroup(): Promise<void> {
  const keyExchanger = new KeyExchanger();
  const groupId = 'test-leave-group';
  const userId1 = 'user1';
  const userId2 = 'user2';
  
  // Simuler un groupe existant avec plusieurs participants
  const mockGroupKey: GroupKeyInfo = {
    groupId,
    groupKey: await window.crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    ),
    participants: [userId1, userId2],
    keyVersion: 1,
    created: Date.now(),
    lastRotation: Date.now()
  };
  
  // Accéder directement au Map interne pour le test
  (keyExchanger as any).groupKeys.set(groupId, mockGroupKey);
  
  // Faire sortir un utilisateur
  await keyExchanger.leaveGroup(groupId, userId1);
  
  // Vérifier que l'utilisateur a été retiré
  const updatedGroup = keyExchanger.getGroupInfo(groupId);
  if (updatedGroup) {
    assert(!updatedGroup.participants.includes(userId1), 'L\'utilisateur doit être retiré');
    assert(updatedGroup.participants.includes(userId2), 'Les autres participants doivent rester');
  }
  
  // Faire sortir le dernier participant
  await keyExchanger.leaveGroup(groupId, userId2);
  
  // Le groupe doit être supprimé
  const finalGroup = keyExchanger.getGroupInfo(groupId);
  assert(finalGroup === null, 'Le groupe doit être supprimé quand il n\'y a plus de participants');
}

async function testRotateGroupKey(): Promise<void> {
  const keyExchanger = new KeyExchanger();
  const groupId = 'test-rotation';
  
  // Simuler un groupe existant
  const mockGroupKey: GroupKeyInfo = {
    groupId,
    groupKey: await window.crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    ),
    participants: ['user1', 'user2'],
    keyVersion: 1,
    created: Date.now(),
    lastRotation: Date.now() - 1000
  };
  
  (keyExchanger as any).groupKeys.set(groupId, mockGroupKey);
  
  const originalVersion = mockGroupKey.keyVersion;
  const originalRotation = mockGroupKey.lastRotation;
  
  // Effectuer la rotation
  await keyExchanger.rotateGroupKey(groupId);
  
  const updatedGroup = keyExchanger.getGroupInfo(groupId);
  assert(updatedGroup !== null, 'Le groupe doit toujours exister');
  assert(updatedGroup.keyVersion > originalVersion, 'La version de clé doit être incrémentée');
  assert(updatedGroup.lastRotation > originalRotation, 'Le timestamp de rotation doit être mis à jour');
}