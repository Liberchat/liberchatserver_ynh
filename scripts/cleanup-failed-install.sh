#!/bin/bash

# Script de nettoyage pour les installations échouées de Liberchat

echo "=== Nettoyage de l'installation échouée de Liberchat ==="

APP_NAME="liberchat"
INSTALL_DIR="/var/www/$APP_NAME"

# Arrêter le service s'il existe
if systemctl is-active --quiet $APP_NAME; then
    echo "Arrêt du service $APP_NAME..."
    systemctl stop $APP_NAME
fi

# Supprimer les fichiers d'installation
if [ -d "$INSTALL_DIR" ]; then
    echo "Suppression du répertoire d'installation..."
    rm -rf "$INSTALL_DIR"
fi

# Nettoyer les caches npm globaux
echo "Nettoyage des caches npm..."
npm cache clean --force 2>/dev/null || true

# Supprimer les logs d'erreur
if [ -d "/var/log/$APP_NAME" ]; then
    echo "Suppression des logs..."
    rm -rf "/var/log/$APP_NAME"
fi

# Nettoyer les configurations systemd
if [ -f "/etc/systemd/system/$APP_NAME.service" ]; then
    echo "Suppression de la configuration systemd..."
    rm -f "/etc/systemd/system/$APP_NAME.service"
    systemctl daemon-reload
fi

# Nettoyer nginx
if [ -f "/etc/nginx/conf.d/$APP_NAME.conf" ]; then
    echo "Suppression de la configuration nginx..."
    rm -f "/etc/nginx/conf.d/$APP_NAME.conf"
    nginx -t && systemctl reload nginx
fi

echo "=== Nettoyage terminé ==="
echo "Vous pouvez maintenant réessayer l'installation avec :"
echo "sudo yunohost app install ./"