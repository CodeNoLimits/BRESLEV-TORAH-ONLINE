export class ResponseFilter {
  static filterBlueSections(response: string): string {
    if (!response) return '';
    
    // Patterns à éliminer complètement
    const patternsToRemove = [
      /\*\*Contexte[^]*?\*\*/gi,
      /\*\*Points[^]*?\*\*/gi,
      /\*\*Points-clés[^]*?\*\*/gi,
      /\*\*POINTS CLÉS DU TEXTE[^]*?\*\*/gi,
      /\*\*POINTS CLÉS[^]*?\*\*/gi,
      /```[\s\S]*?```/g, // Blocs de code potentiels
      /<div[^>]*class="[^"]*context[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
      /---\s*Contexte[\s\S]*?---/gi,
      /## Contexte[\s\S]*?(?=##|$)/gi,
      /### Points[\s\S]*?(?=###|##|$)/gi,
      // Patterns spécifiques aux réponses IA
      /\*\*En résumé[\s\S]*?(?=\*\*|$)/gi,
      /\*\*Points principaux[\s\S]*?(?=\*\*|$)/gi
    ];

    let filtered = response;
    patternsToRemove.forEach(pattern => {
      filtered = filtered.replace(pattern, '');
    });

    // Nettoyage des lignes vides multiples
    filtered = filtered.replace(/\n{3,}/g, '\n\n');
    
    // Suppression des puces orphelines
    filtered = filtered.replace(/^\s*[-*]\s*$/gm, '');
    
    return filtered.trim();
  }

  static ensureCitationFormat(response: string, sources: any[]): string {
    if (!response) return "❗ Aucune réponse générée.";
    
    // Si pas de sources ET pas de message "aucun passage trouvé"
    if (sources.length === 0 && !response.includes('aucun passage') && !response.includes('n\'ai pas trouvé')) {
      return "❗ Je n'ai pas trouvé de passage pertinent dans les textes fournis.";
    }

    // S'assurer que la réponse contient des références entre crochets si on a des sources
    if (sources.length > 0) {
      const hasReferences = /\[[^\]]+\]/.test(response);
      if (!hasReferences) {
        // Ajouter les références si manquantes
        const sourceRefs = sources.map(s => `[${s.book} ${s.chapter}:${s.section}]`).join(', ');
        response = `${response}\n\n**Sources consultées:** ${sourceRefs}`;
      }
    }

    return response;
  }

  static validateResponse(response: string): {
    isValid: boolean,
    issues: string[],
    correctedResponse?: string
  } {
    const issues: string[] = [];
    
    // Vérifier la présence de blocs interdits
    if (response.includes('**Contexte') || response.includes('**Points')) {
      issues.push('Contient des sections interdites (Contexte/Points)');
    }
    
    // Vérifier la présence de sources ou d'avertissement
    const hasSources = /\[[^\]]+\]/.test(response);
    const hasNoResultMessage = response.includes('aucun passage') || response.includes('n\'ai pas trouvé');
    
    if (!hasSources && !hasNoResultMessage) {
      issues.push('Manque de sources ou message "aucun passage trouvé"');
    }
    
    const isValid = issues.length === 0;
    let correctedResponse = response;
    
    if (!isValid) {
      correctedResponse = this.filterBlueSections(response);
      if (!hasSources && !hasNoResultMessage) {
        correctedResponse = "❗ Je n'ai pas trouvé de passage pertinent dans les textes fournis.";
      }
    }
    
    return {
      isValid,
      issues,
      correctedResponse: isValid ? undefined : correctedResponse
    };
  }
}