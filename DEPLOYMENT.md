# Guide de déploiement Liberchat YunoHost

## 🚀 Installation rapide

### Via l'interface YunoHost
1. Connectez-vous à votre interface d'administration YunoHost
2. Allez dans **Applications** > **Installer une application**
3. Cliquez sur **Installer une application personnalisée**
4. Entrez l'URL : `https://github.com/Liberchat/liberchatserver_ynh`
5. Suivez l'assistant d'installation

### Via la ligne de commande
```bash
sudo yunohost app install https://github.com/Liberchat/liberchatserver_ynh
```

### Installation de la version de test
```bash
sudo yunohost app install https://github.com/Liberchat/liberchatserver_ynh/tree/testing --debug
```

## ⚙️ Configuration

### Paramètres d'installation
- **Domaine** : Le domaine où installer l'application
- **Chemin** : Le sous-chemin (ex: `/liberchat`)
- **Administrateur** : L'utilisateur YunoHost administrateur
- **Visibilité** : Public ou privé

### Variables d'environnement automatiques
L'application configure automatiquement :
- `NODE_ENV=production`
- `PORT` : Port assigné par YunoHost
- `ALLOWED_DOMAINS` : Domaine d'installation
- `YNH_APP_ARG_PATH` : Chemin de base

## 🔄 Gestion

### Mise à jour
```bash
sudo yunohost app upgrade liberchat
```

### Sauvegarde
```bash
sudo yunohost backup create --apps liberchat
```

### Restauration
```bash
sudo yunohost backup restore <nom_sauvegarde> --apps liberchat
```

### Logs
```bash
sudo journalctl -u liberchat -f
```

### Redémarrage
```bash
sudo systemctl restart liberchat
```

## 🔧 Multi-instance

Vous pouvez installer plusieurs instances :

```bash
# Première instance
sudo yunohost app install https://github.com/Liberchat/liberchatserver_ynh \
  --args "domain=example.com&path=/chat1"

# Deuxième instance  
sudo yunohost app install https://github.com/Liberchat/liberchatserver_ynh \
  --args "domain=example.com&path=/chat2"
```

## 🌐 Domaines supportés

L'application fonctionne automatiquement avec :

### Domaines classiques
- `https://example.com/liberchat`
- `https://chat.example.com`

### Domaines .onion (Tor)
- `https://abc123...onion/liberchat`

### IP locales
- `https://192.168.1.100/liberchat`
- `http://10.0.0.50:8080/liberchat`

## 🛠️ Développement

### Test en local
```bash
git clone https://github.com/Liberchat/liberchatserver_ynh.git
cd liberchatserver_ynh
./test-yunohost.sh
```

### Structure des fichiers
```
├── conf/                 # Configuration YunoHost
├── scripts/             # Scripts d'installation/gestion
├── src/                 # Code source React
├── server.js            # Serveur Node.js
└── manifest.toml        # Manifeste YunoHost
```

## 🔍 Dépannage

### L'application ne démarre pas
```bash
# Vérifier les logs
sudo journalctl -u liberchat -n 50

# Vérifier la configuration
sudo systemctl status liberchat

# Redémarrer
sudo systemctl restart liberchat
```

### Page blanche
1. Vérifiez que le build s'est bien passé
2. Vérifiez les permissions des fichiers
3. Vérifiez la configuration Nginx

### WebSocket ne fonctionne pas
1. Vérifiez la configuration du proxy Nginx
2. Vérifiez que le port est bien ouvert
3. Testez avec `curl` :
```bash
curl -s "https://votre-domaine.com/liberchat/socket.io/?EIO=4&transport=polling"
```

## 📋 Checklist post-installation

- [ ] L'application se charge correctement
- [ ] Les WebSockets fonctionnent (chat en temps réel)
- [ ] Le partage de fichiers fonctionne
- [ ] Les réactions emoji fonctionnent
- [ ] L'interface est responsive sur mobile
- [ ] Les logs ne montrent pas d'erreurs

## 🆘 Support

- **Issues GitHub** : https://github.com/Liberchat/liberchatserver_ynh/issues
- **Forum YunoHost** : https://forum.yunohost.org/
- **Documentation YunoHost** : https://yunohost.org/packaging_apps

## 📝 Contribution

1. Fork le projet
2. Créez une branche feature
3. Testez vos modifications
4. Soumettez une Pull Request vers la branche `testing`