import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Sefaria API Proxy Routes
  app.get('/api/sefaria/texts/:reference', async (req, res) => {
    try {
      const { reference } = req.params;
      const encodedRef = encodeURIComponent(reference);
      const apiUrl = `https://www.sefaria.org/api/texts/${encodedRef}`;
      
      console.log(`Fetching from Sefaria: ${apiUrl}`);
      
      const response = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SefariaBot/1.0)',
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        return res.status(400).json({ error: data.error });
      }
      
      res.json(data);
    } catch (error) {
      console.error('Sefaria API error:', error);
      res.status(500).json({ 
        error: `Unable to fetch text: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    }
  });

  app.get('/api/sefaria/index', async (req, res) => {
    try {
      const apiUrl = 'https://www.sefaria.org/api/index/';
      
      console.log(`Fetching Sefaria index: ${apiUrl}`);
      
      const response = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SefariaBot/1.0)',
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Sefaria index error:', error);
      res.status(500).json({ 
        error: `Unable to fetch index: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    }
  });

  app.get('/api/sefaria/search', async (req, res) => {
    try {
      const { q, size = 10 } = req.query;
      
      if (!q) {
        return res.status(400).json({ error: 'Query parameter "q" is required' });
      }
      
      const apiUrl = `https://www.sefaria.org/api/search-wrapper?q=${encodeURIComponent(q as string)}&size=${size}`;
      
      console.log(`Searching Sefaria: ${apiUrl}`);
      
      const response = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SefariaBot/1.0)',
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Sefaria search error:', error);
      res.status(500).json({ 
        error: `Unable to search: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
