# Guide de dépannage YunoHost - Liberchat

## Problèmes courants et solutions

### 1. Erreur d'installation Node.js

**Symptôme :** `Node.js version is too old` ou `npm ERR! EBADENGINE`

**Solution :**
```bash
# Installer Node.js 20+ manuellement (requis pour certaines dépendances)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt-get install -y nodejs

# Installer patch-package globalement
sudo npm install -g patch-package

# Vérifier la version
node --version  # Doit être ≥ v20.0.0
```

### 2. Erreurs de dépendances npm

**Symptôme :** `npm install` échoue avec des erreurs de peer dependencies ou `patch-package: not found`

**Solution :**
```bash
# Nettoyer le cache npm
npm cache clean --force

# Installer patch-package si manquant
sudo npm install -g patch-package

# Installer avec les flags appropriés
npm install --legacy-peer-deps --no-audit --no-fund --ignore-engines

# Si problème persiste, supprimer node_modules
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps --ignore-engines
```

### 3. Erreur de build Vite

**Symptôme :** `npm run build` échoue

**Solution :**
```bash
# S'assurer que les variables d'environnement sont définies
export NODE_ENV=production
export YNH_APP_ARG_PATH="/liberchat"

# Rebuild
npm run build
```

### 4. Service ne démarre pas

**Symptôme :** Le service systemd ne démarre pas

**Solution :**
```bash
# Vérifier les logs
sudo journalctl -u liberchat -f

# Vérifier les permissions
sudo chown -R liberchat:www-data /var/www/liberchat
sudo chmod 644 /var/www/liberchat/.env
```

### 5. Problèmes de permissions

**Symptôme :** Erreurs de permissions lors de l'installation

**Solution :**
```bash
# Corriger les permissions
sudo chown -R liberchat:www-data /var/www/liberchat
sudo chmod -R 755 /var/www/liberchat
sudo chmod 644 /var/www/liberchat/.env
```

## Commandes de diagnostic

### Test rapide de l'installation
```bash
./test-yunohost-install.sh
```

### Vérifier l'état du service
```bash
sudo systemctl status liberchat
```

### Vérifier les logs
```bash
sudo journalctl -u liberchat --since "1 hour ago"
```

### Test manuel de l'application
```bash
cd /var/www/liberchat
sudo -u liberchat npm start
```

## Nettoyage après échec d'installation

Si l'installation/upgrade échoue :

```bash
# Arrêter le service
sudo systemctl stop liberchat

# Nettoyer les fichiers
sudo rm -rf /var/www/liberchat
sudo rm -f /etc/systemd/system/liberchat.service
sudo rm -f /etc/nginx/conf.d/liberchat.conf

# Nettoyer les caches
sudo npm cache clean --force

# Recharger les services
sudo systemctl daemon-reload
sudo nginx -t && sudo systemctl reload nginx

# Réinstaller avec Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt-get install -y nodejs
sudo npm install -g patch-package
sudo yunohost app install ./
```

## Réinstallation complète

Si tous les dépannages échouent :

```bash
# Désinstaller complètement
sudo yunohost app remove liberchat

# Nettoyer tous les résidus
sudo rm -rf /var/www/liberchat
sudo userdel liberchat 2>/dev/null || true
sudo npm cache clean --force

# Réinstaller
sudo yunohost app install ./
```

## Support

Si les problèmes persistent, vérifiez :
1. Version de YunoHost : `yunohost --version`
2. Logs système : `sudo journalctl -xe`
3. Espace disque : `df -h`
4. Mémoire disponible : `free -h`