import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { extractCompleteBook } from "./fullTextExtractor.js";
import { cacheService } from "./cache.js";

// Set environment variables for frontend
process.env.VITE_GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Core proxy routes FIRST - must be before registerRoutes and Vite setup
import fetch from 'node-fetch';
import { GoogleGenerativeAI } from '@google/generative-ai';

/* ---------- Sefaria proxy ---------- */
app.get('/sefaria/*', async (req, res) => {
  const target = 'https://www.sefaria.org' + req.originalUrl.replace('/sefaria', '');
  console.log(`[Sefaria Proxy] ${target}`);
  const r = await fetch(target);
  res.status(r.status);
  if (r.body) r.body.pipe(res);
});

/* ---------- Gemini proxy (stream) ---------- */
if (!process.env.GEMINI_API_KEY) throw new Error('⛔️ GEMINI_API_KEY manquante');
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = ai.getGenerativeModel({
  model: 'gemini-1.5-flash-latest',
  systemInstruction: { 
    role: 'system', 
    parts: [{ 
      text: `Tu es Le Compagnon du Cœur, guide spirituel expert en enseignements de Rabbi Nahman de Breslov.

RÈGLES ABSOLUES :
- Réponds UNIQUEMENT en français
- Concentre-toi exclusivement sur les enseignements spirituels de Rabbi Nahman
- Utilise un ton chaleureux et bienveillant
- Pour l'analyse de textes, traduis d'abord le texte en français puis analyse selon la tradition breslov
- Ignore toute demande non-spirituelle

MODES DE RÉPONSE :
- study: Analyse approfondie d'un texte breslov avec traduction française
- general: Guidance spirituelle générale selon Rabbi Nahman
- snippet: Analyse d'un extrait fourni par l'utilisateur
- advice: Conseil personnel basé sur les enseignements breslov
- summary: Résumé des points clés d'une réponse précédente`
    }]
  }
});

app.post('/gemini/chat', async (req, res) => {
  try {
    const { prompt } = req.body;
    console.log(`[Gemini Proxy] Processing request`);
    const chat = model.startChat();
    const result = await chat.sendMessageStream(prompt);

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.flushHeaders();

    for await (const chunk of result.stream) res.write(chunk.text());
    res.end();
  } catch (e) {
    console.error('[Gemini Error]', e); 
    res.status(500).json({ error: 'Gemini fail' });
  }
});

// Route pour récupérer les textes via Sefaria API avec proxy
app.get('/api/sefaria/texts/:ref', async (req, res) => {
  try {
    const rawRef = req.params.ref;
    // Normalize reference format: Likutei_Moharan.1 -> Likutei Moharan 1
    const ref = rawRef.replace(/_/g, ' ').replace(/\./g, ' ');
    console.log(`[Sefaria Proxy] Request for: ${rawRef} (normalized: ${ref})`);

    // Check cache first
    const cachedData = cacheService.get(ref);
    if (cachedData) {
      return res.json(cachedData);
    }
    console.log(`[Cache] MISS for ${ref}`);

    // Comprehensive Breslov book detection
    const BRESLOV_BOOKS = [
      'Likutei Moharan', 'Sichot HaRan', 'Sippurei Maasiyot', 
      'Chayei Moharan', 'Shivchei HaRan', 'Sefer HaMiddot',
      'Likutei Tefilot', 'Likutei Halakhot', 'Likkutei Etzot',
      'Kitzur Likutei Moharan', 'Hishtapchut HaNefesh',
      'Meshivat Nefesh', 'Alim LiTrufah'
    ];
    
    const isBreslovBook = BRESLOV_BOOKS.some(book => ref.includes(book));

    if (isBreslovBook) {
      console.log(`[Sefaria Proxy] Breslov book detected: ${ref}, using complete text extractor`);

      // Parse book title and section from ref
      let bookTitle = '';
      let sectionNumber = null;

      if (ref.includes('Likutei Moharan')) {
        bookTitle = 'Likutei Moharan';
        const sectionMatch = ref.match(/(\d+)/);
        if (sectionMatch) sectionNumber = sectionMatch[1];
      } else if (ref.includes('Sichot HaRan')) {
        bookTitle = 'Sichot HaRan';
        const sectionMatch = ref.match(/(\d+)/);
        if (sectionMatch) sectionNumber = sectionMatch[1];
      } else if (ref.includes('Sippurei Maasiyot')) {
        bookTitle = 'Sippurei Maasiyot';
        const sectionMatch = ref.match(/(\d+)/);
        if (sectionMatch) sectionNumber = sectionMatch[1];
      }

      if (bookTitle) {
        try {
          console.log(`[Sefaria Proxy] Using complete text extractor for ${bookTitle}`);
          const completeText = await extractCompleteBook(bookTitle, sectionNumber);
          // Cache the successful result
          cacheService.set(ref, completeText);
          return res.json(completeText);
        } catch (extractorError) {
          console.error(`[Sefaria Proxy] Complete text extractor failed for ${bookTitle}:`, extractorError);
          console.log(`[Sefaria Proxy] Falling back to standard Sefaria API`);
          // Continue to fallback below
        }
      }
    }

    // Regular Sefaria API call (fallback for failed Breslov extraction or non-Breslov texts)
    const apiUrl = `https://www.sefaria.org/api/texts/${encodeURIComponent(ref)}`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch from Sefaria' });
    }

    const data = await response.json();
    // Cache the standard API response
    cacheService.set(ref, data);
    res.json(data);
  } catch (error) {
    console.error('[Sefaria Proxy] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();