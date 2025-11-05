#!/bin/bash

# Script de vérification rapide de la santé de LiberChat

echo "🏥 Vérification de santé LiberChat"
echo "=================================="

app="liberchat"
install_dir="/var/www/$app"

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction pour afficher le statut
status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# 1. Service systemd
echo -e "\n🔧 Services:"
systemctl is-active --quiet $app
status $? "Service $app"

systemctl is-active --quiet nginx
status $? "Service nginx"

# 2. Ports
echo -e "\n🔌 Connectivité:"
port=$(yunohost app setting $app port 2>/dev/null || echo "3000")
curl -s --connect-timeout 3 "http://127.0.0.1:$port" >/dev/null
status $? "Application locale (port $port)"

curl -s --connect-timeout 3 "http://127.0.0.1:$port/socket.io/?EIO=4&transport=polling" >/dev/null
status $? "Socket.IO local"

# 3. Configuration
echo -e "\n📝 Configuration:"
[ -f "$install_dir/.env" ]
status $? "Fichier .env présent"

if [ -f "$install_dir/.env" ]; then
    grep -q "PING_TIMEOUT" "$install_dir/.env"
    status $? "PING_TIMEOUT configuré"
    
    grep -q "PING_INTERVAL" "$install_dir/.env"
    status $? "PING_INTERVAL configuré"
    
    grep -q "YNH_APP_ARG_PATH" "$install_dir/.env"
    status $? "YNH_APP_ARG_PATH configuré"
fi

# 4. Nginx
echo -e "\n🌐 Nginx:"
nginx -t >/dev/null 2>&1
status $? "Configuration nginx valide"

nginx_conf="/etc/nginx/conf.d/${app}.*.conf"
if ls $nginx_conf 2>/dev/null >/dev/null; then
    grep -q "socket.io" $nginx_conf
    status $? "Configuration Socket.IO dans nginx"
else
    echo -e "${RED}❌ Configuration nginx non trouvée${NC}"
fi

# 5. Test public
echo -e "\n🌍 Accès public:"
domain=$(yunohost domain list --output-as json 2>/dev/null | jq -r '.domains[0]' 2>/dev/null)
path=$(yunohost app setting $app path 2>/dev/null)

if [ -n "$domain" ] && [ -n "$path" ]; then
    curl -s --connect-timeout 10 "https://$domain$path" >/dev/null
    status $? "Site accessible publiquement"
    
    curl -s --connect-timeout 10 "https://$domain$path/socket.io/?EIO=4&transport=polling" >/dev/null
    status $? "Socket.IO accessible publiquement"
else
    warning "Impossible de déterminer le domaine/chemin YunoHost"
fi

# 6. Logs récents
echo -e "\n📋 Logs récents:"
error_count=$(journalctl -u $app --since "5 minutes ago" --no-pager | grep -i error | wc -l)
if [ $error_count -eq 0 ]; then
    echo -e "${GREEN}✅ Aucune erreur dans les 5 dernières minutes${NC}"
else
    echo -e "${RED}❌ $error_count erreur(s) dans les 5 dernières minutes${NC}"
    echo "Dernières erreurs:"
    journalctl -u $app --since "5 minutes ago" --no-pager | grep -i error | tail -3
fi

# 7. Ressources système
echo -e "\n💻 Ressources:"
cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
mem_usage=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')

echo "CPU: ${cpu_usage}%"
echo "RAM: ${mem_usage}%"

# Vérifier si l'application consomme trop
app_mem=$(ps aux | grep -E "(node.*$app|$app.*node)" | grep -v grep | awk '{sum+=$4} END {printf "%.1f", sum}')
if [ -n "$app_mem" ] && [ $(echo "$app_mem > 10" | bc -l 2>/dev/null || echo 0) -eq 1 ]; then
    warning "Application utilise ${app_mem}% de RAM (élevé)"
fi

# 8. Résumé
echo -e "\n📊 Résumé:"
total_checks=8
failed_checks=0

# Compter les échecs (approximatif)
systemctl is-active --quiet $app || ((failed_checks++))
systemctl is-active --quiet nginx || ((failed_checks++))
curl -s --connect-timeout 3 "http://127.0.0.1:$port" >/dev/null || ((failed_checks++))
[ -f "$install_dir/.env" ] || ((failed_checks++))
nginx -t >/dev/null 2>&1 || ((failed_checks++))

success_rate=$(( (total_checks - failed_checks) * 100 / total_checks ))

if [ $success_rate -ge 90 ]; then
    echo -e "${GREEN}🎉 Système en bonne santé ($success_rate%)${NC}"
elif [ $success_rate -ge 70 ]; then
    echo -e "${YELLOW}⚠️  Système partiellement fonctionnel ($success_rate%)${NC}"
    echo "Exécutez: ./fix-socketio-issues.sh"
else
    echo -e "${RED}🚨 Système en panne ($success_rate%)${NC}"
    echo "Exécutez: ./debug-socketio.sh"
fi

echo -e "\n🔧 Commandes utiles:"
echo "- Diagnostic complet: ./debug-socketio.sh"
echo "- Réparation auto: sudo ./fix-socketio-issues.sh"
echo "- Logs temps réel: sudo journalctl -u $app -f"