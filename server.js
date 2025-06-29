import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';

const app = express();
app.use(cors());
app.use(express.json());

/* ---------- Sefaria proxy ---------- */
app.get('/sefaria/*', async (req, res) => {
  const target = 'https://www.sefaria.org' + req.originalUrl.replace('/sefaria', '');
  console.log(`[Sefaria Proxy] ${target}`);
  const r = await fetch(target);
  res.status(r.status);
  r.body.pipe(res);
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

    for await (const chunk of result.stream) {
      res.write(chunk.text());
    }
    res.end();
  } catch (e) {
    console.error('[Gemini Error]', e);
    res.status(500).json({ error: 'Gemini fail' });
  }
});

app.listen(3000, () => console.log('🚀 Proxy up : http://localhost:3000'));