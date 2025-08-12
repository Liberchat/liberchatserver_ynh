#!/bin/bash
# Script de sauvegarde pour Liberchat sur YunoHost
set -e

app=liberchat
final_path=/var/www/$app

# Sauvegarde du dossier de l'app
ynh_backup $final_path

# Sauvegarde des logs
ynh_backup_if_checksum_is_different $final_path/package.json

# Fin
