import { useState, useCallback, useRef } from 'react';
import { geminiService } from '../services/gemini';
import { AIMode, Language } from '../types';
import { SYSTEM_INSTRUCTION } from '../constants/system-instruction';

interface UseGeminiOptions {
  language: Language;
  onResponse?: (text: string) => void;
  onError?: (error: string) => void;
}

export const useGemini = ({ language, onResponse, onError }: UseGeminiOptions) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const formatPrompt = useCallback((mode: AIMode, content: string, context?: string) => {
    const contextPart = context ? `[CONTEXTE PERTINENT]\n${context}\n\n` : '';
    
    switch (mode) {
      case 'study':
        return `${contextPart}TEXTE COMPLET: "${content}"\n---\n[INSTRUCTION]\nAnalyse en profondeur ce texte selon les enseignements de Rabbi Nahman de Breslev.`;
      
      case 'analyze':
        return `${contextPart}EXTRAIT DE L'UTILISATEUR: "${content}"\n---\n[INSTRUCTION]\nConcentre-toi uniquement sur l'extrait et analyse-le en détail.`;
      
      case 'counsel':
        return `${contextPart}SITUATION DE L'UTILISATEUR: "${content}"\n---\n[INSTRUCTION]\nTrouve un conseil pertinent tiré des enseignements de Rabbi Nahman pour cette situation.`;
      
      case 'summarize':
        return `${contextPart}TEXTE À RÉSUMER: "${content}"\n---\n[INSTRUCTION]\nRésume le texte suivant en 3-5 points clés maximum.`;
      
      case 'explore':
      default:
        return content;
    }
  }, []);

  const sendMessage = useCallback(async (
    message: string, 
    mode: AIMode = 'explore',
    context?: string
  ): Promise<string> => {
    if (isLoading) return '';

    setIsLoading(true);
    setIsStreaming(true);

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      const formattedPrompt = formatPrompt(mode, message, context);
      let fullResponse = '';

      await geminiService.generateContentStream({
        prompt: formattedPrompt,
        onChunk: (chunk: string) => {
          fullResponse += chunk;
          onResponse?.(fullResponse);
        },
        signal: abortControllerRef.current.signal
      });

      return fullResponse;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return '';
      }
      
      const errorMessage = error.message || 'Une erreur est survenue lors de la communication avec l\'IA.';
      onError?.(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [isLoading, formatPrompt, onResponse, onError]);

  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return {
    sendMessage,
    cancelRequest,
    isLoading,
    isStreaming
  };
};
