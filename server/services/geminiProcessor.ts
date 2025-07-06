import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';

// Initialisation Gemini avec gestion d'erreur robuste
let genAI: GoogleGenerativeAI | null = null;

const initializeGemini = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    console.error('⚠️ GEMINI_API_KEY non configurée ou invalide');
    console.error('👉 Configurez votre clé API Gemini dans les variables d\'environnement');
    return false;
  }

  try {
    genAI = new GoogleGenerativeAI(apiKey);
    console.log('✅ Gemini AI initialisé avec succès');
    return true;
  } catch (error) {
    console.error('❌ Erreur initialisation Gemini:', error);
    return false;
  }
};

// Initialiser au démarrage
const isGeminiInitialized = initializeGemini();

interface BookContent {
  title: string;
  content: string;
  language: 'fr' | 'he';
  sections: Array<{
    id: string;
    title: string;
    content: string;
    lineNumbers: [number, number];
  }>;
}

// Cache pour éviter de recharger les livres
const bookCache = new Map<string, BookContent>();

// Charger le contenu d'un livre
export const loadBookContent = async (bookId: string): Promise<BookContent> => {
  // Vérifier le cache
  if (bookCache.has(bookId)) {
    return bookCache.get(bookId)!;
  }

  try {
    let filePath: string;
    let language: 'fr' | 'he' = 'fr';

    // Mapper les IDs de livres vers les fichiers
    switch (bookId) {
      case 'chayei-moharan':
        filePath = path.join(process.cwd(), 'assets', 'CHAYE MOHARAN FR_1751542665093.docx.txt');
        language = 'fr';
        break;
      case 'likutei-moharan':
        filePath = path.join(process.cwd(), 'assets', 'likutei_moharan_1.txt');
        language = 'he';
        break;
      case 'sippurei-maasiyot':
        filePath = path.join(process.cwd(), 'assets', 'sippurei_maasiyot.txt');
        language = 'he';
        break;
      default:
        throw new Error(`Livre non trouvé: ${bookId}`);
    }

    // Lire le fichier
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Traiter le contenu en sections
    const sections = processBookIntoSections(content, language);
    
    const bookContent: BookContent = {
      title: getBookTitle(bookId),
      content,
      language,
      sections
    };

    // Mettre en cache
    bookCache.set(bookId, bookContent);
    console.log(`📚 Livre chargé: ${bookId} (${sections.length} sections, ${content.length} caractères)`);
    
    return bookContent;
    
  } catch (error) {
    console.error(`❌ Erreur chargement livre ${bookId}:`, error);
    throw new Error(`Impossible de charger le livre: ${bookId}`);
  }
};

// Traitement du contenu en sections
const processBookIntoSections = (content: string, language: 'fr' | 'he') => {
  const lines = content.split('\n');
  const sections: BookContent['sections'] = [];
  
  let currentSection = {
    id: '',
    title: '',
    content: '',
    lineNumbers: [0, 0] as [number, number]
  };
  
  let sectionCount = 0;
  let lineCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    lineCount++;

    // Détecter les titres de section (selon la langue)
    const isSectionTitle = language === 'fr' 
      ? /^(Chapitre|Section|Partie|\d+\.|\d+\))/i.test(line)
      : /^(פרק|חלק|סימן|\d+\.|\d+\))/i.test(line);

    if (isSectionTitle && line.length > 3) {
      // Sauvegarder la section précédente
      if (currentSection.content.trim()) {
        currentSection.lineNumbers[1] = lineCount - 1;
        sections.push({ ...currentSection });
      }

      // Commencer une nouvelle section
      sectionCount++;
      currentSection = {
        id: `section-${sectionCount}`,
        title: line,
        content: '',
        lineNumbers: [lineCount, lineCount]
      };
    } else if (line.length > 0) {
      // Ajouter le contenu à la section actuelle
      currentSection.content += line + '\n';
    }
  }

  // Ajouter la dernière section
  if (currentSection.content.trim()) {
    currentSection.lineNumbers[1] = lineCount;
    sections.push(currentSection);
  }

  return sections;
};

// Obtenir le titre du livre
const getBookTitle = (bookId: string): string => {
  const titles = {
    'chayei-moharan': 'Chayei Moharan - Vie de Rabbi Nahman',
    'likutei-moharan': 'Likutei Moharan - Enseignements de Rabbi Nahman',
    'sippurei-maasiyot': 'Sippurei Maasiyot - Contes de Rabbi Nahman'
  };
  return titles[bookId as keyof typeof titles] || bookId;
};

// Recherche intelligente dans le contenu
const findRelevantSections = (query: string, bookContent: BookContent, maxSections = 5) => {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);
  
  // Score de pertinence pour chaque section
  const sectionScores = bookContent.sections.map(section => {
    const sectionText = (section.title + ' ' + section.content).toLowerCase();
    
    let score = 0;
    queryWords.forEach(word => {
      const matches = (sectionText.match(new RegExp(word, 'g')) || []).length;
      score += matches;
      
      // Bonus si le mot est dans le titre
      if (section.title.toLowerCase().includes(word)) {
        score += 3;
      }
    });
    
    return { section, score };
  });
  
  // Retourner les sections les plus pertinentes
  return sectionScores
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSections)
    .map(item => item.section);
};

// Fonction principale de traitement des requêtes
export const processBookQuery = async (
  query: string, 
  bookId: string = 'chayei-moharan'
): Promise<{
  response: string;
  sources: Array<{
    title: string;
    content: string;
    lineNumbers: [number, number];
  }>;
}> => {
  
  if (!genAI) {
    console.error('❌ Gemini AI non initialisé');
    return {
      response: "Désolé, le service d'intelligence artificielle n'est pas disponible pour le moment. Veuillez vérifier la configuration de l'API Gemini dans les variables d'environnement.",
      sources: []
    };
  }

  try {
    // Charger le contenu du livre
    const bookContent = await loadBookContent(bookId);
    
    // Trouver les sections pertinentes
    const relevantSections = findRelevantSections(query, bookContent, 8);
    
    if (relevantSections.length === 0) {
      return {
        response: "Je n'ai pas trouvé d'information pertinente dans le livre pour répondre à votre question. Pourriez-vous reformuler ou poser une question différente ?",
        sources: []
      };
    }

    // Préparer le contexte pour Gemini
    const contextText = relevantSections
      .map(section => `[${section.title}]\n${section.content}`)
      .join('\n\n---\n\n');

    // Prompt optimisé pour des réponses conversationnelles et précises
    const prompt = `Tu es un assistant spirituel expert des enseignements de Rabbi Nahman de Breslev.

CONTEXTE DU LIVRE (${bookContent.title}):
${contextText}

QUESTION DE L'UTILISATEUR: ${query}

INSTRUCTIONS STRICTES:
1. Réponds de manière conversationnelle et directe - pas trop poétique
2. Base-toi UNIQUEMENT sur le contexte fourni ci-dessus
3. Cite les passages pertinents en français avec les titres des sections
4. Si tu mentionnes des lieux comme "Lemberg", précise le contexte exact du passage
5. Sois précis et factuel, évite les formulations trop lyriques
6. Structure ta réponse en paragraphes courts et clairs
7. Si une information n'est pas dans le contexte, dis-le clairement

RÉPONSE:`;

    // Appel à Gemini
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-pro',
      generationConfig: {
        temperature: 0.3, // Réponses plus précises
        maxOutputTokens: 1000,
      }
    });

    console.log('🤖 Envoi de la requête à Gemini...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const aiResponse = response.text();

    console.log('✅ Réponse Gemini reçue:', aiResponse.substring(0, 100) + '...');

    // Formater les sources
    const sources = relevantSections.map(section => ({
      title: section.title,
      content: section.content.substring(0, 500) + (section.content.length > 500 ? '...' : ''),
      lineNumbers: section.lineNumbers
    }));

    return {
      response: aiResponse,
      sources
    };

  } catch (error) {
    console.error('❌ Erreur processBookQuery:', error);
    
    // Gestion d'erreur avec message utilisateur
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    
    return {
      response: `Désolé, j'ai rencontré une erreur technique: ${errorMessage}. Veuillez réessayer dans quelques instants.`,
      sources: []
    };
  }
};

// Fonction de traduction pour les livres hébreux (à implémenter plus tard)
export const translateHebrewText = async (hebrewText: string): Promise<string> => {
  if (!genAI) {
    throw new Error('Gemini AI non initialisé');
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    
    const prompt = `Traduis ce texte hébreu en français de manière naturelle et fidèle:

TEXTE HÉBREU:
${hebrewText}

TRADUCTION FRANÇAISE:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
    
  } catch (error) {
    console.error('❌ Erreur traduction:', error);
    return `[Erreur de traduction: ${hebrewText.substring(0, 50)}...]`;
  }
};

// Test de santé de l'API avec retry
export const testGeminiConnection = async (): Promise<boolean> => {
  if (!genAI || !isGeminiInitialized) {
    console.log('🔍 Gemini non initialisé, tentative de réinitialisation...');
    if (!initializeGemini()) {
      return false;
    }
  }

  try {
    const model = genAI!.getGenerativeModel({ model: 'gemini-1.5-pro' });
    const result = await model.generateContent('Test de connexion - réponds simplement "OK"');
    const response = await result.response;
    return response.text().includes('OK');
  } catch (error) {
    console.error('❌ Test connexion Gemini échoué:', error);
    return false;
  }
};