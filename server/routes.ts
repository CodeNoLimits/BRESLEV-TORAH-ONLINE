import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Sefaria Breslov-specific proxy routes
  app.get('/api/sefaria/texts/:ref', async (req, res) => {
    try {
      const ref = req.params.ref;
      const url = `https://www.sefaria.org/api/v3/texts/${ref}?context=0&commentary=0&pad=0&wrapLinks=false`;
      
      console.log(`[Sefaria Proxy] Fetching text: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; BreslovStudyApp/1.0)'
        }
      });
      
      if (!response.ok) {
        console.error(`[Sefaria Proxy] Error ${response.status}: ${response.statusText}`);
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
      console.log(`[Sefaria Proxy] Fetching Breslov index`);
      
      const response = await fetch('https://www.sefaria.org/api/category/Breslov', {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; BreslovStudyApp/1.0)'
        }
      });
      
      if (!response.ok) {
        console.error(`[Sefaria Proxy] Breslov index error ${response.status}: ${response.statusText}`);
        return res.status(response.status).json({ error: 'Breslov index error' });
      }
      
      const data = await response.json();
      console.log(`[Sefaria Proxy] Breslov index fetched successfully, ${data.length || 0} items`);
      
      // Set CORS headers
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET');
      res.header('Access-Control-Allow-Headers', 'Content-Type');
      
      res.json(data);
    } catch (error) {
      console.error('[Sefaria Proxy] Breslov index fetch error:', error);
      res.status(500).json({ error: `Failed to fetch Breslov index: ${error instanceof Error ? error.message : 'Unknown error'}` });
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
