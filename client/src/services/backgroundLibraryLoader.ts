// Background service worker for progressive library loading
// Loads Breslov texts in background without blocking main thread

export interface LoadingProgress {
  loaded: number;
  total: number;
  percentage: number;
  currentBook: string;
  estimatedTimeRemaining?: number;
}

export class BackgroundLibraryLoader {
  private isLoading = false;
  private abortController: AbortController | null = null;
  private progressCallback: ((progress: LoadingProgress) => void) | null = null;
  private queue: string[] = [];
  private loaded: Set<string> = new Set();

  constructor() {
    // Check if user has enabled background sync
    this.checkDataSaverMode();
  }

  private checkDataSaverMode(): boolean {
    // Check for data saver mode or slow connection
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection && (connection.saveData || connection.effectiveType === 'slow-2g')) {
        console.log('[BackgroundLoader] Data saver mode detected - disabling background sync');
        return false;
      }
    }
    return true;
  }

  async startBackgroundLoading(
    onProgress: ((progress: LoadingProgress) => void) | null = null,
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): Promise<void> {
    if (this.isLoading) {
      console.log('[BackgroundLoader] Already loading');
      return;
    }

    if (!this.checkDataSaverMode()) {
      console.log('[BackgroundLoader] Skipping background load due to data saver mode');
      return;
    }

    this.isLoading = true;
    this.progressCallback = onProgress || null;
    this.abortController = new AbortController();

    // Build priority queue
    this.buildLoadingQueue(priority);

    const totalItems = this.queue.length;
    let loadedCount = 0;
    const startTime = Date.now();

    try {
      console.log(`[BackgroundLoader] Starting background load of ${totalItems} items (${priority} priority)`);

      for (const bookRef of this.queue) {
        if (this.abortController.signal.aborted) {
          break;
        }

        // Skip if already loaded
        if (this.loaded.has(bookRef)) {
          loadedCount++;
          continue;
        }

        try {
          // Load with rate limiting to avoid overwhelming the API
          await this.loadBookWithRateLimit(bookRef);
          this.loaded.add(bookRef);
          loadedCount++;

          // Calculate progress and ETA
          const progress: LoadingProgress = {
            loaded: loadedCount,
            total: totalItems,
            percentage: Math.round((loadedCount / totalItems) * 100),
            currentBook: bookRef,
            estimatedTimeRemaining: this.calculateETA(startTime, loadedCount, totalItems)
          };

          // Update progress without blocking main thread
          if (this.progressCallback) {
            setTimeout(() => this.progressCallback?.(progress), 0);
          }

          // Yield control to main thread
          await new Promise(resolve => setTimeout(resolve, 50));

        } catch (error) {
          console.warn(`[BackgroundLoader] Failed to load ${bookRef}:`, error);
          loadedCount++; // Count as processed even if failed
        }
      }

      console.log(`[BackgroundLoader] Completed background load: ${this.loaded.size}/${totalItems} successfully loaded`);

    } catch (error) {
      console.error('[BackgroundLoader] Background loading error:', error);
    } finally {
      this.isLoading = false;
      this.abortController = null;
    }
  }

  private buildLoadingQueue(priority: 'high' | 'normal' | 'low'): void {
    // Essential books first
    const essentialBooks = [
      'Likutei Moharan.1', 'Likutei Moharan.2', 'Likutei Moharan.3',
      'Sichot HaRan.1', 'Sichot HaRan.2',
      'Sippurei Maasiyot.1', 'Sippurei Maasiyot.2'
    ];

    // Popular books second
    const popularBooks = [
      ...Array.from({ length: 20 }, (_, i) => `Likutei Moharan.${i + 4}`),
      ...Array.from({ length: 10 }, (_, i) => `Sichot HaRan.${i + 3}`),
      ...Array.from({ length: 5 }, (_, i) => `Sippurei Maasiyot.${i + 3}`)
    ];

    // Complete collection third
    const allBooks = [
      ...Array.from({ length: 286 }, (_, i) => `Likutei Moharan.${i + 1}`),
      ...Array.from({ length: 125 }, (_, i) => `Likutei Moharan Tinyana.${i + 1}`),
      ...Array.from({ length: 307 }, (_, i) => `Sichot HaRan.${i + 1}`),
      ...Array.from({ length: 14 }, (_, i) => `Sippurei Maasiyot.${i + 1}`),
      ...Array.from({ length: 50 }, (_, i) => `Chayei Moharan.${i + 1}`),
      ...Array.from({ length: 200 }, (_, i) => `Likkutei Etzot.${i + 1}`),
      ...Array.from({ length: 50 }, (_, i) => `Shivchei HaRan.${i + 1}`),
      ...Array.from({ length: 40 }, (_, i) => `Alim LiTerufah.${i + 1}`),
      ...Array.from({ length: 45 }, (_, i) => `Kitzur Likutei Moharan.${i + 1}`)
    ];

    // Build queue based on priority
    switch (priority) {
      case 'high':
        this.queue = [...essentialBooks, ...popularBooks];
        break;
      case 'normal':
        this.queue = [...essentialBooks, ...popularBooks, ...allBooks.slice(0, 100)];
        break;
      case 'low':
        this.queue = [...essentialBooks, ...allBooks];
        break;
    }

    // Remove duplicates and already loaded
    this.queue = Array.from(new Set(this.queue)).filter(ref => !this.loaded.has(ref));
  }

  private async loadBookWithRateLimit(bookRef: string): Promise<void> {
    // Use a simple fetch with timeout instead of heavy services
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    try {
      const response = await fetch(`/api/sefaria/texts/${encodeURIComponent(bookRef)}`, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      if (response.ok) {
        // Just cache the response, don't process it yet
        const data = await response.json();
        if (data.text || data.he) {
          console.log(`[BackgroundLoader] ✓ Cached ${bookRef}`);
        }
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private calculateETA(startTime: number, loaded: number, total: number): number {
    if (loaded === 0) return 0;
    
    const elapsed = Date.now() - startTime;
    const avgTimePerItem = elapsed / loaded;
    const remaining = total - loaded;
    
    return Math.round((remaining * avgTimePerItem) / 1000); // Return in seconds
  }

  stopLoading(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.isLoading = false;
    console.log('[BackgroundLoader] Background loading stopped');
  }

  isCurrentlyLoading(): boolean {
    return this.isLoading;
  }

  getLoadedCount(): number {
    return this.loaded.size;
  }

  resetProgress(): void {
    this.loaded.clear();
    this.queue = [];
  }
}

export const backgroundLibraryLoader = new BackgroundLibraryLoader();