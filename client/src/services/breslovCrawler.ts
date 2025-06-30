/**
 * Crawler complet pour récupérer TOUS les contenus des 9 livres Breslov
 * Implémentation exacte selon les spécifications utilisateur
 */

export interface BreslovBook {
  title: string;
  key: string;
  sections: Record<string, any>;
}

export class BreslovCrawler {
  private cache = new Map<string, any>();
  private readonly CONCURRENCY = 5;
  private readonly DELAY = 250; // ms entre requêtes

  // Liste canonique des 9 ouvrages Breslov
  private readonly BRESLOV_BOOKS = [
    { title: 'Likoutei Moharan', key: 'Likutei_Moharan' },
    { title: 'Likoutei Halakhot', key: 'Likutei_Halakhot' },
    { title: 'Likoutei Tefilot', key: 'Likutei_Tefilot' },
    { title: 'Likkutei Etzot', key: 'Likkutei_Etzot' },
    { title: 'Sefer HaMiddot', key: 'Sefer_HaMiddot' },
    { title: 'Sichot HaRan', key: 'Sichot_HaRan' },
    { title: 'Chayei Moharan', key: 'Chayei_Moharan' },
    { title: 'Shivchei HaRan', key: 'Shivchei_HaRan' },
    { title: 'Sippurei Maasiyot', key: 'Sippurei_Maasiyot' }
  ];

  /**
   * Récupère la table des matières d'un livre
   */
  async fetchTOC(title: string): Promise<any> {
    const cacheKey = `toc_${title}`;
    if (this.cache.has(cacheKey)) {
      console.log(`[BreslovCrawler] TOC cache hit for: ${title}`);
      return this.cache.get(cacheKey);
    }

    try {
      const response = await fetch(`/sefaria/api/index/${title}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch TOC for ${title}: ${response.status}`);
      }
      
      const toc = await response.json();
      this.cache.set(cacheKey, toc);
      console.log(`[BreslovCrawler] TOC fetched for: ${title}`);
      return toc;
    } catch (error) {
      console.error(`[BreslovCrawler] Error fetching TOC for ${title}:`, error);
      throw error;
    }
  }

  /**
   * Fonction récursive pour extraire toutes les références finales (feuilles)
   */
  private extractLeafRefs(node: any, refs: string[] = []): string[] {
    // Si c'est une feuille (a une ref mais pas de children)
    if (node.ref && (!node.nodes || node.nodes.length === 0) && 
        (!node.contents || node.contents.length === 0) &&
        (!node.schema?.nodes || node.schema.nodes.length === 0)) {
      refs.push(node.ref.replace(/ /g, '_'));
      return refs;
    }

    // Sinon, parcourir les enfants
    const children = node.nodes || node.contents || node.schema?.nodes || [];
    children.forEach((child: any) => this.extractLeafRefs(child, refs));
    
    return refs;
  }

  /**
   * Télécharge le contenu d'une référence spécifique avec fallback API
   */
  async fetchTextSection(ref: string): Promise<any> {
    const cacheKey = `text_${ref}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Générer des variantes de référence pour maximiser la compatibilité
    const refVariants = this.generateReferenceVariants(ref);
    
    const endpoints = [
      `/api/sefaria/texts/`,
      `/sefaria/api/texts/`,
      `/sefaria/api/v3/texts/`,
      `/api/sefaria/v3/texts/`
    ];

    console.log(`[BreslovCrawler] Trying ${refVariants.length} reference variants for: ${ref}`);

    for (const variant of refVariants) {
      for (const endpoint of endpoints) {
        try {
          const url = `${endpoint}${encodeURIComponent(variant)}?context=0&commentary=0&pad=0&wrapLinks=false`;
          console.log(`[BreslovCrawler] Trying: ${url}`);
          
          const response = await fetch(url);
          
          if (!response.ok) {
            continue;
          }

          const data = await response.json();
          
          if (this.hasValidContent(data)) {
            this.cache.set(cacheKey, data);
            console.log(`[BreslovCrawler] ✅ Loaded ${ref} using variant "${variant}"`);
            
            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, this.DELAY));
            return data;
          }
        } catch (error) {
          continue;
        }
      }
    }

    // If all endpoints failed
    console.error(`[BreslovCrawler] ❌ Failed to load: ${ref} (tried ${refVariants.length} variants)`);
    return null;
  }

  /**
   * Génère différentes variantes de référence pour maximiser la compatibilité
   */
  private generateReferenceVariants(ref: string): string[] {
    const variants = [ref];
    
    // Format point vers espace (Likutei Moharan.10 -> Likutei Moharan 10)
    if (ref.includes('.')) {
      variants.push(ref.replace(/\./g, ' '));
      variants.push(ref.replace(/\./g, ', '));
      variants.push(ref.replace(/\./g, ':'));
    }
    
    // Format underscore vers espace (Likutei_Moharan -> Likutei Moharan)
    if (ref.includes('_')) {
      variants.push(ref.replace(/_/g, ' '));
      variants.push(ref.replace(/_/g, '.'));
    }
    
    // Ajouter .1 à la fin si pas de sous-numéro
    if (!ref.includes('.1') && !ref.includes(' 1') && ref.match(/\d+$/)) {
      variants.push(`${ref}.1`);
      variants.push(`${ref} 1`);
      variants.push(`${ref}:1`);
    }
    
    // Format spécial pour certains textes
    if (ref.includes('Likutei Moharan')) {
      const num = ref.match(/\d+/)?.[0];
      if (num) {
        variants.push(`Likutei Moharan ${num}`);
        variants.push(`Likutei Moharan.${num}`);
        variants.push(`Likutei Moharan, ${num}`);
        variants.push(`Likutei Moharan ${num}:1`);
        variants.push(`Likutei Moharan.${num}.1`);
      }
    }
    
    // Format spécial pour Sichot HaRan
    if (ref.includes('Sichot HaRan')) {
      const num = ref.match(/\d+/)?.[0];
      if (num) {
        variants.push(`Sichot HaRan ${num}`);
        variants.push(`Sichot HaRan.${num}`);
        variants.push(`Sichot HaRan ${num}:1`);
        variants.push(`Sichot HaRan.${num}.1`);
      }
    }
    
    // Supprimer les doublons et retourner les variantes
    return Array.from(new Set(variants));
  }

  /**
   * Crawle un livre entier avec limitation de concurrence
   */
  async fetchEntireBook(title: string): Promise<Record<string, any>> {
    console.log(`[BreslovCrawler] Starting crawl for: ${title}`);
    
    // 1. Récupérer la TOC
    const toc = await this.fetchTOC(title);
    
    // 2. Extraire toutes les références finales
    const leafRefs = this.extractLeafRefs(toc.schema || toc);
    console.log(`[BreslovCrawler] Found ${leafRefs.length} sections in ${title}`);
    
    if (leafRefs.length === 0) {
      console.warn(`[BreslovCrawler] No leaf refs found for ${title}`);
      return {};
    }

    // 3. Téléchargement batch avec limitation de concurrence
    const results: Record<string, any> = {};
    let i = 0;

    const worker = async () => {
      while (i < leafRefs.length) {
        const ref = leafRefs[i++];
        const data = await this.fetchTextSection(ref);
        if (data) {
          results[ref] = data;
        }
        // Mini-pause pour respecter les quotas
        await new Promise(resolve => setTimeout(resolve, this.DELAY));
      }
    };

    // Exécuter les workers en parallèle (limitation à CONCURRENCY)
    await Promise.all(
      Array.from({ length: this.CONCURRENCY }, () => worker())
    );

    console.log(`[BreslovCrawler] ✔ ${title}: ${Object.keys(results).length} sections downloaded`);
    return results;
  }

  /**
   * Crawle tous les livres Breslov
   */
  async crawlAllBreslovBooks(): Promise<BreslovBook[]> {
    console.log(`[BreslovCrawler] Starting complete Breslov crawl...`);
    
    const books: BreslovBook[] = [];
    
    for (const book of this.BRESLOV_BOOKS) {
      try {
        const sections = await this.fetchEntireBook(book.key);
        books.push({
          title: book.title,
          key: book.key,
          sections
        });
        
        // Pause entre livres pour éviter de surcharger l'API
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`[BreslovCrawler] Failed to crawl ${book.title}:`, error);
      }
    }
    
    console.log(`[BreslovCrawler] ✔ Complete crawl finished: ${books.length} books`);
    return books;
  }

  /**
   * Récupère un texte spécifique par référence avec format correct
   */
  async getTextByRef(ref: string): Promise<any> {
    // Fix reference format based on Sefaria API structure
    let correctedRef = ref;
    
    // Handle different book formats based on API testing
    if (ref.includes('Likutei_Moharan')) {
      // Convert Likutei_Moharan.1 to Likutei Moharan.1.1 (Torah.Section format)
      const match = ref.match(/Likutei_Moharan\.(\d+)/);
      if (match) {
        correctedRef = `Likutei Moharan.${match[1]}.1`;
      }
    } else if (ref.includes('Sichot_HaRan')) {
      // Convert Sichot_HaRan.1 to Sichot HaRan.1.1 (Chapter.Verse format)
      const match = ref.match(/Sichot_HaRan\.(\d+)/);
      if (match) {
        correctedRef = `Sichot HaRan.${match[1]}.1`;
      }
    } else if (ref.includes('Sippurei_Maasiyot')) {
      // Convert Sippurei_Maasiyot.1 to Sippurei Maasiyot.1.1
      const match = ref.match(/Sippurei_Maasiyot\.(\d+)/);
      if (match) {
        correctedRef = `Sippurei Maasiyot.${match[1]}.1`;
      }
    }
    
    console.log(`[BreslovCrawler] Getting text by ref: ${ref} -> ${correctedRef}`);
    
    try {
      const result = await this.fetchTextSection(correctedRef);
      
      // Handle both server fullTextExtractor format and standard Sefaria format
      if (result) {
        let textLength = 0;
        let heLength = 0;
        
        // Server fullTextExtractor format (direct text/he arrays)
        if (result.text && Array.isArray(result.text)) {
          textLength = result.text.length;
        }
        if (result.he && Array.isArray(result.he)) {
          heLength = result.he.length;
        }
        
        // Fallback: Standard Sefaria versions format
        if (textLength === 0 && result.versions && result.versions.length > 0) {
          textLength = Array.isArray(result.versions[0].text) ? result.versions[0].text.length : 1;
          heLength = Array.isArray(result.versions[0].he) ? result.versions[0].he.length : 1;
        }
        
        console.log(`[BreslovCrawler] Retrieved complete text: ${textLength} English segments, ${heLength} Hebrew segments`);
      }
      
      return result;
    } catch (error) {
      console.error(`[BreslovCrawler] Error fetching ${correctedRef}:`, error);
      return null;
    }
  }

  /**
   * Sauvegarde/charge le cache dans sessionStorage
   */
  saveCache(): void {
    const cacheData = Array.from(this.cache.entries());
    sessionStorage.setItem('breslov_crawler_cache', JSON.stringify(cacheData));
    console.log(`[BreslovCrawler] Cache saved: ${cacheData.length} items`);
  }

  loadCache(): void {
    const stored = sessionStorage.getItem('breslov_crawler_cache');
    if (stored) {
      const cacheData = JSON.parse(stored);
      this.cache = new Map(cacheData);
      console.log(`[BreslovCrawler] Cache loaded: ${this.cache.size} items`);
    }
  }

  /**
   * Nettoie le cache (pour debug)
   */
  clearCache(): void {
    this.cache.clear();
    sessionStorage.removeItem('breslov_crawler_cache');
    console.log(`[BreslovCrawler] Cache cleared`);
  }

  getCache(): Record<string, any> {
    const cacheObject: Record<string, any> = {};
    this.cache.forEach((value, key) => {
      cacheObject[key] = value;
    });
    return cacheObject;
  }

  /**
   * Vérifie si les données contiennent du contenu textuel valide
   */
  private hasValidContent(data: any): boolean {
    if (!data) return false;
    
    // Check server fullTextExtractor format (direct text/he arrays)
    if (this.isValidText(data.text) || this.isValidText(data.he)) {
      return true;
    }
    
    // Check V3 API format
    if (data.versions && Array.isArray(data.versions) && data.versions.length > 0) {
      return data.versions.some((version: any) => 
        (version.text && this.isValidText(version.text)) || 
        (version.he && this.isValidText(version.he))
      );
    }
    
    return false;
  }

  /**
   * Vérifie si un texte est valide (non vide et suffisamment long)
   */
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
}

// Instance singleton
export const breslovCrawler = new BreslovCrawler();