# Guide de déploiement sur VPS

Ce guide vous explique comment déployer l'application Bataille Navale sur votre VPS.

## Prérequis

- Un VPS avec Ubuntu/Debian
- Node.js 18+ installé
- npm installé
- PM2 installé globalement (`npm install -g pm2`)
- Nginx installé (optionnel mais recommandé)
- Un nom de domaine pointant vers votre VPS (optionnel)

## Étapes de déploiement

### 1. Préparer le serveur

Connectez-vous à votre VPS via SSH :

```bash
ssh utilisateur@votre-vps-ip
```

### 2. Cloner le projet

```bash
cd ~
git clone <votre-repo-url> bataille-navale
cd bataille-navale
```

### 3. Installer les dépendances

```bash
npm install
```

### 4. Configurer les variables d'environnement

Créez un fichier `.env` à la racine du projet :

```bash
nano .env
```

Ajoutez les variables suivantes (remplacez par vos valeurs) :

```env
PORT=4000
HOST=0.0.0.0
VITE_SERVER_URL=http://votre-domaine.com
```

**Important** : Remplacez `votre-domaine.com` par votre domaine ou l'IP de votre VPS.

### 5. Build de l'application

```bash
npm run build
```

Cette commande va :
- Builder le client React dans `client/dist/`
- Compiler le serveur TypeScript dans `server/dist/`

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

La dernière commande vous donnera une commande à exécuter pour démarrer PM2 au boot.

### 8. Vérifier que le serveur fonctionne

```bash
pm2 status
pm2 logs bataille-navale
```

Vous devriez voir : `Serveur prêt sur 0.0.0.0:4000`

### 9. Configurer Nginx (recommandé)

#### Option A : Avec un domaine

1. Copiez le fichier de configuration :

```bash
sudo cp nginx.conf.example /etc/nginx/sites-available/bataille-navale
```

2. Éditez le fichier :

```bash
sudo nano /etc/nginx/sites-available/bataille-navale
```

Remplacez `votre-domaine.com` par votre domaine.

3. Activez la configuration :

```bash
sudo ln -s /etc/nginx/sites-available/bataille-navale /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

4. Configurez SSL avec Let's Encrypt (recommandé) :

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d votre-domaine.com
```

#### Option B : Sans domaine (accès par IP)

Si vous n'avez pas de domaine, vous pouvez accéder directement à l'application via l'IP de votre VPS sur le port 4000 :

```
http://votre-ip-vps:4000
```

Assurez-vous que le firewall autorise le port 4000 :

```bash
sudo ufw allow 4000/tcp
```

### 10. Configurer le firewall

```bash
# Autoriser SSH
sudo ufw allow 22/tcp

# Autoriser HTTP et HTTPS (si vous utilisez Nginx)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Ou autoriser directement le port 4000 (sans Nginx)
sudo ufw allow 4000/tcp

# Activer le firewall
sudo ufw enable
```

## Commandes utiles

### Gérer l'application avec PM2

```bash
# Voir le statut
pm2 status

# Voir les logs
pm2 logs bataille-navale

# Redémarrer
pm2 restart bataille-navale

# Arrêter
pm2 stop bataille-navale

# Supprimer
pm2 delete bataille-navale
```

### Mettre à jour l'application

```bash
cd ~/bataille-navale
git pull
npm install
npm run build
pm2 restart bataille-navale
```

## Dépannage

### Le serveur ne démarre pas

1. Vérifiez les logs : `pm2 logs bataille-navale`
2. Vérifiez que le port 4000 n'est pas déjà utilisé : `sudo lsof -i :4000`
3. Vérifiez les permissions du dossier `logs/`

### Le client ne se connecte pas au serveur

1. Vérifiez que `VITE_SERVER_URL` dans `.env` correspond à votre domaine/IP
2. Rebuild le client : `npm run build:client`
3. Redémarrez PM2 : `pm2 restart bataille-navale`

### Problèmes avec Socket.io

1. Vérifiez que Nginx est correctement configuré pour les WebSockets
2. Vérifiez les logs Nginx : `sudo tail -f /var/log/nginx/error.log`
3. Assurez-vous que le CORS est correctement configuré

## Structure des fichiers

```
bataille-navale/
├── client/              # Application React
│   ├── dist/           # Build du client (généré)
│   └── src/
├── server/              # Serveur Express + Socket.io
│   ├── dist/           # Build du serveur (généré)
│   └── src/
├── logs/               # Logs PM2
├── ecosystem.config.js # Configuration PM2
├── nginx.conf.example  # Exemple de config Nginx
└── .env               # Variables d'environnement (à créer)
```

## Sécurité

- Ne commitez jamais le fichier `.env`
- Utilisez HTTPS en production (Let's Encrypt)
- Configurez un firewall approprié
- Gardez Node.js et les dépendances à jour
- Utilisez des mots de passe forts pour SSH

## Support

En cas de problème, vérifiez :
1. Les logs PM2 : `pm2 logs`
2. Les logs Nginx : `sudo tail -f /var/log/nginx/error.log`
3. Le statut du service : `pm2 status`

