// Correction définitive des références Breslov pour Sefaria
// Résout le problème des livres vides comme Shivchei HaRan et Chayei Moharan

export interface BreslovReference {
  title: string;
  sefariaKey: string;
  alternativeKeys: string[];
  verified: boolean;
  description: string;
  icon: string;
  color: string;
}

// Références Breslov corrigées avec les vrais noms Sefaria
export const BRESLOV_REFERENCES_FIXED: BreslovReference[] = [
  {
    title: "Likoutei Moharan",
    sefariaKey: "Likutei Moharan",
    alternativeKeys: ["Likutei_Moharan", "Likkutei_Moharan"],
    verified: true,
    description: "Torah 1-286 (Part I) + Torah 1-125 (Part II)",
    icon: "📜",
    color: "from-amber-500 to-orange-600",
  },
  {
    title: "Sippurei Maasiyot",
    sefariaKey: "Sippurei Maasiyot",
    alternativeKeys: ["Sippurei_Maasiyot", "Tales"],
    verified: true,
    description: "13 contes principaux + contes additionnels",
    icon: "📖",
    color: "from-blue-500 to-indigo-600",
  },
  {
    title: "Sichot HaRan",
    sefariaKey: "Sichot HaRan",
    alternativeKeys: ["Sichot_HaRan", "Conversations"],
    verified: true,
    description: "332 sections de conversations",
    icon: "💬",
    color: "from-green-500 to-emerald-600",
  },
  {
    title: "Likoutei Tefilot",
    sefariaKey: "Likutei Tefilot",
    alternativeKeys: ["Likutei_Tefilot", "Likkutei_Tefilot"],
    verified: true,
    description: "210 prières spirituelles",
    icon: "🙏",
    color: "from-purple-500 to-violet-600",
  },
  {
    title: "Sefer HaMiddot",
    sefariaKey: "Sefer HaMiddot",
    alternativeKeys: ["Sefer_HaMiddot", "The_Aleph_Bet_Book"],
    verified: true,
    description: "Traits de caractère et conseils moraux",
    icon: "⚖️",
    color: "from-red-500 to-rose-600",
  },
  {
    title: "Chayei Moharan",
    sefariaKey: "Chayei Moharan",
    alternativeKeys: ["Chayei_Moharan", "Life_of_Rabbi_Nachman"],
    verified: false, // Livre problématique
    description: "Biographie spirituelle de Rabbi Nahman",
    icon: "📚",
    color: "from-teal-500 to-cyan-600",
  },
  {
    title: "Shivchei HaRan",
    sefariaKey: "Shivchei HaRan",
    alternativeKeys: ["Shivchei_HaRan", "Praises"],
    verified: false, // Livre problématique
    description: "Éloges et récits spirituels",
    icon: "⭐",
    color: "from-yellow-500 to-amber-600",
  },
  {
    title: "Kitzur Likutei Moharan",
    sefariaKey: "Kitzur Likutei Moharan",
    alternativeKeys: ["Kitzur_Likutei_Moharan", "Abridged_Likutei_Moharan"],
    verified: false, // Livre problématique
    description: "Version abrégée du Likoutei Moharan",
    icon: "📄",
    color: "from-slate-500 to-gray-600",
  },
  {
    title: "Likkutei Etzot",
    sefariaKey: "Likkutei Etzot",
    alternativeKeys: ["Likutei_Etzot", "Advice"],
    verified: false, // Livre problématique
    description: "Conseils spirituels organisés par thèmes",
    icon: "💡",
    color: "from-pink-500 to-rose-600",
  },
];

// Fonction pour obtenir la référence correcte
export const getBreslovReference = (title: string): BreslovReference | null => {
  return (
    BRESLOV_REFERENCES_FIXED.find(
      (ref) =>
        ref.title === title ||
        ref.sefariaKey === title ||
        ref.alternativeKeys.includes(title),
    ) || null
  );
};

// Fonction pour vérifier la disponibilité d'un livre
export const verifyBreslovBook = async (
  ref: BreslovReference,
): Promise<boolean> => {
  try {
    // Test avec la clé principale
    const response = await fetch(
      `/api/sefaria/v3/texts/${ref.sefariaKey}?context=0&commentary=0&pad=0&wrapLinks=false`,
    );
    if (response.ok) {
      const data = await response.json();
      return data.text && data.text.length > 0;
    }

    // Test avec les clés alternatives
    for (const altKey of ref.alternativeKeys) {
      const altResponse = await fetch(
        `/api/sefaria/v3/texts/${altKey}?context=0&commentary=0&pad=0&wrapLinks=false`,
      );
      if (altResponse.ok) {
        const altData = await altResponse.json();
        if (altData.text && altData.text.length > 0) {
          return true;
        }
      }
    }

    return false;
  } catch (error) {
    console.error(`[BreslovReferences] Error verifying ${ref.title}:`, error);
    return false;
  }
};

// Fonction pour obtenir tous les livres disponibles
export const getAvailableBreslovBooks = async (): Promise<
  BreslovReference[]
> => {
  const availableBooks: BreslovReference[] = [];

  for (const ref of BRESLOV_REFERENCES_FIXED) {
    const isAvailable = await verifyBreslovBook(ref);
    if (isAvailable) {
      availableBooks.push({ ...ref, verified: true });
    } else {
      console.warn(`[BreslovReferences] Book not available: ${ref.title}`);
    }
  }

  return availableBooks;
};
