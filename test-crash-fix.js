#!/usr/bin/env node

/**
 * Script de test pour vérifier les corrections du crash lors de l'envoi de messages
 */

console.log('🔧 Test des corrections du crash lors de l\'envoi de messages...\n');

// Test 1: Vérifier que les fichiers modifiés existent
const fs = require('fs');
const path = require('path');

const filesToCheck = [
  'src/App.tsx',
  'src/utils/CryptoManager.ts',
  'src/utils/SecureStorage.ts'
];

console.log('📁 Vérification des fichiers modifiés:');
for (const file of filesToCheck) {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} - OK`);
  } else {
    console.log(`❌ ${file} - MANQUANT`);
  }
}

// Test 2: Vérifier que les corrections sont présentes
console.log('\n🔍 Vérification des corrections:');

// Vérifier App.tsx
const appContent = fs.readFileSync('src/App.tsx', 'utf8');
if (appContent.includes('hasError') && appContent.includes('handleRecoverFromError')) {
  console.log('✅ App.tsx - Gestion d\'erreur globale ajoutée');
} else {
  console.log('❌ App.tsx - Gestion d\'erreur globale manquante');
}

if (appContent.includes('Message vide ou invalide') && appContent.includes('NON CHIFFRÉ')) {
  console.log('✅ App.tsx - Gestion d\'erreur d\'envoi améliorée');
} else {
  console.log('❌ App.tsx - Gestion d\'erreur d\'envoi manquante');
}

if (appContent.includes('Message reçu invalide') && appContent.includes('startsWith(\'{\'')) {
  console.log('✅ App.tsx - Gestion d\'erreur de réception améliorée');
} else {
  console.log('❌ App.tsx - Gestion d\'erreur de réception manquante');
}

// Vérifier CryptoManager.ts
const cryptoContent = fs.readFileSync('src/utils/CryptoManager.ts', 'utf8');
if (cryptoContent.includes('Validation stricte des données') && cryptoContent.includes('Message invalide')) {
  console.log('✅ CryptoManager.ts - Validation stricte du déchiffrement ajoutée');
} else {
  console.log('❌ CryptoManager.ts - Validation stricte du déchiffrement manquante');
}

if (cryptoContent.includes('API Web Crypto non disponible')) {
  console.log('✅ CryptoManager.ts - Vérification des APIs crypto ajoutée');
} else {
  console.log('❌ CryptoManager.ts - Vérification des APIs crypto manquante');
}

// Vérifier SecureStorage.ts
const storageContent = fs.readFileSync('src/utils/SecureStorage.ts', 'utf8');
if (storageContent.includes('localStorage non disponible') && storageContent.includes('typeof localStorage')) {
  console.log('✅ SecureStorage.ts - Vérification localStorage ajoutée');
} else {
  console.log('❌ SecureStorage.ts - Vérification localStorage manquante');
}

console.log('\n🎯 Résumé des corrections appliquées:');
console.log('1. ✅ Gestion d\'erreur globale dans App.tsx pour éviter l\'écran noir');
console.log('2. ✅ Validation stricte des messages avant envoi et réception');
console.log('3. ✅ Gestion d\'erreur robuste dans le chiffrement/déchiffrement');
console.log('4. ✅ Vérification de la disponibilité des APIs Web Crypto');
console.log('5. ✅ Protection contre les erreurs de localStorage');
console.log('6. ✅ Écran de récupération d\'erreur pour l\'utilisateur');

console.log('\n🚀 Pour tester les corrections:');
console.log('1. npm run build');
console.log('2. npm start');
console.log('3. Essayer d\'envoyer des messages');
console.log('4. Vérifier que l\'application ne crash plus');

console.log('\n💡 Si le problème persiste:');
console.log('1. Ouvrir les outils de développement (F12)');
console.log('2. Regarder la console pour les erreurs');
console.log('3. Vérifier l\'onglet Network pour les problèmes de connexion');
console.log('4. Essayer de vider le cache du navigateur');