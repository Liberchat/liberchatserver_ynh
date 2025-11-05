#!/bin/bash

# Script de diagnostic spécifique pour Socket.IO

echo "🔌 Diagnostic Socket.IO pour LiberChat"
echo "======================================"

# Variables
app="liberchat"
install_dir="/var/www/$app"

# Récupérer les informations YunoHost
domain=$(yunohost domain list --output-as json 2>/dev/null | jq -r '.domains[0]' 2>/dev/null || echo "localhost")
path=$(yunohost app setting $app path 2>/dev/null || echo "/liberchat")
port=$(yunohost app setting $app port 2>/dev/null || echo "3000")

echo "Configuration détectée:"
echo "- Domain: $domain"
echo "- Path: $path"
echo "- Port: $port"

# 1. Vérifier le service
echo -e "\n⚙️ Status du service:"
if systemctl is-active --quiet $app; then
    echo "✅ Service actif"
    echo "PID: $(systemctl show $app --property=MainPID --value)"
else
    echo "❌ Service inactif"
    echo "Status: $(systemctl is-active $app)"
    exit 1
fi

# 2. Vérifier les variables d'environnement
echo -e "\n🔧 Variables d'environnement:"
if [ -f "$install_dir/.env" ]; then
    echo "Variables Socket.IO:"
    grep -E "^(PORT|YNH_APP_ARG_PATH|PING_TIMEOUT|PING_INTERVAL|ALLOWED_DOMAINS)" "$install_dir/.env" 2>/dev/null || echo "Variables manquantes"
else
    echo "❌ Fichier .env manquant"
fi

# 3. Test de connectivité locale
echo -e "\n🌐 Test connectivité locale:"
local_url="http://127.0.0.1:$port"
if curl -s --connect-timeout 3 "$local_url" >/dev/null; then
    echo "✅ Application accessible localement sur port $port"
else
    echo "❌ Application non accessible sur port $port"
fi

# Test Socket.IO local
local_socketio="http://127.0.0.1:$port/socket.io/?EIO=4&transport=polling"
echo -e "\nTest Socket.IO local: $local_socketio"
response=$(curl -s --connect-timeout 3 "$local_socketio" 2>/dev/null)
if [ $? -eq 0 ] && [ -n "$response" ]; then
    echo "✅ Socket.IO répond localement"
    echo "Réponse: $(echo "$response" | head -c 100)..."
else
    echo "❌ Socket.IO ne répond pas localement"
fi

# 4. Test via nginx/proxy
echo -e "\n🌐 Test via proxy nginx:"
public_url="https://$domain$path"
public_socketio="https://$domain$path/socket.io/?EIO=4&transport=polling"

echo "URL publique: $public_url"
echo "Socket.IO public: $public_socketio"

# Test avec curl verbose pour voir les détails
echo -e "\nTest Socket.IO public (détaillé):"
curl -v --connect-timeout 10 "$public_socketio" 2>&1 | head -20

# 5. Vérifier la configuration nginx
echo -e "\n📄 Configuration nginx:"
nginx_conf="/etc/nginx/conf.d/${app}.*.conf"
if ls $nginx_conf 2>/dev/null >/dev/null; then
    echo "✅ Configuration nginx trouvée"
    echo -e "\nSocket.IO location block:"
    grep -A 10 "location.*socket.io" $nginx_conf 2>/dev/null || echo "Pas de bloc socket.io trouvé"
else
    echo "❌ Configuration nginx non trouvée"
fi

# 6. Test WebSocket upgrade
echo -e "\n🔄 Test WebSocket upgrade:"
if command -v wscat >/dev/null 2>&1; then
    echo "Test avec wscat..."
    timeout 5 wscat -c "wss://$domain$path/socket.io/?EIO=4&transport=websocket" 2>&1 | head -5
elif command -v websocat >/dev/null 2>&1; then
    echo "Test avec websocat..."
    timeout 5 websocat "wss://$domain$path/socket.io/?EIO=4&transport=websocket" --exit-on-eof 2>&1 | head -5
else
    echo "❌ Aucun client WebSocket installé (wscat ou websocat)"
fi

# 7. Vérifier les logs récents
echo -e "\n📋 Logs récents (Socket.IO):"
journalctl -u $app --since "2 minutes ago" --no-pager | grep -i -E "(socket|websocket|polling|connect|disconnect|error)" | tail -15

# 8. Vérifier les processus et ports
echo -e "\n🔍 Processus et ports:"
echo "Processus Node.js:"
ps aux | grep -E "(node|$app)" | grep -v grep

echo -e "\nPorts en écoute:"
netstat -tlnp | grep ":$port " || echo "Port $port non en écoute"

# 9. Test de performance réseau
echo -e "\n⚡ Test de performance:"
echo "Ping vers le domaine:"
ping -c 3 "$domain" 2>/dev/null | tail -3

echo -e "\nTest de résolution DNS:"
nslookup "$domain" 2>/dev/null | grep -A 2 "Name:"

# 10. Recommandations
echo -e "\n💡 Diagnostic et recommandations:"

# Vérifier si le service répond localement mais pas publiquement
if curl -s --connect-timeout 3 "$local_url" >/dev/null; then
    if ! curl -s --connect-timeout 10 "$public_url" >/dev/null; then
        echo "⚠️  Service OK localement mais pas publiquement - problème nginx/proxy"
        echo "   → Vérifier: sudo nginx -t && sudo systemctl reload nginx"
    fi
fi

# Vérifier les timeouts Socket.IO
if [ -f "$install_dir/.env" ]; then
    ping_timeout=$(grep "PING_TIMEOUT" "$install_dir/.env" | cut -d= -f2)
    ping_interval=$(grep "PING_INTERVAL" "$install_dir/.env" | cut -d= -f2)
    
    if [ -z "$ping_timeout" ] || [ "$ping_timeout" -lt 30000 ]; then
        echo "⚠️  PING_TIMEOUT trop faible ou manquant (recommandé: 60000)"
    fi
    
    if [ -z "$ping_interval" ] || [ "$ping_interval" -lt 20000 ]; then
        echo "⚠️  PING_INTERVAL trop faible ou manquant (recommandé: 25000)"
    fi
fi

echo -e "\n🔧 Commandes de réparation suggérées:"
echo "1. Redémarrer nginx: sudo systemctl restart nginx"
echo "2. Redémarrer l'app: sudo systemctl restart $app"
echo "3. Vérifier les logs: sudo journalctl -u $app -f"
echo "4. Test manuel: cd $install_dir && sudo -u $app NODE_ENV=production npm start"