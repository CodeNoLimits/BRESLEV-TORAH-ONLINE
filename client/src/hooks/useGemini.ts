import { useState, useCallback, useRef } from "react";
import { geminiService } from "../services/gemini";
import { AIMode, Language } from "../types";
import { SYSTEM_INSTRUCTION } from "../constants/system-instruction";

interface UseGeminiOptions {
  language: Language;
  onResponse?: (text: string) => void;
  onError?: (error: string) => void;
}

export const useGemini = ({
  language,
  onResponse,
  onError,
}: UseGeminiOptions) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const formatPrompt = useCallback(
    (mode: AIMode, content: string, context?: string) => {
      const contextPart = context ? `[CONTEXTE PERTINENT]\n${context}\n\n` : "";

      switch (mode) {
        case "study":
          return `${contextPart}TEXTE COMPLET À ÉTUDIER: "${content}"\n---\n[INSTRUCTION STRICTE]\n1. TRADUIRE d'abord ce texte en français complet si nécessaire\n2. ANALYSER uniquement ce texte selon Rabbi Nahman de Breslev\n3. IGNORER tout autre sujet non lié à ce texte précis\n4. Format: **Traduction française:** [texte traduit] **Analyse spirituelle:** [analyse du texte]`;

        case "analyze":
          return `${contextPart}EXTRAIT SPÉCIFIQUE: "${content}"\n---\n[INSTRUCTION STRICTE]\n1. TRADUIRE en français si nécessaire\n2. ANALYSER uniquement cet extrait\n3. RESTER concentré sur ce passage uniquement`;

        case "counsel":
          return `${contextPart}SITUATION PERSONNELLE: "${content}"\n---\n[INSTRUCTION STRICTE]\nTrouver un conseil spirituel précis de Rabbi Nahman pour cette situation exacte. Répondre en français.`;

        case "summarize":
          return `${contextPart}TEXTE À RÉSUMER: "${content}"\n---\n[INSTRUCTION STRICTE]\nRésumer en 3-5 points clés en français maximum. Traduire d'abord si nécessaire.`;

        case "explore":
        default:
          return `QUESTION SPIRITUELLE: "${content}"\n---\n[INSTRUCTION STRICTE]\nRépondre uniquement avec les enseignements de Rabbi Nahman de Breslev. Réponse en français.`;
      }
    },
    [],
  );

  const sendMessage = useCallback(
    async (
      message: string,
      mode: AIMode = "explore",
      context?: string,
    ): Promise<string> => {
      if (isLoading) return "";

      setIsLoading(true);
      setIsStreaming(true);

      // Cancel any previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      try {
        const formattedPrompt = formatPrompt(mode, message, context);
        let fullResponse = "";

        await geminiService.generateContentStream({
          prompt: formattedPrompt,
          onChunk: (chunk: string) => {
            fullResponse += chunk;
            onResponse?.(fullResponse);
          },
          signal: abortControllerRef.current.signal,
        });

        return fullResponse;
      } catch (error: any) {
        if (error.name === "AbortError") {
          return "";
        }

        const errorMessage =
          error.message ||
          "Une erreur est survenue lors de la communication avec l'IA.";
        onError?.(errorMessage);
        throw error;
      } finally {
        setIsLoading(false);
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [isLoading, formatPrompt, onResponse, onError],
  );

  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return {
    sendMessage,
    cancelRequest,
    isLoading,
    isStreaming,
  };
};
