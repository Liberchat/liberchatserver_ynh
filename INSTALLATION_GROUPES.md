# Installation du Système de Groupes - LiberChat

## 🚀 Installation Rapide

### 1. Prérequis
- Node.js 18+ 
- npm ou yarn
- Espace disque suffisant pour les sauvegardes

### 2. Installation des dépendances
```bash
npm install
```

### 3. Test du système
```bash
# Tester le système de groupes et sauvegarde
npm run test-groups

# Créer une sauvegarde manuelle
npm run backup
```

### 4. Démarrage
```bash
# Mode développement
npm run dev

# Mode production
npm run build
npm start
```

## 📁 Structure des Fichiers Ajoutés

### Backend
- `server.js` - Modifié avec le système de groupes
- `backup-system.js` - Système de sauvegarde automatique
- `groups.config.js` - Configuration des groupes
- `test-groups.js` - Script de test

### Frontend
- `src/components/GroupManager.tsx` - Gestion des groupes
- `src/components/GroupChat.tsx` - Interface de chat de groupe
- `src/components/AdminPanel.tsx` - Panneau d'administration
- `src/components/Header.tsx` - Modifié avec navigation
- `src/App.tsx` - Modifié avec intégration des groupes

### Données
- `data/` - Dossier des données persistantes
- `backups/` - Dossier des sauvegardes automatiques

## ⚙️ Configuration

### Variables d'Environnement
Ajoutez dans votre fichier `.env` :
```bash
# Groupes
MAX_MESSAGES=100
MAX_FILE_SIZE=50
BACKUP_INTERVAL=3600000

# Sécurité
ALLOWED_DOMAINS=votre-domaine.com
```

### Configuration Avancée
Modifiez `groups.config.js` pour personnaliser :
- Limites des groupes
- Intervalles de sauvegarde
- Fonctionnalités activées/désactivées

## 🔧 Utilisation

### Interface Utilisateur

#### 1. Navigation
- **Chat** : Chat global classique
- **Groupes** : Interface de gestion des groupes
- **Admin** : Panneau d'administration (statistiques et sauvegardes)

#### 2. Créer un Groupe
1. Cliquer sur "Groupes"
2. Cliquer sur le bouton "+"
3. Saisir le nom (3-50 caractères)
4. Cliquer sur "Créer"

#### 3. Rejoindre un Groupe
1. Sélectionner un groupe dans la liste
2. Le chat s'ouvre automatiquement
3. L'historique est chargé

#### 4. Administration
1. Cliquer sur "Admin" dans le header
2. Consulter les statistiques en temps réel
3. Créer des sauvegardes manuelles

### API REST

#### Groupes
```bash
# Lister les groupes
GET /api/groups

# Créer un groupe
POST /api/groups
{
  "name": "Mon Groupe",
  "creatorUsername": "utilisateur"
}

# Statistiques
GET /api/stats

# Sauvegarde manuelle
POST /api/backup
```

### WebSocket Events

#### Client → Serveur
```javascript
// Rejoindre un groupe
socket.emit('join group', groupId);

// Quitter un groupe
socket.emit('leave group', groupId);

// Envoyer un message
socket.emit('group message', {
  groupId: 1,
  type: 'text',
  content: 'Message chiffré'
});
```

#### Serveur → Client
```javascript
// Historique des messages
socket.on('group messages', (data) => {
  console.log('Messages du groupe:', data.messages);
});

// Nouveau message
socket.on('group message', (message) => {
  console.log('Nouveau message:', message);
});

// Utilisateur rejoint/quitte
socket.on('user joined group', (data) => {
  console.log(`${data.username} a rejoint le groupe ${data.groupId}`);
});
```

## 🔒 Sécurité

### Chiffrement
- **AES-GCM 256 bits** pour les messages
- **IV aléatoire** pour chaque message
- **Clés générées côté client** uniquement

### Validation
- **Nettoyage XSS** automatique
- **Validation des entrées** stricte
- **Limites de taille** configurables

### Sauvegardes
- **Chiffrement des sauvegardes** (optionnel)
- **Rotation automatique** des anciennes sauvegardes
- **Métadonnées de traçabilité**

## 🛠️ Maintenance

### Sauvegardes
```bash
# Sauvegarde manuelle
npm run backup

# Vérifier les sauvegardes
ls -la backups/

# Restaurer une sauvegarde (manuel)
cp backups/backup-YYYY-MM-DD/groups.json data/
cp backups/backup-YYYY-MM-DD/messages.json data/
```

### Monitoring
```bash
# Logs du serveur
tail -f server.log

# Statistiques via API
curl http://localhost:3000/api/stats

# Espace disque
df -h
```

### Nettoyage
```bash
# Nettoyer les anciennes sauvegardes (garde les 10 plus récentes)
node -e "import('./backup-system.js').then(m => m.cleanOldBackups())"
```

## 🐛 Dépannage

### Problèmes Courants

#### 1. Groupes non sauvegardés
```bash
# Vérifier les permissions
ls -la data/
chmod 755 data/
```

#### 2. Sauvegardes échouées
```bash
# Vérifier l'espace disque
df -h
# Vérifier les permissions
ls -la backups/
```

#### 3. Messages non chiffrés
- Vérifier la console du navigateur
- Régénérer la clé symétrique (F5)
- Vérifier la compatibilité WebCrypto

#### 4. Erreurs de connexion Socket.IO
```bash
# Vérifier les logs serveur
tail -f server.log
# Vérifier la configuration CORS
```

### Logs Utiles
```bash
# Logs complets
node server.js 2>&1 | tee server.log

# Logs des groupes uniquement
node server.js 2>&1 | grep -i "group"

# Logs des sauvegardes
node server.js 2>&1 | grep -i "backup"
```

## 📊 Monitoring

### Métriques Importantes
- Nombre de groupes actifs
- Messages par groupe
- Utilisateurs connectés
- Taille des sauvegardes
- Fréquence des erreurs

### Alertes Recommandées
- Espace disque < 10%
- Échec de sauvegarde
- Nombre d'erreurs > seuil
- Groupes inactifs > 7 jours

## 🔄 Mise à Jour

### Sauvegarde Avant Mise à Jour
```bash
# Sauvegarde complète
npm run backup
cp -r data/ data-backup-$(date +%Y%m%d)
cp -r backups/ backups-backup-$(date +%Y%m%d)
```

### Après Mise à Jour
```bash
# Tester le système
npm run test-groups

# Vérifier les données
ls -la data/
ls -la backups/
```

## 📞 Support

### En cas de problème
1. Consulter les logs : `tail -f server.log`
2. Vérifier les permissions : `ls -la data/ backups/`
3. Tester le système : `npm run test-groups`
4. Consulter la documentation : `GROUPS_SYSTEM.md`

### Informations à fournir
- Version de Node.js : `node --version`
- Logs d'erreur complets
- Configuration utilisée
- Étapes pour reproduire le problème

---

🎉 **Félicitations !** Votre système de groupes avec sauvegarde est maintenant opérationnel.

Pour toute question, consultez `GROUPS_SYSTEM.md` pour la documentation technique complète.