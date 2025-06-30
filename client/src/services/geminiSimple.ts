// Fichier : client/src/services/geminiSimple.ts

export const streamGemini = async (
  prompt: string,
  onChunk: (chunk: string) => void,
) => {
  const response = await fetch("/gemini/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok || !response.body) {
    throw new Error("Failed to stream response from Gemini proxy");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    onChunk(decoder.decode(value, { stream: true }));
  }
};
