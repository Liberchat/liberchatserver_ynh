#!/bin/bash

# Script de réparation automatique pour les problèmes Socket.IO

echo "🔧 Réparation automatique Socket.IO"
echo "==================================="

app="liberchat"
install_dir="/var/www/$app"

# Vérifier les permissions
if [ "$EUID" -ne 0 ]; then
    echo "❌ Ce script doit être exécuté en tant que root"
    echo "Usage: sudo $0"
    exit 1
fi

echo "🔍 Diagnostic initial..."

# 1. Vérifier et corriger les variables d'environnement
echo -e "\n📝 Vérification des variables d'environnement..."
if [ -f "$install_dir/.env" ]; then
    # Backup du fichier .env
    cp "$install_dir/.env" "$install_dir/.env.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Vérifier PING_TIMEOUT
    if ! grep -q "PING_TIMEOUT" "$install_dir/.env"; then
        echo "PING_TIMEOUT=60000" >> "$install_dir/.env"
        echo "✅ Ajouté PING_TIMEOUT=60000"
    else
        # Corriger si trop faible
        current_timeout=$(grep "PING_TIMEOUT" "$install_dir/.env" | cut -d= -f2)
        if [ "$current_timeout" -lt 30000 ]; then
            sed -i 's/PING_TIMEOUT=.*/PING_TIMEOUT=60000/' "$install_dir/.env"
            echo "✅ Corrigé PING_TIMEOUT à 60000"
        fi
    fi
    
    # Vérifier PING_INTERVAL
    if ! grep -q "PING_INTERVAL" "$install_dir/.env"; then
        echo "PING_INTERVAL=25000" >> "$install_dir/.env"
        echo "✅ Ajouté PING_INTERVAL=25000"
    else
        current_interval=$(grep "PING_INTERVAL" "$install_dir/.env" | cut -d= -f2)
        if [ "$current_interval" -lt 20000 ]; then
            sed -i 's/PING_INTERVAL=.*/PING_INTERVAL=25000/' "$install_dir/.env"
            echo "✅ Corrigé PING_INTERVAL à 25000"
        fi
    fi
    
    # Vérifier YNH_APP_ARG_PATH
    path=$(yunohost app setting $app path 2>/dev/null)
    if [ -n "$path" ] && ! grep -q "YNH_APP_ARG_PATH" "$install_dir/.env"; then
        echo "YNH_APP_ARG_PATH=$path" >> "$install_dir/.env"
        echo "✅ Ajouté YNH_APP_ARG_PATH=$path"
    fi
    
    # Corriger les permissions
    chown $app:$app "$install_dir/.env"
    chmod 600 "$install_dir/.env"
    
else
    echo "❌ Fichier .env manquant"
    exit 1
fi

# 2. Vérifier et corriger la configuration nginx
echo -e "\n🌐 Vérification de la configuration nginx..."
nginx_conf="/etc/nginx/conf.d/${app}.*.conf"
if ls $nginx_conf 2>/dev/null >/dev/null; then
    # Vérifier si la configuration Socket.IO est présente
    if ! grep -q "socket.io" $nginx_conf; then
        echo "⚠️  Configuration Socket.IO manquante dans nginx"
        echo "   Veuillez réinstaller l'application ou corriger manuellement"
    else
        echo "✅ Configuration Socket.IO présente dans nginx"
    fi
    
    # Test de la configuration nginx
    if nginx -t 2>/dev/null; then
        echo "✅ Configuration nginx valide"
    else
        echo "❌ Configuration nginx invalide"
        nginx -t
    fi
else
    echo "❌ Configuration nginx non trouvée"
fi

# 3. Vérifier les permissions des fichiers
echo -e "\n🔒 Vérification des permissions..."
chown -R $app:$app "$install_dir"
chmod -R 755 "$install_dir"
chmod 600 "$install_dir/.env" 2>/dev/null
echo "✅ Permissions corrigées"

# 4. Nettoyer les processus zombies
echo -e "\n🧹 Nettoyage des processus..."
pkill -f "node.*$app" 2>/dev/null || true
sleep 2
echo "✅ Processus nettoyés"

# 5. Redémarrer les services
echo -e "\n🔄 Redémarrage des services..."

# Redémarrer nginx
systemctl restart nginx
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx redémarré avec succès"
else
    echo "❌ Échec du redémarrage nginx"
    systemctl status nginx --no-pager -l
fi

# Redémarrer l'application
systemctl restart $app
sleep 5

if systemctl is-active --quiet $app; then
    echo "✅ Application redémarrée avec succès"
else
    echo "❌ Échec du redémarrage de l'application"
    systemctl status $app --no-pager -l
    echo -e "\nLogs récents:"
    journalctl -u $app --no-pager -n 20
fi

# 6. Tests de validation
echo -e "\n✅ Tests de validation..."

# Test local
port=$(yunohost app setting $app port 2>/dev/null || echo "3000")
if curl -s --connect-timeout 5 "http://127.0.0.1:$port" >/dev/null; then
    echo "✅ Application accessible localement"
else
    echo "❌ Application non accessible localement"
fi

# Test Socket.IO local
if curl -s --connect-timeout 5 "http://127.0.0.1:$port/socket.io/?EIO=4&transport=polling" >/dev/null; then
    echo "✅ Socket.IO accessible localement"
else
    echo "❌ Socket.IO non accessible localement"
fi

# Test public
domain=$(yunohost domain list --output-as json 2>/dev/null | jq -r '.domains[0]' 2>/dev/null)
path=$(yunohost app setting $app path 2>/dev/null)
if [ -n "$domain" ] && [ -n "$path" ]; then
    if curl -s --connect-timeout 10 "https://$domain$path" >/dev/null; then
        echo "✅ Application accessible publiquement"
    else
        echo "❌ Application non accessible publiquement"
    fi
fi

echo -e "\n🎉 Réparation terminée!"
echo -e "\n📋 Résumé des actions:"
echo "- Variables d'environnement vérifiées/corrigées"
echo "- Permissions corrigées"
echo "- Services redémarrés"
echo "- Tests de validation effectués"

echo -e "\n🔍 Pour surveiller les logs:"
echo "sudo journalctl -u $app -f"

echo -e "\n🌐 Pour tester manuellement:"
echo "curl -v 'https://$domain$path/socket.io/?EIO=4&transport=polling'"