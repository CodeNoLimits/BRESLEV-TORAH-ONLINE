import express from "express";
import { TextToSpeechClient } from "@google-cloud/text-to-speech";

const router = express.Router();

// Initialize Google Cloud TTS client
let client: TextToSpeechClient | null = null;

try {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    client = new TextToSpeechClient({
      credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
    });
  }
} catch (error) {
  console.error("[TTS] Failed to initialize Google Cloud TTS:", error);
}

router.post("/tts", async (req, res) => {
  try {
    const text = (req.body.text || "").slice(0, 5000);

    if (!text.trim()) {
      return res.status(400).json({ error: "Text is required" });
    }

    if (!client) {
      return res.status(500).json({ error: "TTS service not configured" });
    }

    const [response] = await client.synthesizeSpeech({
      input: { text },
      voice: {
        languageCode: "fr-FR",
        name: "fr-FR-Studio-D",
        ssmlGender: "MALE"
      },
      audioConfig: {
        audioEncoding: "MP3"
      }
    });

    res.type("audio/mpeg").send(response.audioContent);
  } catch (error) {
    console.error("[TTS] Error:", error);
    res.status(500).json({ error: "TTS synthesis failed" });
  }
});

export default router;