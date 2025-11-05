#!/bin/bash

# Fichier _common.sh pour LiberChat
# Fonctions communes pour les scripts YunoHost

# Variables par défaut
app=${YNH_APP_INSTANCE_NAME:-liberchat}
install_dir=${YNH_APP_INSTALL_DIR:-/var/www/$app}

# Version Node.js requise
nodejs_version=18

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

# Fonction pour vérifier les prérequis
check_requirements() {
    # Vérifier que Node.js est installé
    if ! command -v node &> /dev/null; then
        ynh_print_err "Node.js n'est pas installé"
        return 1
    fi
    
    # Vérifier la version de Node.js
    node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -lt 16 ]; then
        ynh_print_err "Node.js version $node_version détectée, version 16+ requise"
        return 1
    fi
    
    return 0
}

# Fonction pour vérifier la santé de l'application
check_app_health() {
    local port=$1
    local timeout=${2:-30}
    local count=0
    
    ynh_print_info "Vérification de la santé de l'application sur le port $port..."
    
    while [ $count -lt $timeout ]; do
        if curl -f -s "http://127.0.0.1:$port" > /dev/null; then
            ynh_print_info "✅ Application accessible"
            return 0
        fi
        sleep 1
        count=$((count + 1))
    done
    
    ynh_print_err "❌ Application non accessible après ${timeout}s"
    return 1
}

# Fonction pour vérifier Socket.IO
check_socketio_health() {
    local port=$1
    local path=${2:-""}
    
    ynh_print_info "Vérification de Socket.IO..."
    
    if curl -f -s "http://127.0.0.1:$port${path}/socket.io/?EIO=4&transport=polling" > /dev/null; then
        ynh_print_info "✅ Socket.IO accessible"
        return 0
    else
        ynh_print_err "❌ Socket.IO non accessible"
        return 1
    fi
}
