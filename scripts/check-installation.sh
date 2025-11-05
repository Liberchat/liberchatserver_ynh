#!/bin/bash

# Script de diagnostic pour l'installation YunoHost de Liberchat

echo "🔍 Diagnostic de l'installation Liberchat..."
echo "=============================================="

# Variables
app="liberchat"
install_dir="/var/www/$app"

# 1. Vérifier l'existence des fichiers
echo -e "\n📁 Vérification des fichiers:"
if [ -d "$install_dir" ]; then
    echo "✅ Dossier d'installation: $install_dir"
    echo "   Taille: $(du -sh $install_dir 2>/dev/null | cut -f1)"
else
    echo "❌ Dossier d'installation manquant: $install_dir"
fi

# 2. Vérifier Node.js
echo -e "\n🟢 Vérification Node.js:"
if command -v node &> /dev/null; then
    node_version=$(node --version)
    echo "✅ Node.js installé: $node_version"
    
    npm_version=$(npm --version 2>/dev/null)
    echo "✅ NPM installé: $npm_version"
else
    echo "❌ Node.js non installé"
fi

# 3. Vérifier les dépendances
echo -e "\n📦 Vérification des dépendances:"
if [ -f "$install_dir/package.json" ]; then
    echo "✅ package.json présent"
    if [ -d "$install_dir/node_modules" ]; then
        echo "✅ node_modules présent"
        modules_count=$(ls -1 "$install_dir/node_modules" | wc -l)
        echo "   Modules installés: $modules_count"
    else
        echo "❌ node_modules manquant"
    fi
else
    echo "❌ package.json manquant"
fi

# 4. Vérifier le build
echo -e "\n🏗️ Vérification du build:"
if [ -d "$install_dir/dist" ]; then
    echo "✅ Dossier dist présent"
    dist_files=$(ls -1 "$install_dir/dist" 2>/dev/null | wc -l)
    echo "   Fichiers dans dist: $dist_files"
else
    echo "❌ Dossier dist manquant"
fi

# 5. Vérifier les permissions
echo -e "\n🔐 Vérification des permissions:"
if [ -d "$install_dir" ]; then
    owner=$(stat -c '%U:%G' "$install_dir")
    echo "✅ Propriétaire du dossier: $owner"
    
    perms=$(stat -c '%a' "$install_dir")
    echo "✅ Permissions du dossier: $perms"
else
    echo "❌ Impossible de vérifier les permissions"
fi

# 6. Vérifier le service systemd
echo -e "\n⚙️ Vérification du service:"
if systemctl list-unit-files | grep -q "$app.service"; then
    echo "✅ Service systemd configuré"
    
    if systemctl is-active --quiet "$app"; then
        echo "✅ Service actif"
    else
        echo "❌ Service inactif"
        echo "   Status: $(systemctl is-active $app)"
    fi
    
    if systemctl is-enabled --quiet "$app"; then
        echo "✅ Service activé au démarrage"
    else
        echo "❌ Service non activé au démarrage"
    fi
else
    echo "❌ Service systemd non configuré"
fi

# 7. Vérifier les logs
echo -e "\n📋 Vérification des logs:"
log_dir="/var/log/$app"
if [ -d "$log_dir" ]; then
    echo "✅ Dossier de logs: $log_dir"
    if [ -f "$log_dir/$app.log" ]; then
        echo "✅ Fichier de log présent"
        log_size=$(du -sh "$log_dir/$app.log" 2>/dev/null | cut -f1)
        echo "   Taille du log: $log_size"
        
        # Afficher les dernières lignes du log
        echo -e "\n📄 Dernières lignes du log:"
        tail -n 10 "$log_dir/$app.log" 2>/dev/null || echo "   Impossible de lire le log"
    else
        echo "❌ Fichier de log manquant"
    fi
else
    echo "❌ Dossier de logs manquant"
fi

# 8. Vérifier la configuration Nginx
echo -e "\n🌐 Vérification Nginx:"
nginx_conf="/etc/nginx/conf.d/$app.conf"
if [ -f "$nginx_conf" ]; then
    echo "✅ Configuration Nginx présente"
else
    echo "❌ Configuration Nginx manquante"
fi

# 9. Vérifier les ports
echo -e "\n🔌 Vérification des ports:"
if command -v ss &> /dev/null; then
    listening_ports=$(ss -tlnp | grep ":300[0-9]" | wc -l)
    echo "✅ Ports en écoute (3000-3009): $listening_ports"
    
    if [ $listening_ports -gt 0 ]; then
        echo "   Détails:"
        ss -tlnp | grep ":300[0-9]" | while read line; do
            echo "   $line"
        done
    fi
else
    echo "❌ Impossible de vérifier les ports (ss non disponible)"
fi

# 10. Recommandations
echo -e "\n💡 Recommandations:"
echo "1. Vérifiez les logs pour plus de détails: journalctl -u $app -f"
echo "2. Testez manuellement: cd $install_dir && npm start"
echo "3. Vérifiez la configuration: cat $install_dir/.env"
echo "4. Redémarrez le service: systemctl restart $app"

echo -e "\n✅ Diagnostic terminé"