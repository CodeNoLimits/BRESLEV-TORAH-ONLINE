export const streamGemini = async (prompt: string, onChunk: (t:string)=>void) => {
  const res = await fetch('/gemini/chat', {
    method: 'POST', headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ prompt })
  });
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    onChunk(dec.decode(value, { stream: true }));
  }
};