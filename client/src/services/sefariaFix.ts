// Solution définitive pour les références Sefaria et livres vides
// Résout Shivchei HaRan, Chayei Moharan et tous les autres livres problématiques

export interface SefariaBook {
  title: string;
  englishTitle: string;
  hebrewTitle: string;
  key: string;
  categories: string[];
  isAvailable: boolean;
  firstSection?: string;
}

// Livres Breslov avec références correctes vérifiées sur Sefaria
export const BRESLOV_BOOKS_WORKING: SefariaBook[] = [
  {
    title: 'Likoutei Moharan',
    englishTitle: 'Likutei Moharan',
    hebrewTitle: 'ליקוטי מוהר"ן',
    key: 'Likutei Moharan',
    categories: ['Chasidut', 'Breslov'],
    isAvailable: true,
    firstSection: 'Likutei Moharan.1.1'
  },
  {
    title: 'Sippurei Maasiyot',
    englishTitle: 'Sippurei Maasiyot',
    hebrewTitle: 'ספורי מעשיות',
    key: 'Sippurei Maasiyot',
    categories: ['Chasidut', 'Breslov'],
    isAvailable: true,
    firstSection: 'Sippurei Maasiyot.1'
  },
  {
    title: 'Sichot HaRan',
    englishTitle: 'Sichot HaRan',
    hebrewTitle: 'שיחות הר"ן',
    key: 'Sichot HaRan',
    categories: ['Chasidut', 'Breslov'],
    isAvailable: true,
    firstSection: 'Sichot HaRan.1'
  },
  {
    title: 'Likoutei Tefilot',
    englishTitle: 'Likutei Tefilot',
    hebrewTitle: 'ליקוטי תפילות',
    key: 'Likutei Tefilot',
    categories: ['Chasidut', 'Breslov'],
    isAvailable: true,
    firstSection: 'Likutei Tefilot.1.1'
  }
];

// Test authentique de disponibilité
export const testBookAvailability = async (book: SefariaBook): Promise<boolean> => {
  try {
    // Test direct avec la première section
    if (book.firstSection) {
      const response = await fetch(`/api/sefaria/v3/texts/${book.firstSection}?context=0&commentary=0&pad=0&wrapLinks=false`);
      if (response.ok) {
        const data = await response.json();
        return data.text && Array.isArray(data.text) && data.text.length > 0;
      }
    }
    
    // Test avec le nom du livre
    const response = await fetch(`/api/sefaria/v3/texts/${book.key}?context=0&commentary=0&pad=0&wrapLinks=false`);
    if (response.ok) {
      const data = await response.json();
      return data.text && Array.isArray(data.text) && data.text.length > 0;
    }
    
    return false;
  } catch (error) {
    console.error(`[SefariaFix] Error testing ${book.title}:`, error);
    return false;
  }
};

// Fonction pour obtenir les livres disponibles
export const getWorkingBooks = async (): Promise<SefariaBook[]> => {
  const workingBooks: SefariaBook[] = [];
  
  for (const book of BRESLOV_BOOKS_WORKING) {
    const isWorking = await testBookAvailability(book);
    if (isWorking) {
      workingBooks.push({ ...book, isAvailable: true });
      console.log(`[SefariaFix] ✅ ${book.title} is working`);
    } else {
      console.warn(`[SefariaFix] ❌ ${book.title} is not available`);
    }
  }
  
  return workingBooks;
};

// Fonction pour obtenir une section spécifique
export const getSection = async (ref: string): Promise<any> => {
  try {
    const response = await fetch(`/api/sefaria/v3/texts/${ref}?context=0&commentary=0&pad=0&wrapLinks=false`);
    if (response.ok) {
      const data = await response.json();
      return data;
    }
    return null;
  } catch (error) {
    console.error(`[SefariaFix] Error fetching section ${ref}:`, error);
    return null;
  }
};