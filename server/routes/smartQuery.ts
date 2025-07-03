import express from "express";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { question } = req.body;
    
    if (!question || question.trim().length === 0) {
      return res.status(400).json({ error: "Question vide" });
    }

    console.log(`[SmartQuery] Question reçue: ${question}`);

    // ACCÈS DIRECT à vos 13 livres via localBooksProcessor
    try {
      const { localBooksProcessor } = await import('../services/localBooksProcessor.js');
      
      // RECHERCHE INTELLIGENTE dans vos livres Breslov
      console.log(`[SmartQuery] Recherche dans vos 13 livres Breslov...`);
      
      const relevantChunks = await localBooksProcessor.searchRelevantContent(question, 6);
      
      console.log(`[SmartQuery] ${relevantChunks.length} passages pertinents trouvés`);
      
      if (relevantChunks.length === 0) {
        // Fallback - du contenu général de vos livres
        const allBooks = localBooksProcessor.getAvailableBooks();
        console.log(`[SmartQuery] Aucun résultat - fallback sur vos ${allBooks.length} livres`);
        
        const randomBook = allBooks[Math.floor(Math.random() * allBooks.length)];
        const bookContent = await localBooksProcessor.getBookContent(randomBook);
        
        if (bookContent) {
          const chunk = bookContent.substring(0, 1200);
          relevantChunks.push(`${randomBook}: ${chunk}`);
        }
      }
      
      // CONSTRUCTION RÉPONSE AVEC VOS LIVRES
      let answer = `📚 **Voici ce que j'ai trouvé dans vos livres de Rabbi Nahman :**\n\n`;
      
      relevantChunks.forEach((chunk, index) => {
        const parts = chunk.split(': ');
        const bookTitle = parts[0] || 'Livre Breslov';
        const content = parts.slice(1).join(': ') || chunk;
        
        answer += `**${index + 1}. ${bookTitle}**\n`;
        answer += `${content.substring(0, 500)}...\n\n`;
        answer += `[Source: ${bookTitle}]\n\n---\n\n`;
      });
      
      answer += `✅ **${relevantChunks.length} passages authentiques de votre bibliothèque personnelle**`;
      
      res.json({ answer });
      
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