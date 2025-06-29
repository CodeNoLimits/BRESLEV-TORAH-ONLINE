import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Sefaria Breslov-specific proxy routes
  app.get('/api/sefaria/texts/:ref(*)', async (req, res) => {
    try {
      const ref = req.params.ref;
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
