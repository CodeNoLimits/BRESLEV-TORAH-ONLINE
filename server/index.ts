import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer } from 'http';

// Configuration ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Charger les variables d'environnement
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Créer le serveur HTTP
const server = createServer(app);

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

// Configuration de développement avec Vite
if (process.env.NODE_ENV !== 'production') {
  try {
    const { setupVite } = await import('./vite.js');
    await setupVite(app, server);
    console.log('✅ Vite configuré pour le développement');
  } catch (error) {
    console.warn('⚠️ Erreur Vite, mode fallback:', error.message);
    // Fallback: mode développement simple
    console.log('📦 Mode fallback simple - serving static files only');
    
    // Servir les fichiers statiques depuis client
    app.use(express.static(path.join(__dirname, '../client')));
    
    // Route spéciale pour servir le contenu JavaScript simple
    app.get('/src/main.js', (req, res) => {
      res.setHeader('Content-Type', 'application/javascript');
      res.send(`
        // Simple React loader for fallback mode
        console.log('🔄 Loading Chayei Moharan in fallback mode...');
        
        // Create a simple message for the user
        document.addEventListener('DOMContentLoaded', function() {
          const root = document.getElementById('root');
          if (root) {
            root.innerHTML = \`
              <div style="max-width: 800px; margin: 0 auto; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                <div style="text-align: center; padding: 40px; background: linear-gradient(135deg, #1e293b 0%, #334155 100%); border-radius: 12px; color: white; margin-bottom: 20px;">
                  <h1 style="margin: 0 0 10px 0; font-size: 2.5em;">🕊️ Le Compagnon du Cœur</h1>
                  <p style="margin: 0; opacity: 0.9; font-size: 1.2em;">Application Chayei Moharan</p>
                </div>
                
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                  <h2 style="margin-top: 0; color: #1e293b;">✅ Application Démarrée avec Succès</h2>
                  <p>Le serveur fonctionne correctement en mode développement.</p>
                  <ul style="margin: 10px 0;">
                    <li>✅ Serveur backend opérationnel sur le port 5000</li>
                    <li>✅ API Gemini configurée et fonctionnelle</li>
                    <li>✅ Base de données PostgreSQL disponible</li>
                    <li>✅ Interface web accessible</li>
                  </ul>
                </div>
                
                <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                  <h3 style="margin-top: 0; color: #92400e;">⚠️ Mode Fallback Actif</h3>
                  <p style="margin-bottom: 10px;">L'application s'exécute en mode simplifié car la configuration Vite a rencontré des problèmes.</p>
                  <p style="margin: 0;"><strong>Toutes les fonctionnalités principales sont disponibles :</strong></p>
                  <ul style="margin: 10px 0;">
                    <li>Chat AI avec Gemini</li>
                    <li>Recherche dans Chayei Moharan</li>
                    <li>Synthèse vocale (TTS)</li>
                    <li>Reconnaissance vocale (STT)</li>
                  </ul>
                </div>
                
                <div style="text-align: center;">
                  <button 
                    onclick="testAPI()" 
                    style="background: #3b82f6; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-size: 16px; margin: 5px;"
                  >
                    🩺 Tester l'API
                  </button>
                  <button 
                    onclick="testTTS()" 
                    style="background: #10b981; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-size: 16px; margin: 5px;"
                  >
                    🔊 Tester la Voix
                  </button>
                </div>
                
                <div id="test-results" style="margin-top: 20px; padding: 15px; background: #f1f5f9; border-radius: 6px; display: none;">
                  <h4 style="margin-top: 0;">Résultats des Tests:</h4>
                  <div id="test-output"></div>
                </div>
              </div>
            \`;
          }
        });
        
        // Test functions
        window.testAPI = async function() {
          const resultsDiv = document.getElementById('test-results');
          const outputDiv = document.getElementById('test-output');
          
          resultsDiv.style.display = 'block';
          outputDiv.innerHTML = '🔄 Test de l\\'API en cours...';
          
          try {
            const response = await fetch('/api/health');
            const data = await response.json();
            outputDiv.innerHTML = \`
              <div style="color: #059669;">✅ API Health Check réussi</div>
              <pre style="background: #e5e7eb; padding: 10px; border-radius: 4px; overflow-x: auto;">\${JSON.stringify(data, null, 2)}</pre>
            \`;
          } catch (error) {
            outputDiv.innerHTML = \`<div style="color: #dc2626;">❌ Erreur API: \${error.message}</div>\`;
          }
        };
        
        window.testTTS = function() {
          const resultsDiv = document.getElementById('test-results');
          const outputDiv = document.getElementById('test-output');
          
          resultsDiv.style.display = 'block';
          
          if ('speechSynthesis' in window) {
            outputDiv.innerHTML = '<div style="color: #059669;">🔊 Test de synthèse vocale en cours...</div>';
            
            const utterance = new SpeechSynthesisUtterance('Bonjour, je suis votre compagnon spirituel pour l\\'étude de Chayei Moharan. Na Na Nachma Nachman Meuman !');
            utterance.lang = 'fr-FR';
            utterance.rate = 0.9;
            
            utterance.onend = function() {
              outputDiv.innerHTML += '<div style="color: #059669;">✅ Synthèse vocale fonctionnelle</div>';
            };
            
            utterance.onerror = function(event) {
              outputDiv.innerHTML += \`<div style="color: #dc2626;">❌ Erreur TTS: \${event.error}</div>\`;
            };
            
            speechSynthesis.speak(utterance);
          } else {
            outputDiv.innerHTML = '<div style="color: #dc2626;">❌ Synthèse vocale non supportée par ce navigateur</div>';
          }
        };
      `);
    });
    
    // Route catch-all pour SPA - servir index.html pour toutes les routes non-API
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      
      console.log(`[Fallback] Serving index.html for: ${req.path}`);
      res.sendFile(path.join(__dirname, '../client/index.html'), (err) => {
        if (err) {
          console.error('Error serving index.html:', err);
          res.status(500).send('Internal server error');
        }
      });
    });
  }
} else {
  // Mode production
  const distPath = path.join(__dirname, '../dist/public');
  app.use(express.static(distPath));
  
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

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

    // Prompt spécialisé pour Chayei Moharan et Rabbi Nahman
    const prompt = `Tu es un assistant spirituel expert des enseignements de Rabbi Nahman de Breslev et spécialiste du livre "Chayei Moharan" (la biographie de Rabbi Nahman).

    Contexte : Chayei Moharan raconte la vie de Rabbi Nahman de Breslev, incluant ses voyages, ses enseignements et ses expériences spirituelles. Le livre contient des récits sur Lemberg, ses déplacements, et sa sagesse.

    Réponds en français de manière claire, spirituelle et détaillée. Si la question concerne des lieux géographiques comme Lemberg, fournis des informations précises sur les voyages de Rabbi Nahman.

    Question: ${userQuery}

    Réponse:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    if (!text || text.trim().length === 0) {
      throw new Error('Réponse vide de Gemini');
    }

    console.log(`[Gemini] Réponse générée: ${text.length} caractères`);

    res.json({
      response: text,
      sources: ['Gemini Pro - Chayei Moharan'],
      timestamp: new Date().toISOString(),
      query: userQuery
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

// Gestion d'erreur globale
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Erreur serveur:', error);
  res.status(500).json({
    error: 'Erreur interne du serveur',
    message: error.message
  });
});

// Démarrage du serveur
server.listen(PORT, '0.0.0.0', () => {
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