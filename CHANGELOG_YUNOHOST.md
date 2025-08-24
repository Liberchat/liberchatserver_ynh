# Changelog YunoHost - Liberchat

## Version 7.0.0 (25 août 2025)

### 🎥 Intégration vidéo majeure
- **Appels vidéo Jitsi Meet** : Bouton vidéo intégré dans l'interface utilisateur
- **URL Jitsi configurable** : Possibilité d'utiliser votre propre instance Jitsi auto-hébergée
- **Génération automatique** de salles de conférence uniques avec timestamp
- **Configuration via panneau YunoHost** : Nouvelle section "Configuration vidéo" dans les paramètres avancés
- **API endpoint** `/api/jitsi-url` pour récupérer l'URL configurée
- **Fallback automatique** vers meet.jit.si en cas d'erreur

### 🔧 Améliorations de stabilité
- **Timeouts Socket.IO optimisés** : 
  - PING_TIMEOUT augmenté à 5 minutes (300000ms)
  - PING_INTERVAL porté à 2 minutes (120000ms)
- **Réduction drastique des déconnexions** lors de la mise en veille des appareils
- **Logs de confidentialité** : Désactivation des logs de contenu des messages chiffrés
- **Gestion des permissions** : Correction des permissions du fichier .env

### 🎨 Interface utilisateur
- **Bouton vidéo** intégré dans le Header avec le même style que les autres boutons
- **Icône vidéo** 📹 avec texte "Vidéo" sur desktop
- **Responsive design** : Bouton adaptatif mobile/desktop
- **Accessibilité** : Labels ARIA et title appropriés

### 🛠️ Corrections techniques
- **Panneau de configuration** : Toutes les fonctions getter/setter opérationnelles
- **Variables d'environnement** : Chargement correct du fichier .env avec dotenv
- **Cache YunoHost** : Tentatives de correction du cache des valeurs de configuration
- **Permissions fichiers** : Gestion automatique des permissions pour les modifications

---

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

## Versions antérieures

Voir le fichier README.md pour l'historique complet des versions précédentes.