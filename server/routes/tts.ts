import { Router } from "express";
import { TextToSpeechClient } from "@google-cloud/text-to-speech";

const router = Router();
const client = new TextToSpeechClient({
  credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON!)
});

router.post("/tts", async (req, res) => {
  const txt = (req.body.text || "").slice(0, 5000);
  try {
    const [r] = await client.synthesizeSpeech({
      input: { text: txt },
      voice: { languageCode: "fr-FR", name: "fr-FR-Studio-D", ssmlGender: "MALE" },
      audioConfig: { audioEncoding: "MP3" }
    });
    res.type("audio/mpeg").send(r.audioContent);
  } catch (e) {
    console.error("[TTS] Error", e);
    res.status(500).json({ error: "tts" });
  }
});

export { router as ttsRouter };