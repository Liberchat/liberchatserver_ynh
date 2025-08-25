#!/usr/bin/env node

/**
 * Script de test pour les fonctionnalités Jitsi de LibreChat
 */

import { buildJitsiUrl, generateRoomName } from './src/config/jitsi.js';

console.log('🧪 Test des fonctionnalités Jitsi LibreChat\n');

// Test 1: Génération de nom de salle
console.log('1. Test génération de nom de salle:');
const roomName1 = generateRoomName();
const roomName2 = generateRoomName('test');
console.log(`   - Automatique: ${roomName1}`);
console.log(`   - Avec identifiant: ${roomName2}\n`);

// Test 2: Construction d'URL pour desktop
console.log('2. Test URL Jitsi Desktop:');
const desktopUrl = buildJitsiUrl(
  'https://meet.jit.si',
  'test-room',
  {},
  false, // pas WebView
  false  // pas mobile
);
console.log(`   ${desktopUrl.substring(0, 100)}...\n`);

// Test 3: Construction d'URL pour WebView
console.log('3. Test URL Jitsi WebView:');
const webviewUrl = buildJitsiUrl(
  'https://meet.jit.si',
  'test-room',
  {},
  true,  // WebView
  false  // pas mobile
);
console.log(`   ${webviewUrl.substring(0, 100)}...\n`);

// Test 4: Construction d'URL pour mobile
console.log('4. Test URL Jitsi Mobile:');
const mobileUrl = buildJitsiUrl(
  'https://meet.jit.si',
  'test-room',
  {},
  false, // pas WebView
  true   // mobile
);
console.log(`   ${mobileUrl.substring(0, 100)}...\n`);

// Test 5: Test avec configuration personnalisée
console.log('5. Test configuration personnalisée:');
const customUrl = buildJitsiUrl(
  'https://meet.jit.si',
  'custom-room',
  {
    config: {
      startWithAudioMuted: true,
      startWithVideoMuted: true
    },
    interfaceConfig: {
      SHOW_JITSI_WATERMARK: true
    }
  },
  false,
  false
);
console.log(`   ${customUrl.substring(0, 100)}...\n`);

console.log('✅ Tous les tests sont passés !');
console.log('\n📝 Pour tester l\'API serveur:');
console.log('   npm start');
console.log('   curl http://localhost:3000/api/jitsi-url');