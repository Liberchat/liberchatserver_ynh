# Guide de dépannage Socket.IO pour LiberChat

## Problème observé

Erreurs `ERR_INTERNET_DISCONNECTED` dans la console du navigateur lors des tentatives de connexion Socket.IO.

## Diagnostic rapide

1. **Exécuter le diagnostic automatique :**
   ```bash
   ./debug-socketio.sh
   ```

2. **Vérifier les logs en temps réel :**
   ```bash
   sudo journalctl -u liberchat -f
   ```

## Causes possibles et solutions

### 1. Configuration Socket.IO côté serveur

**Problème :** Timeouts trop courts ou configuration CORS incorrecte.

**Solution :**
```bash
sudo ./fix-socketio-issues.sh
```

### 2. Configuration nginx/proxy

**Problème :** Le proxy nginx ne transmet pas correctement les requêtes WebSocket/polling.

**Vérification :**
```bash
sudo nginx -t
sudo systemctl status nginx
```

**Solution :**
```bash
sudo systemctl restart nginx
sudo systemctl restart liberchat
```

### 3. Certificats SSL

**Problème :** Certificats SSL expirés ou invalides.

**Vérification :**
```bash
openssl s_client -connect votre-domaine.com:443 -servername votre-domaine.com
```

**Solution :**
```bash
sudo yunohost domain cert-renew votre-domaine.com
```

### 4. Firewall/réseau

**Problème :** Ports bloqués ou problèmes de connectivité réseau.

**Vérification :**
```bash
# Vérifier les ports ouverts
sudo netstat -tlnp | grep :3000

# Tester la connectivité locale
curl -v http://127.0.0.1:3000/socket.io/?EIO=4&transport=polling
```

### 5. Variables d'environnement manquantes

**Problème :** Variables PING_TIMEOUT, PING_INTERVAL ou YNH_APP_ARG_PATH manquantes.

**Vérification :**
```bash
cat /var/www/liberchat/.env | grep -E "(PING_|YNH_)"
```

**Solution :** Le script `fix-socketio-issues.sh` corrige automatiquement ces variables.

## Tests manuels

### Test Socket.IO direct

```bash
# Test local
curl -v "http://127.0.0.1:3000/socket.io/?EIO=4&transport=polling"

# Test public
curl -v "https://votre-domaine.com/liberchat/socket.io/?EIO=4&transport=polling"
```

### Test WebSocket

Si vous avez `wscat` installé :
```bash
wscat -c "wss://votre-domaine.com/liberchat/socket.io/?EIO=4&transport=websocket"
```

## Configuration côté client

Le fichier `src/App.tsx` a été mis à jour pour :
- Permettre les transports WebSocket et polling
- Améliorer la gestion des reconnexions
- Ajouter une gestion d'erreur robuste

## Commandes de réparation

### Réparation automatique complète
```bash
sudo ./fix-socketio-issues.sh
```

### Réparation manuelle étape par étape

1. **Corriger les variables d'environnement :**
   ```bash
   sudo nano /var/www/liberchat/.env
   # Ajouter ou corriger :
   # PING_TIMEOUT=60000
   # PING_INTERVAL=25000
   # YNH_APP_ARG_PATH=/liberchat
   ```

2. **Redémarrer les services :**
   ```bash
   sudo systemctl restart nginx
   sudo systemctl restart liberchat
   ```

3. **Vérifier les logs :**
   ```bash
   sudo journalctl -u liberchat --since "1 minute ago"
   ```

## Surveillance continue

Pour surveiller les connexions Socket.IO en temps réel :

```bash
# Logs de l'application
sudo journalctl -u liberchat -f | grep -i socket

# Logs nginx
sudo tail -f /var/log/nginx/access.log | grep socket.io

# Connexions réseau
watch 'netstat -an | grep :3000'
```

## Indicateurs de santé

### ✅ Système sain
- Service liberchat actif
- Port 3000 en écoute
- Socket.IO répond aux requêtes polling
- Certificats SSL valides
- Logs sans erreurs de connexion

### ❌ Problèmes détectés
- Service inactif ou en erreur
- Port 3000 non accessible
- Erreurs 502/504 dans nginx
- Certificats SSL expirés
- Erreurs `ERR_INTERNET_DISCONNECTED` côté client

## Support avancé

Si les solutions automatiques ne fonctionnent pas :

1. **Collecter les informations de diagnostic :**
   ```bash
   ./debug-socketio.sh > diagnostic-$(date +%Y%m%d_%H%M%S).log
   ```

2. **Vérifier la configuration YunoHost :**
   ```bash
   yunohost app info liberchat
   yunohost app setting liberchat
   ```

3. **Test en mode développement :**
   ```bash
   cd /var/www/liberchat
   sudo -u liberchat NODE_ENV=development npm start
   ```

## Notes importantes

- Les erreurs `ERR_INTERNET_DISCONNECTED` sont souvent liées à des problèmes de proxy/SSL
- Socket.IO utilise d'abord le polling HTTP puis upgrade vers WebSocket si possible
- Les timeouts doivent être cohérents entre client et serveur
- YunoHost nécessite une configuration spécifique du chemin (path) pour Socket.IO