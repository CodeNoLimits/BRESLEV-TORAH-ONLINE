// Bulk loader for ALL Breslov books with ALL segments
// Comprehensive system to load the complete Breslov library

export interface BulkLoadProgress {
  loaded: number;
  total: number;
  percentage: number;
  currentBook: string;
  errors: string[];
  totalSegments: number;
  loadedSegments: number;
}

export interface CompleteBreslovLibrary {
  books: Record<string, any>;
  segments: Record<string, string[]>;
  metadata: {
    totalBooks: number;
    totalSegments: number;
    categories: string[];
    loadedAt: Date;
  };
}

class BreslovBulkLoader {
  private cache = new Map<string, any>();
  private progress: BulkLoadProgress = {
    loaded: 0,
    total: 0,
    percentage: 0,
    currentBook: '',
    errors: [],
    totalSegments: 0,
    loadedSegments: 0
  };

  // Complete list of ALL Breslov books with segment ranges
  private readonly COMPLETE_BRESLOV_BOOKS = [
    { title: 'Likutei Moharan', segments: 286, pattern: 'Likutei Moharan.{n}' },
    { title: 'Likutei Moharan Tinyana', segments: 125, pattern: 'Likutei Moharan, Part II.{n}' },
    { title: 'Sichot HaRan', segments: 307, pattern: 'Sichot HaRan.{n}' },
    { title: 'Sippurei Maasiyot', segments: 13, pattern: 'Sippurei Maasiyot.{n}' },
    { title: 'Likutei Tefilot', segments: 210, pattern: 'Likutei Tefilot.{n}' },
    { title: 'Chayei Moharan', segments: 50, pattern: 'Chayei Moharan.{n}' },
    { title: 'Sefer HaMiddot', segments: 100, pattern: 'Sefer HaMiddot.{n}' },
    { title: 'Likkutei Etzot', segments: 200, pattern: 'Likkutei Etzot.{n}' },
    { title: 'Shivchei HaRan', segments: 50, pattern: 'Shivchei HaRan.{n}' },
    { title: 'Alim LiTerufah', segments: 40, pattern: 'Alim LiTerufah.{n}' }
  ];

  async loadCompleteLibrary(onProgress?: (progress: BulkLoadProgress) => void): Promise<CompleteBreslovLibrary> {
    console.log('[BreslovBulkLoader] Starting complete library load...');
    
    // Calculate totals
    this.progress.total = this.COMPLETE_BRESLOV_BOOKS.reduce((sum, book) => sum + book.segments, 0);
    this.progress.totalSegments = this.progress.total * 10; // Estimated segments per text
    
    const library: CompleteBreslovLibrary = {
      books: {},
      segments: {},
      metadata: {
        totalBooks: this.COMPLETE_BRESLOV_BOOKS.length,
        totalSegments: 0,
        categories: this.COMPLETE_BRESLOV_BOOKS.map(b => b.title),
        loadedAt: new Date()
      }
    };

    // Load each book completely
    for (const bookConfig of this.COMPLETE_BRESLOV_BOOKS) {
      this.progress.currentBook = bookConfig.title;
      console.log(`[BreslovBulkLoader] Loading ${bookConfig.title} (${bookConfig.segments} texts)...`);
      
      try {
        const bookData = await this.loadCompleteBook(bookConfig, onProgress);
        library.books[bookConfig.title] = bookData.texts;
        library.segments[bookConfig.title] = bookData.allSegments;
        library.metadata.totalSegments += bookData.segmentCount;
      } catch (error) {
        console.error(`[BreslovBulkLoader] Error loading ${bookConfig.title}:`, error);
        this.progress.errors.push(`Failed to load ${bookConfig.title}: ${error}`);
      }
    }

    console.log(`[BreslovBulkLoader] Complete library loaded: ${library.metadata.totalSegments} total segments`);
    return library;
  }

  private async loadCompleteBook(
    bookConfig: { title: string; segments: number; pattern: string },
    onProgress?: (progress: BulkLoadProgress) => void
  ): Promise<{ texts: any[]; allSegments: string[]; segmentCount: number }> {
    
    const texts: any[] = [];
    const allSegments: string[] = [];
    let segmentCount = 0;

    // Load in batches to avoid API rate limits
    const batchSize = 5;
    const batches: number[][] = [];
    
    for (let i = 1; i <= bookConfig.segments; i += batchSize) {
      const batch = [];
      for (let j = i; j < i + batchSize && j <= bookConfig.segments; j++) {
        batch.push(j);
      }
      batches.push(batch);
    }

    for (const batch of batches) {
      const batchPromises = batch.map(async (index) => {
        const ref = bookConfig.pattern.replace('{n}', index.toString());
        
        try {
          const textData = await this.fetchAuthenticText(ref);
          if (textData) {
            const segments = this.extractAllSegments(textData);
            texts.push({
              ref,
              title: `${bookConfig.title} ${index}`,
              segments,
              segmentCount: segments.length
            });
            
            allSegments.push(...segments);
            segmentCount += segments.length;
            this.progress.loadedSegments += segments.length;
          }
          
          this.progress.loaded++;
          this.progress.percentage = Math.round((this.progress.loaded / this.progress.total) * 100);
          
          if (onProgress) {
            onProgress({ ...this.progress });
          }
          
        } catch (error) {
          console.error(`[BreslovBulkLoader] Error loading ${ref}:`, error);
          this.progress.errors.push(`Failed to load ${ref}`);
        }
      });

      await Promise.all(batchPromises);
      
      // Respectful delay between batches
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    return { texts, allSegments, segmentCount };
  }

  private async fetchAuthenticText(ref: string): Promise<any> {
    if (this.cache.has(ref)) {
      return this.cache.get(ref);
    }

    // Try multiple API endpoints for maximum coverage
    const endpoints = [
      `/api/sefaria/texts/${encodeURIComponent(ref)}`,
      `/api/sefaria/v3/texts/${encodeURIComponent(ref)}?context=0&commentary=0&pad=0&wrapLinks=false`,
      `/sefaria/api/texts/${encodeURIComponent(ref)}?context=0&commentary=0`
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint);
        
        if (!response.ok) {
          continue;
        }

        const data = await response.json();
        
        if (this.hasValidContent(data)) {
          this.cache.set(ref, data);
          return data;
        }
      } catch (error) {
        continue;
      }
    }

    return null;
  }

  private extractAllSegments(data: any): string[] {
    const segments: string[] = [];
    
    // Handle V3 API format
    if (data.versions && Array.isArray(data.versions)) {
      for (const version of data.versions) {
        if (version.text) {
          if (Array.isArray(version.text)) {
            segments.push(...version.text.filter(seg => seg && seg.trim().length > 0));
          } else if (typeof version.text === 'string') {
            segments.push(version.text);
          }
        }
        
        if (version.he) {
          if (Array.isArray(version.he)) {
            segments.push(...version.he.filter(seg => seg && seg.trim().length > 0));
          } else if (typeof version.he === 'string') {
            segments.push(version.he);
          }
        }
      }
    }
    
    // Handle V1 API format
    if (data.text) {
      if (Array.isArray(data.text)) {
        segments.push(...data.text.filter(seg => seg && seg.trim().length > 0));
      } else if (typeof data.text === 'string') {
        segments.push(data.text);
      }
    }
    
    if (data.he) {
      if (Array.isArray(data.he)) {
        segments.push(...data.he.filter(seg => seg && seg.trim().length > 0));
      } else if (typeof data.he === 'string') {
        segments.push(data.he);
      }
    }
    
    return segments;
  }

  private hasValidContent(data: any): boolean {
    if (!data) return false;
    
    // Check V3 format
    if (data.versions && Array.isArray(data.versions)) {
      return data.versions.some((version: any) => 
        (version.text && this.isValidText(version.text)) || 
        (version.he && this.isValidText(version.he))
      );
    }
    
    // Check V1 format
    return this.isValidText(data.text) || this.isValidText(data.he);
  }

  private isValidText(text: any): boolean {
    if (!text) return false;
    
    if (typeof text === 'string') {
      return text.trim().length > 3;
    }
    
    if (Array.isArray(text)) {
      return text.some(segment => 
        segment && typeof segment === 'string' && segment.trim().length > 3
      );
    }
    
    return false;
  }

  getProgress(): BulkLoadProgress {
    return { ...this.progress };
  }

  clearCache(): void {
    this.cache.clear();
    console.log('[BreslovBulkLoader] Cache cleared');
  }

  // Save/load progress to localStorage
  saveProgress(): void {
    localStorage.setItem('breslov_bulk_progress', JSON.stringify(this.progress));
  }

  loadProgress(): void {
    const saved = localStorage.getItem('breslov_bulk_progress');
    if (saved) {
      this.progress = { ...this.progress, ...JSON.parse(saved) };
    }
  }
}

export const breslovBulkLoader = new BreslovBulkLoader();