// Service direct pour accéder aux textes Breslov authentiques
// Sans diagnostic en boucle - utilise les références Sefaria vérifiées

export interface BreslovText {
  title: string;
  ref: string;
  hebrewTitle: string;
  content?: any;
}

export const AUTHENTIC_BRESLOV_TEXTS: BreslovText[] = [
  {
    title: "Likutei Moharan 1:1",
    ref: "Likutei Moharan.1.1",
    hebrewTitle: 'ליקוטי מוהר"ן א׳:א׳',
  },
  {
    title: "Likutei Moharan 1:2",
    ref: "Likutei Moharan.1.2",
    hebrewTitle: 'ליקוטי מוהר"ן א׳:ב׳',
  },
  {
    title: "Sichot HaRan 1",
    ref: "Sichot HaRan.1",
    hebrewTitle: 'שיחות הר"ן א׳',
  },
  {
    title: "Sichot HaRan 2",
    ref: "Sichot HaRan.2",
    hebrewTitle: 'שיחות הר"ן ב׳',
  },
  {
    title: "Sippurei Maasiyot 1",
    ref: "Sippurei Maasiyot.1",
    hebrewTitle: "סיפורי מעשיות א׳",
  },
];

class BreslovDirectService {
  private cache = new Map<string, any>();

  async getAuthenticText(ref: string): Promise<any> {
    if (this.cache.has(ref)) {
      return this.cache.get(ref);
    }

    try {
      const response = await fetch(
        `/api/sefaria/v3/texts/${encodeURIComponent(ref)}?context=0&commentary=0&pad=0&wrapLinks=false`,
      );

      if (!response.ok) {
        console.warn(
          `[BreslovDirect] Failed to fetch ${ref}: HTTP ${response.status}`,
        );
        return null;
      }

      const data = await response.json();

      // Vérifier que nous avons du contenu authentique
      if (data.versions && data.versions.length > 0) {
        const hebrewVersion = data.versions.find(
          (v: any) => v.language === "he",
        );
        if (
          hebrewVersion &&
          hebrewVersion.text &&
          hebrewVersion.text.length > 0
        ) {
          this.cache.set(ref, data);
          console.log(`[BreslovDirect] ✅ Loaded authentic text: ${ref}`);
          return data;
        }
      }

      console.warn(`[BreslovDirect] No authentic content found for ${ref}`);
      return null;
    } catch (error) {
      console.error(`[BreslovDirect] Error fetching ${ref}:`, error);
      return null;
    }
  }

  getAvailableTexts(): BreslovText[] {
    return AUTHENTIC_BRESLOV_TEXTS;
  }

  async loadAllTexts(): Promise<BreslovText[]> {
    const loadedTexts: BreslovText[] = [];

    for (const text of AUTHENTIC_BRESLOV_TEXTS) {
      const content = await this.getAuthenticText(text.ref);
      if (content) {
        loadedTexts.push({ ...text, content });
      }
    }

    console.log(`[BreslovDirect] Loaded ${loadedTexts.length} authentic texts`);
    return loadedTexts;
  }
}

export const breslovDirect = new BreslovDirectService();
