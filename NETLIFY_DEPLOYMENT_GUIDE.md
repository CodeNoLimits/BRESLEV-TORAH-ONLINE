# 🚀 Guide de Déploiement Netlify - Breslev Torah Online

## ✅ Préparation Complète

Votre application frontend est maintenant **prête pour le déploiement sur Netlify**!

### 📋 Ce qui a été configuré

1. **✅ Configuration Netlify** (`netlify.toml`) - Optimisée pour Next.js
2. **✅ Variables d'environnement** (`.env.production`) - API URL configurée
3. **✅ Build réussi** - Toutes les erreurs corrigées
4. **✅ Fichier _redirects** - Pour les routes API et SPA
5. **✅ Netlify CLI installé** - Prêt pour le déploiement

### 🔧 Fichiers de configuration créés

- `frontend/netlify.toml` - Configuration Netlify
- `frontend/.env.production` - Variables d'environnement
- `frontend/public/_redirects` - Redirections pour l'API
- `frontend/next.config.js` - Configuration Next.js optimisée

## 🚀 Déploiement sur Netlify

### Option 1: Déploiement via Interface Web (Recommandé)

1. **Se connecter à Netlify**
   - Aller sur https://app.netlify.com
   - Se connecter avec GitHub/GitLab/Email

2. **Nouveau site depuis Git**
   - Cliquer "New site from Git"
   - Connecter votre dépôt GitHub
   - Sélectionner le dépôt BRESLEV-TORAH-ONLINE

3. **Configuration du build**
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/.next`

4. **Variables d'environnement**
   - Aller dans Site settings > Environment variables
   - Ajouter:
     ```
     NEXT_PUBLIC_API_URL=https://breslev-torah-api.onrender.com
     NEXT_PUBLIC_ENVIRONMENT=production
     ```

5. **Déployer**
   - Cliquer "Deploy site"
   - Attendre la fin du build

### Option 2: Déploiement via CLI

```bash
# Dans le dossier frontend
cd frontend

# Se connecter à Netlify
netlify login

# Déployer
netlify deploy --prod --dir=.next
```

### Option 3: Déploiement manuel

```bash
# Build l'application
npm run build

# Zipper le dossier .next
zip -r netlify-deploy.zip .next

# Uploader sur Netlify via interface web
```

## 🌐 URL de déploiement

Après le déploiement, vous aurez une URL comme:
- `https://breslev-torah-[random].netlify.app`
- Ou votre domaine personnalisé

## 🔧 Configuration Post-Déploiement

### 1. Vérifier le déploiement
- Site se charge ✅
- Navigation fonctionne ✅
- API calls fonctionnent ✅

### 2. Domaine personnalisé (optionnel)
- Aller dans Site settings > Domain management
- Ajouter votre domaine
- Configurer les DNS

### 3. SSL/HTTPS
- Automatiquement configuré par Netlify

## 🐛 Dépannage

### Erreur de build
- Vérifier que le build fonctionne localement: `npm run build`
- Vérifier les variables d'environnement

### Erreur 404 sur les routes
- Vérifier le fichier `_redirects` dans `/public`
- Vérifier la configuration Next.js

### Erreur API
- Vérifier l'URL de l'API dans les variables d'environnement
- Vérifier que l'API backend est déployée

## 📊 Monitoring

### Netlify Analytics
- Activable dans Site settings > Analytics
- Statistiques de trafic et performance

### Logs de déploiement
- Disponibles dans l'interface Netlify
- Utiles pour déboguer les erreurs

## 🎯 Optimisations

### Performance
- Images optimisées automatiquement
- CDN global de Netlify
- Compression automatique

### Sécurité
- HTTPS automatique
- Headers de sécurité configurés
- Protection DDoS

## 📝 Commandes utiles

```bash
# Build local
npm run build

# Déploiement preview
netlify deploy --dir=.next

# Déploiement production
netlify deploy --prod --dir=.next

# Logs en temps réel
netlify logs

# Ouvrir le dashboard
netlify open
```

## 🎉 Félicitations!

Votre application **Breslev Torah Online** est maintenant déployée et accessible sur Netlify!

### 🔗 Liens utiles
- [Documentation Netlify](https://docs.netlify.com/)
- [Next.js sur Netlify](https://docs.netlify.com/frameworks/next-js/)
- [Plugin Netlify Next.js](https://github.com/netlify/netlify-plugin-nextjs)

---

**🚀 Votre application est prête pour le monde!**