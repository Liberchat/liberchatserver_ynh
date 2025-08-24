#!/bin/bash

# Script de test pour YunoHost
echo "=== Test de configuration YunoHost ==="

# Simulation des variables YunoHost
export NODE_ENV=production
export PORT=3000
export HOST=127.0.0.1
export ALLOWED_DOMAINS="https://example.com/liberchat"
export YNH_APP_ARG_PATH="/liberchat"

echo "Variables d'environnement configurées:"
echo "NODE_ENV=$NODE_ENV"
echo "PORT=$PORT"
echo "ALLOWED_DOMAINS=$ALLOWED_DOMAINS"
echo "YNH_APP_ARG_PATH=$YNH_APP_ARG_PATH"

echo ""
echo "=== Build avec chemin de base ==="
npm run build

echo ""
echo "=== Test du serveur ==="
timeout 3s node server.js

echo ""
echo "=== Test des routes ==="
echo "Test de la route statique:"
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/liberchat/ || echo "Serveur non démarré"

echo ""
echo "=== Fin du test ==="