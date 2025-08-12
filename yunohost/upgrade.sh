#!/bin/bash
# Script de mise à jour pour Liberchat sur YunoHost
set -e

app=liberchat
final_path=/var/www/$app

# Arrêt du service
ynh_systemd_action --service_name=$app --action=stop

# Mise à jour des fichiers
cp -r ../src $final_path/
cp ../package.json $final_path/
cp ../server.js $final_path/

cd $final_path
npm install --production

# Redémarrage du service
ynh_systemd_action --service_name=$app --action=restart

# Mise à jour des logs
ynh_store_file_checksum --file $final_path/package.json

# Permissions (si besoin)
# ynh_permission_update --permission main --add $admin

# Fin
