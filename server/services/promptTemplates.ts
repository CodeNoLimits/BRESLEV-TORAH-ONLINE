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

    if (!context || context.length === 0) {
      return `❗ AUCUN PASSAGE TROUVÉ dans les textes de Rabbi Nahman fournis.

La question "${question}" ne trouve pas de correspondance dans les livres suivants :
- Likutei Moharan Kama (2864 passages)
- Hishtapchut HaNefesh (1149 passages) 
- Chayei Moharan (1428 passages)
- Yemei Moharnat (988 passages)
- Likutei Etzot (230 passages)
- Likutei Moharan Tinyana (250 passages)

Reformulez votre question avec des termes plus spécifiques aux enseignements de Rabbi Nahman.`;
    }

    return `INSTRUCTIONS STRICTES : Tu DOIS répondre UNIQUEMENT avec les passages hébreux fournis ci-dessous de Rabbi Nahman de Breslov.

RÈGLES ABSOLUES :
1. CITE le texte hébreu exact puis traduis-le
2. Ajoute OBLIGATOIREMENT [${context[0].source.reference}] après chaque citation
3. Si aucun passage ne répond EXACTEMENT à la question, réponds : "❗ Aucun passage pertinent trouvé"
4. JAMAIS de connaissance générale - SEULEMENT ces passages

PASSAGES AUTHENTIQUES DE RABBI NAHMAN :
${contextText}

QUESTION : ${question}

RÉPONSE (FORMAT OBLIGATOIRE: Citation hébraïque → Traduction → [Source] → Explication) :`;
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