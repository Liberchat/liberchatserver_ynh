@
#!/bin/bash

# Script de réparation pour l'installation YunoHost de Liberchat

echo "🔧 Réparation de l'installation Liberchat..."
echo "============================================="

# Variables
app="liberchat"
install_dir="/var/www/$app"

# Vérifier si on est root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Ce script doit être exécuté en tant que root"
    exit 1
fi

# 1. Arrêter le service
echo -e "\n⏹️ Arrêt du service..."
systemctl stop $app 2>/dev/null || true

# 2. Vérifier et installer Node.js si nécessaire
echo -e "\n🟢 Vérification de Node.js..."
if ! command -v node &> /dev/null; then
    echo "📦 Installation de Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi

node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$node_version" -lt 16 ]; then
    echo "⚠️ Version Node.js trop ancienne ($node_version), mise à jour recommandée"
fi

# 3. Réparer les permissions
echo -e "\n🔐 Réparation des permissions..."
if [ -d "$install_dir" ]; then
    chown -R $app:www-data "$install_dir"
    chmod -R 755 "$install_dir"
    
    # Permissions spéciales pour les dossiers de données
    if [ -d "$install_dir/data" ]; then
        chown -R $app:$app "$install_dir/data"
        chmod -R 750 "$install_dir/data"
    fi
    
    if [ -d "$install_dir/backups" ]; then
        chown -R $app:$app "$install_dir/backups"
        chmod -R 750 "$install_dir/backups"
    fi
    
    echo "✅ Permissions réparées"
else
    echo "❌ Dossier d'installation non trouvé: $install_dir"
    exit 1
fi

# 4. Réinstaller les dépendances
echo -e "\n📦 Réinstallation des dépendances..."
cd "$install_dir"
if [ -f "package.json" ]; then
    # Nettoyer
    rm -rf node_modules package-lock.json
    
    # Réinstaller
    sudo -u $app npm install --production=false
    
    if [ $? -eq 0 ]; then
        echo "✅ Dépendances installées"
    else
        echo "❌ Erreur lors de l'installation des dépendances"
        exit 1
    fi
else
    echo "❌ package.json non trouvé"
    exit 1
fi

# 5. Rebuild l'application
echo -e "\n🏗️ Reconstruction de l'application..."
sudo -u $app npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build réussi"
else
    echo "❌ Erreur lors du build"
    exit 1
fi

# 6. Créer les dossiers nécessaires
echo -e "\n📁 Création des dossiers..."
mkdir -p "$install_dir/data"
mkdir -p "$install_dir/backups"
mkdir -p "/var/log/$app"

chown -R $app:$app "$install_dir/data" "$install_dir/backups" "/var/log/$app"

# 7. Vérifier la configuration
echo -e "\n⚙️ Vérification de la configuration..."
if [ -f "$install_dir/.env" ]; then
    echo "✅ Fichier .env présent"
else
    echo "⚠️ Fichier .env manquant, création d'un fichier par défaut..."
    cat > "$install_dir/.env" << EOF
NODE_ENV=production
PORT=3000
HOST=127.0.0.1
ALLOWED_DOMAINS=
YNH_APP_ARG_PATH=/liberchat
MAX_MESSAGES=100
MAX_FILE_SIZE=50
PING_TIMEOUT=300000
PING_INTERVAL=120000
EOF
    chown $app:$app "$install_dir/.env"
fi

# 8. Redémarrer le service
echo -e "\n🚀 Redémarrage du service..."
systemctl daemon-reload
systemctl enable $app
systemctl start $app

# Attendre un peu et vérifier
sleep 5
if systemctl is-active --quiet $app; then
    echo "✅ Service démarré avec succès"
else
    echo "❌ Erreur lors du démarrage du service"
    echo "📋 Logs du service:"
    journalctl -u $app --no-pager -n 20
    exit 1
fi

# 9. Test de connectivité
echo -e "\n🌐 Test de connectivité..."
port=$(grep "PORT=" "$install_dir/.env" | cut -d'=' -f2)
if [ -z "$port" ]; then
    port=3000
fi

if curl -s "http://127.0.0.1:$port" > /dev/null; then
    echo "✅ Application accessible sur le port $port"
else
    echo "❌ Application non accessible sur le port $port"
fi

echo -e "\n✅ Réparation terminée !"
echo -e "\n💡 Commandes utiles:"
echo "- Voir les logs: journalctl -u $app -f"
echo "- Redémarrer: systemctl restart $app"
echo "- Status: systemctl status $app"
echo "- Test manuel: cd $install_dir && sudo -u $app npm start"