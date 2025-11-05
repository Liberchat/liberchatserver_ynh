#!/bin/bash

# Script pour corriger l'installation YunoHost de Liberchat

echo "🔧 Correction de l'installation YunoHost Liberchat..."
echo "=================================================="

# Vérifier si on est root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Ce script doit être exécuté en tant que root"
    exit 1
fi

# 1. Arrêter et supprimer l'instance existante
echo -e "\n🛑 Suppression de l'instance existante..."
yunohost app remove liberchat --force

# 2. Nettoyer les résidus
echo -e "\n🧹 Nettoyage des résidus..."
rm -rf /var/www/liberchat*
rm -rf /var/log/liberchat*
rm -f /etc/nginx/conf.d/*liberchat*
rm -f /etc/systemd/system/liberchat*

# 3. Recharger les services
echo -e "\n🔄 Rechargement des services..."
systemctl daemon-reload
nginx -t && systemctl reload nginx

# 4. Vérifier que tout est propre
echo -e "\n🔍 Vérification..."
if [ -d "/var/www/liberchat" ] || [ -d "/var/www/liberchat__2" ]; then
    echo "❌ Des dossiers liberchat existent encore"
    ls -la /var/www/liberchat*
else
    echo "✅ Nettoyage terminé"
fi

echo -e "\n💡 Maintenant vous pouvez réinstaller avec :"
echo "sudo yunohost app install https://github.com/Liberchat/liberchatserver_ynh/tree/v6.5"
echo -e "\nOu depuis le dossier local :"
echo "sudo yunohost app install ./"