// Complete Breslov book discovery system for Sefaria
export interface BreslovBook {
  title: string;
  ref: string;
  firstTextRef: string;
  categories: string[];
  verified: boolean;
}

// All known Breslov books on Sefaria with their correct references
export const BRESLOV_BOOKS: BreslovBook[] = [
  {
    title: "Likutei Moharan",
    ref: "Likutei_Moharan",
    firstTextRef: "Likutei Moharan.1.1.1",
    categories: ["Chasidut", "Breslov"],
    verified: true
  },
  {
    title: "Sichot HaRan", 
    ref: "Sichot_HaRan",
    firstTextRef: "Sichot HaRan.1",
    categories: ["Chasidut", "Breslov"],
    verified: true
  },
  {
    title: "Sippurei Maasiyot",
    ref: "Sippurei_Maasiyot", 
    firstTextRef: "Sippurei Maasiyot.1.1",
    categories: ["Chasidut", "Breslov"],
    verified: true
  },
  {
    title: "Sefer HaMiddot",
    ref: "Sefer_HaMiddot",
    firstTextRef: "Sefer HaMiddot.1.1",
    categories: ["Chasidut", "Breslov"],
    verified: false // Need to verify correct reference
  },
  {
    title: "Likutei Tefilot",
    ref: "Likutei_Tefilot",
    firstTextRef: "Likutei Tefilot.1.1",
    categories: ["Chasidut", "Breslov"],
    verified: false
  },
  {
    title: "Chayei Moharan",
    ref: "Chayei_Moharan",
    firstTextRef: "Chayei Moharan.1.1",
    categories: ["Chasidut", "Breslov"],
    verified: false
  },
  {
    title: "Shivchei HaRan",
    ref: "Shivchei_HaRan", 
    firstTextRef: "Shivchei HaRan.1",
    categories: ["Chasidut", "Breslov"],
    verified: true
  },
  {
    title: "Likutei Halakhot",
    ref: "Likutei_Halakhot",
    firstTextRef: "Likutei Halakhot.1.1.1.1",
    categories: ["Chasidut", "Breslov"],
    verified: false
  },
  {
    title: "Likkutei Etzot",
    ref: "Likkutei_Etzot",
    firstTextRef: "Likkutei Etzot.1.1",
    categories: ["Chasidut", "Breslov"],
    verified: false
  }
];

// Verify and discover correct references for each book
export async function verifyBreslovBooks(): Promise<BreslovBook[]> {
  const verifiedBooks: BreslovBook[] = [];
  
  for (const book of BRESLOV_BOOKS) {
    try {
      // Check the book's index structure
      const indexResponse = await fetch(`https://www.sefaria.org/api/index/${book.ref}`);
      if (indexResponse.ok) {
        const indexData = await indexResponse.json();
        console.log(`[BreslovDiscovery] Found index for ${book.title}:`, indexData.title);
        
        // Try to find a valid first text reference
        let validRef = book.firstTextRef;
        
        // Test various reference patterns based on the book structure
        const testRefs = [
          `${book.title}.1`,
          `${book.title}.1.1`, 
          `${book.title}.1.1.1`,
          `${book.title}, Introduction`,
          `${book.title}, 1`,
          book.firstTextRef
        ];
        
        for (const testRef of testRefs) {
          try {
            const textResponse = await fetch(`https://www.sefaria.org/api/v3/texts/${encodeURIComponent(testRef)}?context=0&commentary=0`);
            if (textResponse.ok) {
              const textData = await textResponse.json();
              if (textData.versions && textData.versions.length > 0) {
                validRef = testRef;
                console.log(`[BreslovDiscovery] Valid reference found for ${book.title}: ${validRef}`);
                break;
              }
            }
          } catch (error) {
            continue;
          }
        }
        
        verifiedBooks.push({
          ...book,
          firstTextRef: validRef,
          verified: true
        });
      }
    } catch (error) {
      console.log(`[BreslovDiscovery] Could not verify ${book.title}: ${error}`);
      // Still add the book with original reference
      verifiedBooks.push(book);
    }
  }
  
  return verifiedBooks;
}