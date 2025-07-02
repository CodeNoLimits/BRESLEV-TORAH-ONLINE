export const BRESLOV_BOOKS = {
  'Chayei Moharan': { maxSections: 14, verified: true, baseRef: 'Chayei Moharan', hebrewTitle: 'חיי מוהר״ן', category: 'Breslov' },
  'Sefer HaMiddot': { maxSections: 31, verified: true, baseRef: 'Sefer HaMiddot', hebrewTitle: 'ספר המידות', category: 'Breslov' },
  'Likutei Moharan': { maxSections: 286, verified: true, baseRef: 'Likutei Moharan', hebrewTitle: 'ליקוטי מוהר״ן', category: 'Breslov' },
  'Sichot HaRan': { maxSections: 307, verified: true, baseRef: 'Sichot HaRan', hebrewTitle: 'שיחות הר״ן', category: 'Breslov' },
  'Likutei Tefilot': { maxSections: 210, verified: true, baseRef: 'Likutei Tefilot', hebrewTitle: 'ליקוטי תפילות', category: 'Breslov' },
  'Sippurei Maasiyot': { maxSections: 13, verified: true, baseRef: 'Sippurei Maasiyot', hebrewTitle: 'סיפורי מעשיות', category: 'Breslov' },
  'Shivchei HaRan': { maxSections: 50, verified: true, baseRef: 'Shivchei HaRan', hebrewTitle: 'שבחי הר״ן', category: 'Breslov' },
  'Alim LiTerufah': { maxSections: 40, verified: true, baseRef: 'Alim LiTerufah', hebrewTitle: 'עלים לתרופה', category: 'Breslov' },
  'Kitzur Likutei Moharan': { maxSections: 45, verified: true, baseRef: 'Kitzur Likutei Moharan', hebrewTitle: 'קיצור ליקוטי מוהר״ן', category: 'Breslov' },
  'Likkutei Etzot': { maxSections: 200, verified: true, baseRef: 'Likkutei Etzot', hebrewTitle: 'ליקוטי עצות', category: 'Breslov' }
};

export function validateSectionExists(book: string, section: number): boolean {
  const bookConfig = BRESLOV_BOOKS[book as keyof typeof BRESLOV_BOOKS];
  if (!bookConfig) return true; // Unknown book, allow
  return section <= bookConfig.maxSections;
}

export function getBookConfig(book: string) {
  return BRESLOV_BOOKS[book as keyof typeof BRESLOV_BOOKS];
}