// Complete discovery of all Breslov books on Sefaria with correct references
const BRESLOV_BOOKS_TO_DISCOVER = [
  'Likutei_Moharan',
  'Sichot_HaRan', 
  'Sippurei_Maasiyot',
  'Sefer_HaMiddot',
  'Likutei_Tefilot',
  'Chayei_Moharan',
  'Shivchei_HaRan',
  'Likutei_Halakhot',
  'Likkutei_Etzot'
];

async function discoverBreslovReferences() {
  const validBooks = [];
  
  for (const bookName of BRESLOV_BOOKS_TO_DISCOVER) {
    try {
      console.log(`\n=== Discovering ${bookName} ===`);
      
      // Get book index structure
      const indexResponse = await fetch(`https://www.sefaria.org/api/index/${bookName}`);
      if (!indexResponse.ok) {
        console.log(`❌ Index not found for ${bookName}`);
        continue;
      }
      
      const indexData = await indexResponse.json();
      console.log(`✅ Found index for: ${indexData.title}`);
      
      // Try different reference patterns to find working text
      const testPatterns = [
        `${indexData.title}.1`,
        `${indexData.title}.1.1`,
        `${indexData.title}.1.1.1`,
        `${indexData.title}, 1`,
        `${indexData.title}, Introduction`,
        `${indexData.title}, Preface`
      ];
      
      let workingRef = null;
      
      for (const pattern of testPatterns) {
        try {
          const textResponse = await fetch(`https://www.sefaria.org/api/v3/texts/${encodeURIComponent(pattern)}?commentary=0&context=0`);
          if (textResponse.ok) {
            const textData = await textResponse.json();
            if (textData.versions && textData.versions.length > 0) {
              // Check if we have actual text content
              const hasContent = textData.versions.some(v => v.text && v.text.trim().length > 0);
              if (hasContent) {
                workingRef = pattern;
                console.log(`✅ Working reference found: ${pattern}`);
                break;
              }
            }
          }
        } catch (error) {
          continue;
        }
      }
      
      if (workingRef) {
        validBooks.push({
          title: indexData.title,
          ref: workingRef,
          categories: indexData.categories || ['Chasidut', 'Breslov']
        });
      } else {
        console.log(`❌ No working reference found for ${bookName}`);
      }
      
    } catch (error) {
      console.log(`❌ Error discovering ${bookName}:`, error.message);
    }
  }
  
  return validBooks;
}

// Run discovery
discoverBreslovReferences().then(books => {
  console.log('\n=== FINAL RESULTS ===');
  console.log(`Found ${books.length} working Breslov books:`);
  books.forEach(book => {
    console.log(`- ${book.title}: ${book.ref}`);
  });
});