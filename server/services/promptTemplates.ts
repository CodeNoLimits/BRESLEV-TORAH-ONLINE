interface SearchResult {
  content: string;
  hebrewContent?: string;
  source: {
    book: string;
    chapter: string;
    section: string;
    reference: string;
  };
  score: number;
  metadata?: any;
}

export class PromptTemplates {
  static createRAGPrompt(question: string, context: SearchResult[]): string {
    const contextText = context.map(result => 
      `[${result.source.reference}]\n${result.content}${result.hebrewContent ? `\n(Hébreu: ${result.hebrewContent})` : ''}\n---`
    ).join('\n');

    return `Tu es un érudit spécialisé dans les enseignements de Rabbi Nahman de Breslov. Tu reçois des passages en hébreu authentiques de ses œuvres.

MISSION:
1. TRADUIS et EXPLIQUE les passages hébreux fournis ci-dessous
2. Chaque explication DOIT inclure la source: [Nom du livre Chapitre:Section]
3. Relie ces enseignements à la question posée

FORMAT REQUIS:
- Traduction/paraphrase du passage hébreu
- [Source exacte]
- Explication spirituelle du message
- Application pratique pour la question

Si les passages ne répondent pas à la question, cite au moins 2-3 passages traduits avec leurs sources et explique pourquoi ils sont pertinents.

PASSAGES HÉBREUX AUTHENTIQUES:
${contextText}

QUESTION: ${question}

RÉPONSE (en français, avec traductions et sources obligatoires):`;
  }

  static createFallbackPrompt(question: string, partialContext?: string): string {
    return `Tu es un guide spirituel basé sur les enseignements de Rabbi Nahman de Breslov.

CONTEXTE PARTIEL TROUVÉ:
${partialContext || 'Aucun passage spécifique trouvé dans les textes fournis.'}

Pour la question: "${question}"

Fournis une réponse générale sur les enseignements de Rabbi Nahman, en précisant clairement au début:
"⚠️ Cette réponse est basée sur la connaissance générale des enseignements de Rabbi Nahman, car aucun passage spécifique n'a été trouvé dans les textes fournis."

Garde un ton respectueux et spirituel, en 3-4 paragraphes maximum.

RÉPONSE:`;
  }

  static createValidationPrompt(response: string): string {
    return `Vérifie cette réponse et assure-toi qu'elle respecte les règles:
1. Contient des sources entre crochets [Livre Chapitre:Section] OU dit explicitement "aucun passage trouvé"
2. Pas de bloc "Contexte" ou "Points-clés"
3. Citations directes des textes

Réponds uniquement par la réponse corrigée:

${response}`;
  }
}