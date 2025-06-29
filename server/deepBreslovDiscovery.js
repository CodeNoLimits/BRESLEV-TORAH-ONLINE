// Deep discovery for ALL Breslov books with complex reference patterns
async function discoverComplexBreslovBooks() {
  const complexBooks = ['Sefer_HaMiddot', 'Likutei_Tefilot', 'Likutei_Halakhot', 'Likkutei_Etzot'];
  const validBooks = [];
  
  for (const bookName of complexBooks) {
    try {
      console.log(`\n=== Deep discovery for ${bookName} ===`);
      
      // Get detailed book structure
      const indexResponse = await fetch(`https://www.sefaria.org/api/index/${bookName}`);
      if (!indexResponse.ok) continue;
      
      const indexData = await indexResponse.json();
      console.log(`Analyzing structure for: ${indexData.title}`);
      
      // Explore complex reference patterns based on schema structure
      const complexPatterns = [];
      
      if (indexData.schema && indexData.schema.nodes) {
        // Extract first section titles from schema
        indexData.schema.nodes.forEach(node => {
          if (node.title || node.heTitle) {
            const sectionName = node.title || node.heTitle;
            complexPatterns.push(`${indexData.title}, ${sectionName}.1`);
            complexPatterns.push(`${indexData.title}, ${sectionName}.1.1`);
            complexPatterns.push(`${indexData.title}, ${sectionName}`);
          }
        });
      }
      
      // Add common patterns for complex books
      complexPatterns.push(
        `${indexData.title}, Truth.1`,
        `${indexData.title}, Faith.1`,
        `${indexData.title}, Prayer.1`,
        `${indexData.title}, Emunah.1`,
        `${indexData.title}, Tefillah.1`,
        `${indexData.title}, Introduction.1`,
        `${indexData.title}, Preface.1`,
        `${indexData.title}, 1.1.1`,
        `${indexData.title}.Truth.1`,
        `${indexData.title}.Faith.1`,
        `${indexData.title}.1.1.1.1`
      );
      
      console.log(`Testing ${complexPatterns.length} patterns...`);
      
      let workingRef = null;
      let actualContent = null;
      
      for (const pattern of complexPatterns) {
        try {
          const textResponse = await fetch(`https://www.sefaria.org/api/v3/texts/${encodeURIComponent(pattern)}?commentary=0&context=0`);
          if (textResponse.ok) {
            const textData = await textResponse.json();
            if (textData.versions && textData.versions.length > 0) {
              // Look for actual text content
              const contentVersion = textData.versions.find(v => v.text && v.text.trim().length > 10);
              if (contentVersion) {
                workingRef = pattern;
                actualContent = contentVersion.text.substring(0, 100);
                console.log(`✅ FOUND working reference: ${pattern}`);
                console.log(`Content preview: ${actualContent}...`);
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
          categories: indexData.categories || ['Chasidut', 'Breslov'],
          preview: actualContent
        });
      } else {
        console.log(`❌ No working reference found for ${bookName} after testing ${complexPatterns.length} patterns`);
      }
      
    } catch (error) {
      console.log(`❌ Error with ${bookName}:`, error.message);
    }
  }
  
  return validBooks;
}

// Run deep discovery
discoverComplexBreslovBooks().then(books => {
  console.log('\n=== COMPLEX BRESLOV BOOKS DISCOVERED ===');
  console.log(`Found ${books.length} additional working books:`);
  books.forEach(book => {
    console.log(`- ${book.title}: ${book.ref}`);
    console.log(`  Preview: ${book.preview.substring(0, 80)}...`);
  });
});