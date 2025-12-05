<div align="center">

<img src="./icon.png" alt="LiberChat Logo" width="200"/>

# 🚩🏴 ✊ LiberChat — La Commune Numérique

<p align="center" style="font-size:1.2em; color:#ff2800; font-weight:bold;">
« Pour l'autogestion, la solidarité et la liberté numérique. Un chat libre, par et pour le prolétariat. »
</p>

[![Anticapitaliste](https://img.shields.io/badge/Anticapitaliste-✊-red?style=for-the-badge)](#)
[![Logiciel Libre](https://img.shields.io/badge/Logiciel_Libre-100%25-black?style=for-the-badge)](#)
[![Anarcho-syndicaliste](https://img.shields.io/badge/Anarcho--syndicaliste-Noir_&_Rouge-black?style=for-the-badge&labelColor=ff2800)](#)

[![Version](https://img.shields.io/badge/Version-7.0.0-red?style=for-the-badge)](#)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Libsodium](https://img.shields.io/badge/Libsodium-Protected-blue?style=for-the-badge&logo=lock&logoColor=white)](https://doc.libsodium.org/)
[![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io/)

**Un chat en temps réel, autogéré, horizontal, pour la Commune numérique.**

[📝 Documentation](#documentation) | [🤝 Contribuer](#contribution) | [📧 Contact](#support) | [🏠 YunoHost](https://github.com/Liberchat/liberchatserver_ynh)

</div>

---

## Vue d'ensemble

LiberChat eost une application de chat en temps réel qui privilégie la confidentialité et la sécurité. Conçue pour être auto-hébergée sur YunoHost, elle offre un niveau de sécurité comparable aux meilleures messageries sécurisées.

### Caractéristiques principales

- 💬 **Chat en temps réel** - Messages instantanés avec WebSocket
- 🔐 **Chiffrement E2EE Libsodium** - XChaCha20-Poly1305 + BLAKE2b
- 📁 **Partage Sécurisé** - Fichiers et vocaux chiffrés de bout en bout
- 🏴 **Interface Militante** - Design rouge et noir, animations fluides
- 🌍 **Traduction Universelle** - Intégrée et discrète (bouton 🌐)
- 🎨 **Thèmes personnalisables** - Mode sombre/clair + thèmes custom
- ♿ **Accessibilité** - Support lecteurs d'écran, contraste élevé
- � **YunoHost Ready** - Installation native parfaite

---

## Nouveautés v7.0.0 "The Revolution"

### �️ Core Security Upgrade (Libsodium)

LiberChat 7.0.0 abandonne les implémentations cryptographiques artisanales pour **libsodium** (via WebAssembly), la référence mondiale en cryptographie moderne.

- **Algorithme** : XSalsa20-Poly1305 (plus rapide et sûr que AES-GCM sur certaines plateformes)
- **Dérivation de clé** : BLAKE2b
- **Protection HMR** : Robustesse face aux rechargements de modules
- **Intégrité** : Vérification native des messages

### 💬 Chat Privé V2

Une refonte complète de l'expérience de messagerie privée :

- **Design Immersif** : Interface "Glassmorphism" sombre avec animations néon
- **Indicateurs Temps Réel** : "En train d'écrire..." fluide et animé
- **Support Multimédia** : Envoi de messages vocaux et fichiers chiffrés en privé
- **Ergonomie** : Bouton de traduction intégré directement dans la barre de saisie

### 🌍 Traduction Améliorée

- **Interface Épurée** : Suppression des drapeaux nationaux pour une approche internationaliste
- **Accès Rapide** : Nouveau bouton 🌐 à côté du micro
- **Support CORS** : Fonctionne parfaitement derrière les reverse proxies

---

## Installation

### Installation Simple

```bash
sudo yunohost app install https://github.com/Liberchat/liberchatserver_ynh
```

### Installation Multi-Instance

```bash
sudo yunohost app install liberchat --args "domain=exemple.com&path=/equipe1"
sudo yunohost app install liberchat --args "domain=exemple.com&path=/equipe2"
```

---

## Sécurité

### Chiffrement de Bout en Bout

Tous les messages, fichiers et réactions sont chiffrés avant transmission :

- **Messages texte** : XChaCha20-Poly1305 (Libsodium)
- **Fichiers** : Chiffrement binaire avant upload
- **Messages vocaux** : Chiffrement audio à la volée

### Standards Utilisés

- **Libsodium** : Bibliothèque cryptographique haute performance
- **WebAssembly** : Exécution quasi-native dans le navigateur

---

## Historique des Versions

### Version 7.0.0 (Décembre 2025) - "The Revolution"

**Mise à jour majeure de l'infrastructure et de l'UX :**

- 🔐 **Libsodium Core** : Migration vers libsodium-wrappers & WASM
- 💬 **Private Chat V2** : Nouvelle interface immersive et sécurisée
- 📂 **Secure Media** : Chiffrement E2EE pour fichiers et audio en privé
- 🌍 **Traduction UX** : Interface simplifiée sans drapeaux
- 🏠 **YunoHost Fixes** : Gestion parfaite des chemins relatifs

### Version 6.9.0 (Décembre 2025) - "Fortress"

**Système de cryptage v2.0 -**

- 🔐 AES-256-GCM avec authentification intégrée
- 🤝 Perfect Forward Secrecy (X25519 Diffie-Hellman)
- 🔄 Rotation automatique des clés (30 minutes)
- 🛡️ Niveau de sécurité : 9.8/10

### Version 6.8.0 (Novembre 2025)

**Protection avancée du code**

- 🛡️ Obfuscation multi-couches
- 🚫 Anti-debugging actif

---

## Crédits

### Technologies

- **React** - Interface utilisateur
- **TypeScript** - Typage statique
- **Socket.IO** - Communication temps réel
- **Libsodium** - Cœur cryptographique

### Inspiration

- **Signal Protocol** - Architecture de sécurité
- **ProtonMail** - Utilisation de Libsodium

---

<div align="center">

**🔐 Chiffrez en toute sécurité avec LiberChat 🔐**

Version 7.0.0

</div>
