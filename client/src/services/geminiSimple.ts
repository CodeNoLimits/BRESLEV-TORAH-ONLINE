// Fichier : client/src/services/geminiSimple.ts

export const streamGemini = async (prompt: string, onChunk: (chunk: string) => void) => {
  try {
    console.log('[GeminiSimple] Sending request to /api/gemini/quick');
    
    const response = await fetch('/api/gemini/quick', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });

    console.log('[GeminiSimple] Response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[GeminiSimple] API Error:', response.status, errorData);
      
      if (response.status === 502 && errorData.error === 'AI_ERR') {
        throw new Error('AI_ERR');
      }
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    console.log('[GeminiSimple] Response received:', data.response?.substring(0, 100) + '...');
    
    if (data.response) {
      onChunk(data.response);
    } else {
      console.error('[GeminiSimple] No response in data:', data);
      throw new Error('No response received from AI');
    }
  } catch (error) {
    console.error('[GeminiSimple] Full error:', error);
    throw error;
  }
};