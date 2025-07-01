// Fichier : client/src/services/sefariaSimple.ts

export const getBreslovIndex = async () => {
  // Appel au proxy pour l'index complet de la catégorie Breslev
  const response = await fetch('/sefaria/api/index/Breslov');
  if (!response.ok) {
    throw new Error('Failed to fetch Breslov index from proxy');
  }
  const data = await response.json();
  // La structure contient directement les livres dans `contents`
  return data.contents || [];
};

export const getText = (ref: string) => {
  // Appel au proxy pour un texte spécifique
  const cleanRef = ref.replace(/ /g, '_');
  return fetch(`/sefaria/api/v3/texts/${cleanRef}?context=0&commentary=0&pad=0&wrapLinks=false`)
    .then(r => {
      if (!r.ok) {
        throw new Error(`Proxy error fetching text: ${r.statusText}`);
      }
      return r.json();
    });
};