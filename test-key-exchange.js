/**
 * Test simple pour vérifier l'intégration de l'échange de clés
 * 
 * Ce script teste:
 * - La connexion Socket.IO
 * - L'envoi d'événements d'échange de clés
 * - La validation côté serveur
 */

import { io } from 'socket.io-client';

const SERVER_URL = 'http://localhost:3000';

async function testKeyExchange() {
  console.log('🧪 Test d\'intégration de l\'échange de clés...\n');

  // Créer deux clients pour simuler l'échange
  const client1 = io(SERVER_URL);
  const client2 = io(SERVER_URL);

  let client1Ready = false;
  let client2Ready = false;

  // Configuration du client 1
  client1.on('connect', () => {
    console.log('✅ Client 1 connecté');
    client1.emit('register', 'user1');
  });

  client1.on('init', () => {
    console.log('✅ Client 1 initialisé');
    client1Ready = true;
    checkBothReady();
  });

  // Configuration du client 2
  client2.on('connect', () => {
    console.log('✅ Client 2 connecté');
    client2.emit('register', 'user2');
  });

  client2.on('init', () => {
    console.log('✅ Client 2 initialisé');
    client2Ready = true;
    checkBothReady();
  });

  // Gestionnaires d'événements d'échange de clés
  client1.on('key-exchange-request', (data) => {
    console.log('📨 Client 1 a reçu une demande d\'échange:', data);
  });

  client2.on('key-exchange-request', (data) => {
    console.log('📨 Client 2 a reçu une demande d\'échange:', data);
  });

  client1.on('key-exchange-response', (data) => {
    console.log('📨 Client 1 a reçu une réponse d\'échange:', data);
  });

  client2.on('key-exchange-response', (data) => {
    console.log('📨 Client 2 a reçu une réponse d\'échange:', data);
  });

  client1.on('key-exchange-error', (data) => {
    console.log('❌ Client 1 erreur d\'échange:', data);
  });

  client2.on('key-exchange-error', (data) => {
    console.log('❌ Client 2 erreur d\'échange:', data);
  });

  function checkBothReady() {
    if (client1Ready && client2Ready) {
      setTimeout(runTests, 1000);
    }
  }

  async function runTests() {
    console.log('\n🚀 Démarrage des tests...\n');

    // Test 1: Créer un groupe et faire rejoindre les deux clients
    console.log('Test 1: Création de groupe et adhésion');
    
    const groupId = 1; // ID de groupe de test
    
    client1.emit('join group', groupId);
    client2.emit('join group', groupId);
    
    await new Promise(resolve => setTimeout(resolve, 500));

    // Test 2: Envoyer une demande d'échange de clés invalide
    console.log('\nTest 2: Demande d\'échange invalide');
    
    client1.emit('key-exchange-request', {
      groupId: groupId.toString(),
      fromUserId: 'user1',
      // publicKey manquante
      timestamp: Date.now(),
      nonce: 'test-nonce-1'
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    // Test 3: Envoyer une demande d'échange de clés valide
    console.log('\nTest 3: Demande d\'échange valide');
    
    const mockPublicKey = new Array(65).fill(0).map((_, i) => i % 256);
    
    client1.emit('key-exchange-request', {
      groupId: groupId.toString(),
      fromUserId: 'user1',
      publicKey: mockPublicKey,
      timestamp: Date.now(),
      nonce: 'test-nonce-2'
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    // Test 4: Envoyer une réponse d'échange
    console.log('\nTest 4: Réponse d\'échange');
    
    client2.emit('key-exchange-response', {
      groupId: groupId.toString(),
      toUserId: 'user1',
      publicKey: mockPublicKey,
      timestamp: Date.now(),
      nonce: 'test-nonce-3'
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    // Test 5: Distribution de clé
    console.log('\nTest 5: Distribution de clé');
    
    client1.emit('key-distribution', {
      groupId: groupId.toString(),
      toUserId: 'user2',
      publicKey: mockPublicKey,
      timestamp: Date.now(),
      nonce: 'test-nonce-4'
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('\n✅ Tests terminés');
    
    // Nettoyer
    client1.disconnect();
    client2.disconnect();
    
    process.exit(0);
  }

  // Gestion des erreurs
  client1.on('error', (error) => {
    console.error('❌ Erreur client 1:', error);
  });

  client2.on('error', (error) => {
    console.error('❌ Erreur client 2:', error);
  });

  // Timeout de sécurité
  setTimeout(() => {
    console.log('⏰ Timeout - Arrêt des tests');
    client1.disconnect();
    client2.disconnect();
    process.exit(1);
  }, 10000);
}

// Lancer les tests
testKeyExchange().catch(console.error);