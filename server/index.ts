import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Configuration ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Charger les variables d'environnement
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares robustes
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Middleware de logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Servir les fichiers statiques (client)
app.use(express.static(path.join(__dirname, '../client')));

// Routes API essentielles
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    gemini: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Route chat Gemini robuste
app.post('/api/chat', async (req, res) => {
  try {
    const { query, question } = req.body;
    const userQuery = query || question;

    if (!userQuery?.trim()) {
      return res.status(400).json({
        error: 'Question vide'
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        response: "L'IA n'est pas configurée. Ajoutez GEMINI_API_KEY dans les Secrets Replit.",
        error: 'Clé API manquante'
      });
    }

    console.log(`[Gemini] Question: "${userQuery}"`);

    // Import dynamique pour éviter les erreurs au démarrage
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `Tu es un assistant spirituel expert des enseignements de Rabbi Nahman de Breslev. 
    Réponds en français de manière claire et spirituelle.

    Question: ${userQuery}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log(`[Gemini] Réponse générée: ${text.length} caractères`);

    res.json({
      response: text,
      sources: ['Gemini Pro'],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Erreur Gemini:', error);
    res.status(500).json({
      error: 'Erreur interne du serveur',
      response: "Désolé, une erreur est survenue. Vérifiez la console et la clé API.",
      details: error.message
    });
  }
});

// Route pour servir l'application React (catch-all)
app.get('*', (req, res, next) => {
  // Skip API routes
  if (req.path.startsWith('/api')) {
    return next();
  }

  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Gestion d'erreur globale
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Erreur serveur:', error);
  res.status(500).json({
    error: 'Erreur interne du serveur',
    message: error.message
  });
});

// Démarrage du serveur
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Serveur Chayei Moharan sur le port ${PORT}`);
  console.log(`📚 Application: http://0.0.0.0:${PORT}`);
  console.log(`🩺 Santé: http://0.0.0.0:${PORT}/api/health`);

  if (!process.env.GEMINI_API_KEY) {
    console.log('⚠️  GEMINI_API_KEY manquante!');
    console.log('👉 Ajoutez-la dans Secrets (🔒)');
  } else {
    console.log('✅ GEMINI_API_KEY configurée');
  }
});

// Gestion propre de l'arrêt
process.on('SIGTERM', () => {
  console.log('🛑 Arrêt du serveur...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Arrêt du serveur...');
  process.exit(0);
});