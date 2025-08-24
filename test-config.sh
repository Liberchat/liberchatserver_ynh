#!/bin/bash

echo "=== TEST CONFIGURATION ==="

# Simuler les variables YunoHost
export YNH_APP_INSTANCE_NAME="liberchat"
export install_dir="/opt/yunohost/liberchat"

# Créer un faux fichier .env pour test
mkdir -p /tmp/test-liberchat
cat > /tmp/test-liberchat/.env << EOF
NODE_ENV=production
PORT=3000
HOST=127.0.0.1
ALLOWED_DOMAINS=https://test.example.com
YNH_APP_ARG_PATH=/liberchat__2
MAX_MESSAGES=150
MAX_FILE_SIZE=75
PING_TIMEOUT=45000
PING_INTERVAL=20000
EOF

# Modifier temporairement install_dir pour le test
export install_dir="/tmp/test-liberchat"

echo "Fichier .env créé :"
cat /tmp/test-liberchat/.env
echo ""

# Tester les fonctions du script config
source scripts/_common.sh 2>/dev/null || echo "Warning: _common.sh not found"

# Définir les fonctions de test
get__max_messages() {
    if [ -f "$install_dir/.env" ] && grep -q "^MAX_MESSAGES=" "$install_dir/.env"; then
        grep "^MAX_MESSAGES=" "$install_dir/.env" | cut -d'=' -f2-
    else
        echo "100"
    fi
}

get__max_file_size() {
    if [ -f "$install_dir/.env" ] && grep -q "^MAX_FILE_SIZE=" "$install_dir/.env"; then
        grep "^MAX_FILE_SIZE=" "$install_dir/.env" | cut -d'=' -f2-
    else
        echo "50"
    fi
}

echo "=== TESTS DES GETTERS ==="
echo "MAX_MESSAGES: $(get__max_messages)"
echo "MAX_FILE_SIZE: $(get__max_file_size)"

echo ""
echo "=== TEST SETTER ==="
# Test setter
set__max_messages() {
    local max_messages="${1:-100}"
    
    if [ -f "$install_dir/.env" ] && grep -q "^MAX_MESSAGES=" "$install_dir/.env"; then
        sed -i "s/^MAX_MESSAGES=.*/MAX_MESSAGES=$max_messages/" "$install_dir/.env"
    else
        echo "MAX_MESSAGES=$max_messages" >> "$install_dir/.env"
    fi
}

echo "Avant modification:"
get__max_messages

set__max_messages 200
echo "Après modification (200):"
get__max_messages

echo ""
echo "Fichier .env final :"
cat /tmp/test-liberchat/.env

# Nettoyage
rm -rf /tmp/test-liberchat

echo ""
echo "=== TEST TERMINÉ ==="