#!/bin/bash
# Script d'installation pour Liberchat sur YunoHost
set -e

# Variables
app=liberchat
domain=$YNH_APP_ARG_DOMAIN
path_url=$YNH_APP_ARG_PATH
admin=$YNH_APP_ARG_ADMIN
final_path=/var/www/$app

# Installation des dépendances
ynh_install_app_dependencies nodejs npm

# Création du dossier final
mkdir -p $final_path

# Copie des fichiers
cp -r ../src $final_path/
cp ../package.json $final_path/
cp ../server.js $final_path/

# Installation des modules Node.js
cd $final_path
npm install --production

# Création du service systemd
ynh_add_systemd_config

# Configuration NGINX
ynh_add_nginx_config

# Permissions SSO
ynh_app_setting_set $app admin $admin
ynh_permission_update --permission main --add $admin

# Logs
ynh_store_file_checksum --file $final_path/package.json

# Fin
