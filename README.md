# Liberchat pour YunoHost

[![GitHub release](https://img.shields.io/github/v/release/Liberchat/liberchatserver_ynh?style=flat-square)](https://github.com/Liberchat/liberchatserver_ynh/releases)
[![GitHub license](https://img.shields.io/github/license/Liberchat/liberchatserver_ynh?style=flat-square)](https://github.com/Liberchat/liberchatserver_ynh/blob/main/LICENSE)
[![GitHub issues](https://img.shields.io/github/issues/Liberchat/liberchatserver_ynh?style=flat-square)](https://github.com/Liberchat/liberchatserver_ynh/issues)
[![YunoHost](https://img.shields.io/badge/YunoHost-11.2%2B-blue?style=flat-square)](https://yunohost.org)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green?style=flat-square)](https://nodejs.org)
[![Multi-instance](https://img.shields.io/badge/Multi--instance-✓-success?style=flat-square)](https://github.com/Liberchat/liberchatserver_ynh)

*[Read this README in English.](./README_en.md)*

> *Ce paquet vous permet d'installer Liberchat rapidement et simplement sur un serveur YunoHost.*
> *Si vous n'avez pas YunoHost, consultez [le guide](https://yunohost.org/install) pour apprendre comment l'installer.*

## Vue d'ensemble

Liberchat est une application de chat libre et décentralisée qui privilégie la confidentialité et la sécurité.

**Version livrée :** 6.1.20~ynh1

**Démo :** https://liberchat-3-0-1.onrender.com

## Fonctionnalités

- **Chat en temps réel** avec WebSockets
- **Partage de fichiers** (images, documents)
- **Réactions emoji** sur les messages
- **Chiffrement côté client** pour la confidentialité
- **Interface responsive** compatible mobile
- **Support multi-domaines** (IP locales, domaines classiques)
- **Aucun enregistrement** pour une confidentialité totale
- **Messages vocaux** et réponses aux messages

## Installation

### Installation simple

```bash
sudo yunohost app install https://github.com/Liberchat/liberchatserver_ynh
```

### Installation multi-instance

Vous pouvez installer plusieurs instances de Liberchat sur le même serveur YunoHost avec des chemins différents :

```bash
sudo yunohost app install liberchat --args "domain=exemple.com&path=/equipe1"
sudo yunohost app install liberchat --args "domain=exemple.com&path=/equipe2"
```

### Installation depuis une branche spécifique

Pour tester la branche de développement :

```bash
sudo yunohost app install https://github.com/Liberchat/liberchatserver_ynh/tree/testing --debug
```

## Configuration

### Support multi-utilisateurs

Cette application supporte l'installation multi-instance. Vous pouvez installer plusieurs instances de Liberchat sur le même serveur YunoHost avec des chemins différents.

### Domaines supportés

L'application fonctionne automatiquement avec :
- Domaines classiques (https://exemple.com/liberchat)

- Adresses IP locales
- Localhost (en développement)

### Paramètres avancés

- **Taille maximale des fichiers** : Configurable via le panneau d'administration
- **Nombre de messages en mémoire** : Ajustable selon vos besoins
- **Timeouts Socket.IO** : Personnalisables pour optimiser les performances

## Utilisation

1. **Accédez à votre instance** : `https://votre-domaine.com/liberchat`
2. **Définissez une clé de chiffrement** partagée avec vos contacts
3. **Choisissez un nom d'utilisateur**
4. **Commencez à chatter** en toute sécurité !

## Sécurité

- **Chiffrement de bout en bout** avec Web Crypto API
- **Aucun stockage** des messages sur le serveur
- **Protection CSP, CORS, XSS**

- **Clés de session** pour la confidentialité

## Documentation et ressources

- Site officiel de l'application : <https://liberchat-3-0-1.onrender.com>
- Documentation utilisateur : <https://github.com/AnARCHIS12/Liberchat>
- Documentation administrateur : <https://github.com/Liberchat/liberchatserver_ynh>
- Dépôt du code source : <https://github.com/AnARCHIS12/Liberchat>
- Signaler un bug : <https://github.com/Liberchat/liberchatserver_ynh/issues>

## Informations pour les développeurs

Veuillez envoyer vos pull requests vers la [branche testing](https://github.com/Liberchat/liberchatserver_ynh/tree/testing).

Pour tester la branche de développement :

```bash
sudo yunohost app install https://github.com/Liberchat/liberchatserver_ynh/tree/testing --debug
# ou
sudo yunohost app upgrade liberchat -u https://github.com/Liberchat/liberchatserver_ynh/tree/testing --debug
```

**Plus d'informations sur le packaging d'applications :** <https://yunohost.org/packaging_apps>

---

## English Version

### Overview

Liberchat is a free and decentralized chat application that allows secure and private communication.

### Installation

```bash
sudo yunohost app install https://github.com/Liberchat/liberchatserver_ynh
```

### Features

- Real-time chat with WebSockets
- File sharing (images, documents)
- Emoji reactions on messages
- Client-side encryption for privacy
- Responsive interface mobile compatible
- Multi-domain support (Tor, local IPs, classic domains)
- No logging for total privacy
- Voice messages and message replies

For complete English documentation, see [README_en.md](./README_en.md)