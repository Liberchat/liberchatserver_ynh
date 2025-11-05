#!/bin/bash

# Script de réparation rapide pour le service liberchat

echo "🔧 Réparation du service liberchat..."

app="liberchat"
install_dir="/var/www/$app"

# 1. Arrêter le service
echo "⏹️ Arrêt du service..."
sudo systemctl stop $app

# 2. Trouver le bon chemin Node.js
echo "🔍 Recherche du chemin Node.js..."
if command -v node &> /dev/null; then
    node_path=$(which node)
    echo "✅ Node.js trouvé: $node_path"
else
    echo "❌ Node.js non trouvé"
    exit 1
fi

# 3. Corriger le fichier systemd
echo "⚙️ Correction du fichier systemd..."
service_file="/etc/systemd/system/$app.service"

if [ -f "$service_file" ]; then
    # Backup du fichier original
    sudo cp "$service_file" "$service_file.backup"
    
    # Corriger le chemin ExecStart
    sudo sed -i "s|ExecStart=.*|ExecStart=$node_path $install_dir/server.js|" "$service_file"
    
    echo "✅ Fichier systemd corrigé"
    echo "Nouveau ExecStart: $node_path $install_dir/server.js"
else
    echo "❌ Fichier systemd non trouvé: $service_file"
    exit 1
fi

# 4. Vérifier que server.js existe
if [ ! -f "$install_dir/server.js" ]; then
    echo "❌ server.js manquant dans $install_dir"
    exit 1
fi

# 5. Vérifier les permissions
echo "🔐 Vérification des permissions..."
sudo chown -R $app:$app "$install_dir"
sudo chmod +x "$install_dir/server.js"

# 6. Recharger systemd
echo "🔄 Rechargement de systemd..."
sudo systemctl daemon-reload

# 7. Redémarrer le service
echo "🚀 Redémarrage du service..."
sudo systemctl start $app

# 8. Vérifier le status
sleep 3
echo -e "\n📊 Status du service:"
sudo systemctl status $app --no-pager -l

# 9. Test de connectivité
echo -e "\n🌐 Test de connectivité..."
port=$(grep "PORT=" "$install_dir/.env" 2>/dev/null | cut -d'=' -f2 || echo "3000")
if curl -s --connect-timeout 5 "http://127.0.0.1:$port" > /dev/null; then
    echo "✅ Service accessible sur le port $port"
else
    echo "❌ Service non accessible sur le port $port"
    echo "📋 Logs récents:"
    sudo journalctl -u $app --no-pager -n 10
fi