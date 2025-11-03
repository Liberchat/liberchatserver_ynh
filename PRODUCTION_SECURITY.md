# Système de Sécurité pour la Production

## Vue d'ensemble

Ce système implémente un chiffrement de bout en bout (E2EE) sécurisé pour la production avec :

- **Échange de clés ECDH** : Chaque utilisateur génère une paire de clés elliptiques
- **Clés de groupe** : Distribution sécurisée des clés de chiffrement AES-GCM
- **Rotation automatique** : Les clés sont renouvelées toutes les 24h
- **Audit complet** : Tous les accès aux clés sont journalisés

## Architecture

### 1. Échange de Clés (ECDH)

```
Utilisateur A                    Serveur                    Utilisateur B
    |                              |                              |
    |-- Génère paire ECDH -------->|                              |
    |                              |<----- Génère paire ECDH -----|
    |                              |                              |
    |<-- Clé publique B -----------|-- Clé publique A ----------->|
    |                              |                              |
    |-- Dérive clé partagée ------>|<----- Dérive clé partagée ---|
```

### 2. Distribution des Clés de Groupe

```
Premier utilisateur:
1. Génère une clé de groupe AES-GCM
2. Chiffre la clé avec sa clé partagée
3. Stocke sur le serveur avec liste des autorisations

Utilisateurs suivants:
1. Établissent une clé partagée avec un membre existant
2. Récupèrent la clé de groupe chiffrée
3. Déchiffrent avec leur clé partagée
```

### 3. Rotation des Clés

- **Automatique** : Toutes les 24h
- **Manuelle** : Quand un utilisateur quitte un groupe
- **Versioning** : Chaque rotation incrémente la version

## Sécurité

### Algorithmes Utilisés

- **ECDH** : Courbe P-256 pour l'échange de clés
- **AES-GCM** : 256 bits pour le chiffrement des messages
- **PBKDF2** : 100,000 itérations pour la dérivation (dev uniquement)

### Protections

1. **Forward Secrecy** : Les anciennes clés ne peuvent pas déchiffrer les nouveaux messages
2. **Perfect Forward Secrecy** : Rotation automatique des clés
3. **Authentification** : Vérification de l'identité avant accès aux clés
4. **Audit Trail** : Journalisation de tous les accès

### Stockage Sécurisé

- **Client** : Clés stockées dans IndexedDB avec chiffrement
- **Serveur** : Clés chiffrées, jamais en clair
- **Transport** : HTTPS obligatoire en production

## Configuration Production

### Variables d'Environnement

```bash
# Sécurité
NODE_ENV=production
HTTPS_CERT_PATH=/path/to/cert.pem
HTTPS_KEY_PATH=/path/to/key.pem

# Rotation des clés (en millisecondes)
KEY_ROTATION_INTERVAL=86400000  # 24h

# Audit
AUDIT_LOG_RETENTION=2592000000  # 30 jours
MAX_AUDIT_ENTRIES=10000

# Domaines autorisés
ALLOWED_DOMAINS=https://votre-domaine.com,https://autre-domaine.com
```

### Nginx Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name votre-domaine.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # Headers de sécurité
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # WebSocket support
        proxy_buffering off;
        proxy_read_timeout 86400;
    }
}
```

## API Endpoints

### Gestion des Clés

```
POST /api/keys/register
- Enregistre une clé publique utilisateur

GET /api/keys/public/:userId
- Récupère la clé publique d'un utilisateur

GET /api/keys/public?exclude=userId
- Récupère toutes les clés publiques sauf celle exclue

POST /api/keys/group
- Enregistre une clé de groupe

GET /api/keys/group/:groupId/:userId
- Récupère une clé de groupe pour un utilisateur autorisé

GET /api/keys/audit
- Récupère les logs d'audit (avec filtres)
```

### Événements Socket.IO

```javascript
// Client vers serveur
socket.emit('register_public_key', { publicKey });
socket.emit('request_public_keys');
socket.emit('register_group_key', { groupId, groupKeyData });
socket.emit('request_group_key', { groupId });

// Serveur vers client
socket.on('public_key_registered', { success });
socket.on('public_keys_response', { publicKeys });
socket.on('new_public_key_available', { userId, publicKey });
socket.on('group_key_registered', { success, groupId });
socket.on('new_group_key_available', { groupId, groupKeyData });
socket.on('key_error', message);
```

## Déploiement

### 1. Installation

```bash
npm install
npm run build
```

### 2. Configuration SSL

```bash
# Générer un certificat Let's Encrypt
certbot certonly --webroot -w /var/www/html -d votre-domaine.com
```

### 3. Démarrage

```bash
# Mode production
NODE_ENV=production npm start

# Avec PM2 (recommandé)
pm2 start ecosystem.config.js --env production
```

### 4. Monitoring

```bash
# Vérifier les logs d'audit
curl https://votre-domaine.com/api/keys/audit

# Statistiques
curl https://votre-domaine.com/api/stats
```

## Maintenance

### Rotation Manuelle des Clés

```bash
# Via API
curl -X POST https://votre-domaine.com/api/keys/rotate \
  -H "Content-Type: application/json" \
  -d '{"groupId": "global", "force": true}'
```

### Sauvegarde des Clés

```bash
# Les clés sont automatiquement sauvegardées dans data/
cp data/key-exchange-data.json backup/keys-$(date +%Y%m%d).json
```

### Nettoyage

```bash
# Nettoyer les clés expirées
curl -X POST https://votre-domaine.com/api/keys/cleanup
```

## Conformité

Ce système respecte :

- **RGPD** : Chiffrement des données personnelles
- **ANSSI** : Algorithmes recommandés (AES-256, ECDH P-256)
- **NIST** : Standards cryptographiques
- **OWASP** : Bonnes pratiques de sécurité web

## Support

Pour toute question de sécurité :
- Consultez les logs d'audit
- Vérifiez la rotation des clés
- Surveillez les tentatives d'accès non autorisées

En cas de compromission suspectée :
1. Forcer la rotation de toutes les clés
2. Analyser les logs d'audit
3. Révoquer l'accès des utilisateurs suspects
4. Redémarrer le service avec de nouvelles clés