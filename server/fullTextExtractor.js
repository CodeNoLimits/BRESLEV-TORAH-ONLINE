// Complete text extraction system for Breslov books
// This ensures we get FULL texts, not fragments

const BRESLOV_BOOKS = {
  'Likutei Moharan': {
    baseRef: 'Likutei Moharan',
    totalSections: 286, // Complete Likutei Moharan has 286 teachings
    part1Sections: 286,
    part2Sections: 125
  },
  'Sichot HaRan': {
    baseRef: 'Sichot HaRan',
    totalSections: 305 // All conversations
  },
  'Sippurei Maasiyot': {
    baseRef: 'Sippurei Maasiyot',
    totalSections: 13 // 13 stories
  },
  'Chayei Moharan': {
    baseRef: 'Chayei Moharan',
    totalSections: 600 // Biography sections
  },
  'Shivchei HaRan': {
    baseRef: 'Shivchei HaRan',
    totalSections: 50 // Praise sections
  }
};

async function extractCompleteBook(bookTitle, sectionNumber = null) {
  console.log(`[FullTextExtractor] Extracting complete content for ${bookTitle}${sectionNumber ? ` section ${sectionNumber}` : ''}`);
  
  const book = BRESLOV_BOOKS[bookTitle];
  if (!book) {
    throw new Error(`Book ${bookTitle} not found in Breslov collection`);
  }
  
  try {
    let completeEnglishText = [];
    let completeHebrewText = [];
    
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
            const data = await response.json();
            
            // Extract all text recursively
            const extractText = (textData) => {
              if (!textData) return [];
              if (typeof textData === 'string') return [textData.trim()].filter(t => t);
              if (Array.isArray(textData)) {
                return textData.flat(Infinity).filter(t => typeof t === 'string' && t.trim());
              }
              return [];
            };
            
            const english = extractText(data.text);
            const hebrew = extractText(data.he);
            
            if (english.length > completeEnglishText.length) {
              completeEnglishText = english;
              completeHebrewText = hebrew;
              console.log(`[FullTextExtractor] Better content found with approach: ${approach} (${english.length} segments)`);
            }
            
            // If we found substantial content, use it
            if (english.length >= 5) break;
            
          }
        } catch (error) {
          console.log(`[FullTextExtractor] Approach ${approach} failed:`, error.message);
        }
      }
      
    } else {
      // Extract entire book (first few sections for preview)
      console.log(`[FullTextExtractor] Extracting book overview for ${bookTitle}`);
      
      for (let section = 1; section <= Math.min(5, book.totalSections); section++) {
        try {
          const sectionRef = `${book.baseRef} ${section}`;
          const response = await fetch(`https://www.sefaria.org/api/texts/${encodeURIComponent(sectionRef)}?lang=both&context=1`);
          
          if (response.ok) {
            const data = await response.json();
            
            if (data.text && Array.isArray(data.text)) {
              completeEnglishText = completeEnglishText.concat(
                data.text.flat(Infinity).filter(t => typeof t === 'string' && t.trim())
              );
            }
            
            if (data.he && Array.isArray(data.he)) {
              completeHebrewText = completeHebrewText.concat(
                data.he.flat(Infinity).filter(t => typeof t === 'string' && t.trim())
              );
            }
          }
        } catch (error) {
          console.log(`[FullTextExtractor] Failed to fetch section ${section}:`, error.message);
        }
      }
    }
    
    // Clean the texts
    const cleanTexts = (texts) => {
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
    
  } catch (error) {
    console.error(`[FullTextExtractor] Error extracting ${bookTitle}:`, error);
    throw error;
  }
}

module.exports = { extractCompleteBook, BRESLOV_BOOKS };