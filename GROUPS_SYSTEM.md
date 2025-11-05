# Système de Groupes avec Sauvegarde - LiberChat

## Vue d'ensemble

Le système de groupes de LiberChat permet aux utilisateurs de créer et rejoindre des groupes de discussion privés avec chiffrement de bout en bout et sauvegarde automatique des données.

## Fonctionnalités

### 🔐 Groupes Chiffrés
- Création de groupes avec noms personnalisés
- Messages chiffrés de bout en bout (AES-GCM 256 bits)
- Historique des messages par groupe
- Gestion des membres en temps réel

### 💾 Système de Sauvegarde
- Sauvegarde automatique toutes les 5 minutes (données courantes)
- Sauvegarde complète toutes les heures (avec historique)
- Conservation des 10 sauvegardes les plus récentes
- Sauvegarde manuelle via le panneau d'administration
- Métadonnées de sauvegarde avec horodatage

### 📊 Panneau d'Administration
- Statistiques en temps réel
- Gestion des sauvegardes
- Monitoring des groupes actifs
- Informations système

## Structure des Données

### Groupes
```json
{
  "id": 1,
  "name": "Nom du groupe",
  "members": ["socketId1", "socketId2"],
  "messages": [...],
  "createdAt": 1640995200000,
  "createdBy": "username"
}
```

### Messages de Groupe
```json
{
  "id": 123,
  "type": "text|file|audio",
  "username": "utilisateur",
  "content": "contenu chiffré",
  "timestamp": 1640995200000,
  "groupId": 1
}
```

## API Endpoints

### Groupes
- `GET /api/groups` - Liste des groupes disponibles
- `POST /api/groups` - Créer un nouveau groupe
- `GET /api/stats` - Statistiques du système

### Sauvegardes
- `POST /api/backup` - Créer une sauvegarde manuelle

## Événements Socket.IO

### Côté Client → Serveur
- `join group` - Rejoindre un groupe
- `leave group` - Quitter un groupe
- `group message` - Envoyer un message dans un groupe

### Côté Serveur → Client
- `group messages` - Historique des messages d'un groupe
- `group message` - Nouveau message dans un groupe
- `user joined group` - Utilisateur a rejoint le groupe
- `user left group` - Utilisateur a quitté le groupe

## Composants Frontend

### GroupManager
- Interface de gestion des groupes
- Création de nouveaux groupes
- Liste des groupes disponibles
- Statistiques par groupe

### GroupChat
- Interface de chat pour un groupe spécifique
- Messages chiffrés en temps réel
- Partage de fichiers et audio
- Gestion des membres

### AdminPanel
- Statistiques système
- Gestion des sauvegardes
- Monitoring en temps réel

## Sécurité

### Chiffrement
- Clé symétrique AES-GCM 256 bits générée côté client
- IV aléatoire pour chaque message
- Pas de stockage des clés côté serveur

### Validation
- Nettoyage XSS des contenus
- Validation des noms de groupes (3-50 caractères)
- Vérification des permissions d'accès aux groupes

### Sauvegarde
- Données stockées localement dans `/data`
- Sauvegardes dans `/backups`
- Métadonnées de traçabilité

## Installation et Configuration

### Variables d'Environnement
```bash
MAX_MESSAGES=100          # Nombre max de messages par groupe
MAX_FILE_SIZE=50          # Taille max des fichiers (MB)
BACKUP_INTERVAL=3600000   # Intervalle de sauvegarde (ms)
```

### Structure des Dossiers
```
/
├── data/
│   ├── groups.json       # Données des groupes
│   └── messages.json     # Messages globaux
├── backups/
│   ├── backup-2024-01-01T12-00-00/
│   │   ├── groups.json
│   │   ├── messages.json
│   │   └── metadata.json
│   └── ...
└── backup-system.js      # Système de sauvegarde
```

## Utilisation

### Créer un Groupe
1. Cliquer sur "Groupes" dans la navigation
2. Cliquer sur le bouton "+"
3. Saisir le nom du groupe (3-50 caractères)
4. Cliquer sur "Créer"

### Rejoindre un Groupe
1. Sélectionner un groupe dans la liste
2. Le chat du groupe s'ouvre automatiquement
3. L'historique des messages est chargé

### Administration
1. Cliquer sur "Admin" dans le header
2. Consulter les statistiques
3. Créer des sauvegardes manuelles
4. Surveiller l'activité du système

## Maintenance

### Sauvegardes Automatiques
- Les données sont sauvegardées automatiquement
- Les anciennes sauvegardes sont nettoyées automatiquement
- Vérifier régulièrement l'espace disque

### Monitoring
- Utiliser le panneau d'administration
- Surveiller les logs serveur
- Vérifier la connectivité des utilisateurs

## Dépannage

### Problèmes Courants
1. **Messages non chiffrés** : Vérifier la génération de la clé symétrique
2. **Groupes non sauvegardés** : Vérifier les permissions du dossier `/data`
3. **Sauvegardes échouées** : Vérifier l'espace disque disponible

### Logs
```bash
# Vérifier les logs du serveur
tail -f server.log

# Vérifier les sauvegardes
ls -la backups/
```

## Évolutions Futures

- [ ] Chiffrement par groupe avec clés dédiées
- [ ] Invitations par lien
- [ ] Modération des groupes
- [ ] Export/import de sauvegardes
- [ ] Notifications push
- [ ] Recherche dans l'historique
- [ ] Groupes temporaires avec auto-destruction

## Support

Pour toute question ou problème, consulter :
- Les logs serveur
- Le panneau d'administration
- La documentation technique dans le code source