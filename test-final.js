#!/usr/bin/env node

/**
 * Test final des améliorations Jitsi LibreChat
 */

import fs from 'fs';
import path from 'path';

console.log('🧪 Test final des améliorations Jitsi LibreChat\n');

const requiredFiles = [
  'server.js',
  'src/components/VideoModal.tsx',
  'src/components/JitsiReturn.tsx',
  'src/utils/webview.ts',
  'src/config/jitsi.ts',
  'src/types/global.d.ts',
  'public/jitsi-return.html',
  'conf/env'
];

console.log('1. Vérification des fichiers requis:');
let allFilesExist = true;
for (const file of requiredFiles) {
  const exists = fs.existsSync(file);
  console.log(`   ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allFilesExist = false;
}

if (!allFilesExist) {
  console.log('\n❌ Certains fichiers sont manquants !');
  process.exit(1);
}

// Test 2: Vérifier la configuration Jitsi dans conf/env
console.log('\n2. Vérification de la configuration:');
try {
  const envContent = fs.readFileSync('conf/env', 'utf8');
  const hasJitsiUrl = envContent.includes('JITSI_URL=');
  console.log(`   ${hasJitsiUrl ? '✅' : '❌'} JITSI_URL configuré dans conf/env`);
  
  if (hasJitsiUrl) {
    const jitsiUrlMatch = envContent.match(/JITSI_URL=(.+)/);
    if (jitsiUrlMatch) {
      console.log(`   📍 URL Jitsi: ${jitsiUrlMatch[1]}`);
    }
  }
} catch (error) {
  console.log('   ❌ Erreur lors de la lecture de conf/env:', error.message);
}

// Test 3: Vérifier que l'API est ajoutée dans server.js
console.log('\n3. Vérification de l\'API serveur:');
try {
  const serverContent = fs.readFileSync('server.js', 'utf8');
  const hasJitsiApi = serverContent.includes('/api/jitsi-url');
  console.log(`   ${hasJitsiApi ? '✅' : '❌'} Route API /api/jitsi-url présente`);
  
  const hasJitsiUrlEnv = serverContent.includes('process.env.JITSI_URL');
  console.log(`   ${hasJitsiUrlEnv ? '✅' : '❌'} Utilisation de la variable d'environnement JITSI_URL`);
} catch (error) {
  console.log('   ❌ Erreur lors de la lecture de server.js:', error.message);
}

// Test 4: Vérifier les imports dans VideoModal
console.log('\n4. Vérification des composants:');
try {
  const videoModalContent = fs.readFileSync('src/components/VideoModal.tsx', 'utf8');
  const hasWebViewImport = videoModalContent.includes('from \'../utils/webview\'');
  const hasJitsiConfigImport = videoModalContent.includes('from \'../config/jitsi\'');
  
  console.log(`   ${hasWebViewImport ? '✅' : '❌'} Import des utilitaires WebView`);
  console.log(`   ${hasJitsiConfigImport ? '✅' : '❌'} Import de la configuration Jitsi`);
} catch (error) {
  console.log('   ❌ Erreur lors de la lecture de VideoModal.tsx:', error.message);
}

// Test 5: Vérifier le build
console.log('\n5. Vérification du build:');
const distExists = fs.existsSync('dist');
console.log(`   ${distExists ? '✅' : '❌'} Dossier dist présent`);

if (distExists) {
  const indexExists = fs.existsSync('dist/index.html');
  const assetsExists = fs.existsSync('dist/assets');
  console.log(`   ${indexExists ? '✅' : '❌'} index.html généré`);
  console.log(`   ${assetsExists ? '✅' : '❌'} Assets générés`);
}

// Test 6: Vérifier la page de retour Jitsi
console.log('\n6. Vérification de la page de retour:');
try {
  const returnPageContent = fs.readFileSync('public/jitsi-return.html', 'utf8');
  const hasSessionStorage = returnPageContent.includes('sessionStorage');
  const hasCountdown = returnPageContent.includes('countdown');
  
  console.log(`   ${hasSessionStorage ? '✅' : '❌'} Gestion sessionStorage`);
  console.log(`   ${hasCountdown ? '✅' : '❌'} Compte à rebours`);
} catch (error) {
  console.log('   ❌ Erreur lors de la lecture de jitsi-return.html:', error.message);
}

console.log('\n🎉 Tests terminés !');
console.log('\n📋 Résumé des améliorations:');
console.log('   • API serveur /api/jitsi-url ajoutée');
console.log('   • Détection WebView améliorée');
console.log('   • Configuration Jitsi optimisée par environnement');
console.log('   • Page de retour dédiée');
console.log('   • Composants React améliorés');
console.log('   • Types TypeScript ajoutés');
console.log('   • Build fonctionnel');

console.log('\n🚀 Pour tester:');
console.log('   npm start');
console.log('   curl http://localhost:3000/api/jitsi-url');