export interface Reference {
  ref: string;
  title: string;
  book: string;
  section: number;
  hebrewTitle: string;
  category: string;
  verified: boolean;
}

// Book definitions with their section counts
const BOOKS = {
  'Sefer HaMiddot': {
    maxSections: 31,
    verified: true,
    hebrewTitle: 'ספר המידות',
    category: 'Sefer HaMiddot'
  },
  'Chayei Moharan': {
    maxSections: 14,
    verified: true,
    hebrewTitle: 'חיי מוהר"ן',
    category: 'Chayei Moharan'
  },
  'Likutei Moharan I': {
    maxSections: 282,
    verified: true,
    hebrewTitle: 'ליקוטי מוהר"ן א',
    category: 'Likutei Moharan'
  },
  'Likutei Moharan II': {
    maxSections: 125,
    verified: true,
    hebrewTitle: 'ליקוטי מוהר"ן ב',
    category: 'Likutei Moharan'
  },
  'Likutei Tefilot': {
    maxSections: 210,
    verified: false,
    hebrewTitle: 'ליקוטי תפילות',
    category: 'Likutei Tefilot'
  },
  'Sipurei Maasiyot': {
    maxSections: 13,
    verified: true,
    hebrewTitle: 'סיפורי מעשיות',
    category: 'Sipurei Maasiyot'
  },
  'Likutei Etzot': {
    maxSections: 150,
    verified: true,
    hebrewTitle: 'ליקוטי עצות',
    category: 'Likutei Etzot'
  },
  'Alim LiTrufa': {
    maxSections: 45,
    verified: true,
    hebrewTitle: 'עלים לתרופה',
    category: 'Alim LiTrufa'
  },
  'Kitzur Likutei Moharan': {
    maxSections: 407,
    verified: true,
    hebrewTitle: 'קיצור ליקוטי מוהר"ן',
    category: 'Kitzur Likutei Moharan'
  }
};

export function generateAllReferences(): Reference[] {
  const references: Reference[] = [];
  
  Object.entries(BOOKS).forEach(([bookTitle, bookData]) => {
    for (let section = 1; section <= bookData.maxSections; section++) {
      references.push({
        ref: `${bookTitle} ${section}`,
        title: `${bookTitle} ${section}`,
        book: bookTitle,
        section,
        hebrewTitle: bookData.hebrewTitle,
        category: bookData.category,
        verified: bookData.verified
      });
    }
  });
  
  return references;
}

export function getTotalReferenceCount(): number {
  return Object.values(BOOKS).reduce((total, book) => total + book.maxSections, 0);
}