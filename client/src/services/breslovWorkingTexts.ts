// Solution définitive pour accès aux textes Breslov authentiques
// Références Sefaria vérifiées et fonctionnelles

export interface WorkingBreslovText {
  title: string;
  key: string;
  ref: string;
  verified: boolean;
  content?: any;
}

// Textes Breslov avec références Sefaria exactes qui fonctionnent
export const VERIFIED_BRESLOV_TEXTS: WorkingBreslovText[] = [
  {
    title: 'Likutei Moharan Torah 1',
    key: 'Likutei Moharan',
    ref: 'Likutei Moharan.1.1',
    verified: true
  },
  {
    title: 'Likutei Moharan Torah 2', 
    key: 'Likutei Moharan',
    ref: 'Likutei Moharan.1.2',
    verified: true
  },
  {
    title: 'Sichot HaRan 1',
    key: 'Sichot HaRan',
    ref: 'Sichot HaRan.1',
    verified: true
  },
  {
    title: 'Sichot HaRan 2',
    key: 'Sichot HaRan', 
    ref: 'Sichot HaRan.2',
    verified: true
  },
  {
    title: 'Sichot HaRan 3',
    key: 'Sichot HaRan',
    ref: 'Sichot HaRan.3', 
    verified: true
  },
  {
    title: 'Sippurei Maasiyot 1',
    key: 'Sippurei Maasiyot',
    ref: 'Sippurei Maasiyot.1',
    verified: true
  },
  {
    title: 'Likutei Tefilot 1:1',
    key: 'Likutei Tefilot',
    ref: 'Likutei Tefilot.1.1', 
    verified: true
  }
];

// Service pour récupérer les textes authentiques
export class WorkingBreslovService {
  private cache = new Map<string, any>();

  async getWorkingText(ref: string): Promise<any> {
    if (this.cache.has(ref)) {
      return this.cache.get(ref);
    }

    try {
      const response = await fetch(`/api/sefaria/v3/texts/${encodeURIComponent(ref)}?context=0&commentary=0&pad=0&wrapLinks=false`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      // Debug : afficher la structure des données reçues
      console.log(`[WorkingBreslovService] DEBUG: Structure for ${ref}:`, {
        hasVersions: !!data.versions,
        versionsLength: data.versions?.length || 0,
        firstVersionKeys: data.versions?.[0] ? Object.keys(data.versions[0]) : [],
        firstVersionHasText: !!data.versions?.[0]?.text,
        firstVersionTextLength: data.versions?.[0]?.text?.length || 0,
        sampleText: data.versions?.[0]?.text?.[0]?.substring(0, 50) || 'N/A'
      });
      
      // Vérifier le contenu dans la structure Sefaria v3
      if (data.versions && Array.isArray(data.versions) && data.versions.length > 0) {
        for (const version of data.versions) {
          if (version.text && Array.isArray(version.text) && version.text.length > 0) {
            const hasContent = version.text.some((segment: any) => 
              segment && typeof segment === 'string' && segment.trim().length > 3
            );
            
            if (hasContent) {
              this.cache.set(ref, data);
              console.log(`[WorkingBreslovService] ✅ Successfully loaded ${ref} (${version.language})`);
              return data;
            }
          }
        }
      }
      
      // Fallback : vérifier l'ancienne structure
      if (data.text && Array.isArray(data.text) && data.text.length > 0) {
        const hasContent = data.text.some((segment: any) => 
          segment && typeof segment === 'string' && segment.trim().length > 3
        );
        
        if (hasContent) {
          this.cache.set(ref, data);
          console.log(`[WorkingBreslovService] ✅ Successfully loaded ${ref} (legacy format)`);
          return data;
        }
      }
      
      console.warn(`[WorkingBreslovService] ❌ No substantial content in ${ref}`);
      return null;
    } catch (error) {
      console.error(`[WorkingBreslovService] Error loading ${ref}:`, error);
      return null;
    }
  }

  async getAllWorkingTexts(): Promise<WorkingBreslovText[]> {
    const workingTexts: WorkingBreslovText[] = [];
    
    for (const text of VERIFIED_BRESLOV_TEXTS) {
      const content = await this.getWorkingText(text.ref);
      if (content) {
        workingTexts.push({
          ...text,
          content,
          verified: true
        });
      }
    }
    
    console.log(`[WorkingBreslovService] Found ${workingTexts.length} working texts out of ${VERIFIED_BRESLOV_TEXTS.length}`);
    return workingTexts;
  }

  // Obtenir textes par livre
  getTextsByBook(bookKey: string): WorkingBreslovText[] {
    return VERIFIED_BRESLOV_TEXTS.filter(text => text.key === bookKey);
  }

  // Obtenir tous les livres disponibles
  getAvailableBooks(): string[] {
    const books = new Set(VERIFIED_BRESLOV_TEXTS.map(text => text.key));
    return Array.from(books);
  }
}