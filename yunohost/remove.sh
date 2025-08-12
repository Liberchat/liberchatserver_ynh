#!/bin/bash
# Script de désinstallation pour Liberchat sur YunoHost
set -e

app=liberchat
final_path=/var/www/$app

# Suppression du service systemd
ynh_remove_systemd_config

# Suppression de la configuration NGINX
ynh_remove_nginx_config

# Suppression des permissions
ynh_permission_delete --permission main

# Suppression des logs et fichiers
ynh_secure_remove $final_path

# Fin
