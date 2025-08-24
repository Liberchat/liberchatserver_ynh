#!/bin/bash

# Fichier _common.sh pour LiberChat
# Fonctions communes pour les scripts YunoHost

# Variables par défaut (avec valeurs par défaut si non définies)
app=${YNH_APP_INSTANCE_NAME:-liberchat}
final_path=${YNH_APP_INSTALL_DIR:-/var/www/$app}
install_dir=${YNH_APP_INSTALL_DIR:-/var/www/$app}

# Fonction de log
ynh_print_info() {
    echo "Info: $1"
}

ynh_print_warn() {
    echo "Warning: $1"
}

ynh_print_err() {
    echo "Error: $1"
}
