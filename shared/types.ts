export interface BreslovBookConfig {
  maxSections: number;
  verified: boolean;
  baseRef: string;
  hebrewTitle: string;
  category: string;
}

export interface SefariaBook {
  title: string;
  englishTitle: string;
  hebrewTitle: string;
  key: string;
  categories: string[];
  isAvailable: boolean;
  firstSection?: string;
  // Properties from BreslovBookConfig
  maxSections: number;
  verified: boolean;
  baseRef: string;
  category: string;
}