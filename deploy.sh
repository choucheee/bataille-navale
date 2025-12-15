#!/bin/bash

# Script de déploiement pour Bataille Navale
# Usage: ./deploy.sh

set -e

echo "🚀 Déploiement de Bataille Navale..."

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "package.json" ]; then
    echo "❌ Erreur: Ce script doit être exécuté depuis la racine du projet"
    exit 1
fi

# Vérifier que .env existe
if [ ! -f ".env" ]; then
    echo "⚠️  Fichier .env non trouvé. Créez-le à partir de .env.example"
    echo "   Exemple: cp .env.example .env"
    exit 1
fi

# Charger les variables d'environnement
export $(cat .env | grep -v '^#' | xargs)

# Vérifier que VITE_SERVER_URL est défini
if [ -z "$VITE_SERVER_URL" ]; then
    echo "⚠️  VITE_SERVER_URL n'est pas défini dans .env"
    echo "   Ajoutez: VITE_SERVER_URL=http://votre-domaine.com"
    exit 1
fi

echo "📦 Installation des dépendances..."
npm install

echo "🔨 Build du client..."
cd client
npm run build
cd ..

echo "🔨 Build du serveur..."
cd server
npm run build
cd ..

echo "📁 Création du dossier de logs..."
mkdir -p logs

echo "🔄 Redémarrage de PM2..."
if pm2 list | grep -q "bataille-navale"; then
    echo "   Application déjà en cours d'exécution, redémarrage..."
    pm2 restart bataille-navale
else
    echo "   Démarrage de l'application..."
    pm2 start ecosystem.config.js
    pm2 save
fi

echo "✅ Déploiement terminé!"
echo ""
echo "📊 Statut de l'application:"
pm2 status bataille-navale
echo ""
echo "📝 Pour voir les logs: pm2 logs bataille-navale"

