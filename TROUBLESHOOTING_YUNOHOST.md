# Guide de dépannage YunoHost - Liberchat

## Problèmes courants et solutions

### 1. Erreur d'installation Node.js

**Symptôme :** `Node.js version is too old` ou `npm not found`

**Solution :**
```bash
# Installer Node.js 18+ manuellement
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo bash -
sudo apt-get install -y nodejs

# Vérifier la version
node --version  # Doit être ≥ v18.0.0
```

### 2. Erreurs de dépendances npm

**Symptôme :** `npm install` échoue avec des erreurs de peer dependencies

**Solution :**
```bash
# Nettoyer le cache npm
npm cache clean --force

# Installer avec les flags appropriés
npm install --legacy-peer-deps --no-audit --no-fund
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

## Réinstallation complète

Si tous les dépannages échouent :

```bash
# Désinstaller
sudo yunohost app remove liberchat

# Nettoyer les résidus
sudo rm -rf /var/www/liberchat
sudo userdel liberchat

# Réinstaller
sudo yunohost app install ./
```

## Support

Si les problèmes persistent, vérifiez :
1. Version de YunoHost : `yunohost --version`
2. Logs système : `sudo journalctl -xe`
3. Espace disque : `df -h`
4. Mémoire disponible : `free -h`