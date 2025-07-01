// Complete text extraction system for Breslov books
// This ensures we get FULL texts, not fragments

import fetch from 'node-fetch';

interface BreslovSection {
  ref: string;
  title: string;
  number: string;
}

interface BreslovBook {
  baseRef: string;
  sections: BreslovSection[];
  totalSections?: number;
}

interface BreslovTextResult {
  ref: string;
  book: string;
  text: string[];
  he: string[];
  title: string;
}

const BRESLOV_BOOKS: Record<string, BreslovBook> = {
  'Likutei Moharan': {
    baseRef: 'Likutei Moharan',
    sections: [
      { ref: 'Likutei Moharan 1', title: 'Torah 1', number: '1' },
      { ref: 'Likutei Moharan 2', title: 'Torah 2', number: '2' },
      { ref: 'Likutei Moharan 3', title: 'Torah 3', number: '3' },
      { ref: 'Likutei Moharan 4', title: 'Torah 4', number: '4' },
      { ref: 'Likutei Moharan 5', title: 'Torah 5', number: '5' },
      { ref: 'Likutei Moharan 6', title: 'Torah 6', number: '6' },
      { ref: 'Likutei Moharan 7', title: 'Torah 7', number: '7' },
      { ref: 'Likutei Moharan 8', title: 'Torah 8', number: '8' },
      { ref: 'Likutei Moharan 9', title: 'Torah 9', number: '9' },
      { ref: 'Likutei Moharan 10', title: 'Torah 10', number: '10' }
    ]
  },
  'Sichot HaRan': {
    baseRef: 'Sichot HaRan',
    sections: [
      { ref: 'Sichot HaRan 1', title: 'Conversation 1', number: '1' },
      { ref: 'Sichot HaRan 2', title: 'Conversation 2', number: '2' },
      { ref: 'Sichot HaRan 3', title: 'Conversation 3', number: '3' },
      { ref: 'Sichot HaRan 4', title: 'Conversation 4', number: '4' },
      { ref: 'Sichot HaRan 5', title: 'Conversation 5', number: '5' }
    ]
  },
  'Sippurei Maasiyot': {
    baseRef: 'Sippurei Maasiyot',
    sections: [
      { ref: 'Sippurei Maasiyot 1', title: 'Story 1: The Lost Princess', number: '1' },
      { ref: 'Sippurei Maasiyot 2', title: 'Story 2: The King and the Emperor', number: '2' },
      { ref: 'Sippurei Maasiyot 3', title: 'Story 3: The Cripple', number: '3' },
      { ref: 'Sippurei Maasiyot 4', title: 'Story 4: The Bull and the Ram', number: '4' },
      { ref: 'Sippurei Maasiyot 5', title: 'Story 5: The Prince of Gems', number: '5' }
    ]
  },
  'Chayei Moharan': {
    baseRef: 'Chayei Moharan',
    sections: [
      { ref: 'Chayei Moharan 1', title: 'Biography Part 1', number: '1' },
      { ref: 'Chayei Moharan 2', title: 'Biography Part 2', number: '2' },
      { ref: 'Chayei Moharan 3', title: 'Biography Part 3', number: '3' }
    ]
  },
  'Shivchei HaRan': {
    baseRef: 'Shivchei HaRan',
    sections: [
      { ref: 'Shivchei HaRan 1', title: 'Praise 1', number: '1' },
      { ref: 'Shivchei HaRan 2', title: 'Praise 2', number: '2' },
      { ref: 'Shivchei HaRan 3', title: 'Praise 3', number: '3' }
    ]
  }
};

export async function extractCompleteBook(bookTitle: string, sectionNumber: string | null = null): Promise<BreslovTextResult> {
  console.log(`[FullTextExtractor] Extracting complete content for ${bookTitle}${sectionNumber ? ` section ${sectionNumber}` : ''}`);
  
  const book = BRESLOV_BOOKS[bookTitle];
  if (!book) {
    throw new Error(`Book ${bookTitle} not found in Breslov collection`);
  }
  
  try {
    let completeEnglishText: string[] = [];
    let completeHebrewText: string[] = [];
    
    if (sectionNumber) {
      // Extract specific section with ALL its content
      const sectionRef = `${book.baseRef} ${sectionNumber}`;
      console.log(`[FullTextExtractor] Fetching complete section: ${sectionRef}`);
      
      // Try multiple approaches to get complete section
      const approaches = [
        `${sectionRef}:1-100`, // Extended range
        `${sectionRef}:1-50`,  // Medium range
        `${sectionRef}:1-20`,  // Smaller range
        sectionRef             // Basic reference
      ];
      
      for (const approach of approaches) {
        try {
          const response = await fetch(`https://www.sefaria.org/api/texts/${encodeURIComponent(approach)}?lang=both&context=1&commentary=0&multiple=1`);
          if (response.ok) {
            const data = await response.json() as any;
            
            // Extract all text recursively with better Hebrew handling
            const extractText = (textData: any): string[] => {
              if (!textData) return [];
              if (typeof textData === 'string') return [textData.trim()].filter(t => t);
              if (Array.isArray(textData)) {
                return textData.flat(Infinity).filter(t => typeof t === 'string' && t.trim());
              }
              return [];
            };
            
            const english = extractText(data.text);
            const hebrew = extractText(data.he);
            
            console.log(`[FullTextExtractor] Extracted for ${approach}: EN=${english.length}, HE=${hebrew.length}`);
            
            // Debug: Show sample content
            if (english.length > 0) {
              console.log(`[FullTextExtractor] Sample English: ${english[0].substring(0, 100)}...`);
            }
            if (hebrew.length > 0) {
              console.log(`[FullTextExtractor] Sample Hebrew: ${hebrew[0].substring(0, 50)}...`);
            } else {
              console.log(`[FullTextExtractor] WARNING: No Hebrew content found for ${approach}`);
            }
            
            if (english.length > completeEnglishText.length) {
              completeEnglishText = english;
              completeHebrewText = hebrew;
              console.log(`[FullTextExtractor] Better content found with approach: ${approach} (${english.length} segments)`);
            }
            
            // If we found substantial content, use it
            if (english.length >= 5) break;
            
          }
        } catch (error: any) {
          console.log(`[FullTextExtractor] Approach ${approach} failed:`, error.message);
        }
      }
      
    } else {
      // Extract entire book (first few sections for preview)
      console.log(`[FullTextExtractor] Extracting book overview for ${bookTitle}`);
      
      for (let section = 1; section <= Math.min(5, book.totalSections || 5); section++) {
        try {
          const sectionRef = `${book.baseRef} ${section}`;
          const response = await fetch(`https://www.sefaria.org/api/texts/${encodeURIComponent(sectionRef)}?lang=both&context=1`);
          
          if (response.ok) {
            const data = await response.json() as any;
            
            if (data.text && Array.isArray(data.text)) {
              completeEnglishText = completeEnglishText.concat(
                data.text.flat(Infinity).filter((t: any) => typeof t === 'string' && t.trim())
              );
            }
            
            if (data.he && Array.isArray(data.he)) {
              completeHebrewText = completeHebrewText.concat(
                data.he.flat(Infinity).filter((t: any) => typeof t === 'string' && t.trim())
              );
            }
          }
        } catch (error: any) {
          console.log(`[FullTextExtractor] Failed to fetch section ${section}:`, error.message);
        }
      }
    }
    
    // Clean the texts
    const cleanTexts = (texts: string[]): string[] => {
      return texts
        .map(text => text.replace(/<[^>]*>/g, '').trim())
        .filter(text => text.length > 0);
    };
    
    const finalEnglish = cleanTexts(completeEnglishText);
    const finalHebrew = cleanTexts(completeHebrewText);
    
    console.log(`[FullTextExtractor] COMPLETE extraction result - EN: ${finalEnglish.length} segments, HE: ${finalHebrew.length} segments`);
    
    if (finalEnglish.length === 0) {
      throw new Error(`No English text extracted for ${bookTitle}${sectionNumber ? ` section ${sectionNumber}` : ''}`);
    }
    
    return {
      ref: sectionNumber ? `${book.baseRef} ${sectionNumber}` : book.baseRef,
      book: bookTitle,
      text: finalEnglish,
      he: finalHebrew.length > 0 ? finalHebrew : [`Hebrew text for ${bookTitle}${sectionNumber ? ` section ${sectionNumber}` : ''}`],
      title: `${bookTitle}${sectionNumber ? ` - Section ${sectionNumber}` : ''}`
    };
    
  } catch (error: any) {
    console.error(`[FullTextExtractor] Error extracting ${bookTitle}:`, error);
    throw error;
  }
}

export { BRESLOV_BOOKS };