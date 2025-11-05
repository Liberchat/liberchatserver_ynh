#!/bin/bash

# Test manuel du serveur Node.js

echo "🧪 Test manuel du serveur liberchat..."

app="liberchat"
install_dir="/var/www/$app"

# 1. Arrêter le service systemd
echo "⏹️ Arrêt du service systemd..."
sudo systemctl stop $app

# 2. Vérifier les fichiers
echo -e "\n📁 Vérification des fichiers:"
if [ ! -d "$install_dir" ]; then
    echo "❌ Dossier d'installation manquant: $install_dir"
    exit 1
fi

if [ ! -f "$install_dir/server.js" ]; then
    echo "❌ server.js manquant"
    exit 1
fi

if [ ! -f "$install_dir/.env" ]; then
    echo "❌ .env manquant"
    exit 1
fi

echo "✅ Fichiers présents"

# 3. Vérifier les permissions
echo -e "\n🔐 Vérification des permissions:"
sudo chown -R $app:$app "$install_dir"
echo "✅ Permissions corrigées"

# 4. Afficher la configuration
echo -e "\n📄 Configuration .env:"
cat "$install_dir/.env"

# 5. Test manuel
echo -e "\n🚀 Démarrage manuel (Ctrl+C pour arrêter):"
echo "Si le serveur démarre correctement, vous verrez 'Server running on port XXXX'"
echo "Appuyez sur Ctrl+C pour arrêter et redémarrer le service systemd"
echo ""

cd "$install_dir"
sudo -u $app node server.js