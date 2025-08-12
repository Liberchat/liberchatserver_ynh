#!/bin/bash
# Script de restauration pour Liberchat sur YunoHost
set -e

app=liberchat
final_path=/var/www/$app

# Restauration du dossier de l'app
ynh_restore $final_path

# Restauration des logs
ynh_restore_file_if_checksum_is_different $final_path/package.json

# Fin
