#!/bin/bash

# Script de setup pour VPS - Bataille Navale
# À exécuter sur votre VPS après connexion SSH

set -e

echo "🚀 Configuration du VPS pour Bataille Navale..."
echo ""

# Vérifier que nous sommes sur un système Linux
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    echo "❌ Ce script est conçu pour Linux. Exécutez-le sur votre VPS."
    exit 1
fi

# Vérifier Node.js
if ! command -v node &> /dev/null; then
    echo "📦 Installation de Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "✅ Node.js déjà installé: $(node --version)"
fi

# Vérifier npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm n'est pas installé"
    exit 1
else
    echo "✅ npm déjà installé: $(npm --version)"
fi

# Vérifier Git
if ! command -v git &> /dev/null; then
    echo "📦 Installation de Git..."
    sudo apt-get update
    sudo apt-get install -y git
else
    echo "✅ Git déjà installé: $(git --version)"
fi

# Vérifier PM2
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installation de PM2..."
    sudo npm install -g pm2
else
    echo "✅ PM2 déjà installé: $(pm2 --version)"
fi

# Demander le répertoire de déploiement
read -p "📁 Dans quel répertoire voulez-vous cloner le projet ? (défaut: ~/bataille-navale): " DEPLOY_DIR
DEPLOY_DIR=${DEPLOY_DIR:-~/bataille-navale}

# Créer le répertoire si nécessaire
mkdir -p "$DEPLOY_DIR"
cd "$DEPLOY_DIR"

# Vérifier si le projet existe déjà
if [ -d ".git" ]; then
    echo "⚠️  Le projet existe déjà dans ce répertoire."
    read -p "Voulez-vous le mettre à jour ? (o/n): " UPDATE
    if [[ "$UPDATE" == "o" || "$UPDATE" == "O" ]]; then
        echo "🔄 Mise à jour du projet..."
        git pull
    else
        echo "❌ Opération annulée"
        exit 1
    fi
else
    echo "📥 Clonage du dépôt..."
    git clone git@github.com:choucheee/bataille-navale.git .
fi

# Installer les dépendances
echo "📦 Installation des dépendances..."
npm install

# Créer le fichier .env
if [ ! -f ".env" ]; then
    echo "📝 Création du fichier .env..."
    cp env.example .env
    
    echo ""
    echo "⚠️  IMPORTANT: Vous devez configurer le fichier .env"
    echo "   Éditez-le avec: nano .env"
    echo "   Modifiez VITE_SERVER_URL avec votre domaine ou IP VPS"
    echo ""
    read -p "Voulez-vous l'éditer maintenant ? (o/n): " EDIT_ENV
    
    if [[ "$EDIT_ENV" == "o" || "$EDIT_ENV" == "O" ]]; then
        # Demander l'URL du serveur
        read -p "Entrez l'URL de votre serveur (ex: https://votre-domaine.com ou http://123.456.789.0:4000): " SERVER_URL
        SERVER_URL=${SERVER_URL:-http://localhost:4000}
        
        # Mettre à jour le fichier .env
        sed -i "s|VITE_SERVER_URL=.*|VITE_SERVER_URL=$SERVER_URL|g" .env
        echo "✅ VITE_SERVER_URL configuré: $SERVER_URL"
    fi
else
    echo "✅ Fichier .env existe déjà"
fi

# Créer le dossier de logs
mkdir -p logs

echo ""
echo "✅ Setup terminé !"
echo ""
echo "📋 Prochaines étapes:"
echo "   1. Vérifiez/modifiez le fichier .env: nano .env"
echo "   2. Build l'application: npm run build"
echo "   3. Démarrez avec PM2: pm2 start ecosystem.config.js"
echo "   4. Sauvegardez PM2: pm2 save"
echo "   5. Configurez PM2 au démarrage: pm2 startup"
echo ""
echo "📖 Pour plus d'informations, consultez DEPLOY.md"

