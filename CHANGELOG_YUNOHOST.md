# Changelog - Améliorations YunoHost

## Version 6.1.21 (24 août 2025)

### 🔧 Corrections importantes
- **Panneau de configuration** : Correction des erreurs "unbound variable" dans les scripts de configuration
- **Variables d'environnement** : Toutes les fonctionnalités du panneau de config sont maintenant réellement implémentées

### ✨ Nouvelles fonctionnalités opérationnelles
- **MAX_MESSAGES** : Contrôle réel du nombre de messages gardés en mémoire (défaut: 100)
- **MAX_FILE_SIZE** : Limitation effective de la taille des fichiers uploadés (défaut: 50MB)
- **PING_TIMEOUT** : Configuration du timeout Socket.IO (défaut: 60000ms)
- **PING_INTERVAL** : Configuration de l'intervalle de ping Socket.IO (défaut: 25000ms)
- **ALLOWED_DOMAINS** : Gestion des domaines CORS autorisés

### 🐛 Corrections de bugs
- Variables de configuration avec valeurs par défaut pour éviter les erreurs
- Affichage des variables d'environnement dans les logs de démarrage
- Messages d'erreur dynamiques pour la taille des fichiers

---

## Changements effectués pour une compatibilité parfaite avec YunoHost

### 🔧 Serveur (server.js)

1. **CORS dynamique** : Autorise automatiquement tous les domaines HTTPS
2. **Détection automatique du chemin de base** via `YNH_APP_ARG_PATH`
3. **Configuration Socket.IO adaptative** avec chemin personnalisé
4. **Routes adaptées au sous-chemin** YunoHost
5. **Logs de débogage** pour faciliter le diagnostic

### 🎨 Client (src/App.tsx)

1. **Détection automatique du chemin Socket.IO** basée sur l'URL courante
2. **Configuration adaptative** pour développement vs production

### ⚙️ Configuration Build (vite.config.ts)

1. **Chemin de base dynamique** utilisant `YNH_APP_ARG_PATH`
2. **Support multi-environnement** (dev/prod)

### 📦 Configuration YunoHost

#### Nouveaux fichiers :
- `scripts/upgrade` : Script de mise à jour
- `scripts/backup` : Script de sauvegarde  
- `scripts/restore` : Script de restauration
- `scripts/check` : Script de vérification
- `config_panel.toml` : Interface de configuration
- `README_yunohost.md` : Documentation spécifique

#### Fichiers modifiés :
- `conf/env` : Ajout de `YNH_APP_ARG_PATH` et `ALLOWED_DOMAINS`
- `scripts/install` : Build avec variables d'environnement

### 🧪 Tests

1. **Script de test YunoHost** (`test-yunohost.sh`)
2. **Vérification automatique** des configurations

## Fonctionnalités YunoHost supportées

✅ **Multi-instance** : Plusieurs installations sur le même serveur  
✅ **Sous-chemins** : Fonctionne avec n'importe quel chemin (ex: `/liberchat`)  
✅ **Domaines multiples** : Support automatique de tous types de domaines  
✅ **Proxy inverse** : Compatible avec Nginx de YunoHost  
✅ **WebSockets** : Socket.IO fonctionne à travers le proxy  
✅ **Sauvegarde/Restauration** : Scripts complets  
✅ **Mise à jour** : Processus automatisé  
✅ **Configuration** : Interface web pour les paramètres  
✅ **Logs** : Intégration avec systemd/journald  

## Variables d'environnement

- `NODE_ENV=production` : Mode de production
- `PORT` : Port d'écoute (configuré par YunoHost)
- `HOST=127.0.0.1` : Interface d'écoute
- `ALLOWED_DOMAINS` : Domaines CORS autorisés
- `YNH_APP_ARG_PATH` : Chemin de base de l'application

## Test de déploiement

```bash
# Test en local avec simulation YunoHost
./test-yunohost.sh

# Installation sur YunoHost
sudo yunohost app install https://github.com/AnARCHIS12/liberchatserver_ynh

# Vérification
sudo yunohost app info liberchat
```

## Compatibilité

- ✅ YunoHost 11.2+
- ✅ Multi-instance
- ✅ Domaines .onion (Tor)
- ✅ IP locales
- ✅ HTTPS/HTTP
- ✅ Sous-chemins personnalisés

Tous les changements sont rétrocompatibles et n'affectent pas le fonctionnement en développement local.