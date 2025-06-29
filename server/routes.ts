import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { extractCompleteBook } = require('./fullTextExtractor');

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize Gemini AI
  if (!process.env.GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY environment variable is missing!');
  }
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  // Gemini API proxy for AI interactions
  app.post('/gemini-api/chat', async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      console.log('[GeminiProxy] Processing AI request');
      
      const result = await model.generateContentStream(prompt);
      
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Transfer-Encoding', 'chunked');
      res.setHeader('Access-Control-Allow-Origin', '*');
      
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        res.write(chunkText);
      }
      res.end();
      
      console.log('[GeminiProxy] AI response completed');
    } catch (error) {
      console.error('[GeminiProxy] Error:', error);
      res.status(500).json({ error: 'AI service error' });
    }
  });

  // Universal Sefaria proxy to eliminate ALL CORS issues
  app.get('/sefaria-api/*', async (req, res) => {
    try {
      const path = req.path.replace('/sefaria-api', '');
      const queryString = req.url.includes('?') ? req.url.split('?')[1] : '';
      const sefariaUrl = `https://www.sefaria.org/api${path}${queryString ? '?' + queryString : ''}`;
      
      console.log(`[SefariaProxy] Proxying request to: ${sefariaUrl}`);
      
      const response = await fetch(sefariaUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'LeCompagnonDuCoeur/1.0'
        }
      });
      
      if (!response.ok) {
        console.error(`[SefariaProxy] Error ${response.status}: ${response.statusText}`);
        return res.status(response.status).json({ error: response.statusText });
      }
      
      const data = await response.json();
      console.log(`[SefariaProxy] Successfully proxied request for: ${path}`);
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      res.json(data);
    } catch (error) {
      console.error('[SefariaProxy] Proxy error:', error);
      res.status(500).json({ error: 'Proxy server error' });
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

  const httpServer = createServer(app);

  return httpServer;
}
