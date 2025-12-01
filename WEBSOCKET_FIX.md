# Fix WebSocket pour YunoHost

## Problèmes identifiés

1. **Configuration Socket.IO côté client** : Le client ne détecte pas automatiquement le chemin YunoHost
2. **Configuration nginx** : Le proxy_pass inclut le path deux fois
3. **Variables d'environnement** : Le serveur ne reçoit pas correctement le path YunoHost

## Solutions appliquées

### 1. Côté client (App.tsx)
- Détection automatique du chemin YunoHost depuis `window.location.pathname`
- Configuration du `path` Socket.IO avec le bon préfixe
- Ajout d'options de reconnexion robustes

### 2. Configuration nginx
- Correction du `proxy_pass` pour éviter la duplication du path
- Ajout de `proxy_buffering off` pour les WebSockets
- Amélioration des timeouts

### 3. Serveur Node.js
- Ajout de `serveClient: false` pour éviter les conflits de routing

## Application du fix

1. Appliquer le patch client :
```bash
cd /home/calyps/Bureau/liberchatserver_ynh-main
patch -p1 < fix-websocket.patch
```

2. Les fichiers nginx.conf et server.js ont été corrigés automatiquement

3. Rebuild l'application :
```bash
npm run build
```

## Test

Après installation sur YunoHost, vérifier dans la console du navigateur :
- Les logs "Socket.IO config:" doivent montrer le bon path
- La connexion WebSocket doit s'établir sans erreur 404