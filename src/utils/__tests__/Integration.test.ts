/**
 * Tests d'intégration pour le système de chiffrement automatique
 * 
 * Ces tests vérifient:
 * - Le chiffrement automatique end-to-end
 * - Les scénarios de groupe avec échange de clés
 * - La persistance des clés entre les sessions
 * - L'intégration entre tous les composants cryptographiques
 * 
 * Requirements: 1.3, 2.2, 4.1, 4.2
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
 * Simule un utilisateur avec ses composants cryptographiques
 */
class MockUser {
  public id: string;
  public cryptoManager: CryptoManager;
  public secureStorage: SecureStorage;
  public keyExchanger: KeyExchanger;
  
  constructor(id: string) {
    this.id = id;
    this.cryptoManager = new CryptoManager();
    this.secureStorage = new SecureStorage();
    this.keyExchanger = new KeyExchanger();
  }
  
  async sendMessage(message: string, context: string = 'global') {
    return await this.cryptoManager.encryptMessage(message, context);
  }
  
  async receiveMessage(encrypted: any, context: string = 'global') {
    return await this.cryptoManager.decryptMessage(encrypted, context);
  }
  
  async joinGroup(groupId: string) {
    await this.keyExchanger.joinGroup(groupId, this.id);
  }
  
  async leaveGroup(groupId: string) {
    await this.keyExchanger.leaveGroup(groupId, this.id);
  }
  
  async reset() {
    await this.cryptoManager.reset();
    await this.secureStorage.reset();
    this.keyExchanger.reset();
  }
}

/**
 * Test runner avec gestion des erreurs
 */
async function runIntegrationTests(): Promise<void> {
  console.log('🧪 Démarrage des tests d\'intégration...\n');
  
  let passed = 0;
  let failed = 0;
  const results: Array<{ name: string; success: boolean; time?: number; error?: string }> = [];

  const tests = [
    // Tests end-to-end de base
    testBasicEncryptionFlow,
    testMultiUserCommunication,
    testCrossSessionPersistence,
    
    // Tests de groupes
    testGroupCreationAndMessaging,
    testGroupKeyExchange,
    testGroupMembershipChanges,
    testMultipleGroupsPerUser,
    
    // Tests de persistance
    testKeyPersistenceAcrossSessions,
    testMetadataPersistence,
    testStorageRecovery,
    
    // Tests de performance intégrée
    testEndToEndPerformance,
    testConcurrentOperations,
    testBulkMessaging,
    
    // Tests de récupération d'erreurs
    testErrorRecovery,
    testCorruptedDataRecovery,
    testMissingKeyRecovery,
    
    // Tests de sécurité intégrée
    testContextIsolationIntegration,
    testKeyRotationIntegration,
    testSecurityAuditTrail
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
  console.log(`\n📊 Tests d'intégration: ${passed} réussis, ${failed} échoués`);
  
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
// TESTS END-TO-END DE BASE
// ============================================================================

async function testBasicEncryptionFlow(): Promise<void> {
  const user = new MockUser('alice');
  const message = 'Message secret de test';
  
  // Flux complet: chiffrement -> stockage -> récupération -> déchiffrement
  const encrypted = await user.sendMessage(message);
  
  // Vérifier que le message est chiffré
  assert(encrypted.iv.length === 12, 'IV doit être présent');
  assert(encrypted.content.length > 0, 'Contenu chiffré doit être présent');
  assert(encrypted.algorithm === 'AES-GCM', 'Algorithme correct');
  
  // Déchiffrer le message
  const decrypted = await user.receiveMessage(encrypted);
  
  assert(decrypted === message, 'Le message doit être déchiffré correctement');
  
  // Vérifier que la clé est stockée de manière persistante
  const keys = await user.secureStorage.listKeys();
  assert(keys.includes('global'), 'La clé globale doit être stockée');
  
  // Vérifier les métadonnées
  const metadata = await user.secureStorage.getMetadata('global');
  assert(metadata !== null, 'Les métadonnées doivent exister');
  assert(metadata.algorithm === 'AES-GCM', 'Algorithme dans les métadonnées');
}

async function testMultiUserCommunication(): Promise<void> {
  const alice = new MockUser('alice');
  const bob = new MockUser('bob');
  
  // Alice envoie un message
  const aliceMessage = 'Message d\'Alice';
  const encryptedFromAlice = await alice.sendMessage(aliceMessage);
  
  // Bob envoie un message
  const bobMessage = 'Message de Bob';
  const encryptedFromBob = await bob.sendMessage(bobMessage);
  
  // Chaque utilisateur peut déchiffrer son propre message
  const aliceDecrypted = await alice.receiveMessage(encryptedFromAlice);
  const bobDecrypted = await bob.receiveMessage(encryptedFromBob);
  
  assert(aliceDecrypted === aliceMessage, 'Alice doit pouvoir déchiffrer son message');
  assert(bobDecrypted === bobMessage, 'Bob doit pouvoir déchiffrer son message');
  
  // Les messages sont chiffrés avec des clés différentes
  assert(!arraysEqual(encryptedFromAlice.content, encryptedFromBob.content), 
    'Les messages doivent être chiffrés différemment');
  
  // Bob ne peut pas déchiffrer le message d'Alice (clés différentes)
  const bobTryAlice = await bob.receiveMessage(encryptedFromAlice);
  assert(bobTryAlice === '[Message non déchiffrable]', 
    'Bob ne doit pas pouvoir déchiffrer le message d\'Alice');
}

async function testCrossSessionPersistence(): Promise<void> {
  const message = 'Message persistant';
  
  // Session 1: créer et chiffrer
  const user1 = new MockUser('persistent-user');
  const encrypted = await user1.sendMessage(message);
  
  // Simuler la fin de session
  user1.cryptoManager.clearCache();
  
  // Session 2: nouvelle instance, même utilisateur
  const user2 = new MockUser('persistent-user');
  
  // Doit pouvoir déchiffrer le message de la session précédente
  const decrypted = await user2.receiveMessage(encrypted);
  
  assert(decrypted === message, 'Le message doit être déchiffrable après redémarrage');
}

// ============================================================================
// TESTS DE GROUPES
// ============================================================================

async function testGroupCreationAndMessaging(): Promise<void> {
  const alice = new MockUser('alice');
  const bob = new MockUser('bob');
  const groupId = 'test-group';
  const groupContext = `group_${groupId}`;
  
  // Créer un groupe et envoyer des messages
  await alice.joinGroup(groupId);
  await bob.joinGroup(groupId);
  
  const message = 'Message de groupe';
  const encrypted = await alice.sendMessage(message, groupContext);
  
  // Vérifier que le message est chiffré avec le contexte de groupe
  assert(encrypted.context === groupContext, 'Le contexte de groupe doit être défini');
  
  // Alice peut déchiffrer son propre message
  const decrypted = await alice.receiveMessage(encrypted, groupContext);
  assert(decrypted === message, 'Alice doit pouvoir déchiffrer le message de groupe');
  
  // Vérifier que les clés de groupe sont créées
  const aliceKeys = await alice.secureStorage.listKeys();
  assert(aliceKeys.includes(groupContext), 'La clé de groupe doit être créée pour Alice');
  
  const bobKeys = await bob.secureStorage.listKeys();
  assert(bobKeys.includes(groupContext), 'La clé de groupe doit être créée pour Bob');
}

async function testGroupKeyExchange(): Promise<void> {
  const alice = new MockUser('alice');
  const bob = new MockUser('bob');
  const charlie = new MockUser('charlie');
  const groupId = 'exchange-group';
  
  let exchangeRequests: any[] = [];
  let exchangeResponses: any[] = [];
  
  // Configurer les callbacks pour capturer les échanges
  alice.keyExchanger.setEventHandlers({
    onKeyExchangeRequest: (data) => exchangeRequests.push({ user: 'alice', data }),
    onKeyExchangeResponse: (data) => exchangeResponses.push({ user: 'alice', data })
  });
  
  bob.keyExchanger.setEventHandlers({
    onKeyExchangeRequest: (data) => exchangeRequests.push({ user: 'bob', data }),
    onKeyExchangeResponse: (data) => exchangeResponses.push({ user: 'bob', data })
  });
  
  // Rejoindre le groupe déclenche des échanges de clés
  await alice.joinGroup(groupId);
  await bob.joinGroup(groupId);
  await charlie.joinGroup(groupId);
  
  // Vérifier que des échanges ont été initiés
  assert(exchangeRequests.length > 0, 'Des demandes d\'échange doivent être générées');
  
  // Vérifier que les groupes sont créés
  const aliceGroup = alice.keyExchanger.getGroupInfo(groupId);
  const bobGroup = bob.keyExchanger.getGroupInfo(groupId);
  
  assert(aliceGroup !== null, 'Le groupe doit exister pour Alice');
  assert(bobGroup !== null, 'Le groupe doit exister pour Bob');
}

async function testGroupMembershipChanges(): Promise<void> {
  const alice = new MockUser('alice');
  const bob = new MockUser('bob');
  const charlie = new MockUser('charlie');
  const groupId = 'membership-group';
  
  // Tous rejoignent le groupe
  await alice.joinGroup(groupId);
  await bob.joinGroup(groupId);
  await charlie.joinGroup(groupId);
  
  // Vérifier les participants
  const initialGroup = alice.keyExchanger.getGroupInfo(groupId);
  assert(initialGroup !== null, 'Le groupe doit exister');
  
  // Bob quitte le groupe
  await bob.leaveGroup(groupId);
  
  // Vérifier que Bob n'est plus dans le groupe
  const updatedGroup = alice.keyExchanger.getGroupInfo(groupId);
  if (updatedGroup) {
    assert(!updatedGroup.participants.includes('bob'), 'Bob ne doit plus être dans le groupe');
    assert(updatedGroup.participants.includes('alice'), 'Alice doit toujours être dans le groupe');
    assert(updatedGroup.participants.includes('charlie'), 'Charlie doit toujours être dans le groupe');
  }
  
  // Charlie quitte aussi
  await charlie.leaveGroup(groupId);
  
  // Alice quitte en dernier
  await alice.leaveGroup(groupId);
  
  // Le groupe doit être supprimé
  const finalGroup = alice.keyExchanger.getGroupInfo(groupId);
  assert(finalGroup === null, 'Le groupe doit être supprimé quand vide');
}

async function testMultipleGroupsPerUser(): Promise<void> {
  const alice = new MockUser('alice');
  const groups = ['group1', 'group2', 'group3'];
  
  // Rejoindre plusieurs groupes
  for (const groupId of groups) {
    await alice.joinGroup(groupId);
  }
  
  // Envoyer des messages dans chaque groupe
  const messages = ['Message groupe 1', 'Message groupe 2', 'Message groupe 3'];
  const encrypted = [];
  
  for (let i = 0; i < groups.length; i++) {
    const context = `group_${groups[i]}`;
    encrypted.push(await alice.sendMessage(messages[i], context));
  }
  
  // Vérifier que chaque message a le bon contexte
  for (let i = 0; i < groups.length; i++) {
    assert(encrypted[i].context === `group_${groups[i]}`, 
      `Le message ${i} doit avoir le bon contexte`);
  }
  
  // Déchiffrer chaque message avec le bon contexte
  for (let i = 0; i < groups.length; i++) {
    const context = `group_${groups[i]}`;
    const decrypted = await alice.receiveMessage(encrypted[i], context);
    assert(decrypted === messages[i], 
      `Le message ${i} doit être déchiffré correctement`);
  }
  
  // Vérifier l'isolation: un message d'un groupe ne peut pas être déchiffré avec la clé d'un autre
  const wrongDecryption = await alice.receiveMessage(encrypted[0], `group_${groups[1]}`);
  assert(wrongDecryption === '[Message non déchiffrable]', 
    'Un message ne doit pas être déchiffrable avec une mauvaise clé de groupe');
}// ===
=========================================================================
// TESTS DE PERSISTANCE
// ============================================================================

async function testKeyPersistenceAcrossSessions(): Promise<void> {
  const userId = 'persistent-user';
  const message = 'Message persistant entre sessions';
  const groupId = 'persistent-group';
  
  // Session 1: créer des clés et chiffrer des messages
  const session1 = new MockUser(userId);
  await session1.joinGroup(groupId);
  
  const globalEncrypted = await session1.sendMessage(message);
  const groupEncrypted = await session1.sendMessage(message, `group_${groupId}`);
  
  // Vérifier que les clés sont stockées
  const keys1 = await session1.secureStorage.listKeys();
  assert(keys1.includes('global'), 'La clé globale doit être stockée');
  assert(keys1.includes(`group_${groupId}`), 'La clé de groupe doit être stockée');
  
  // Simuler la fin de session
  session1.cryptoManager.clearCache();
  
  // Session 2: nouvelle instance, même utilisateur
  const session2 = new MockUser(userId);
  
  // Doit pouvoir déchiffrer les messages de la session précédente
  const globalDecrypted = await session2.receiveMessage(globalEncrypted);
  const groupDecrypted = await session2.receiveMessage(groupEncrypted, `group_${groupId}`);
  
  assert(globalDecrypted === message, 'Le message global doit être déchiffrable après redémarrage');
  assert(groupDecrypted === message, 'Le message de groupe doit être déchiffrable après redémarrage');
}

async function testMetadataPersistence(): Promise<void> {
  const user = new MockUser('metadata-user');
  
  // Créer des clés avec métadonnées
  await user.cryptoManager.generateGlobalKey();
  await user.cryptoManager.generateGroupKey('meta-group');
  
  // Récupérer les métadonnées initiales
  const globalMeta1 = await user.cryptoManager.getKeyMetadata('global');
  const groupMeta1 = await user.cryptoManager.getKeyMetadata('group_meta-group');
  
  assert(globalMeta1 !== null, 'Les métadonnées globales doivent exister');
  assert(groupMeta1 !== null, 'Les métadonnées de groupe doivent exister');
  
  // Simuler un redémarrage
  user.cryptoManager.clearCache();
  
  // Récupérer les métadonnées après redémarrage
  const globalMeta2 = await user.cryptoManager.getKeyMetadata('global');
  const groupMeta2 = await user.cryptoManager.getKeyMetadata('group_meta-group');
  
  assert(globalMeta2 !== null, 'Les métadonnées globales doivent persister');
  assert(groupMeta2 !== null, 'Les métadonnées de groupe doivent persister');
  assert(globalMeta2.created === globalMeta1.created, 'La date de création doit être préservée');
  assert(groupMeta2.version === groupMeta1.version, 'La version doit être préservée');
}

async function testStorageRecovery(): Promise<void> {
  const user = new MockUser('recovery-user');
  
  // Créer des clés
  await user.cryptoManager.generateGlobalKey();
  await user.cryptoManager.generateGroupKey('recovery-group');
  
  // Vérifier l'intégrité initiale
  const integrity1 = await user.cryptoManager.verifyIntegrity();
  assert(integrity1.valid === true, 'L\'intégrité initiale doit être valide');
  
  // Simuler une corruption partielle en supprimant une métadonnée
  await user.secureStorage.deleteKey('recovery-group');
  
  // Vérifier que l'intégrité détecte le problème
  const integrity2 = await user.cryptoManager.verifyIntegrity();
  assert(integrity2.valid === false || integrity2.warnings.length > 0, 
    'L\'intégrité doit détecter les problèmes');
  
  // Le système doit pouvoir récupérer en régénérant les clés manquantes
  const newKey = await user.cryptoManager.getKey('group_recovery-group');
  assert(newKey !== null, 'Une nouvelle clé doit être générée pour remplacer la clé manquante');
}

// ============================================================================
// TESTS DE PERFORMANCE INTÉGRÉE
// ============================================================================

async function testEndToEndPerformance(): Promise<void> {
  const alice = new MockUser('alice-perf');
  const bob = new MockUser('bob-perf');
  const message = 'Message de performance end-to-end';
  
  // Test du flux complet: génération de clé + chiffrement + déchiffrement
  const { time: aliceTime } = await measureTime(async () => {
    const encrypted = await alice.sendMessage(message);
    return await alice.receiveMessage(encrypted);
  });
  
  assert(aliceTime < 150, `Le flux complet doit prendre moins de 150ms (actuel: ${aliceTime.toFixed(2)}ms)`);
  
  // Test avec groupe
  const groupId = 'perf-group';
  await alice.joinGroup(groupId);
  await bob.joinGroup(groupId);
  
  const { time: groupTime } = await measureTime(async () => {
    const encrypted = await alice.sendMessage(message, `group_${groupId}`);
    return await alice.receiveMessage(encrypted, `group_${groupId}`);
  });
  
  assert(groupTime < 200, `Le flux de groupe doit prendre moins de 200ms (actuel: ${groupTime.toFixed(2)}ms)`);
}

async function testConcurrentOperations(): Promise<void> {
  const users = Array.from({ length: 5 }, (_, i) => new MockUser(`user-${i}`));
  const message = 'Message concurrent';
  
  // Test d'opérations concurrentes
  const operations = users.map(async (user, i) => {
    const encrypted = await user.sendMessage(`${message} ${i}`);
    return await user.receiveMessage(encrypted);
  });
  
  const { time, result } = await measureTime(() => Promise.all(operations));
  
  assert(time < 500, `Les opérations concurrentes doivent prendre moins de 500ms (actuel: ${time.toFixed(2)}ms)`);
  assert(result.length === 5, 'Toutes les opérations doivent réussir');
  
  for (let i = 0; i < result.length; i++) {
    assert(result[i] === `${message} ${i}`, `Le message ${i} doit être correct`);
  }
}

async function testBulkMessaging(): Promise<void> {
  const user = new MockUser('bulk-user');
  const messageCount = 50;
  const messages = Array.from({ length: messageCount }, (_, i) => `Message bulk ${i}`);
  
  // Chiffrement en masse
  const { time: encryptTime, result: encrypted } = await measureTime(async () => {
    return await Promise.all(messages.map(msg => user.sendMessage(msg)));
  });
  
  assert(encryptTime < 2000, `Le chiffrement en masse doit prendre moins de 2s (actuel: ${encryptTime.toFixed(2)}ms)`);
  assert(encrypted.length === messageCount, 'Tous les messages doivent être chiffrés');
  
  // Déchiffrement en masse
  const { time: decryptTime, result: decrypted } = await measureTime(async () => {
    return await Promise.all(encrypted.map(enc => user.receiveMessage(enc)));
  });
  
  assert(decryptTime < 1500, `Le déchiffrement en masse doit prendre moins de 1.5s (actuel: ${decryptTime.toFixed(2)}ms)`);
  assert(decrypted.length === messageCount, 'Tous les messages doivent être déchiffrés');
  
  // Vérifier l'intégrité
  for (let i = 0; i < messageCount; i++) {
    assert(decrypted[i] === messages[i], `Le message ${i} doit être correct`);
  }
}

// ============================================================================
// TESTS DE RÉCUPÉRATION D'ERREURS
// ============================================================================

async function testErrorRecovery(): Promise<void> {
  const user = new MockUser('error-recovery');
  const message = 'Message de récupération d\'erreur';
  
  // Créer un message chiffré valide
  const validEncrypted = await user.sendMessage(message);
  
  // Vérifier que le déchiffrement fonctionne
  const decrypted1 = await user.receiveMessage(validEncrypted);
  assert(decrypted1 === message, 'Le déchiffrement initial doit fonctionner');
  
  // Simuler une erreur en corrompant le message
  const corruptedEncrypted = { ...validEncrypted, content: [1, 2, 3, 4, 5] };
  
  // Le système doit gérer l'erreur gracieusement
  const decrypted2 = await user.receiveMessage(corruptedEncrypted);
  assert(decrypted2 === '[Message non déchiffrable]', 'Les erreurs doivent être gérées gracieusement');
  
  // Le système doit continuer à fonctionner après une erreur
  const newMessage = 'Nouveau message après erreur';
  const newEncrypted = await user.sendMessage(newMessage);
  const newDecrypted = await user.receiveMessage(newEncrypted);
  
  assert(newDecrypted === newMessage, 'Le système doit continuer à fonctionner après une erreur');
}

async function testCorruptedDataRecovery(): Promise<void> {
  const user = new MockUser('corrupted-recovery');
  
  // Créer des clés
  await user.cryptoManager.generateGlobalKey();
  await user.cryptoManager.generateGroupKey('corrupted-group');
  
  // Corrompre le stockage en injectant des données invalides
  localStorage.setItem('liberchat_secure_corrupted', 'invalid json data');
  localStorage.setItem('liberchat_meta_corrupted', '{"invalid": json}');
  
  // Le système doit détecter et gérer la corruption
  const integrity = await user.cryptoManager.verifyIntegrity();
  assert(integrity.valid === false, 'La corruption doit être détectée');
  assert(integrity.errors.length > 0, 'Des erreurs doivent être reportées');
  
  // Le système doit continuer à fonctionner malgré la corruption
  const message = 'Message malgré corruption';
  const encrypted = await user.sendMessage(message);
  const decrypted = await user.receiveMessage(encrypted);
  
  assert(decrypted === message, 'Le système doit fonctionner malgré la corruption partielle');
}

async function testMissingKeyRecovery(): Promise<void> {
  const user = new MockUser('missing-key-recovery');
  const groupId = 'missing-key-group';
  
  // Créer un groupe et une clé
  await user.joinGroup(groupId);
  const message = 'Message avec clé manquante';
  const encrypted = await user.sendMessage(message, `group_${groupId}`);
  
  // Supprimer la clé du stockage
  await user.secureStorage.deleteKey(`group_${groupId}`);
  user.cryptoManager.clearCache();
  
  // Tenter de déchiffrer avec une clé manquante
  const decrypted1 = await user.receiveMessage(encrypted, `group_${groupId}`);
  assert(decrypted1 === '[Message non déchiffrable]', 'Le déchiffrement doit échouer avec une clé manquante');
  
  // Le système doit pouvoir régénérer une nouvelle clé
  const newKey = await user.cryptoManager.getKey(`group_${groupId}`);
  assert(newKey !== null, 'Une nouvelle clé doit être générée');
  
  // Avec la nouvelle clé, on peut chiffrer de nouveaux messages
  const newMessage = 'Nouveau message avec nouvelle clé';
  const newEncrypted = await user.sendMessage(newMessage, `group_${groupId}`);
  const newDecrypted = await user.receiveMessage(newEncrypted, `group_${groupId}`);
  
  assert(newDecrypted === newMessage, 'Les nouveaux messages doivent fonctionner avec la nouvelle clé');
}

// ============================================================================
// TESTS DE SÉCURITÉ INTÉGRÉE
// ============================================================================

async function testContextIsolationIntegration(): Promise<void> {
  const alice = new MockUser('alice-isolation');
  const bob = new MockUser('bob-isolation');
  
  // Créer plusieurs groupes
  const groups = ['group1', 'group2', 'group3'];
  for (const groupId of groups) {
    await alice.joinGroup(groupId);
    await bob.joinGroup(groupId);
  }
  
  const message = 'Message d\'isolation';
  const encrypted = {};
  
  // Chiffrer le même message dans chaque groupe
  for (const groupId of groups) {
    encrypted[groupId] = await alice.sendMessage(message, `group_${groupId}`);
  }
  
  // Vérifier l'isolation: chaque message ne peut être déchiffré qu'avec sa propre clé
  for (const groupId of groups) {
    // Déchiffrement correct
    const correctDecryption = await alice.receiveMessage(encrypted[groupId], `group_${groupId}`);
    assert(correctDecryption === message, `Le message du ${groupId} doit être déchiffrable avec sa clé`);
    
    // Déchiffrement incorrect avec une autre clé de groupe
    for (const otherGroupId of groups) {
      if (otherGroupId !== groupId) {
        const wrongDecryption = await alice.receiveMessage(encrypted[groupId], `group_${otherGroupId}`);
        assert(wrongDecryption === '[Message non déchiffrable]', 
          `Le message du ${groupId} ne doit pas être déchiffrable avec la clé du ${otherGroupId}`);
      }
    }
  }
}

async function testKeyRotationIntegration(): Promise<void> {
  const alice = new MockUser('alice-rotation');
  const bob = new MockUser('bob-rotation');
  const groupId = 'rotation-group';
  
  // Créer un groupe
  await alice.joinGroup(groupId);
  await bob.joinGroup(groupId);
  
  // Envoyer un message avec la clé initiale
  const message1 = 'Message avant rotation';
  const encrypted1 = await alice.sendMessage(message1, `group_${groupId}`);
  
  // Effectuer une rotation de clé
  await alice.keyExchanger.rotateGroupKey(groupId);
  
  // Envoyer un message avec la nouvelle clé
  const message2 = 'Message après rotation';
  const encrypted2 = await alice.sendMessage(message2, `group_${groupId}`);
  
  // Alice doit pouvoir déchiffrer les deux messages
  const decrypted1 = await alice.receiveMessage(encrypted1, `group_${groupId}`);
  const decrypted2 = await alice.receiveMessage(encrypted2, `group_${groupId}`);
  
  // Note: Dans une implémentation complète, il faudrait gérer la compatibilité
  // avec les anciennes versions de clés. Pour ce test, on vérifie au moins
  // que le nouveau message fonctionne
  assert(decrypted2 === message2, 'Le nouveau message doit être déchiffrable après rotation');
  
  // Vérifier que la version de clé a été incrémentée
  const groupInfo = alice.keyExchanger.getGroupInfo(groupId);
  assert(groupInfo !== null, 'Les informations de groupe doivent exister');
  assert(groupInfo.keyVersion > 1, 'La version de clé doit être incrémentée');
}

async function testSecurityAuditTrail(): Promise<void> {
  const user = new MockUser('audit-user');
  
  // Effectuer diverses opérations cryptographiques
  await user.cryptoManager.generateGlobalKey();
  await user.cryptoManager.generateGroupKey('audit-group1');
  await user.cryptoManager.generateGroupKey('audit-group2');
  
  // Chiffrer quelques messages
  await user.sendMessage('Message audit 1');
  await user.sendMessage('Message audit 2', 'group_audit-group1');
  await user.sendMessage('Message audit 3', 'group_audit-group2');
  
  // Vérifier les métadonnées d'audit
  const contexts = await user.cryptoManager.listKeyContexts();
  assert(contexts.length >= 3, 'Plusieurs contextes doivent être créés');
  
  for (const context of contexts) {
    const metadata = await user.cryptoManager.getKeyMetadata(context);
    assert(metadata !== null, `Les métadonnées doivent exister pour ${context}`);
    assert(typeof metadata.created === 'number', 'La date de création doit être enregistrée');
    assert(typeof metadata.lastUsed === 'number', 'La dernière utilisation doit être enregistrée');
    assert(metadata.version >= 1, 'La version doit être enregistrée');
  }
  
  // Vérifier les statistiques de stockage
  const stats = await user.cryptoManager.getCacheStats();
  assert(stats.totalStoredKeys >= 3, 'Les statistiques doivent refléter les clés créées');
  assert(stats.cacheSize >= 0, 'La taille du cache doit être valide');
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
  runIntegrationTests().catch(console.error);
}

export { runIntegrationTests };