#!/bin/bash

# Correction immédiate du service systemd

echo "🔧 Correction immédiate du service liberchat..."

app="liberchat"
service_file="/etc/systemd/system/$app.service"

# 1. Arrêter le service
echo "⏹️ Arrêt du service..."
sudo systemctl stop $app

# 2. Créer le dossier de logs
echo "📁 Création du dossier de logs..."
sudo mkdir -p /var/log/$app
sudo chown -R $app:$app /var/log/$app
sudo chmod 755 /var/log/$app

# 3. Corriger le fichier systemd
echo "⚙️ Correction du fichier systemd..."
if [ -f "$service_file" ]; then
    # Backup
    sudo cp "$service_file" "$service_file.backup"
    
    # Remplacer les lignes StandardOutput et StandardError
    sudo sed -i 's|StandardOutput=.*|StandardOutput=journal|' "$service_file"
    sudo sed -i 's|StandardError=.*|StandardError=journal|' "$service_file"
    
    # Supprimer la référence au dossier de logs dans ReadWritePaths
    sudo sed -i 's|ReadWritePaths=.*/var/log/__APP__|ReadWritePaths=__INSTALL_DIR__/data __INSTALL_DIR__/backups|' "$service_file"
    
    echo "✅ Fichier systemd corrigé"
else
    echo "❌ Fichier systemd non trouvé"
    exit 1
fi

# 4. Recharger systemd
echo "🔄 Rechargement de systemd..."
sudo systemctl daemon-reload

# 5. Redémarrer le service
echo "🚀 Redémarrage du service..."
sudo systemctl start $app

# 6. Attendre et vérifier
sleep 5
echo -e "\n📊 Status du service:"
sudo systemctl status $app --no-pager -l

# 7. Vérifier les logs
echo -e "\n📋 Logs récents:"
sudo journalctl -u $app --no-pager -n 10

echo -e "\n✅ Correction terminée"