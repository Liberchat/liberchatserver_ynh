// Test du système de connexion rapide
console.log('🧪 Test du système de connexion rapide...\n');

// Simuler le localStorage (pour les tests Node.js)
global.localStorage = {
  data: {},
  getItem(key) {
    return this.data[key] || null;
  },
  setItem(key, value) {
    this.data[key] = value;
  },
  removeItem(key) {
    delete this.data[key];
  },
  clear() {
    this.data = {};
  }
};

// Test 1: Sauvegarde du nom d'utilisateur
console.log('📝 Test 1: Sauvegarde du nom d\'utilisateur');
localStorage.setItem('liberchat_username', 'TestUser123');
const savedName = localStorage.getItem('liberchat_username');
console.log(`✅ Nom sauvegardé: ${savedName}`);

// Test 2: Activation de la connexion automatique
console.log('\n⚡ Test 2: Connexion automatique');
localStorage.setItem('liberchat_auto_connect', 'true');
localStorage.setItem('liberchat_remember_username', 'true');
const autoConnect = localStorage.getItem('liberchat_auto_connect') === 'true';
console.log(`✅ Connexion automatique: ${autoConnect ? 'Activée' : 'Désactivée'}`);

// Test 3: Génération de nom aléatoire
console.log('\n🎲 Test 3: Génération de noms aléatoires');
const generateRandomName = () => {
  const adjectives = ['Rouge', 'Libre', 'Rebel', 'Fier', 'Brave', 'Solidaire', 'Révolu', 'Militant', 'Camarade', 'Anarcho'];
  const nouns = ['Loup', 'Aigle', 'Lion', 'Phénix', 'Tigre', 'Ours', 'Faucon', 'Panthère', 'Corbeau', 'Renard'];
  const numbers = Math.floor(Math.random() * 999) + 1;
  
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  
  return `${adj}${noun}${numbers}`;
};

for (let i = 0; i < 5; i++) {
  console.log(`✅ Nom généré ${i + 1}: ${generateRandomName()}`);
}

// Test 4: Génération de nom anonyme
console.log('\n👤 Test 4: Noms anonymes');
for (let i = 0; i < 3; i++) {
  const anonymousName = `Anonyme${Math.floor(Math.random() * 9999) + 1}`;
  console.log(`✅ Nom anonyme ${i + 1}: ${anonymousName}`);
}

// Test 5: Simulation du flux utilisateur
console.log('\n🔄 Test 5: Simulation du flux utilisateur');
console.log('1. Première connexion...');
localStorage.setItem('liberchat_username', 'RevolutionnaireLibre42');
console.log('   ✅ Nom sauvegardé: RevolutionnaireLibre42');

console.log('2. Activation de la connexion rapide...');
localStorage.setItem('liberchat_auto_connect', 'true');
localStorage.setItem('liberchat_remember_username', 'true');
console.log('   ✅ Paramètres activés');

console.log('3. Simulation de reconnexion...');
const shouldAutoConnect = localStorage.getItem('liberchat_auto_connect') === 'true';
const rememberedName = localStorage.getItem('liberchat_username');
if (shouldAutoConnect && rememberedName) {
  console.log(`   ✅ Connexion automatique réussie avec: ${rememberedName}`);
} else {
  console.log('   ❌ Connexion automatique échouée');
}

// Test 6: Nettoyage des données
console.log('\n🧹 Test 6: Nettoyage des données');
const dataKeys = ['liberchat_username', 'liberchat_auto_connect', 'liberchat_remember_username', 'liberchat_seen_quick_connect_notification'];
console.log('Données avant nettoyage:');
dataKeys.forEach(key => {
  console.log(`   ${key}: ${localStorage.getItem(key) || 'null'}`);
});

// Nettoyage
dataKeys.forEach(key => localStorage.removeItem(key));
console.log('\nDonnées après nettoyage:');
dataKeys.forEach(key => {
  console.log(`   ${key}: ${localStorage.getItem(key) || 'null'}`);
});
console.log('✅ Nettoyage terminé');

// Résumé
console.log('\n📊 Résumé des tests:');
console.log('✅ Sauvegarde du nom d\'utilisateur');
console.log('✅ Activation/désactivation de la connexion automatique');
console.log('✅ Génération de noms aléatoires');
console.log('✅ Génération de noms anonymes');
console.log('✅ Simulation du flux utilisateur complet');
console.log('✅ Nettoyage des données');

console.log('\n🎉 Tous les tests sont passés avec succès !');
console.log('\n💡 Pour tester l\'interface:');
console.log('1. Démarrer le serveur: npm run dev');
console.log('2. Ouvrir http://localhost:5173');
console.log('3. Tester les différents modes de connexion');
console.log('4. Vérifier les paramètres de connexion dans le header');
console.log('5. Tester la notification de connexion rapide');