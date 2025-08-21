#!/bin/bash

# Fichier _common.sh pour LiberChat
# Fonctions communes pour les scripts YunoHost

# Variables par défaut
app=$YNH_APP_INSTANCE_NAME
final_path=$YNH_APP_INSTALL_DIR

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
