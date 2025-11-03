/**
 * Tests pour DegradedModeManager
 * Requirements: 9.1, 9.2, 9.3, 9.4
 */

import { DegradedModeManager } from '../DegradedModeManager.ts';

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
  console.log('🧪 Démarrage des tests DegradedModeManager...\n');
  
  let passed = 0;
  let failed = 0;

  const tests = [
    testInitialState,
    testActivateDegradedMode,
    testDeactivateDegradedMode,
    testStateListeners,
    testNotificationListeners,
    testPlaintextMessages,
    testForceReturnToEncryption,
    testAutoRetryMechanism,
    testStats,
    testReset
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
 * Test: état initial
 */
async function testInitialState() {
  const manager = new DegradedModeManager();
  
  const state = manager.getState();
  assert(!state.isActive, 'Le mode dégradé doit être inactif initialement');
  assert(state.reason === '', 'La raison doit être vide initialement');
  assert(state.canRetryEncryption === true, 'Les tentatives doivent être autorisées initialement');
  assert(state.autoRetryAttempts === 0, 'Le compteur de tentatives doit être à 0');
  
  assert(!manager.isActive(), 'isActive() doit retourner false');
  
  const stats = manager.getStats();
  assert(!stats.isActive, 'Les stats doivent indiquer que le mode est inactif');
  assert(stats.activeSince === null, 'activeSince doit être null');
  
  manager.cleanup();
}

/**
 * Test: activation du mode dégradé
 */
async function testActivateDegradedMode() {
  const manager = new DegradedModeManager();
  let stateChangeReceived = false;
  let notificationReceived = false;
  
  // Ajouter des listeners
  manager.addStateListener((state) => {
    stateChangeReceived = true;
    assert(state.isActive, 'L\'état doit indiquer que le mode est actif');
    assert(state.reason === 'Test reason', 'La raison doit être correcte');
  });
  
  manager.addNotificationListener((notification) => {
    notificationReceived = true;
    assert(notification.type === 'warning', 'Le type de notification doit être warning');
    assert(notification.title.includes('Mode non sécurisé'), 'Le titre doit mentionner le mode non sécurisé');
    assert(notification.persistent === true, 'La notification doit être persistante');
    assert(notification.actions && notification.actions.length > 0, 'Des actions doivent être disponibles');
  });
  
  await manager.activateDegradedMode('Test reason', 'test-context');
  
  assert(manager.isActive(), 'Le mode dégradé doit être actif');
  assert(stateChangeReceived, 'Un changement d\'état doit avoir été notifié');
  assert(notificationReceived, 'Une notification doit avoir été envoyée');
  
  const state = manager.getState();
  assert(state.context === 'test-context', 'Le contexte doit être correct');
  assert(state.timestamp > 0, 'Le timestamp doit être défini');
  
  manager.cleanup();
}

/**
 * Test: désactivation du mode dégradé
 */
async function testDeactivateDegradedMode() {
  const manager = new DegradedModeManager();
  let deactivationNotified = false;
  
  // Activer d'abord
  await manager.activateDegradedMode('Test');
  assert(manager.isActive(), 'Le mode doit être actif');
  
  // Ajouter un listener pour la désactivation
  manager.addStateListener((state) => {
    if (!state.isActive) {
      deactivationNotified = true;
    }
  });
  
  await manager.deactivateDegradedMode();
  
  assert(!manager.isActive(), 'Le mode dégradé doit être inactif');
  assert(deactivationNotified, 'La désactivation doit avoir été notifiée');
  
  const state = manager.getState();
  assert(state.reason === '', 'La raison doit être effacée');
  assert(state.timestamp === 0, 'Le timestamp doit être remis à 0');
  
  manager.cleanup();
}

/**
 * Test: listeners d'état
 */
async function testStateListeners() {
  const manager = new DegradedModeManager();
  let callCount = 0;
  
  const listener1 = (state) => { callCount++; };
  const listener2 = (state) => { callCount++; };
  
  manager.addStateListener(listener1);
  manager.addStateListener(listener2);
  
  await manager.activateDegradedMode('Test');
  assert(callCount === 2, 'Les deux listeners doivent avoir été appelés');
  
  // Supprimer un listener
  manager.removeStateListener(listener1);
  callCount = 0;
  
  await manager.deactivateDegradedMode();
  assert(callCount === 1, 'Seul le listener restant doit être appelé');
  
  manager.cleanup();
}

/**
 * Test: listeners de notifications
 */
async function testNotificationListeners() {
  const manager = new DegradedModeManager();
  let notificationCount = 0;
  let lastNotification = null;
  
  const listener1 = (notif) => { 
    notificationCount++; 
    lastNotification = notif;
  };
  const listener2 = (notif) => { notificationCount++; };
  
  manager.addNotificationListener(listener1);
  manager.addNotificationListener(listener2);
  
  await manager.activateDegradedMode('Test notification');
  assert(notificationCount === 2, 'Les deux listeners de notification doivent être appelés');
  assert(lastNotification !== null, 'La dernière notification doit être enregistrée');
  assert(lastNotification.message.includes('Test notification'), 'Le message doit contenir la raison');
  
  // Supprimer un listener
  manager.removeNotificationListener(listener2);
  notificationCount = 0;
  
  await manager.deactivateDegradedMode();
  assert(notificationCount === 1, 'Seul le listener restant doit être appelé');
  
  manager.cleanup();
}

/**
 * Test: messages en texte clair
 */
async function testPlaintextMessages() {
  const manager = new DegradedModeManager();
  
  // Tenter d'envoyer un message sans mode dégradé actif
  try {
    await manager.sendPlaintextMessage('Test', 'user1');
    assert(false, 'L\'envoi devrait échouer si le mode dégradé n\'est pas actif');
  } catch (error) {
    assert(error.message.includes('mode dégradé'), 'L\'erreur doit mentionner le mode dégradé');
  }
  
  // Activer le mode dégradé
  await manager.activateDegradedMode('Test');
  
  // Envoyer un message en texte clair
  const message = await manager.sendPlaintextMessage('Hello world', 'user1', 'test-room');
  
  assert(message.content === 'Hello world', 'Le contenu doit être correct');
  assert(message.sender === 'user1', 'L\'expéditeur doit être correct');
  assert(message.context === 'test-room', 'Le contexte doit être correct');
  assert(message.degradedMode === true, 'Le flag degradedMode doit être true');
  assert(message.id.startsWith('degraded_'), 'L\'ID doit avoir le préfixe degraded_');
  assert(message.timestamp > 0, 'Le timestamp doit être défini');
  
  // Tester la détection de message en texte clair
  assert(manager.isPlaintextMessage(message), 'Le message doit être détecté comme texte clair');
  assert(!manager.isPlaintextMessage({ content: 'test' }), 'Un message normal ne doit pas être détecté comme texte clair');
  
  manager.cleanup();
}

/**
 * Test: retour forcé au chiffrement
 */
async function testForceReturnToEncryption() {
  const manager = new DegradedModeManager();
  
  // Test sans mode dégradé actif
  const result1 = await manager.forceReturnToEncryption();
  assert(result1 === true, 'Le retour doit réussir si le mode n\'est pas actif');
  
  // Activer le mode dégradé
  await manager.activateDegradedMode('Test');
  assert(manager.isActive(), 'Le mode doit être actif');
  
  // Tenter le retour au chiffrement
  // Note: Le résultat peut être true ou false selon la simulation aléatoire
  const result2 = await manager.forceReturnToEncryption();
  assert(typeof result2 === 'boolean', 'Le résultat doit être un booléen');
  
  manager.cleanup();
}

/**
 * Test: mécanisme de retry automatique
 */
async function testAutoRetryMechanism() {
  const manager = new DegradedModeManager();
  
  await manager.activateDegradedMode('Test auto retry');
  
  const state = manager.getState();
  assert(state.canRetryEncryption === true, 'Les tentatives automatiques doivent être autorisées');
  assert(state.autoRetryAttempts === 0, 'Le compteur doit être à 0 initialement');
  
  // Les tentatives automatiques sont programmées mais ne s'exécutent pas immédiatement
  // On teste juste que l'état est correct
  const stats = manager.getStats();
  assert(typeof stats.canRetryEncryption === 'boolean', 'canRetryEncryption doit être un booléen');
  assert(typeof stats.autoRetryAttempts === 'number', 'autoRetryAttempts doit être un nombre');
  
  manager.cleanup();
}

/**
 * Test: statistiques
 */
async function testStats() {
  const manager = new DegradedModeManager();
  
  // Stats initiales
  let stats = manager.getStats();
  assert(!stats.isActive, 'Le mode doit être inactif');
  assert(stats.activeSince === null, 'activeSince doit être null');
  assert(stats.reason === '', 'La raison doit être vide');
  assert(stats.autoRetryAttempts === 0, 'Les tentatives doivent être à 0');
  assert(stats.canRetryEncryption === true, 'Les tentatives doivent être autorisées');
  
  // Activer le mode dégradé
  await manager.activateDegradedMode('Test stats', 'test-context');
  
  stats = manager.getStats();
  assert(stats.isActive, 'Le mode doit être actif');
  assert(stats.activeSince !== null, 'activeSince doit être défini');
  assert(stats.reason === 'Test stats', 'La raison doit être correcte');
  assert(typeof stats.activeSince === 'number', 'activeSince doit être un timestamp');
  
  manager.cleanup();
}

/**
 * Test: réinitialisation
 */
async function testReset() {
  const manager = new DegradedModeManager();
  
  // Activer le mode dégradé
  await manager.activateDegradedMode('Test reset');
  assert(manager.isActive(), 'Le mode doit être actif');
  
  // Réinitialiser
  await manager.reset();
  
  assert(!manager.isActive(), 'Le mode doit être inactif après reset');
  
  const state = manager.getState();
  assert(state.reason === '', 'La raison doit être effacée');
  assert(state.timestamp === 0, 'Le timestamp doit être remis à 0');
  assert(state.autoRetryAttempts === 0, 'Les tentatives doivent être remises à 0');
  assert(state.canRetryEncryption === true, 'Les tentatives doivent être réautorisées');
  
  const stats = manager.getStats();
  assert(!stats.isActive, 'Les stats doivent indiquer que le mode est inactif');
  assert(stats.activeSince === null, 'activeSince doit être null');
  
  manager.cleanup();
}

// Lancer les tests si ce fichier est exécuté directement
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { runTests };