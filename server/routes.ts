import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Sefaria API Proxy Routes - Universal proxy to handle ALL Sefaria requests
  app.get('/sefaria/*', async (req, res) => {
    try {
      const sefariaPath = req.path.replace('/sefaria/', '');
      const queryString = req.url.split('?')[1] || '';
      const apiUrl = `https://www.sefaria.org/api/${sefariaPath}${queryString ? '?' + queryString : ''}`;
      
      console.log(`[Proxy] Fetching: ${apiUrl}`);
      
      const response = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SefariaBot/1.0)',
          'Accept': 'application/json',
          'Accept-Language': 'en,he,fr'
        }
      });
      
      if (!response.ok) {
        console.error(`[Proxy error] ${response.status}: ${response.statusText} for ${apiUrl}`);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        console.error(`[Proxy error] API Error: ${data.error} for ${apiUrl}`);
        return res.status(400).json({ error: data.error });
      }
      
      // Set CORS headers
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      res.json(data);
    } catch (error) {
      console.error('[Proxy error]', req.originalUrl, error);
      res.status(500).json({ 
        error: `Unable to fetch from Sefaria: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    }
  });

  // Handle preflight requests
  app.options('/sefaria/*', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.status(200).end();
  });

  const httpServer = createServer(app);

  return httpServer;
}
