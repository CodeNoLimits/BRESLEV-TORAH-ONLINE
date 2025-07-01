import { Request, Response } from 'express';

export async function handleChatRequest(req: Request, res: Response) {
  try {
    const { prompt, maxTokens = 1000 } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log('[Chat] Processing request:', prompt.substring(0, 100) + '...');

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

    const result = await model.generateContent(prompt);
    if (!result || !result.response) {
      throw new Error('Invalid response from Gemini API');
    }
    
    const response = result.response;
    const text = response.text();

    console.log('[Chat] ✅ Response sent (' + text.length + ' chars)');

    res.json({ 
      response: text.trim(),
      usage: 'chat-response'
    });

  } catch (error) {
    console.error('[Chat] Error:', error);
    
    // Return proper error for AI_ERR handling
    return res.status(502).json({ error: 'AI_ERR' });
  }
}