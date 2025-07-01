import type { Express, Request, Response } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { v1beta1, protos } from '@google-cloud/text-to-speech';
import fs from 'fs/promises';
import path from 'path';
import { validateSectionExists, getBookConfig } from './src/data/BRESLOV_BOOKS.js';
import { registerMetaRoutes } from './routes/meta.js';
import { ttsRouter } from './routes/tts.js';
import { chatRouter } from './routes/chat.js';
// Dynamic import for ES module compatibility
let fullTextExtractor: any = null;

// Helper function to load fullTextExtractor module
async function loadFullTextExtractor() {
  if (!fullTextExtractor) {
    try {
      fullTextExtractor = await import('./fullTextExtractor.js');
    } catch (error) {
      console.error('[Routes] Failed to load fullTextExtractor:', error);
      throw new Error('Text extractor module not available');
    }
  }
  return fullTextExtractor;
}

// Disable Google Cloud TTS to use Web Speech API fallback
let ttsClient: v1beta1.TextToSpeechClient | null = null;
console.log('[TTS-Cloud] Using Web Speech API fallback for TTS');

export async function registerRoutes(app: Express): Promise<Server> {

  // Static assets already handled in index.ts

  // TTS Routes
  app.use('/api', ttsRouter);
  app.use('/api', chatRouter);

  // Docs API Endpoints
  app.get('/api/docs/index', async (req: Request, res: Response) => {
    try {
      const docsIndexPath = path.join(process.cwd(), 'docs', 'docsIndex.json');
      const docsData = await fs.readFile(docsIndexPath, 'utf-8');
      const docsIndex = JSON.parse(docsData);

      res.header('Access-Control-Allow-Origin', '*');
      res.json(docsIndex);
    } catch (error) {
      console.error('[Docs] Error loading docs index:', error);
      res.status(500).json({ error: 'Failed to load docs index' });
    }
  });

  app.get('/api/docs/:collection/:id', async (req: Request, res: Response) => {
    try {
      const { collection, id } = req.params;

      // Convert kebab-case to proper collection format
      const collectionMap: Record<string, string> = {
        'sefer-hamiddot': 'Sefer HaMiddot',
        'chayei-moharan': 'Chayei Moharan', 
        'likutei-moharan': 'Likutei Moharan',
        'sichot-haran': 'Sichot HaRan',
        'sippurei-maasiyot': 'Sippurei Maasiyot',
        'likutei-tefilot': 'Likutei Tefilot',
        'likutei-halachot': 'Likutei Halakhot',
        'kitzur-likutei-moharan': 'Kitzur Likutei Moharan',
        'likutei-etzot': 'Likutei Etzot'
      };

      const properCollection = collectionMap[collection] || collection;
      const sectionNumber = parseInt(id);
      const textRef = `${properCollection}.${id}`;

      console.log(`[Docs] Request for ${collection}/${id} -> ${textRef}`);

      // Validate section exists before fetch to provide graceful 404
      if (!isNaN(sectionNumber) && !validateSectionExists(properCollection, sectionNumber)) {
        const bookConfig = getBookConfig(properCollection);
        const maxSections = bookConfig?.maxSections || 'unknown';

        return res.status(404).json({
          error: 'Section not found',
          ref: textRef,
          message: `Section ${sectionNumber} does not exist for ${properCollection}`,
          maxSections: maxSections,
          alternatives: [
            `Try ${properCollection}.1 to ${properCollection}.${maxSections}`,
            `Browse available sections in the library`
          ]
        });
      }

      // Use the fullTextExtractor to get the content
      try {
        const extractor = await loadFullTextExtractor();
        const result = await extractor.extractCompleteBook(properCollection, id);

        if (result && result.text && result.text.length > 0) {
          res.header('Access-Control-Allow-Origin', '*');
          res.json({
            ref: result.ref,
            title: result.title,
            book: result.book,
            text: result.text,
            he: result.he || [],
            verified: true
          });
        } else {
          res.status(404).json({
            error: 'Text not found',
            ref: textRef,
            alternatives: [`Try ${properCollection}.1`, `Check available sections`]
          });
        }
      } catch (extractorError) {
        console.error(`[Docs] Extractor error for ${textRef}:`, extractorError);
        res.status(404).json({
          error: 'Content not available',
          ref: textRef,
          message: 'This section may not be available in the digital library'
        });
      }

    } catch (error) {
      console.error('[Docs] Error in docs endpoint:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/stats', async (req: Request, res: Response) => {
    try {
      const docsIndexPath = path.join(process.cwd(), 'docs', 'docsIndex.json');
      const docsData = await fs.readFile(docsIndexPath, 'utf-8');
      const docsIndex = JSON.parse(docsData);

      res.header('Access-Control-Allow-Origin', '*');
      res.json({
        totalTexts: docsIndex.totalTexts || 1381,
        collections: Object.keys(docsIndex.collections || {}).length,
        lastUpdated: docsIndex.searchIndex?.lastUpdated || new Date().toISOString()
      });
    } catch (error) {
      console.error('[Stats] Error:', error);
      res.status(500).json({ error: 'Failed to get stats' });
    }
  });

  // TTS Cloud Fallback Endpoint pour mobile
  app.post('/api/tts/speak', async (req: Request, res: Response) => {
    try {
      const { text, language = 'fr' } = req.body as { text?: string; language?: string };

      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Text is required' });
      }

      // Pour l'instant, retourner une erreur 501 avec message informatif
      // TODO: Implémenter Google Cloud TTS quand clé API disponible
      console.log(`[TTS-Fallback] Request for ${language}: ${text.substring(0, 50)}...`);

      return res.status(501).json({ 
        error: 'TTS Cloud not implemented yet',
        fallback: 'Use Web Speech API',
        message: 'Google Cloud TTS endpoint ready for implementation'
      });

    } catch (error) {
      console.error('[TTS-Fallback] Error:', error);
      return res.status(500).json({ error: 'TTS service error' });
    }
  });

  // Endpoint Gemini pour toutes les requêtes AI (vocal + écrit)
  app.post('/api/gemini/quick', async (req: Request, res: Response) => {
    try {
      const { prompt, maxTokens = 1000 } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      console.log('[Gemini Proxy] Processing request:', prompt.substring(0, 100) + '...');

      if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY not configured');
      }

      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature: 0.7,
        }
      });

      const enhancedPrompt = `Tu es un guide spirituel expert des enseignements de Rabbi Nahman de Breslov. Réponds TOUJOURS en français, de manière claire et personnelle.

${prompt}

Réponds en français uniquement, avec sagesse et bienveillance.`;

      const result = await model.generateContent(enhancedPrompt);
      if (!result || !result.response) {
        throw new Error('Invalid response from Gemini API');
      }

      const response = result.response;
      const text = response.text();

      // Nettoyer la réponse
      const cleanResponse = text
        .replace(/[*#]/g, '') // Supprimer markdown
        .trim();

      console.log('[Gemini Proxy] ✅ Response sent (' + cleanResponse.length + ' chars)');

      res.json({ 
        response: cleanResponse,
        usage: 'spiritual-guidance'
      });

    } catch (error) {
      console.error('[Gemini Proxy] Error:', error);

      // Return proper error for AI_ERR handling
      return res.status(502).json({ error: 'AI_ERR' });
    }
  });

  // Endpoint Gemini pour traduction française
  app.post('/api/gemini/translate', async (req: Request, res: Response) => {
    try {
      const { text, targetLang = 'french', context = '' } = req.body;

      if (!text) {
        return res.status(400).json({ error: 'Text is required' });
      }

      console.log(`[Gemini Translate] Request: ${text.substring(0, 50)}... -> ${targetLang}`);

      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: {
          maxOutputTokens: 2000,
          temperature: 0.3,
        }
      });

      const translationPrompt = `Traduis ce texte anglais en français de manière fluide et naturelle.

CONTEXTE: ${context}

TEXTE À TRADUIRE:
${text}

INSTRUCTIONS:
- Traduis en français moderne et fluide
- Préserve le sens spirituel et la profondeur du texte
- Garde les références bibliques en français
- Style élégant et accessible
- Ne répète pas le texte original anglais

TRADUCTION FRANÇAISE:`;

      console.log('[Gemini Translate] Processing translation request');

      const result = await model.generateContent(translationPrompt);
      const response = result.response;
      const translation = response.text();

      // Nettoyer la traduction
      const cleanTranslation = translation
        .replace(/^TRADUCTION FRANÇAISE:\s*/i, '')
        .replace(/^Traduction:\s*/i, '')
        .trim();

      console.log('[Gemini Translate] Translation completed:', cleanTranslation.substring(0, 100) + '...');

      res.json({ 
        translation: cleanTranslation,
        originalLength: text.length,
        translatedLength: cleanTranslation.length
      });

    } catch (error) {
      console.error('[Gemini Translate Error]', error);

      res.json({ 
        translation: `[Traduction temporairement indisponible] Ce passage des enseignements de Rabbi Nahman sera traduit sous peu.`,
        originalLength: req.body.text?.length || 0,
        translatedLength: 100,
        fallback: true
      });
    }
  });

  // Sefaria CORS Proxy to fix fetch errors
  app.get('/sefaria/*', async (req, res) => {
    const target = 'https://www.sefaria.org' + req.originalUrl.replace('/sefaria', '');
    console.log(`[Sefaria Proxy] Fetching: ${target}`);

    // CORS headers always returned
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    try {
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(target);

      res.header('Content-Type', 'application/json');

      if (response.ok) {
        const data = await response.text();
        res.status(response.status).send(data);
      } else {
        console.error(`[Sefaria Proxy] Error ${response.status}: ${response.statusText}`);
        res.status(response.status).json({
          error: `Sefaria API error: ${response.status}`,
          url: target
        });
      }
    } catch (error) {
      console.error('[Sefaria Proxy] Fetch failed:', error);
      res.status(502).json({
        error: 'Proxy failure',
        message: error instanceof Error ? error.message : 'Unknown error',
        url: target
      });
    }
  });

  // Initialize Gemini AI
  if (!process.env.GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY environment variable is missing!');
  }
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  // Gemini proxy (stream) - simplified route
  app.post('/gemini/chat', async (req, res) => {
    try {
      const { prompt } = req.body;
      console.log(`[Gemini Proxy] Processing request`);
      const chat = model.startChat();
      const result = await chat.sendMessageStream(prompt);

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Transfer-Encoding', 'chunked');
      res.flushHeaders();

      for await (const chunk of result.stream) {
        res.write(chunk.text());
      }
      res.end();
    } catch (e) {
      console.error('[Gemini Error]', e);
      res.status(500).json({ error: 'Gemini fail' });
    }
  });


  // Sefaria Breslov-specific proxy routes
  // NEW: Complete text extraction endpoint
  app.get('/api/complete-text/:bookTitle/:section?', async (req, res) => {
    try {
      const { bookTitle, section } = req.params;
      console.log(`[CompleteText] Extracting full content: ${bookTitle}${section ? ` section ${section}` : ''}`);

      const extractor = await loadFullTextExtractor();
      const completeText = await extractor.extractCompleteBook(bookTitle, section ? parseInt(section) : null);

      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET');
      res.header('Access-Control-Allow-Headers', 'Content-Type');

      res.json(completeText);

    } catch (error) {
      console.error(`[CompleteText] Error:`, error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // NEW: Book sections endpoint
  app.get('/api/book-sections/:bookTitle', async (req, res) => {
    try {
      const { bookTitle } = req.params;
      console.log(`[BookSections] Getting sections for: ${bookTitle}`);

      const extractor = await loadFullTextExtractor();
      const book = extractor.BRESLOV_BOOKS?.[bookTitle];

      if (!book) {
        return res.status(404).json({ error: `Book ${bookTitle} not found` });
      }

      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET');
      res.header('Access-Control-Allow-Headers', 'Content-Type');

      res.json(book.sections || []);

    } catch (error) {
      console.error(`[BookSections] Error:`, error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.get('/api/sefaria/texts/:ref(*)', async (req, res) => {
    try {
      const ref = req.params.ref;

      // Check if this is a Breslov book request - use complete text extractor
      const breslovBooks = ['Likutei Moharan', 'Sichot HaRan', 'Sippurei Maasiyot', 'Chayei Moharan', 'Shivchei HaRan'];
      const bookTitle = breslovBooks.find(book => ref.includes(book));

      if (bookTitle) {
        console.log(`[Sefaria Proxy] Breslov book detected: ${ref}, using complete text extractor`);

        // Extract section number if present
        const sectionMatch = ref.match(/(\d+)$/);
        const section = sectionMatch ? parseInt(sectionMatch[1]) : null;

        try {
          const extractor = await loadFullTextExtractor();
          const completeText = await extractor.extractCompleteBook(bookTitle, section);
          res.header('Access-Control-Allow-Origin', '*');
          res.header('Access-Control-Allow-Methods', 'GET');
          res.header('Access-Control-Allow-Headers', 'Content-Type');
          return res.json(completeText);
        } catch (extractError) {
          console.log(`[Sefaria Proxy] Complete extractor failed, falling back to regular proxy`);
        }
      }

      // Try multiple API endpoints for better text access
      const fetch = (await import('node-fetch')).default;
      const encodedRef = encodeURIComponent(ref);

      const endpoints = [
        `https://www.sefaria.org/api/v3/texts/${encodedRef}?context=0&commentary=0&pad=0&wrapLinks=false`,
        `https://www.sefaria.org/api/texts/${encodedRef}?context=0&commentary=0`,
        `https://www.sefaria.org/api/v3/texts/${ref.replace(/\s+/g, '_')}?context=0&commentary=0&pad=0&wrapLinks=false`
      ];

      let lastError = null;

      for (const url of endpoints) {
        try {
          console.log(`[Sefaria Proxy] Trying: ${url}`);

          const response = await fetch(url, {
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'Mozilla/5.0 (compatible; BreslovStudyApp/1.0)'
            }
          });

          if (response.ok) {
            const data = await response.json();

            // Validate that we have actual content
            let hasContent = false;
            if ((data as any).versions && Array.isArray((data as any).versions)) {
              hasContent = (data as any).versions.some((v: any) => v.text && (
                (typeof v.text === 'string' && v.text.trim().length > 3) ||
                (Array.isArray(v.text) && v.text.some((segment: any) => segment && segment.trim().length > 3))
              ));
            } else if ((data as any).text || (data as any).he) {
              hasContent = true;
            }

            if (hasContent) {
              console.log(`[Sefaria Proxy] ✅ Successfully fetched: ${ref}`);
              res.header('Access-Control-Allow-Origin', '*');
              res.header('Access-Control-Allow-Methods', 'GET');
              res.header('Access-Control-Allow-Headers', 'Content-Type');
              return res.json(data);
            }
          }

          lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
        } catch (fetchError) {
          lastError = fetchError;
          continue;
        }
      }

      console.error(`[Sefaria Proxy] All endpoints failed for ${ref}:`, lastError);
      res.status(404).json({ 
        error: 'Text not found', 
        ref: ref,
        suggestion: 'This text may not be available on Sefaria or the reference format may be incorrect'
      });

    } catch (error) {
      console.error('[Sefaria Proxy] Text fetch error:', error);
      res.status(500).json({ error: `Failed to fetch text: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  });

  app.get('/api/sefaria/breslov-index', async (req, res) => {
    try {
      console.log(`[Sefaria Proxy] Building Breslov index from known books`);

      // ALL Breslov books on Sefaria with their validated working references
      const breslovBooks = [
        { title: 'Likutei Moharan', ref: 'Likutei Moharan.1.1.1' },
        { title: 'Sichot HaRan', ref: 'Sichot HaRan.1.1' },
        { title: 'Sippurei Maasiyot', ref: 'Sippurei Maasiyot.1.1' },
        { title: 'Chayei Moharan', ref: 'Chayei Moharan.1.1' },
        { title: 'Shivchei HaRan', ref: 'Shivchei HaRan.1.1' },
        { title: 'Sefer HaMiddot', ref: 'Sefer HaMiddot, Introduction.1' },
        { title: 'Likutei Tefilot', ref: 'Likutei Tefilot, Introduction.1' },
        { title: 'Likutei Halakhot', ref: 'Likutei Halakhot, Author\'s Introduction.1' },
        { title: 'Likkutei Etzot', ref: 'Likkutei Etzot, Introduction to First Edition.1' }
      ];

      console.log(`[Sefaria Proxy] Breslov index built with ${breslovBooks.length} books`);

      // Set CORS headers
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET');
      res.header('Access-Control-Allow-Headers', 'Content-Type');

      res.json(breslovBooks);
    } catch (error) {
      console.error('[Sefaria Proxy] Breslov index build error:', error);
      res.status(500).json({ error: `Failed to build Breslov index: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  });

  // Handle preflight requests
  app.options('/api/sefaria/*', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.status(200).end();
  });

  // Premium TTS endpoint with masculine voice
  app.post('/api/tts/speak', async (req, res) => {
    try {
      const { text, lang } = req.body as { text: string; lang: string };

      if (!ttsClient) {
        console.log('[TTS-Cloud] Service unavailable, returning fallback response');
        return res.status(503).json({ error: 'TTS service unavailable' });
      }

      // Voice mapping with masculine voices for all languages
      const voiceMap = {
        fr: { languageCode: 'fr-FR', name: 'fr-FR-Wavenet-D', ssmlGender: 'MALE' as const },
        en: { languageCode: 'en-US', name: 'en-US-Studio-M', ssmlGender: 'MALE' as const },
        he: { languageCode: 'he-IL', name: 'he-IL-Wavenet-B', ssmlGender: 'MALE' as const }
      };

      const voice = voiceMap[lang as keyof typeof voiceMap] || voiceMap.fr;

      console.log(`[TTS-Cloud] Synthesizing: ${text.substring(0, 50)}... (${lang})`);

      const request: protos.google.cloud.texttospeech.v1beta1.ISynthesizeSpeechRequest = {
        input: { text },
        voice: {
          languageCode: voice.languageCode,
          name: voice.name,
          ssmlGender: protos.google.cloud.texttospeech.v1beta1.SsmlVoiceGender.MALE
        },
        audioConfig: {
          audioEncoding: protos.google.cloud.texttospeech.v1beta1.AudioEncoding.MP3,
          speakingRate: 0.95,
          pitch: -2.0,
          volumeGainDb: 2.0
        }
      };

      const [response] = await ttsClient.synthesizeSpeech(request);

      if (!response.audioContent) {
        throw new Error('No audio content received from TTS service');
      }

      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', response.audioContent.length);
      res.send(response.audioContent);

    } catch (error) {
      console.error('[TTS-Cloud] Error:', error);
      res.status(500).json({ error: 'TTS synthesis failed' });
    }
  });

  // TTS health check endpoint
  app.get('/api/tts/ping', async (req, res) => {
    if (ttsClient) {
      res.json({ available: true, provider: 'Google Cloud TTS' });
    } else {
      res.status(503).json({ available: false, fallback: 'Web Speech API' });
    }
  });

  // Basic health check for automated tests
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Register meta routes
  registerMetaRoutes(app);

  const httpServer = createServer(app);

  return httpServer;
}