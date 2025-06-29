import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { TextToSpeechClient, protos } from '@google-cloud/text-to-speech';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { extractCompleteBook } = require('./fullTextExtractor');

// Initialize Google Cloud TTS client
let ttsClient: TextToSpeechClient | null = null;
try {
  ttsClient = new TextToSpeechClient({
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
  });
  console.log('[TTS-Cloud] Google Cloud TTS initialized');
} catch (error) {
  console.warn('[TTS-Cloud] Google Cloud TTS not available, using fallback:', error);
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Sefaria CORS Proxy to fix fetch errors
  app.get('/sefaria/*', async (req, res) => {
    const target = 'https://www.sefaria.org' + req.originalUrl.replace('/sefaria', '');
    console.log(`[Sefaria Proxy] Fetching: ${target}`);
    
    try {
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(target);
      
      res.set('Content-Type', 'application/json');
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type');
      
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

  // Universal Sefaria proxy - route ALL /sefaria/* requests
  app.get('/sefaria/*', async (req, res) => {
    try {
      const target = 'https://www.sefaria.org' + req.originalUrl.replace('/sefaria', '');
      console.log(`[Sefaria Proxy] ${target}`);
      const response = await fetch(target);
      
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET');
      res.header('Access-Control-Allow-Headers', 'Content-Type');
      
      res.status(response.status);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('[Sefaria Proxy Error]', error);
      res.status(500).json({ error: 'Sefaria proxy failed' });
    }
  });

  // Sefaria Breslov-specific proxy routes
  // NEW: Complete text extraction endpoint
  app.get('/api/complete-text/:bookTitle/:section?', async (req, res) => {
    try {
      const { bookTitle, section } = req.params;
      console.log(`[CompleteText] Extracting full content: ${bookTitle}${section ? ` section ${section}` : ''}`);
      
      const completeText = await extractCompleteBook(bookTitle, section ? parseInt(section) : null);
      
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
      
      const { BRESLOV_BOOKS } = require('./fullTextExtractor');
      const book = BRESLOV_BOOKS[bookTitle];
      
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
          const completeText = await extractCompleteBook(bookTitle, section);
          res.header('Access-Control-Allow-Origin', '*');
          res.header('Access-Control-Allow-Methods', 'GET');
          res.header('Access-Control-Allow-Headers', 'Content-Type');
          return res.json(completeText);
        } catch (extractError) {
          console.log(`[Sefaria Proxy] Complete extractor failed, falling back to regular proxy`);
        }
      }
      
      // Fallback to regular Sefaria proxy
      const encodedRef = encodeURIComponent(ref);
      const url = `https://www.sefaria.org/api/v3/texts/${encodedRef}?context=0&commentary=0&pad=0&wrapLinks=false`;
      
      console.log(`[Sefaria Proxy] Fetching text: ${ref} -> ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; BreslovStudyApp/1.0)'
        }
      });
      
      if (!response.ok) {
        console.error(`[Sefaria Proxy] Error ${response.status}: ${response.statusText} for ${ref}`);
        return res.status(response.status).json({ error: 'Sefaria error' });
      }
      
      const data = await response.json();
      
      // Set CORS headers
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET');
      res.header('Access-Control-Allow-Headers', 'Content-Type');
      
      res.json(data);
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

      const [response] = await ttsClient.synthesizeSpeech({
        input: { text },
        voice: voice,
        audioConfig: { 
          audioEncoding: 'MP3' as const,
          speakingRate: 0.95,
          pitch: -2.0, // Slightly lower pitch for masculine tone
          volumeGainDb: 2.0
        }
      });

      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', response.audioContent?.length || 0);
      res.send(Buffer.from(response.audioContent as string, 'base64'));
      
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

  const httpServer = createServer(app);

  return httpServer;
}
