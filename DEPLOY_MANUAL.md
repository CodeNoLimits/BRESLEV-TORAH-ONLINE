# 🚀 Déploiement Manuel - Breslev Torah Online

## ✅ Votre application est prête!

Le build a réussi et tous les fichiers sont configurés. Voici comment déployer:

### 🎯 Déploiement via Interface Web Netlify

1. **Se connecter à Netlify**
   - Aller sur https://app.netlify.com
   - Vous êtes déjà connecté!

2. **Nouveau site**
   - Cliquer "New site from Git"
   - Sélectionner votre dépôt GitHub

3. **Configuration**
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/.next`

4. **Variables d'environnement**
   - Dans Site settings > Environment variables
   - Ajouter:
     ```
     NEXT_PUBLIC_API_URL=https://breslev-torah-api.onrender.com
     NEXT_PUBLIC_ENVIRONMENT=production
     ```

5. **Déployer**
   - Cliquer "Deploy site"

### 🔧 Ou déploiement par drag & drop

1. **Préparer le build**
   - Le dossier `.next` contient votre build
   - Tout est prêt pour le déploiement

2. **Drag & Drop**
   - Aller sur https://app.netlify.com
   - Faire glisser le dossier `.next` vers l'interface

### 📁 Fichiers de configuration créés

- ✅ `netlify.toml` - Configuration Netlify
- ✅ `.env.production` - Variables d'environnement
- ✅ `public/_redirects` - Redirections API
- ✅ Build réussi dans `.next/`

### 🌐 Après déploiement

Vous aurez une URL comme:
- `https://breslev-torah-[random].netlify.app`

## 🎉 Félicitations!

Votre application **Breslev Torah Online** est maintenant prête pour le déploiement Netlify!

Tous les fichiers sont configurés et le build a réussi. 
Il vous suffit maintenant de suivre les étapes ci-dessus pour déployer.