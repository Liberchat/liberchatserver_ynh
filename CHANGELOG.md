# Changelog - Liberchat

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

## [6.5.0] - 2025-11-03

### 🎯 Ajouté
- **Réactions Emoji Complètement Fonctionnelles** : Les réactions emoji fonctionnent maintenant parfaitement dans les deux sens
- **Synchronisation temps réel** : Toutes les réactions se synchronisent instantanément entre tous les clients
- **Logique add/remove** : Cliquer sur une réaction existante la retire, cliquer sur un nouvel emoji l'ajoute
- **Affichage universel** : Les réactions s'affichent pour tous les utilisateurs, même sans clé de chiffrement

### 🔧 Corrigé
- **Re-renders infinis** : Suppression des boucles de logs qui causaient des problèmes de performance
- **Dépendance symmetricKey** : Les réactions ne dépendent plus de `symmetricKey` pour l'affichage
- **Fusion des réactions** : Remplacement complet au lieu de fusion pour éviter les conflits
- **Communication WebSocket** : Correction des problèmes d'émission/réception pour les réactions

### 🔐 Révolutionnaire
- **Abandon de la clé partagée** : Fini la saisie manuelle d'une clé de chiffrement !
- **Chiffrement automatique** : Le système génère et gère automatiquement les clés de chiffrement
- **Échange de clés transparent** : Les utilisateurs se connectent directement sans configuration
- **Groupes (non fonctionnels)** : Code des groupes implémenté mais pas encore opérationnel

### 🛡️ Sécurité
- **Chiffrement préservé** : Toutes les fonctionnalités de chiffrement E2EE restent intactes
- **Réactions sécurisées** : Les réactions sont chiffrées avant envoi avec la même sécurité que les messages
- **Sécurité renforcée** : Web Crypto API + fallback crypto-js pour une compatibilité maximale

## [6.1.21] - 2025-08-24

### 🔧 Corrigé
- **Panneau de configuration** : Correction des erreurs "unbound variable" dans les scripts de configuration
- **Variables d'environnement** : Toutes les fonctionnalités du panneau de config sont maintenant réellement implémentées

### ✨ Ajouté
- **MAX_MESSAGES** : Contrôle réel du nombre de messages gardés en mémoire (défaut: 100)
- **MAX_FILE_SIZE** : Limitation effective de la taille des fichiers uploadés (défaut: 50MB)
- **PING_TIMEOUT** : Configuration du timeout Socket.IO (défaut: 60000ms)
- **PING_INTERVAL** : Configuration de l'intervalle de ping Socket.IO (défaut: 25000ms)
- **ALLOWED_DOMAINS** : Gestion des domaines CORS autorisés

## [6.1.20] - 2025-08-20

### 🎨 Corrigé
- **Thèmes personnalisés en mode clair** : les thèmes CSS personnalisés fonctionnent maintenant parfaitement avec le mode light
- **Optimisation des performances** : correction de la boucle infinie dans le hook useCustomThemes
- **Application des thèmes** : logique d'application des thèmes repensée pour une compatibilité maximale

### 🖍️ Amélioré
- **Thèmes prédéfinis** : thèmes Rouge Anarchiste, Cyberpunk et Bleu Clair optimisés pour tous les modes

## [6.1.19] - 2025-08-15

### ♿ Ajouté
- **Accessibilité complète** : bouton dédié dans l'en-tête, paramètres sauvegardés localement
- **Conformité WCAG 2.1** : niveau AA, étiquettes ARIA complètes
- **Support lecteurs d'écran** : NVDA, JAWS, VoiceOver, TalkBack, Orca avec annonces vocales
- **Navigation clavier** : raccourcis globaux et focus visible renforcé

### 🖍️ Ajouté
- **Thèmes personnalisables** : interface pour créer, modifier et appliquer des thèmes CSS personnalisés
- **Thèmes prédéfinis** : Rouge Anarchiste, Cyberpunk

## [6.1.18] - 2025-08-10

### ✨ Ajouté
- **Prévisualisation audio** : possibilité d'écouter, d'envoyer ou d'annuler un message vocal avant transmission
- **Indicateur "en train d'écrire"** : affichage dynamique au-dessus de la zone de saisie

### 🔧 Corrigé
- **Erreurs TypeScript** : correction des erreurs de typage liées à Socket.IO côté client
- **Connexion WebSocket** : amélioration de la robustesse de la connexion Socket.IO

## [6.1.16] - 2025-08-05

### 🎨 Ajouté
- **Nouveau sélecteur d'emojis** : remplacement de emoji-mart par emoji-picker-react
- **Interface responsive** : sélecteur compact et adapté, sans débordement sur mobile

### 🔧 Corrigé
- **Bug d'affichage** : correction du menu emojis qui débordait de l'encadré
- **Réactions emoji** : correction de l'ajout d'emoji (plus de undefined)
- **Compatibilité mobile** : amélioration CSS pour garantir l'accessibilité

## Versions antérieures

Voir les commits Git pour l'historique complet des versions antérieures à 6.1.16.