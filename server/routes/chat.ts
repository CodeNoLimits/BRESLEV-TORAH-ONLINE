import { Router } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";

const router = Router();
const model = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!).getGenerativeModel({ model: "gemini-pro" });

router.post("/chat", async (req, res) => {
  const { text, ref } = req.body as { text?: string; ref?: string };
  if (!text) return res.status(400).json({ error: "text" });
  try {
    const prompt = ref ? `CONTEXTE:\n${ref}\n\nQUESTION:\n${text}` : text;
    const result = await model.generateContent(prompt);
    const answer = result.response.text().trim();
    res.json({ answer });
  } catch (e) {
    console.error("[CHAT]", e);
    res.status(502).json({ error: "ai" });
  }
});

export { router as chatRouter };
