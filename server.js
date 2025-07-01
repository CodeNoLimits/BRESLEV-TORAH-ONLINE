// Fichier : server.js
import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';

const app = express();
app.use(cors());
app.use(express.json());

/* ============ Proxy pour Sefaria ============ */
app.get('/sefaria/*', async (req, res) => {
  const targetUrl = 'https://www.sefaria.org' + req.originalUrl.replace('/sefaria', '');
  console.log(`[Sefaria Proxy] Forwarding to: ${targetUrl}`);
  try {
    const response = await fetch(targetUrl);
    res.status(response.status);
    response.body.pipe(res);
  } catch (error) {
    console.error('[Sefaria Proxy] Error:', error);
    res.status(500).json({ error: 'Proxy error for Sefaria' });
  }
});

/* ============ Proxy pour Gemini AI (sécurisé) ============ */
if (!process.env.GEMINI_API_KEY) {
  throw new Error('ERREUR: La clé API Gemini (GEMINI_API_KEY) est manquante dans les "Secrets".');
}

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = ai.getGenerativeModel({
  model: 'gemini-1.5-flash-latest',
  systemInstruction: {
    role: 'system',
    parts: [{
      text: `Tu es Le Compagnon du Cœur, un guide spirituel expert des enseignements de Rabbi Nahman de Breslev. Tes réponses doivent être profondes, bienveillantes et uniquement en français. Lorsque tu analyses un texte, traduis-le d'abord intégralement en français, puis fournis ton analyse. Ignore toute question non spirituelle.`
    }]
  }
});

app.post('/gemini/chat', async (req, res) => {
  try {
    const { prompt } = req.body;
    console.log('[Gemini Proxy] Processing request...');
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
    console.error('[Gemini Proxy Error]', e);
    res.status(500).json({ error: 'Failed to communicate with Gemini API' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 Proxy server running on port ${PORT}`));