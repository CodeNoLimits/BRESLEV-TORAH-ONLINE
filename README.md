# Le Compagnon du Cœur 🕊️

> Application spirituelle interactive pour l'étude des enseignements de Rabbi Nahman de Breslev

## 🌟 Aperçu

Le Compagnon du Cœur est une application web sophistiquée qui combine :
- **Bibliothèque numérique complète** des textes de Breslev via l'API Sefaria
- **Intelligence artificielle Gemini** pour l'analyse et l'orientation spirituelle
- **Synthèse vocale premium** avec Google Cloud TTS (voix Studio)
- **Traduction française progressive** par chunks de 1000 caractères
- **Interface mobile optimisée** avec support tactile

## 🛠️ Technologies

### Frontend
- **React 18** + TypeScript pour une interface moderne et typée
- **Vite** pour un développement rapide et un build optimisé
- **Tailwind CSS** avec thème spirituel (palette sombre : slate, sky, amber)
- **Radix UI** pour des composants accessibles
- **Wouter** pour le routage côté client

### Backend
- **Express.js** + TypeScript pour l'API REST
- **PostgreSQL** avec Drizzle ORM pour la persistance
- **Google Cloud TTS** pour la synthèse vocale premium
- **Gemini AI** pour l'analyse et la traduction

### Intégrations
- **API Sefaria** pour l'accès aux textes juifs authentiques
- **Google Cloud Text-to-Speech** avec voix Studio premium
- **Web Speech API** comme fallback navigateur

## 🚀 Installation

### Prérequis
- Node.js 20+ 
- PostgreSQL (ou base Neon Database)
- Clés API : Gemini, Google Cloud TTS

### Configuration
1. Cloner le repository
```bash
git clone [URL_DU_REPO]
cd le-compagnon-du-coeur
```

2. Installer les dépendances
```bash
npm install
```

3. Configurer les variables d'environnement
```bash
cp .env.example .env
# Éditer .env avec vos clés API
```

4. Lancer l'application
```bash
npm run dev
```

## 🎯 Fonctionnalités

### 📚 Bibliothèque Spirituelle
- **Navigation hiérarchique** des textes Breslev
- **Affichage bilingue** hébreu/anglais côte à côte
- **Sélection de texte** pour analyse contextuelle
- **Cache intelligent** pour performances optimales

### 🤖 Compagnon IA
- **Modes d'interaction multiples** :
  - Étude : Analyse approfondie des enseignements
  - Exploration : Conversations spirituelles ouvertes
  - Analyse : Examen de passages spécifiques
  - Conseil : Guidance personnalisée
- **Réponses en streaming** pour fluidité
- **Traduction française progressive** (1000 char + bouton "Suite")

### 🔊 Synthèse Vocale Premium
- **Voix Google Cloud Studio** :
  - Hébreu : he-IL-Studio-B
  - Anglais : en-US-Studio-O  
  - Français : fr-FR-Studio-D
- **Fallback Web Speech API** pour compatibilité
- **Contrôles TTS intuitifs** avec boutons dédiés

### 📱 Expérience Mobile
- **Design responsive** mobile-first
- **Sidebar collapsible** avec navigation tactile
- **Optimisations TTS mobiles** avec gestion des voix
- **Interface simplifiée** pour écrans tactiles

## 🏗️ Architecture

```
├── client/src/          # Frontend React
│   ├── components/      # Composants UI réutilisables
│   ├── hooks/          # Hooks React personnalisés
│   └── constants/      # Configuration et constantes
├── server/             # Backend Express
│   ├── routes/         # Endpoints API
│   └── services/       # Services métier
├── shared/             # Types et schémas partagés
└── docs/              # Documentation
```

## 🔧 Scripts Disponibles

```bash
npm run dev         # Développement avec hot reload
npm run build       # Build de production
npm run type-check  # Vérification TypeScript
npm run lint        # Linting ESLint
npm run test        # Tests unitaires et e2e
npm run db:push     # Migration base de données
```

## 🌐 API Endpoints

### Textes Spirituels
- `GET /api/sefaria/texts/{ref}` - Récupération de textes
- `GET /api/books/meta` - Métadonnées des livres

### Intelligence Artificielle
- `POST /api/gemini/quick` - Analyse rapide
- `POST /api/gemini/translate` - Traduction française

### Synthèse Vocale
- `POST /api/tts` - Génération audio premium

## 🎨 Interface Utilisateur

### Thème Spirituel
- **Palette sombre apaisante** : slate, sky, amber
- **Typographie lisible** optimisée pour l'étude
- **Animations fluides** pour navigation intuitive
- **Accessibilité complète** clavier et lecteurs d'écran

### Composants Clés
- **Header** : Sélecteur langue, contrôles TTS
- **Sidebar** : Navigation bibliothèque accordéon
- **ChatArea** : Interface conversation streaming
- **TextViewer** : Affichage textes bilingues
- **InputArea** : Saisie multi-modes avec onglets

## 🔒 Sécurité

- **Authentification JWT** pour sessions utilisateur
- **Validation Zod** pour toutes les entrées
- **CORS configuré** pour domaines autorisés
- **Secrets protégés** via variables d'environnement
- **Audit de sécurité** npm audit fix appliqué

## 📊 Performance

- **Lazy loading** des textes lourds
- **Cache navigateur** 24h pour réponses Sefaria
- **Compression gzip** pour assets statiques
- **Service Worker** avec data saver detection
- **Optimisations mobiles** pour connexions lentes

## 🧪 Tests

### Suite de Tests
- **Tests unitaires** Jest/Vitest pour hooks
- **Tests d'intégration** Playwright pour e2e
- **Validation API** avec mocks Sefaria
- **Tests de régression** pour fonctionnalités critiques

### Couverture
- Hooks React : useTTS, useLazyTranslate, useGemini
- Composants UI : BreslovLibrary, TextViewer
- API routes : /api/gemini, /api/tts, /api/sefaria

## 🚢 Déploiement

### Replit (Recommandé)
1. Importer le projet dans Replit
2. Configurer les secrets dans l'onglet Secrets
3. Lancer avec `npm run dev`
4. Déployer via Replit Deployments

### Autres Plateformes
- **Vercel** : Support full-stack avec Postgres
- **Railway** : Déploiement Docker automatisé
- **Heroku** : Avec add-on PostgreSQL

## 🤝 Contribution

### Guidelines
1. Fork le repository
2. Créer une branche feature : `git checkout -b feature/ma-fonctionnalite`
3. Commit avec messages conventionnels
4. Pousser et créer une Pull Request

### Standards Code
- **TypeScript strict** avec types explicites
- **ESLint** configuration Airbnb
- **Prettier** pour formatage automatique
- **Tests obligatoires** pour nouvelles fonctionnalités

## 📝 Changelog

### v2.0.0 (Juillet 2025)
- ✅ Google Cloud TTS avec voix Studio premium
- ✅ Système de traduction lazy par chunks 1000 caractères
- ✅ Gestion d'erreurs robuste avec unhandledrejection
- ✅ Architecture ES modules complètement réparée
- ✅ Interface mobile optimisée avec contrôles tactiles
- ✅ Cache performance < 3 secondes temps de chargement

### v1.0.0 (Juin 2025)
- 🎉 Lancement initial avec 1,381+ textes Breslev
- 🤖 Intégration Gemini AI pour analyse spirituelle
- 📱 Interface responsive avec sidebar collapsible
- 🔊 TTS Web Speech API avec fallback

## 📞 Support

Pour questions techniques ou spirituelles :
- **Issues GitHub** pour bugs et features
- **Discussions** pour questions générales
- **Wiki** pour documentation approfondie

## 📄 Licence

MIT License - Voir [LICENSE](LICENSE) pour détails.

---

*"נ נח נחמ נחמן מאומן - Le cœur de Breslev"* 🕊️