// Fichier : client/src/services/geminiSimple.ts

export const streamGemini = async (prompt: string, onChunk: (chunk: string) => void) => {
  const response = await fetch('/api/gemini/quick', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });

  if (!response.ok) {
    throw new Error('Failed to get response from Gemini API');
  }

  const data = await response.json();
  if (data.response) {
    onChunk(data.response);
  } else {
    throw new Error('No response received from AI');
  }
};