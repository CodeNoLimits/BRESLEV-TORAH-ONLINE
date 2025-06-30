import { breslovCrawler } from '../services/breslovCrawler';

export interface BookDiagnostic {
  ref: string;
  displayName: string;
  status: 'success' | 'empty' | 'error';
  englishSegments: number;
  hebrewSegments: number;
  error?: string;
}

export class BreslovDiagnostic {
  static async runCompleteCheck(): Promise<BookDiagnostic[]> {
    console.log('[BreslovDiagnostic] Starting complete library check...');
    
    const allBooks = [
      'Likutei_Moharan.1',
      'Likutei_Moharan.2', 
      'Likutei_Moharan.3',
      'Likutei_Moharan.4',
      'Likutei_Moharan.5',
      'Sichot_HaRan.1',
      'Sichot_HaRan.2',
      'Sichot_HaRan.3',
      'Sippurei_Maasiyot.1',
      'Chayei_Moharan',
      'Likkutei_Etzot',
      'Sefer_HaMiddot',
      'Kitzur_Likutei_Moharan'
    ];
    
    const results: BookDiagnostic[] = [];
    
    for (const ref of allBooks) {
      try {
        console.log(`[BreslovDiagnostic] Checking ${ref}...`);
        const text = await breslovCrawler.getTextByRef(ref);
        
        // Handle both server fullTextExtractor format and standard Sefaria format
        let englishCount = 0;
        let hebrewCount = 0;
        
        if (text) {
          // Server fullTextExtractor format (from server/fullTextExtractor.js)
          if (text.text && Array.isArray(text.text)) {
            englishCount = text.text.filter(segment => 
              segment && typeof segment === 'string' && segment.trim().length > 10
            ).length;
          }
          
          if (text.he && Array.isArray(text.he)) {
            hebrewCount = text.he.filter(segment => 
              segment && typeof segment === 'string' && segment.trim().length > 5
            ).length;
          }
          
          // Fallback: Check versions format (standard Sefaria)
          if (englishCount === 0 && text.versions && Array.isArray(text.versions)) {
            for (const version of text.versions) {
              if (version.text && Array.isArray(version.text)) {
                englishCount += version.text.filter(segment => 
                  segment && typeof segment === 'string' && segment.trim().length > 10
                ).length;
              }
              if (version.he && Array.isArray(version.he)) {
                hebrewCount += version.he.filter(segment => 
                  segment && typeof segment === 'string' && segment.trim().length > 5
                ).length;
              }
            }
          }
        }

        const diagnostic: BookDiagnostic = {
          ref,
          displayName: this.getDisplayName(ref),
          status: 'success',
          englishSegments: englishCount,
          hebrewSegments: hebrewCount
        };
        
        if (englishCount === 0 && hebrewCount === 0) {
          diagnostic.status = 'empty';
        }
        
        results.push(diagnostic);
        console.log(`[BreslovDiagnostic] ${ref}: ${diagnostic.status} (EN: ${diagnostic.englishSegments}, HE: ${diagnostic.hebrewSegments})`);
        
      } catch (error) {
        results.push({
          ref,
          displayName: this.getDisplayName(ref),
          status: 'error',
          englishSegments: 0,
          hebrewSegments: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        console.error(`[BreslovDiagnostic] Error checking ${ref}:`, error);
      }
    }
    
    this.printSummary(results);
    return results;
  }
  
  private static getDisplayName(ref: string): string {
    const names: Record<string, string> = {
      'Likutei_Moharan.1': 'Likutei Moharan I',
      'Likutei_Moharan.2': 'Likutei Moharan II',
      'Likutei_Moharan.3': 'Likutei Moharan III',
      'Likutei_Moharan.4': 'Likutei Moharan IV',
      'Likutei_Moharan.5': 'Likutei Moharan V',
      'Sichot_HaRan.1': 'Sichot HaRan I',
      'Sichot_HaRan.2': 'Sichot HaRan II',
      'Sichot_HaRan.3': 'Sichot HaRan III',
      'Sippurei_Maasiyot.1': 'Sippurei Maasiyot I',
      'Chayei_Moharan': 'Chayei Moharan',
      'Likkutei_Etzot': 'Likkutei Etzot',
      'Sefer_HaMiddot': 'Sefer HaMiddot',
      'Kitzur_Likutei_Moharan': 'Kitzur Likutei Moharan'
    };
    
    return names[ref] || ref.replace(/_/g, ' ');
  }
  
  private static printSummary(results: BookDiagnostic[]): void {
    console.log('\n=== BRESLOV LIBRARY DIAGNOSTIC REPORT ===');
    
    const successful = results.filter(r => r.status === 'success');
    const empty = results.filter(r => r.status === 'empty');
    const errors = results.filter(r => r.status === 'error');
    
    console.log(`✅ Working books: ${successful.length}`);
    successful.forEach(book => {
      console.log(`   - ${book.displayName}: ${book.englishSegments} EN, ${book.hebrewSegments} HE`);
    });
    
    if (empty.length > 0) {
      console.log(`❌ Empty books: ${empty.length}`);
      empty.forEach(book => {
        console.log(`   - ${book.displayName}: No content found`);
      });
    }
    
    if (errors.length > 0) {
      console.log(`🚨 Error books: ${errors.length}`);
      errors.forEach(book => {
        console.log(`   - ${book.displayName}: ${book.error}`);
      });
    }
    
    console.log('==========================================\n');
  }
}