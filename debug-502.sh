#!/bin/bash

# Script de diagnostic pour l'erreur 502 et Socket.IO

echo "🔍 Diagnostic de l'erreur 502 et Socket.IO..."
echo "=============================================="

# Variables
app="liberchat"

# 1. Vérifier le service systemd
echo -e "\n⚙️ Status du service:"
if systemctl list-unit-files | grep -q "$app.service"; then
    echo "✅ Service configuré"
    
    if systemctl is-active --quiet "$app"; then
        echo "✅ Service actif"
    else
        echo "❌ Service inactif"
        echo "Status: $(systemctl is-active $app)"
        echo -e "\n📋 Logs du service:"
        journalctl -u $app --no-pager -n 20
    fi
else
    echo "❌ Service non configuré"
fi

# 2. Vérifier les ports
echo -e "\n🔌 Ports en écoute:"
netstat -tlnp | grep ":300[0-9]" || echo "Aucun port 3000-3009 en écoute"

# 3. Vérifier la configuration Nginx
echo -e "\n🌐 Configuration Nginx:"
nginx_conf="/etc/nginx/conf.d/${app}.*.conf"
if ls $nginx_conf 2>/dev/null; then
    echo "✅ Configuration Nginx trouvée:"
    ls -la $nginx_conf
    
    echo -e "\n📄 Contenu de la configuration:"
    cat $nginx_conf | head -20
else
    echo "❌ Configuration Nginx non trouvée"
fi

# 4. Test de connectivité locale
echo -e "\n🌐 Test de connectivité:"
for port in 3000 3001 3002; do
    if curl -s --connect-timeout 2 "http://127.0.0.1:$port" > /dev/null 2>&1; then
        echo "✅ Port $port accessible"
    else
        echo "❌ Port $port non accessible"
    fi
done

# 5. Vérifier les logs Nginx
echo -e "\n📋 Logs Nginx (erreurs récentes):"
tail -n 10 /var/log/nginx/error.log 2>/dev/null || echo "Pas de logs d'erreur Nginx"

# 6. Vérifier les processus Node.js
echo -e "\n🟢 Processus Node.js:"
ps aux | grep node | grep -v grep || echo "Aucun processus Node.js trouvé"

# 7. Vérifier les fichiers de l'application
echo -e "\n📁 Fichiers de l'application:"
install_dir="/var/www/$app"
if [ -d "$install_dir" ]; then
    echo "✅ Dossier d'installation: $install_dir"
    if [ -f "$install_dir/server.js" ]; then
        echo "✅ server.js présent"
    else
        echo "❌ server.js manquant"
    fi
    
    if [ -f "$install_dir/.env" ]; then
        echo "✅ .env présent"
        echo "Configuration:"
        grep -E "^(PORT|NODE_ENV|HOST|YNH_APP_ARG_PATH|PING_TIMEOUT|PING_INTERVAL)" "$install_dir/.env" 2>/dev/null || echo "Variables manquantes"
    else
        echo "❌ .env manquant"
    fi
else
    echo "❌ Dossier d'installation manquant"
fi

# 8. Tests Socket.IO spécifiques
echo -e "\n🔌 Tests Socket.IO:"
domain=$(yunohost domain list --output-as json | jq -r '.domains[0]' 2>/dev/null || echo "localhost")
path=$(yunohost app setting $app path 2>/dev/null || echo "/liberchat")

echo "Domain: $domain"
echo "Path: $path"

# Test Socket.IO endpoint
socketio_url="https://$domain$path/socket.io/?EIO=4&transport=polling"
echo -e "\nTest Socket.IO endpoint: $socketio_url"
if curl -s --connect-timeout 5 "$socketio_url" | head -c 50; then
    echo -e "\n✅ Socket.IO endpoint accessible"
else
    echo -e "\n❌ Socket.IO endpoint non accessible"
fi

# Test WebSocket upgrade
echo -e "\nTest WebSocket upgrade:"
if command -v websocat >/dev/null 2>&1; then
    timeout 3 websocat "wss://$domain$path/socket.io/?EIO=4&transport=websocket" --exit-on-eof 2>&1 | head -3
else
    echo "websocat non installé - test WebSocket ignoré"
fi

# 9. Vérifier les certificats SSL
echo -e "\n🔒 Certificats SSL:"
if openssl s_client -connect "$domain:443" -servername "$domain" </dev/null 2>/dev/null | openssl x509 -noout -dates 2>/dev/null; then
    echo "✅ Certificat SSL valide"
else
    echo "❌ Problème de certificat SSL"
fi

# 10. Vérifier les logs d'erreur spécifiques
echo -e "\n📋 Logs d'erreur récents (Socket.IO):"
journalctl -u $app --since "5 minutes ago" | grep -i -E "(socket|websocket|polling|disconnect|error)" | tail -10 || echo "Pas de logs Socket.IO récents"

echo -e "\n💡 Solutions possibles:"
echo "1. Redémarrer le service: sudo systemctl restart $app"
echo "2. Vérifier les logs: sudo journalctl -u $app -f"
echo "3. Test manuel: cd $install_dir && sudo -u $app npm start"
echo "4. Vérifier la config Nginx: sudo nginx -t && sudo systemctl reload nginx"
echo "5. Pour Socket.IO: vérifier les variables PING_TIMEOUT et PING_INTERVAL"
echo "6. Test Socket.IO direct: curl -v 'https://$domain$path/socket.io/?EIO=4&transport=polling'"
echo "7. Si problème SSL: sudo yunohost domain cert-renew $domain"

echo -e "\n🔧 Commandes de diagnostic avancé:"
echo "- Logs temps réel: sudo journalctl -u $app -f"
echo "- Test port local: curl -v http://127.0.0.1:\$(grep PORT $install_dir/.env | cut -d= -f2)/socket.io/"
echo "- Vérifier processus: ps aux | grep node"
echo "- Tester nginx: sudo nginx -t"