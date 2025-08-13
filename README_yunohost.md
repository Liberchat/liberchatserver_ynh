# Liberchat pour YunoHost

[![Niveau d'intégration](https://dash.yunohost.org/integration/liberchat.svg)](https://dash.yunohost.org/appci/app/liberchat) ![Statut du fonctionnement](https://ci-apps.yunohost.org/ci/badges/liberchat.status.svg) ![Statut de maintenance](https://ci-apps.yunohost.org/ci/badges/liberchat.maintain.svg)

[![Installer Liberchat avec YunoHost](https://install-app.yunohost.org/install-with-yunohost.svg)](https://install-app.yunohost.org/?app=liberchat)

*[Read this README in other languages.](./ALL_README.md)*

> *Ce package vous permet d'installer Liberchat rapidement et simplement sur un serveur YunoHost.*
> *Si vous n'avez pas YunoHost, consultez [ce guide](https://yunohost.org/install) pour savoir comment l'installer et en profiter.*

## Vue d'ensemble

Liberchat est une application de chat libre et décentralisée qui permet de communiquer de manière sécurisée et privée.

### Fonctionnalités

- **Chat en temps réel** avec WebSockets
- **Partage de fichiers** (images, documents)
- **Réactions emoji** sur les messages
- **Chiffrement côté client** pour la confidentialité
- **Interface responsive** compatible mobile
- **Support multi-domaines** (Tor, IP locales, domaines classiques)
- **Pas de logs** pour une confidentialité totale

## Configuration

### Variables d'environnement

L'application utilise les variables d'environnement suivantes :

- `NODE_ENV=production` : Mode de production
- `PORT` : Port d'écoute du serveur (configuré automatiquement par YunoHost)
- `ALLOWED_DOMAINS` : Domaines autorisés pour CORS (configuré automatiquement)
- `YNH_APP_ARG_PATH` : Chemin de base de l'application (ex: `/liberchat`)

### Multi-instance

Cette application supporte l'installation multi-instance. Vous pouvez installer plusieurs instances de Liberchat sur le même serveur YunoHost avec des chemins différents.

### Domaines supportés

L'application fonctionne automatiquement avec :
- Domaines classiques (https://example.com/liberchat)
- Domaines .onion (Tor)
- Adresses IP locales
- Localhost (en développement)

## Déploiement

### Installation

```bash
sudo yunohost app install https://github.com/AnARCHIS12/liberchatserver_ynh
```

### Mise à jour

```bash
sudo yunohost app upgrade liberchat
```

### Sauvegarde/Restauration

L'application supporte les mécanismes de sauvegarde et restauration standard de YunoHost.

## Développement

### Structure du projet

```
├── conf/                 # Configuration YunoHost
│   ├── nginx.conf       # Configuration Nginx
│   ├── systemd.service  # Service systemd
│   └── env              # Variables d'environnement
├── scripts/             # Scripts YunoHost
│   ├── install          # Script d'installation
│   ├── upgrade          # Script de mise à jour
│   └── remove           # Script de suppression
├── src/                 # Code source React/TypeScript
├── server.js            # Serveur Express/Socket.IO
└── manifest.toml        # Manifeste YunoHost
```

### Test en local

```bash
# Installation des dépendances
npm install

# Test avec configuration YunoHost
./test-yunohost.sh

# Développement
npm run dev
```

### Débogage

Les logs sont disponibles via :

```bash
sudo journalctl -u liberchat -f
```

## Sécurité

- **CORS** configuré automatiquement pour le domaine d'installation
- **CSP** (Content Security Policy) pour prévenir les attaques XSS
- **Helmet.js** pour sécuriser les headers HTTP
- **Pas de logs** des messages pour la confidentialité
- **Chiffrement côté client** des données sensibles

## Support

- **Documentation** : [README principal](./README.md)
- **Issues** : [GitHub Issues](https://github.com/AnARCHIS12/liberchatserver_ynh/issues)
- **Forum YunoHost** : [Catégorie Apps](https://forum.yunohost.org/c/apps)

## Licence

Ce package est distribué sous licence AGPL-3.0.