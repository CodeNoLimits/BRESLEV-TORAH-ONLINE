import express from "express";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { question } = req.body;
    
    if (!question || question.trim().length === 0) {
      return res.status(400).json({ error: "Question vide" });
    }

    console.log(`[SmartQuery] Question reçue: ${question}`);

    // REDIRECTION VERS CHAYEI MOHARAN UNIQUEMENT
    try {
      console.log(`[SmartQuery] Redirection vers Chayei Moharan pour: "${question}"`);
      
      // Faire la recherche via Chayei Moharan avec Gemini
      const chayeiResponse = await fetch('http://127.0.0.1:5000/api/chayei-moharan/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      });
      
      if (chayeiResponse.ok) {
        const chayeiData = await chayeiResponse.json();
        res.json({ answer: chayeiData.answer || "Aucune réponse trouvée dans Chayei Moharan." });
      } else {
        throw new Error('Erreur API Chayei Moharan');
      }
      
      
    } catch (booksError) {
      console.error('[SmartQuery] Erreur accès livres:', booksError);
      res.json({ 
        answer: `❌ Erreur lors de la recherche dans vos livres : ${booksError}` 
      });
    }
    
  } catch (error) {
    console.error('[SmartQuery] Erreur générale:', error);
    res.status(500).json({ 
      error: "Erreur lors de la recherche dans vos livres."
    });
  }
});

export default router;