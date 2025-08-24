# Fix Jitsi CSP - Redirection plein écran pour WebView

## Problème résolu
Jitsi Meet bloque les iframes à cause des politiques de sécurité CSP (Content Security Policy), empêchant l'intégration directe dans les WebViews.

## Solution implémentée
Remplacement de l'approche iframe par une **redirection plein écran** dans les WebViews :

### Modifications apportées

#### 1. VideoModal.tsx
- **Détection WebView améliorée** : Identification précise des environnements WebView
- **Redirection plein écran** : `window.location.href` au lieu d'iframe
- **Sauvegarde d'état** : Utilisation de `sessionStorage` pour le retour
- **Gestion du retour** : Mécanisme pour revenir au chat après l'appel

#### 2. JitsiReturn.tsx (nouveau)
- **Composant de transition** : Interface de retour depuis Jitsi
- **Nettoyage automatique** : Suppression des données de session
- **Feedback utilisateur** : Animation de chargement

#### 3. App.tsx
- **Intégration JitsiReturn** : Détection automatique du retour
- **État de retour** : Gestion du state `showJitsiReturn`
- **Événements focus** : Écoute des changements de focus de fenêtre

### Fonctionnement

1. **Détection WebView** : Le composant détecte automatiquement les environnements WebView
2. **Redirection sécurisée** : Sauvegarde de l'URL de retour et redirection vers Jitsi
3. **Appel vidéo** : L'utilisateur utilise Jitsi en plein écran
4. **Retour automatique** : Détection du retour et nettoyage des données
5. **Transition fluide** : Interface de transition avant retour au chat

### Avantages

- ✅ **Contourne les restrictions CSP** : Plus de problème d'iframe bloquée
- ✅ **Expérience plein écran** : Meilleure utilisation de l'espace
- ✅ **Compatible WebView** : Fonctionne dans tous les environnements
- ✅ **Retour automatique** : Transition fluide vers le chat
- ✅ **Pas de perte de contexte** : Sauvegarde de l'état de l'application

### Compatibilité

- **Desktop** : Popup Jitsi (comportement inchangé)
- **Mobile/WebView** : Redirection plein écran
- **Navigateurs** : Tous les navigateurs modernes
- **Environnements** : YunoHost, Docker, serveurs classiques

Cette solution garantit une expérience vidéo fluide sans les limitations techniques des iframes.