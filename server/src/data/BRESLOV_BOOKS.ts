// Configuration des livres Breslov avec leurs limites
export const BRESLOV_BOOKS = {
  'Chayei Moharan': { maxSections: 23 },
  'Sefer HaMiddot': { maxSections: 31 },
  'Likutei Moharan': { maxSections: 286 },
  'Sichot HaRan': { maxSections: 307 },
  'Likutei Tefilot': { maxSections: 210 },
  'Sippurei Maasiyot': { maxSections: 13 },
  'Shivchei HaRan': { maxSections: 50 },
  'Alim LiTerufah': { maxSections: 40 },
  'Kitzur Likutei Moharan': { maxSections: 45 },
  'Likkutei Etzot': { maxSections: 200 }
};

export function validateSectionExists(book: string, section: number): boolean {
  const bookConfig = BRESLOV_BOOKS[book as keyof typeof BRESLOV_BOOKS];
  if (!bookConfig) return true; // Unknown book, allow
  return section <= bookConfig.maxSections;
}

export function getBookConfig(book: string) {
  return BRESLOV_BOOKS[book as keyof typeof BRESLOV_BOOKS];
}