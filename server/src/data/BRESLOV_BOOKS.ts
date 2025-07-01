export interface BreslovBookConfig {
  title: string;
  baseRef: string;
  maxSections: number;
  verified: boolean;
  hebrewTitle: string;
  category: string;
}

export const BRESLOV_BOOKS: BreslovBookConfig[] = [
  {
    title: "Likutei Moharan",
    baseRef: "Likutei Moharan",
    maxSections: 286,
    verified: true,
    hebrewTitle: "ליקוטי מוהר\"ן",
    category: "Likutei Moharan"
  },
  {
    title: "Likutei Moharan Tinyana",
    baseRef: "Likutei Moharan, Part II", 
    maxSections: 125,
    verified: true,
    hebrewTitle: "ליקוטי מוהר\"ן תניינא",
    category: "Likutei Moharan Tinyana"
  },
  {
    title: "Sichot HaRan",
    baseRef: "Sichot HaRan",
    maxSections: 307,
    verified: true,
    hebrewTitle: "שיחות הר\"ן",
    category: "Sichot HaRan"
  },
  {
    title: "Sippurei Maasiyot",
    baseRef: "Sippurei Maasiyot",
    maxSections: 14,
    verified: true,
    hebrewTitle: "סיפורי מעשיות",
    category: "Sippurei Maasiyot"
  },
  {
    title: "Sefer HaMiddot",
    baseRef: "Sefer HaMiddot",
    maxSections: 31, // Fixed: was incorrectly higher, causing 404s for sections 32-34
    verified: true,
    hebrewTitle: "ספר המידות",
    category: "Sefer HaMiddot"
  },
  {
    title: "Chayei Moharan",
    baseRef: "Chayei Moharan",
    maxSections: 14, // Fixed: was incorrectly higher, causing 404s
    verified: true,
    hebrewTitle: "חיי מוהר\"ן",
    category: "Chayei Moharan"
  },
  {
    title: "Likutei Tefilot",
    baseRef: "Likutei Tefilot",
    maxSections: 210,
    verified: false, // Not fully available on Sefaria
    hebrewTitle: "ליקוטי תפילות",
    category: "Likutei Tefilot"
  },
  {
    title: "Likutei Halakhot",
    baseRef: "Likutei Halakhot",
    maxSections: 95,
    verified: true,
    hebrewTitle: "ליקוטי הלכות",
    category: "Likutei Halakhot"
  },
  {
    title: "Kitzur Likutei Moharan",
    baseRef: "Kitzur Likutei Moharan",
    maxSections: 45,
    verified: true,
    hebrewTitle: "קיצור ליקוטי מוהר\"ן",
    category: "Kitzur Likutei Moharan"
  },
  {
    title: "Likutei Etzot",
    baseRef: "Likutei Etzot",
    maxSections: 89,
    verified: true,
    hebrewTitle: "ליקוטי עצות",
    category: "Likutei Etzot"
  }
];

export function validateSectionExists(bookTitle: string, sectionNumber: number): boolean {
  const book = BRESLOV_BOOKS.find(b => b.title === bookTitle || b.baseRef === bookTitle);
  if (!book) return false;
  
  return sectionNumber > 0 && sectionNumber <= book.maxSections;
}

export function getBookConfig(bookTitle: string): BreslovBookConfig | null {
  return BRESLOV_BOOKS.find(b => b.title === bookTitle || b.baseRef === bookTitle) || null;
}