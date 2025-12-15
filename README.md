# 🎮 Bataille Navale Online

Un jeu de bataille navale multijoueur en temps réel développé avec React et Node.js. Créez ou rejoignez une salle de jeu et affrontez vos amis dans des parties stratégiques !

![React](https://img.shields.io/badge/React-19.2.0-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-3178C6?logo=typescript)
![Socket.io](https://img.shields.io/badge/Socket.io-4.8.1-010101?logo=socket.io)
![Express](https://img.shields.io/badge/Express-5.2.1-000000?logo=express)

## ✨ Fonctionnalités

- 🎯 **Multijoueur en temps réel** - Jouez avec vos amis via WebSocket
- 🚢 **Placement manuel ou automatique** - Placez vos navires case par case ou utilisez le placement aléatoire
- 🎨 **Interface moderne** - Design épuré et intuitif
- 🔐 **Validation des entrées** - Filtrage des mots interdits et validation des pseudos
- 📊 **Statistiques en temps réel** - Suivez vos tirs, touches et navires restants
- 🔄 **Système de salles** - Créez ou rejoignez des parties avec un code de salle
- 🏆 **Détection de victoire** - Le jeu détecte automatiquement le vainqueur

## 🛠️ Technologies utilisées

### Frontend
- **React 19** - Bibliothèque UI moderne
- **Vite** - Build tool rapide
- **Socket.io Client** - Communication temps réel
- **CSS3** - Styles personnalisés

### Backend
- **Node.js** - Runtime JavaScript
- **Express 5** - Framework web
- **TypeScript** - Typage statique
- **Socket.io** - WebSocket pour le temps réel

## 📋 Prérequis

- **Node.js** 18+ ([Télécharger](https://nodejs.org/))
- **npm** (inclus avec Node.js)
- Un navigateur moderne (Chrome, Firefox, Safari, Edge)

## 🚀 Installation

### 1. Cloner le repository

```bash
git clone https://github.com/votre-username/bataille-navale.git
cd bataille-navale
```

### 2. Installer les dépendances

```bash
npm install
```

Cette commande installera automatiquement les dépendances pour le client et le serveur grâce aux workspaces npm.

### 3. Configuration (optionnel)

Pour le développement local, vous pouvez créer un fichier `.env` à la racine :

```bash
cp env.example .env
```

Modifiez le fichier `.env` si nécessaire :

```env
PORT=4000
HOST=0.0.0.0
VITE_SERVER_URL=http://localhost:4000
```

## 💻 Utilisation

### Mode développement

Pour lancer l'application en mode développement :

```bash
npm run dev
```

Cette commande démarre :
- Le serveur de développement Vite sur `http://localhost:5173`
- Le serveur Express avec hot-reload sur `http://localhost:4000`

### Build de production

Pour créer une version de production :

```bash
npm run build
```

Cette commande :
- Build le client React dans `client/dist/`
- Compile le serveur TypeScript dans `server/dist/`

### Démarrer en production

```bash
npm start
```

L'application sera accessible sur `http://localhost:4000` (ou le port défini dans `.env`).

## 🎮 Comment jouer

1. **Entrez votre pseudo** - Choisissez un nom d'affichage (2-20 caractères)
2. **Créez ou rejoignez une salle** :
   - **Créer** : Générez un code de salle aléatoire ou créez-en un personnalisé
   - **Rejoindre** : Entrez le code de salle partagé par votre adversaire
3. **Placez vos navires** :
   - **Manuel** : Cliquez case par case pour construire chaque navire
   - **Automatique** : Utilisez le bouton "Placement automatique"
4. **Jouez** : Attendez que les deux joueurs placent leurs navires, puis tirez sur la grille adverse à tour de rôle
5. **Gagnez** : Le premier à couler tous les navires de l'adversaire remporte la partie !

### Règles du jeu

- **Grille** : 10x10 cases
- **Navires** : 5 navires de tailles différentes (5, 4, 3, 3, 2 cases)
- **Placement** : Les navires peuvent être placés horizontalement ou verticalement
- **Tours** : Les joueurs tirent alternativement
- **Victoire** : Tous les navires adverses doivent être coulés

## 📁 Structure du projet

```
bataille-navale/
├── client/                 # Application React
│   ├── src/
│   │   ├── App.jsx        # Composant principal
│   │   ├── App.css        # Styles
│   │   └── main.jsx       # Point d'entrée
│   ├── public/            # Assets statiques
│   ├── dist/              # Build de production (généré)
│   └── package.json
├── server/                 # Serveur Express + Socket.io
│   ├── src/
│   │   └── index.ts      # Serveur principal
│   ├── dist/              # Build TypeScript (généré)
│   └── package.json
├── logs/                  # Logs PM2 (généré)
├── ecosystem.config.js    # Configuration PM2
├── nginx.conf.example     # Exemple config Nginx
├── deploy.sh              # Script de déploiement
├── env.example            # Exemple variables d'environnement
├── DEPLOY.md              # Guide de déploiement détaillé
└── package.json           # Workspace racine
```

## 🌐 Déploiement

Pour déployer l'application sur un VPS, consultez le guide complet dans [DEPLOY.md](./DEPLOY.md).

### Déploiement rapide avec PM2

```bash
# Installer PM2 globalement
npm install -g pm2

# Créer le fichier .env
cp env.example .env
# Modifier VITE_SERVER_URL avec votre domaine/IP

# Build et démarrer
npm run build
pm2 start ecosystem.config.js
pm2 save
```

### Avec Nginx (recommandé)

1. Copiez la configuration Nginx :
```bash
sudo cp nginx.conf.example /etc/nginx/sites-available/bataille-navale
```

2. Modifiez le fichier avec votre domaine

3. Activez la configuration :
```bash
sudo ln -s /etc/nginx/sites-available/bataille-navale /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

4. Configurez SSL avec Let's Encrypt :
```bash
sudo certbot --nginx -d votre-domaine.com
```

## 🧪 Scripts disponibles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Lance le client et le serveur en mode développement |
| `npm run build` | Build le client et le serveur pour la production |
| `npm run build:client` | Build uniquement le client |
| `npm run build:server` | Build uniquement le serveur |
| `npm start` | Démarre le serveur en production |
| `npm run lint` | Vérifie le code avec ESLint (client) |

## 🔧 Configuration

### Variables d'environnement

| Variable | Description | Défaut |
|----------|-------------|--------|
| `PORT` | Port du serveur | `4000` |
| `HOST` | Host du serveur | `0.0.0.0` |
| `VITE_SERVER_URL` | URL du serveur pour le client | `http://localhost:4000` |

### Personnalisation

- **Taille de la grille** : Modifiez `GRID_SIZE` dans `client/src/App.jsx` et `server/src/index.ts`
- **Navires** : Modifiez `SHIP_LENGTHS` dans les mêmes fichiers
- **Styles** : Éditez `client/src/App.css` pour personnaliser l'apparence

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :

1. Fork le projet
2. Créer une branche pour votre fonctionnalité (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📝 Licence

Ce projet est sous licence ISC. Voir le fichier `LICENSE` pour plus de détails.

## 🙏 Remerciements

- [React](https://react.dev/) - Bibliothèque UI
- [Socket.io](https://socket.io/) - Communication temps réel
- [Express](https://expressjs.com/) - Framework web
- [Vite](https://vitejs.dev/) - Build tool

## 📞 Support

Si vous rencontrez des problèmes ou avez des questions :

1. Vérifiez les [Issues](https://github.com/votre-username/bataille-navale/issues) existantes
2. Créez une nouvelle Issue avec une description détaillée
3. Consultez le guide de déploiement dans [DEPLOY.md](./DEPLOY.md)

---

⭐ Si ce projet vous plaît, n'hésitez pas à lui donner une étoile !

