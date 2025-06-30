export type Language = "fr" | "en" | "he";

export type Sender = "user" | "ai";

export interface Message {
  id: string;
  text: string;
  sender: Sender;
  timestamp: Date;
  isSafetyMessage?: boolean;
}

export interface SefariaText {
  ref: string;
  book: string;
  text: string[];
  he: string[];
  title: string;
}

export interface SefariaIndexNode {
  title: string;
  ref?: string;
  contents?: SefariaIndexNode[];
  nodes?: SefariaIndexNode[];
  schema?: {
    nodes?: SefariaIndexNode[];
  };
  category?: string;
}

export interface SefariaCategory {
  category: string;
  contents?: SefariaIndexNode[];
}

export type InteractionMode = "chat" | "analysis" | "guidance";

export type AIMode =
  | "study" // Mode 1: Deep study analysis
  | "explore" // Mode 2: General exploration
  | "analyze" // Mode 3: Text analysis
  | "counsel" // Mode 4: Personal guidance
  | "summarize"; // Mode 5: Key points summary

// Extend window for Web Speech API
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}
