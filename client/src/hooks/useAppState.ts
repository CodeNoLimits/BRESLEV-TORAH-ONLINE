import { useReducer, useCallback } from "react";
import { Language } from "../types";

// Types pour la gestion d'état robuste
export interface AppState {
  status: "idle" | "loading-text" | "streaming-response" | "error";
  selectedText: any | null;
  responseText: string;
  streamingText: string;
  error: string | null;
  language: Language;
  ttsEnabled: boolean;
}

export type AppAction =
  | { type: "START_LOADING_TEXT" }
  | { type: "TEXT_LOADED"; payload: any }
  | { type: "START_STREAMING" }
  | { type: "STREAM_CHUNK"; payload: string }
  | { type: "STREAM_COMPLETE" }
  | { type: "ERROR"; payload: string }
  | { type: "CLEAR_ERROR" }
  | { type: "RESET" }
  | { type: "SET_LANGUAGE"; payload: Language }
  | { type: "TOGGLE_TTS" };

// État initial
const initialState: AppState = {
  status: "idle",
  selectedText: null,
  responseText: "",
  streamingText: "",
  error: null,
  language: "fr",
  ttsEnabled: true,
};

// Reducer pour gestion d'état cohérente
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "START_LOADING_TEXT":
      return {
        ...state,
        status: "loading-text",
        error: null,
        responseText: "",
        streamingText: "",
      };

    case "TEXT_LOADED":
      return {
        ...state,
        status: "idle",
        selectedText: action.payload,
        error: null,
      };

    case "START_STREAMING":
      return {
        ...state,
        status: "streaming-response",
        error: null,
        responseText: "",
        streamingText: "",
      };

    case "STREAM_CHUNK":
      return {
        ...state,
        streamingText: state.streamingText + action.payload,
      };

    case "STREAM_COMPLETE":
      return {
        ...state,
        status: "idle",
        responseText: state.streamingText,
        streamingText: "",
      };

    case "ERROR":
      return {
        ...state,
        status: "error",
        error: action.payload,
        streamingText: "",
      };

    case "CLEAR_ERROR":
      return {
        ...state,
        status: "idle",
        error: null,
      };

    case "RESET":
      return {
        ...initialState,
        language: state.language,
        ttsEnabled: state.ttsEnabled,
      };

    case "SET_LANGUAGE":
      return {
        ...state,
        language: action.payload,
      };

    case "TOGGLE_TTS":
      return {
        ...state,
        ttsEnabled: !state.ttsEnabled,
      };

    default:
      return state;
  }
}

// Hook personnalisé pour la gestion d'état
export const useAppState = () => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Actions encapsulées
  const actions = {
    startLoadingText: useCallback(() => {
      dispatch({ type: "START_LOADING_TEXT" });
    }, []),

    textLoaded: useCallback((text: any) => {
      dispatch({ type: "TEXT_LOADED", payload: text });
    }, []),

    startStreaming: useCallback(() => {
      dispatch({ type: "START_STREAMING" });
    }, []),

    addStreamChunk: useCallback((chunk: string) => {
      dispatch({ type: "STREAM_CHUNK", payload: chunk });
    }, []),

    completeStream: useCallback(() => {
      dispatch({ type: "STREAM_COMPLETE" });
    }, []),

    setError: useCallback((error: string) => {
      dispatch({ type: "ERROR", payload: error });
    }, []),

    clearError: useCallback(() => {
      dispatch({ type: "CLEAR_ERROR" });
    }, []),

    reset: useCallback(() => {
      dispatch({ type: "RESET" });
    }, []),

    setLanguage: useCallback((language: Language) => {
      dispatch({ type: "SET_LANGUAGE", payload: language });
    }, []),

    toggleTTS: useCallback(() => {
      dispatch({ type: "TOGGLE_TTS" });
    }, []),
  };

  // Computed values pour l'interface
  const computed = {
    isLoading: state.status === "loading-text",
    isStreaming: state.status === "streaming-response",
    hasError: state.status === "error",
    currentText:
      state.status === "streaming-response"
        ? state.streamingText
        : state.responseText,
    canInteract: state.status === "idle",
  };

  return {
    state,
    actions,
    computed,
  };
};
