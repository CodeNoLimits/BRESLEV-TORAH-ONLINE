// Sefaria service - direct client calls (no proxy needed due to CORS)
export interface SefariaText {
  ref: string;
  text: string[];
  he: string[];
  title: string;
}

export interface SefariaIndexNode {
  title: string;
  ref?: string;
  contents?: SefariaIndexNode[];
  nodes?: SefariaIndexNode[];
  schema?: { nodes?: SefariaIndexNode[] };
  category?: string;
}

class SefariaDirectClient {
  private cache = new Map<string, { data: any; expires: number }>();
  private readonly TTL = 3600000; // 1 hour

  // Fetch section with proper Breslov reference handling
  async fetchSection(tref: string): Promise<SefariaText> {
    const cacheKey = tref;
    const cached = this.cache.get(cacheKey);

    if (cached && cached.expires > Date.now()) {
      console.log(`[SefariaClient] Cache hit for: ${tref}`);
      return this.formatResponse(cached.data, tref);
    }

    try {
      // Get multiple reference formats to try
      const refVariants = this.getBreslovRefVariants(tref);
      console.log(
        `[SefariaClient] Trying ${refVariants.length} reference variants for: ${tref}`,
      );

      for (const variant of refVariants) {
        try {
          const urlFormats = [
            `/sefaria/api/v3/texts/${encodeURIComponent(variant)}?context=0&commentary=0&pad=0&wrapLinks=false`,
            `/sefaria/api/texts/${encodeURIComponent(variant)}?context=0&commentary=0`,
            `/sefaria/api/v3/texts/${variant.replace(/\s+/g, "_")}?context=0&commentary=0&pad=0&wrapLinks=false`,
            `/sefaria/api/texts/${variant.replace(/\s+/g, "_")}?context=0&commentary=0`,
          ];

          for (const url of urlFormats) {
            console.log(`[SefariaClient] Trying: ${url}`);
            const response = await fetch(url);

            if (response.ok) {
              const data = await response.json();

              // Check if we actually got text content
              if (this.hasValidTextContent(data)) {
                console.log(
                  `[SefariaClient] Success! Found content with: ${variant}`,
                );

                // Cache the successful response
                this.cache.set(cacheKey, {
                  data,
                  expires: Date.now() + this.TTL,
                });

                return this.formatResponse(data, tref);
              }
            }
          }
        } catch (variantError) {
          console.log(
            `[SefariaClient] Variant "${variant}" failed:`,
            variantError,
          );
          continue;
        }
      }

      throw new Error(
        `No valid content found for any reference variant of: ${tref}`,
      );
    } catch (error) {
      console.error("[SefariaClient]", tref, error);
      throw new Error(`Cannot load "${tref}" - text may not be available`);
    }
  }

  // Generate multiple reference variants for Breslov texts
  private getBreslovRefVariants(ref: string): string[] {
    const variants: string[] = [ref]; // Always include original

    // Handle Likutei Moharan Tinyana (Part II)
    if (ref.includes("Tinyana")) {
      const match = ref.match(/Likutei Moharan Tinyana (\d+)/i);
      if (match) {
        const section = match[1];
        variants.push(
          `Likutei Moharan II, ${section}`,
          `Likutei Moharan II, ${section}:1`,
          `Likutei Moharan, Part II, ${section}`,
          `Likutei Moharan II.${section}`,
          `Likutei_Moharan_II.${section}`,
        );
      }
    }
    // Handle Likutei Moharan (Part I)
    else if (ref.includes("Likutei Moharan") && !ref.includes("II")) {
      const match = ref.match(/Likutei Moharan (\d+)/i);
      if (match) {
        const section = match[1];
        variants.push(
          `Likutei Moharan I, ${section}`,
          `Likutei Moharan I, ${section}:1`,
          `Likutei Moharan, Part I, ${section}`,
          `Likutei Moharan I.${section}`,
          `Likutei_Moharan_I.${section}`,
          `Likutei Moharan ${section}`, // Without part designation
        );
      }
    }

    // Handle Sichot HaRan
    if (ref.includes("Sichot HaRan")) {
      const match = ref.match(/Sichot HaRan (\d+)/i);
      if (match) {
        const section = match[1];
        variants.push(
          `Sichot HaRan ${section}`,
          `Sichot HaRan, ${section}`,
          `Sichot_HaRan.${section}`,
        );
      }
    }

    // Handle Sippurei Maasiyot
    if (ref.includes("Sippurei Maasiyot")) {
      const match = ref.match(/Sippurei Maasiyot (\d+)/i);
      if (match) {
        const section = match[1];
        variants.push(
          `Sippurei Maasiyot ${section}`,
          `Sippurei Maasiyot, ${section}`,
          `Sippurei_Maasiyot.${section}`,
        );
      }
    }

    return Array.from(new Set(variants)); // Remove duplicates
  }

  // Check if response contains actual text content
  private hasValidTextContent(data: any): boolean {
    if (!data) return false;

    // Check V3 format with versions
    if (data.versions && Array.isArray(data.versions)) {
      return data.versions.some((version: any) => {
        const hasText =
          version.text &&
          Array.isArray(version.text) &&
          version.text.some((t: any) => t && t.trim());
        const hasChapter =
          version.chapter &&
          Array.isArray(version.chapter) &&
          version.chapter.some((c: any) => c && c.trim());
        return hasText || hasChapter;
      });
    }

    // Check V1 format
    const hasV1Text =
      data.text &&
      Array.isArray(data.text) &&
      data.text.some((t: any) => t && t.trim());
    const hasV1He =
      data.he &&
      Array.isArray(data.he) &&
      data.he.some((h: any) => h && h.trim());

    return hasV1Text || hasV1He;
  }

  // Format response to consistent structure with comprehensive text extraction
  private formatResponse(data: any, tref: string): SefariaText {
    console.log(`[SefariaClient] Formatting response for ${tref}:`, {
      hasVersions: !!data.versions,
      versionsCount: data.versions?.length || 0,
      hasDirectText: !!data.text,
      hasDirectHe: !!data.he,
      responseKeys: Object.keys(data),
    });

    let englishText: string[] = [];
    let hebrewText: string[] = [];

    // Handle V3 response format with versions
    if (data.versions && Array.isArray(data.versions)) {
      console.log(
        `[SefariaClient] Processing ${data.versions.length} versions`,
      );

      for (const version of data.versions) {
        console.log(`[SefariaClient] Version:`, {
          language: version.language,
          title: version.versionTitle,
          hasText: !!version.text,
          hasChapter: !!version.chapter,
          keys: Object.keys(version),
        });

        // Extract English content
        if (version.language === "en" && englishText.length === 0) {
          if (version.text && Array.isArray(version.text)) {
            englishText = this.flattenTextArray(version.text);
          } else if (version.chapter && Array.isArray(version.chapter)) {
            englishText = this.flattenTextArray(version.chapter);
          } else if (version.text) {
            englishText = [String(version.text)];
          }
        }

        // Extract Hebrew content
        if (version.language === "he" && hebrewText.length === 0) {
          if (version.text && Array.isArray(version.text)) {
            hebrewText = this.flattenTextArray(version.text);
          } else if (version.chapter && Array.isArray(version.chapter)) {
            hebrewText = this.flattenTextArray(version.chapter);
          } else if (version.text) {
            hebrewText = [String(version.text)];
          }
        }

        // Fallback: if no language specified but has content
        if (!version.language || version.language === "") {
          if (version.text && Array.isArray(version.text)) {
            const content = this.flattenTextArray(version.text);
            if (englishText.length === 0) englishText = content;
            if (hebrewText.length === 0) hebrewText = content;
          }
        }
      }

      console.log(
        `[SefariaClient] V3 extraction - EN: ${englishText.length} segments, HE: ${hebrewText.length} segments`,
      );
    }

    // Handle V1 response format or direct text properties
    if (englishText.length === 0 && data.text) {
      englishText = this.flattenTextArray(data.text);
    }

    if (hebrewText.length === 0 && data.he) {
      hebrewText = this.flattenTextArray(data.he);
    }

    // Clean and validate text arrays
    englishText = englishText.filter(
      (t) => t && typeof t === "string" && t.trim().length > 0,
    );
    hebrewText = hebrewText.filter(
      (t) => t && typeof t === "string" && t.trim().length > 0,
    );

    console.log(
      `[SefariaClient] Final result - EN: ${englishText.length} segments, HE: ${hebrewText.length} segments`,
    );
    if (englishText.length > 0) {
      console.log(
        `[SefariaClient] First English segment: ${englishText[0].substring(0, 100)}...`,
      );
    }
    if (hebrewText.length > 0) {
      console.log(
        `[SefariaClient] First Hebrew segment: ${hebrewText[0].substring(0, 100)}...`,
      );
    }

    return {
      ref: tref,
      title: data.title || tref,
      text: englishText,
      he: hebrewText,
    };
  }

  // Recursively flatten nested text arrays
  private flattenTextArray(textData: any): string[] {
    if (!textData) return [];

    if (typeof textData === "string") {
      return [textData];
    }

    if (Array.isArray(textData)) {
      const flattened: string[] = [];
      for (const item of textData) {
        if (typeof item === "string") {
          flattened.push(item);
        } else if (Array.isArray(item)) {
          flattened.push(...this.flattenTextArray(item));
        } else if (item && typeof item === "object") {
          // Handle objects that might contain text properties
          if (item.text) {
            flattened.push(...this.flattenTextArray(item.text));
          }
        }
      }
      return flattened;
    }

    return [];
  }

  // Load Breslov library from index
  async getBreslovLibrary(): Promise<SefariaIndexNode[]> {
    try {
      console.log("[SefariaClient] Loading Breslov library from index");
      const response = await fetch("https://www.sefaria.org/api/index");

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const index = await response.json();

      // Navigate to Chasidut > Breslov
      const chasidut = index.find((c: any) => c.category === "Chasidut");
      if (!chasidut?.contents) {
        throw new Error("Chasidut category not found");
      }

      const breslov = chasidut.contents.find(
        (c: any) => c.category === "Breslov",
      );
      if (!breslov?.contents) {
        throw new Error("Breslov category not found");
      }

      // Extract all texts with refs
      const breslovTexts = this.extractTextsWithRefs(breslov.contents);
      console.log(`[SefariaClient] Found ${breslovTexts.length} Breslov texts`);

      return breslovTexts;
    } catch (error) {
      console.error("[SefariaClient] Failed to load Breslov library:", error);
      throw error;
    }
  }

  // Extract known Breslov texts with proper refs for first Torah sections
  private extractTextsWithRefs(nodes: any[]): SefariaIndexNode[] {
    const breslovBooks = [
      { title: "Likutei Moharan - Torah 1", ref: "Likutei Moharan 1" },
      { title: "Likutei Moharan - Torah 2", ref: "Likutei Moharan 2" },
      { title: "Likutei Moharan - Torah 3", ref: "Likutei Moharan 3" },
      { title: "Likutei Moharan - Torah 4", ref: "Likutei Moharan 4" },
      { title: "Likutei Moharan - Torah 5", ref: "Likutei Moharan 5" },
      { title: "Sichot HaRan - Section 1", ref: "Sichot HaRan 1" },
      { title: "Sichot HaRan - Section 2", ref: "Sichot HaRan 2" },
      { title: "Sichot HaRan - Section 3", ref: "Sichot HaRan 3" },
      { title: "Sippurei Maasiyot - Story 1", ref: "Sippurei Maasiyot 1" },
      { title: "Sippurei Maasiyot - Story 2", ref: "Sippurei Maasiyot 2" },
      { title: "Chayei Moharan 1", ref: "Chayei Moharan 1" },
      { title: "Shivchei HaRan 1", ref: "Shivchei HaRan 1" },
    ];

    console.log(
      `[SefariaClient] Using Breslov Torah sections for direct access`,
    );
    return breslovBooks;
  }
}

export const sefariaClient = new SefariaDirectClient();
