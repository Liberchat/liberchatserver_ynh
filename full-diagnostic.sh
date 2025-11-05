#!/bin/bash

# Diagnostic complet pour l'erreur 502

echo "🔍 DIAGNOSTIC COMPLET - Erreur 502"
echo "=================================="

app="liberchat"
install_dir="/var/www/$app"

# 1. Informations système
echo -e "\n📋 INFORMATIONS SYSTÈME:"
echo "Date: $(date)"
echo "Utilisateur: $(whoami)"
echo "OS: $(cat /etc/os-release | grep PRETTY_NAME | cut -d'=' -f2 | tr -d '\"')"

# 2. Status du service
echo -e "\n⚙️ STATUS DU SERVICE:"
if systemctl list-unit-files | grep -q "$app.service"; then
    echo "Service configuré: ✅"
    echo "Status: $(systemctl is-active $app)"
    echo "Enabled: $(systemctl is-enabled $app)"
    
    echo -e "\n📄 Configuration du service:"
    cat "/etc/systemd/system/$app.service" 2>/dev/null || echo "Fichier service non trouvé"
else
    echo "❌ Service non configuré"
fi

# 3. Logs du service
echo -e "\n📋 LOGS DU SERVICE (20 dernières lignes):"
journalctl -u $app --no-pager -n 20 2>/dev/null || echo "Pas de logs disponibles"

# 4. Node.js
echo -e "\n🟢 NODE.JS:"
if command -v node &> /dev/null; then
    echo "Path: $(which node)"
    echo "Version: $(node --version)"
    echo "NPM: $(npm --version 2>/dev/null || echo 'Non disponible')"
else
    echo "❌ Node.js non trouvé"
fi

# 5. Fichiers de l'application
echo -e "\n📁 FICHIERS DE L'APPLICATION:"
if [ -d "$install_dir" ]; then
    echo "Dossier: ✅ $install_dir"
    echo "Propriétaire: $(stat -c '%U:%G' "$install_dir")"
    echo "Permissions: $(stat -c '%a' "$install_dir")"
    
    echo -e "\nFichiers principaux:"
    for file in server.js package.json .env dist/index.html; do
        if [ -f "$install_dir/$file" ]; then
            echo "✅ $file"
        else
            echo "❌ $file manquant"
        fi
    done
    
    if [ -f "$install_dir/.env" ]; then
        echo -e "\nConfiguration .env:"
        grep -E "^(PORT|NODE_ENV|HOST)" "$install_dir/.env" 2>/dev/null
    fi
else
    echo "❌ Dossier d'installation manquant"
fi

# 6. Ports et réseau
echo -e "\n🔌 PORTS ET RÉSEAU:"
echo "Ports en écoute (3000-3009):"
netstat -tlnp 2>/dev/null | grep ":300[0-9]" || echo "Aucun port 3000-3009 en écoute"

echo -e "\nProcessus Node.js:"
ps aux | grep node | grep -v grep || echo "Aucun processus Node.js"

# 7. Configuration Nginx
echo -e "\n🌐 CONFIGURATION NGINX:"
nginx_conf_pattern="/etc/nginx/conf.d/*$app*"
if ls $nginx_conf_pattern 2>/dev/null; then
    echo "Configuration trouvée:"
    ls -la $nginx_conf_pattern
    
    echo -e "\nTest de configuration Nginx:"
    nginx -t 2>&1
else
    echo "❌ Configuration Nginx non trouvée"
fi

# 8. Logs Nginx
echo -e "\n📋 LOGS NGINX (erreurs récentes):"
tail -n 5 /var/log/nginx/error.log 2>/dev/null || echo "Pas de logs d'erreur Nginx"

# 9. Test manuel
echo -e "\n🧪 TEST MANUEL:"
if [ -f "$install_dir/server.js" ]; then
    echo "Tentative de démarrage manuel (timeout 10s)..."
    cd "$install_dir"
    timeout 10s sudo -u $app node server.js 2>&1 | head -10 || echo "Timeout ou erreur"
else
    echo "❌ server.js non trouvé"
fi

# 10. Recommandations
echo -e "\n💡 RECOMMANDATIONS:"
echo "1. Vérifier les logs: sudo journalctl -u $app -f"
echo "2. Test manuel: cd $install_dir && sudo -u $app node server.js"
echo "3. Redémarrer: sudo systemctl restart $app"
echo "4. Vérifier Nginx: sudo nginx -t && sudo systemctl reload nginx"
echo "5. Vérifier les permissions: sudo chown -R $app:$app $install_dir"

echo -e "\n✅ Diagnostic terminé"