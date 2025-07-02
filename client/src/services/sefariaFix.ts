// Solution définitive pour les références Sefaria et livres vides
// Résout Shivchei HaRan, Chayei Moharan et tous les autres livres problématiques

import { BRESLOV_BOOKS } from '@shared/data/BRESLOV_BOOKS';
import { SefariaBook, BreslovBookConfig } from '@shared/types';

// Test authentique de disponibilité
export const testBookAvailability = async (book: BreslovBookConfig): Promise<boolean> => {
  try {
    // Test direct avec la première section
    if (book.baseRef) {
      const response = await fetch(`/api/sefaria/v3/texts/${book.baseRef}.1?context=0&commentary=0&pad=0&wrapLinks=false`);
      if (response.ok) {
        const data = await response.json();
        return data.text && Array.isArray(data.text) && data.text.length > 0;
      }
    }
    
    // Test avec le nom du livre
    const response = await fetch(`/api/sefaria/v3/texts/${book.baseRef}?context=0&commentary=0&pad=0&wrapLinks=false`);
    if (response.ok) {
      const data = await response.json();
      return data.text && Array.isArray(data.text) && data.text.length > 0;
    }
    
    return false;
  } catch (error) {
    console.error(`[SefariaFix] Error testing ${book.baseRef}:`, error);
    return false;
  }
};

// Fonction pour obtenir les livres disponibles
export const getWorkingBooks = async (): Promise<SefariaBook[]> => {
  const workingBooks: SefariaBook[] = [];
  
  for (const book of Object.values(BRESLOV_BOOKS)) {
    const isWorking = await testBookAvailability(book);
    if (isWorking) {
      workingBooks.push({
        title: book.baseRef,
        englishTitle: book.baseRef,
        hebrewTitle: book.hebrewTitle,
        key: book.baseRef,
        categories: [book.category],
        isAvailable: true,
        maxSections: book.maxSections,
        baseRef: book.baseRef,
        verified: book.verified,
        category: book.category
      });
      console.log(`[SefariaFix] ✅ ${book.baseRef} is working`);
    } else {
      console.warn(`[SefariaFix] ❌ ${book.baseRef} is not available`);
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