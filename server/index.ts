import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
// Dynamic import for fullTextExtractor to handle ES module compatibility
import { getOrFetch } from "../src/services/cache";
import fs from "fs";
import path from "path";

// ---------------------------------------------------------
// Variables d’environnement accessibles côté client (Vite)
process.env.VITE_GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// ---------------------------------------------------------
// Décodage éventuel des credentials Google TTS
if (process.env.GOOGLE_TTS_CREDENTIALS_B64) {
  try {
    const credentialsPath = path.join(process.cwd(), "serviceAccount.json");
    fs.writeFileSync(
      credentialsPath,
      Buffer.from(process.env.GOOGLE_TTS_CREDENTIALS_B64, "base64")
    );
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
    console.log(`[TTS-Cloud] Credentials written to ${credentialsPath}`);
  } catch (err) {
    console.error("[TTS-Cloud] Failed to decode credentials", err);
  }
}

// ---------------------------------------------------------
// App & middlewares
const app = express();

// Fix host restrictions for Replit domains
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  // Trust all hosts for development
  if (process.env.NODE_ENV === 'development') {
    req.headers.host = 'localhost:5000';
  }

  next();
});

app.use(express.json({ limit: '50mb' })); // Fix PayloadTooLargeError
app.use(express.urlencoded({ extended: false }));

// Basic health-check
app.get("/health", (_req, res) => res.send("ok"));

// Logger API simple
app.use((req, res, next) => {
  const start = Date.now();
  const pathReq = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (pathReq.startsWith("/api")) {
      let logLine = `${req.method} ${pathReq} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      if (logLine.length > 80) logLine = logLine.slice(0, 79) + "…";
      log(logLine);
    }
  });

  next();
});

// ---------------------------------------------------------
// Core proxy routes (avant Vite)
import fetch from "node-fetch";
import { GoogleGenerativeAI } from "@google/generative-ai";

/* ---------- Sefaria proxy ---------- */
app.get("/sefaria/*", async (req, res) => {
  const target = "https://www.sefaria.org" + req.originalUrl.replace("/sefaria", "");
  console.log(`[Sefaria Proxy] ${target}`);
  const r = await fetch(target);
  res.status(r.status);
  if (r.body) r.body.pipe(res);
});

/* ---------- Gemini proxy (stream) ---------- */
if (!process.env.GEMINI_API_KEY) throw new Error("⛔️ GEMINI_API_KEY manquante");

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = ai.getGenerativeModel({
  model: "gemini-1.5-flash-latest",
  systemInstruction: {
    role: "system",
    parts: [
      {
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
- summary: Résumé des points clés d'une réponse précédente`,
      },
    ],
  },
});

app.post("/gemini/chat", async (req, res) => {
  try {
    const { prompt } = req.body;
    console.log("[Gemini Proxy] Processing request:", prompt?.substring(0, 100) + "...");
    
    if (!prompt || prompt.trim().length === 0) {
      return res.status(400).json({ error: "Prompt vide" });
    }
    
    if (!process.env.GEMINI_API_KEY) {
      console.error("[Gemini Error] API Key missing");
      return res.status(500).json({ error: "Configuration manquante. Vérifiez la clé API." });
    }

    const chat = model.startChat();
    const result = await chat.sendMessageStream(prompt);

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.flushHeaders();

    let hasContent = false;
    let contentLength = 0;
    
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        res.write(text);
        hasContent = true;
        contentLength += text.length;
      }
    }
    
    if (!hasContent) {
      const fallbackMessage = "נ נח נחמ נחמן מאומן\n\nGuide spirituel à votre service. Comment puis-je vous accompagner dans votre étude spirituelle ?";
      res.write(fallbackMessage);
    }
    
    console.log(`[Gemini Proxy] ✅ Response sent (${contentLength} chars)`);
    res.end();
    
  } catch (e) {
    console.error("[Gemini Error] Full error:", e);
    
    // Check if response headers have been sent
    if (!res.headersSent) {
      res.status(500).json({ 
        error: "Le guide spirituel est temporairement indisponible. Veuillez patienter un moment et réessayer.",
        details: process.env.NODE_ENV === 'development' ? (e as Error).message : undefined
      });
    } else {
      // If streaming has started, write error to stream
      res.write("\n\n[Connexion interrompue - veuillez réessayer]");
      res.end();
    }
  }
});

/* ---------- Gemini quick responses ---------- */
app.post("/api/gemini/quick", async (req, res) => {
  try {
    const { prompt, maxTokens = 50 } = req.body;
    
    const quickPrompt = `Réponds en français en maximum 15 mots. Sois direct et pratique comme un guide breslov.

Question: "${prompt}"

Exemples de réponses courtes:
- "Méditez 5 minutes sur la gratitude"
- "Récitez le Tikkun HaKlali maintenant"
- "Cherchez dans Likutei Moharan 1"`;

    const chat = model.startChat();
    const result = await chat.sendMessage(quickPrompt);
    const response = result.response.text().trim();
    
    res.json({ response: response || "Reformulez votre question" });
  } catch (e) {
    console.error("[Gemini Quick Error]", e);
    res.json({ response: "Guide spirituel à votre écoute" });
  }
});

// ---------------------------------------------------------
// Route API Sefaria (avec cache)
app.get("/api/sefaria/texts/:ref", async (req, res) => {
  try {
    const rawRef = req.params.ref;
    const ref = rawRef.replace(/_/g, " ").replace(/\./g, " ");
    console.log(`[Sefaria Proxy] Request for: ${rawRef} (normalized: ${ref})`);

    const data = await getOrFetch(ref, async () => {
      console.log(`[Cache] MISS for ${ref}`);

      const BRESLOV_BOOKS = [
        "Likutei Moharan",
        "Sichot HaRan",
        "Sippurei Maasiyot",
        "Chayei Moharan",
        "Shivchei HaRan",
        "Sefer HaMiddot",
        "Likutei Tefilot",
        "Likutei Halakhot",
        "Likkutei Etzot",
        "Kitzur Likutei Moharan",
        "Hishtapchut HaNefesh",
        "Meshivat Nefesh",
        "Alim LiTrufah",
      ];

      const isBreslovBook = BRESLOV_BOOKS.some((book) => ref.includes(book));

      if (isBreslovBook) {
        console.log(
          `[Sefaria Proxy] Breslov book detected: ${ref}, using complete text extractor`
        );

        let bookTitle = "";
        let sectionNumber: string | null = null;

        if (ref.includes("Likutei Moharan")) {
          bookTitle = "Likutei Moharan";
          sectionNumber = ref.match(/(\d+)/)?.[1] ?? null;
        } else if (ref.includes("Sichot HaRan")) {
          bookTitle = "Sichot HaRan";
          sectionNumber = ref.match(/(\d+)/)?.[1] ?? null;
        } else if (ref.includes("Sippurei Maasiyot")) {
          bookTitle = "Sippurei Maasiyot";
          sectionNumber = ref.match(/(\d+)/)?.[1] ?? null;
        }

        if (bookTitle) {
          try {
            console.log(
              `[Sefaria Proxy] Using complete text extractor for ${bookTitle}`
            );
            // Dynamic import to handle ES module compatibility in production
            const extractorModule = await import("./fullTextExtractor.js").catch(async () => {
              // Fallback for development environment
              return await import("./fullTextExtractor");
            });
            const { extractCompleteBook } = extractorModule;
            return await extractCompleteBook(bookTitle, sectionNumber);
          } catch (extractorError) {
            console.error(
              `[Sefaria Proxy] Complete text extractor failed for ${bookTitle}:`,
              extractorError
            );
            console.log(
              `[Sefaria Proxy] Falling back to standard Sefaria API`
            );
          }
        }
      }

      const apiUrl = `https://www.sefaria.org/api/texts/${encodeURIComponent(
        ref
      )}`;
      const response = await fetch(apiUrl);

      if (!response.ok) throw new Error("Failed to fetch from Sefaria");

      return await response.json();
    });

    res.json(data);
  } catch (error) {
    console.error("[Sefaria Proxy] Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Static file serving for attached assets
app.use('/attached_assets', express.static(path.join(process.cwd(), 'attached_assets'), {
  setHeaders: (res) => {
    res.header('Access-Control-Allow-Origin', '*');
  }
}));

// ---------------------------------------------------------
// Bootstrap
(async () => {
  const server = await registerRoutes(app);

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    const status = (err as any).status || (err as any).statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  // Vite en dev uniquement
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Port dynamique avec fallback pour Replit
  const port = Number(process.env.PORT) || 5000;
  const host = "0.0.0.0";

  server.listen(port, host, () => {
    log(`serving on port ${port}`);
    console.log(`🚀 Le Compagnon du Cœur is running on http://${host}:${port}`);
  });
})();