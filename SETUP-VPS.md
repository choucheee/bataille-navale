# Guide de setup VPS

Ce guide vous explique comment configurer votre VPS pour déployer Bataille Navale.

## Connexion SSH

Connectez-vous à votre VPS :

```bash
ssh utilisateur@votre-vps-ip
```

## Option 1 : Setup automatique (recommandé)

1. **Téléchargez le script de setup** sur votre VPS :

```bash
wget https://raw.githubusercontent.com/choucheee/bataille-navale/main/setup-vps.sh
chmod +x setup-vps.sh
./setup-vps.sh
```

Le script va :
- Installer Node.js, npm, Git et PM2 si nécessaire
- Cloner le dépôt
- Installer les dépendances
- Créer le fichier `.env`
- Vous guider pour la configuration

## Option 2 : Setup manuel

### 1. Installer les prérequis

```bash
# Mettre à jour le système
sudo apt update && sudo apt upgrade -y

# Installer Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Installer Git
sudo apt-get install -y git

# Installer PM2 globalement
sudo npm install -g pm2
```

### 2. Cloner le dépôt

```bash
cd ~
git clone git@github.com:choucheee/bataille-navale.git
cd bataille-navale
```

**Note** : Si vous utilisez HTTPS au lieu de SSH :

```bash
git clone https://github.com/choucheee/bataille-navale.git
```

### 3. Installer les dépendances

```bash
npm install
```

### 4. Configurer les variables d'environnement

```bash
cp env.example .env
nano .env
```

Modifiez `VITE_SERVER_URL` avec votre domaine ou IP VPS :

```env
PORT=4000
HOST=0.0.0.0
VITE_SERVER_URL=https://votre-domaine.com
# ou
VITE_SERVER_URL=http://123.456.789.0:4000
```

### 5. Build l'application

```bash
npm run build
```

### 6. Créer le dossier de logs

```bash
mkdir -p logs
```

### 7. Démarrer avec PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

La dernière commande vous donnera une commande à exécuter avec `sudo` pour démarrer PM2 au boot.

### 8. Vérifier que tout fonctionne

```bash
pm2 status
pm2 logs bataille-navale
```

Vous devriez voir : `Serveur prêt sur 0.0.0.0:4000`

## Configuration SSH pour GitHub (si nécessaire)

Si vous avez des problèmes avec `git clone` via SSH, vous pouvez :

### Option A : Utiliser HTTPS

```bash
git clone https://github.com/choucheee/bataille-navale.git
```

### Option B : Configurer une clé SSH

1. Générer une clé SSH sur votre VPS :

```bash
ssh-keygen -t ed25519 -C "votre-email@example.com"
```

2. Afficher la clé publique :

```bash
cat ~/.ssh/id_ed25519.pub
```

3. Ajouter la clé à votre compte GitHub :
   - Allez sur https://github.com/settings/keys
   - Cliquez sur "New SSH key"
   - Collez le contenu de la clé publique

4. Tester la connexion :

```bash
ssh -T git@github.com
```

## Configuration du firewall

```bash
# Autoriser SSH
sudo ufw allow 22/tcp

# Autoriser le port 4000 (si vous n'utilisez pas Nginx)
sudo ufw allow 4000/tcp

# Ou autoriser HTTP/HTTPS (si vous utilisez Nginx)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Activer le firewall
sudo ufw enable
```

## Configuration Nginx (optionnel mais recommandé)

Voir le guide complet dans [DEPLOY.md](./DEPLOY.md) pour la configuration Nginx avec SSL.

## Mise à jour de l'application

Pour mettre à jour l'application après des modifications :

```bash
cd ~/bataille-navale
git pull
npm install
npm run build
pm2 restart bataille-navale
```

## Dépannage

### Le dépôt ne se clone pas

- Vérifiez votre connexion internet : `ping github.com`
- Vérifiez que Git est installé : `git --version`
- Utilisez HTTPS si SSH ne fonctionne pas

### npm install échoue

- Vérifiez que Node.js est installé : `node --version` (doit être 18+)
- Vérifiez votre connexion internet
- Essayez de nettoyer le cache : `npm cache clean --force`

### PM2 ne démarre pas

- Vérifiez les logs : `pm2 logs bataille-navale`
- Vérifiez que le port 4000 n'est pas utilisé : `sudo lsof -i :4000`
- Vérifiez les permissions : `ls -la`

## Support

Pour plus d'aide, consultez [DEPLOY.md](./DEPLOY.md) ou créez une issue sur GitHub.

