export const getBreslovIndex = async () => {
  const r = await fetch('/sefaria/api/index/');
  const idx = await r.json();
  const cha = idx.find((c:any) => c.category === 'Chasidut')?.contents ?? [];
  const bre = cha.find((c:any) => c.category === 'Breslov')?.contents ?? [];
  return bre;                              // tableau hiérarchique complet
};

export const getText = (ref: string) =>
  fetch(`/sefaria/api/v3/texts/${ref.replace(/ /g,'_')}?context=0&commentary=0&pad=0&wrapLinks=false`)
    .then(r => r.json());