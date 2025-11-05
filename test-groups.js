import { createBackup, cleanOldBackups } from './backup-system.js';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

console.log('🧪 Test du système de groupes et sauvegarde...\n');

// Créer le dossier data pour les tests
const DATA_DIR = './data';
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
  console.log('✅ Dossier data créé');
}

// Créer des données de test
const testGroups = [
  {
    id: 1,
    name: "Groupe Test 1",
    members: ["user1", "user2"],
    messages: [
      {
        id: 1,
        type: "text",
        username: "user1",
        content: "Message de test chiffré",
        timestamp: Date.now(),
        groupId: 1
      }
    ],
    createdAt: Date.now(),
    createdBy: "user1"
  },
  {
    id: 2,
    name: "Groupe Test 2",
    members: ["user2", "user3"],
    messages: [],
    createdAt: Date.now(),
    createdBy: "user2"
  }
];

const testMessages = {
  messages: [
    {
      id: 1,
      type: "text",
      username: "user1",
      content: "Message global de test",
      timestamp: Date.now()
    }
  ],
  nextMessageId: 2
};

// Écrire les données de test
writeFileSync(join(DATA_DIR, 'groups.json'), JSON.stringify(testGroups, null, 2));
writeFileSync(join(DATA_DIR, 'messages.json'), JSON.stringify(testMessages, null, 2));
console.log('✅ Données de test créées');

// Tester la sauvegarde
console.log('\n📦 Test de sauvegarde...');
const backupPath = createBackup();
if (backupPath) {
  console.log('✅ Sauvegarde créée avec succès:', backupPath.split('/').pop());
} else {
  console.log('❌ Échec de la sauvegarde');
}

// Tester le nettoyage
console.log('\n🧹 Test du nettoyage...');
await cleanOldBackups();
console.log('✅ Nettoyage terminé');

// Afficher les statistiques
console.log('\n📊 Statistiques de test:');
console.log(`- Groupes créés: ${testGroups.length}`);
console.log(`- Messages globaux: ${testMessages.messages.length}`);
console.log(`- Groupes avec messages: ${testGroups.filter(g => g.messages.length > 0).length}`);

console.log('\n🎉 Tests terminés avec succès !');
console.log('\n💡 Pour tester l\'interface:');
console.log('1. Démarrer le serveur: npm run dev');
console.log('2. Ouvrir http://localhost:5173');
console.log('3. Se connecter avec un nom d\'utilisateur');
console.log('4. Cliquer sur "Groupes" pour voir les groupes de test');
console.log('5. Cliquer sur "Admin" pour voir les statistiques');