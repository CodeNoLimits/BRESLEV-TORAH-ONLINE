import { multiBookProcessor } from './services/multiBookProcessor.js';

export const HEBREW_BOOKS_CONFIG = [
  {
    id: 'likutei_moharan',
    title: 'Likutei Moharan',
    titleFrench: 'Les Enseignements de Rabbi Nahman',
    titleHebrew: 'ליקוטי מוהרן',
    filename: 'ליקוטי מוהרן קמא_1751481234338.docx',
    language: 'hebrew' as const
  },
  {
    id: 'likutei_moharan_tinyana',
    title: 'Likutei Moharan Tinyana',
    titleFrench: 'Les Enseignements de Rabbi Nahman - Tome 2',
    titleHebrew: 'ליקוטי מוהרן תנינא',
    filename: 'ליקוטי מוהרן תנינא_1751481234338.docx',
    language: 'hebrew' as const
  },
  {
    id: 'sippurei_maasiyot',
    title: 'Sippurei Maasiyot',
    titleFrench: 'Les Contes de Rabbi Nahman',
    titleHebrew: 'סיפורי מעשיות',
    filename: 'סיפורי מעשיות_1751481234338.docx',
    language: 'hebrew' as const
  },
  {
    id: 'likutei_tefilot',
    title: 'Likutei Tefilot',
    titleFrench: 'Recueil de Prières',
    titleHebrew: 'ליקוטי תפילות',
    filename: 'ליקוטי תפילות_1751481234338.docx',
    language: 'hebrew' as const
  },
  {
    id: 'chayei_moharan_hebrew',
    title: 'Chayei Moharan',
    titleFrench: 'La Vie de Rabbi Nahman',
    titleHebrew: 'חיי מוהרן',
    filename: 'חיי מוהרן_1751481234338.docx',
    language: 'hebrew' as const
  },
  {
    id: 'shivchei_haran',
    title: 'Shivchei HaRan',
    titleFrench: 'Les Louanges de Rabbi Nahman',
    titleHebrew: 'שבחי ושיחות הרן',
    filename: 'שבחי ושיחות הרן_1751481234339.docx',
    language: 'hebrew' as const
  },
  {
    id: 'sefer_hamidot',
    title: 'Sefer HaMidot',
    titleFrench: 'Le Livre des Traits de Caractère',
    titleHebrew: 'ספר המידות',
    filename: 'ספר המידות_1751481234338.docx',
    language: 'hebrew' as const
  },
  {
    id: 'likutei_etzot',
    title: 'Likutei Etzot',
    titleFrench: 'Recueil de Conseils',
    titleHebrew: 'ליקוטי עצות',
    filename: 'ליקוטי עצות_1751481234338.docx',
    language: 'hebrew' as const
  },
  {
    id: 'kitzur_likutei_moharan',
    title: 'Kitzur Likutei Moharan',
    titleFrench: 'Abrégé des Enseignements - Tome 1',
    titleHebrew: 'קיצור ליקוטי מוהרן',
    filename: 'קיצור ליקוטי מוהרן_1751481234339.docx',
    language: 'hebrew' as const
  },
  {
    id: 'kitzur_likutei_moharan_tinyana',
    title: 'Kitzur Likutei Moharan Tinyana',
    titleFrench: 'Abrégé des Enseignements - Tome 2',
    titleHebrew: 'קיצור ליקוטי מוהרן תנינא',
    filename: 'קיצור ליקוטי מוהרן תנינא_1751481234339.docx',
    language: 'hebrew' as const
  }
];

export async function loadAllHebrewBooks() {
  console.log('[LoadHebrewBooks] Début du chargement des livres hébreux...');
  
  let loaded = 0;
  let failed = 0;
  
  for (const bookConfig of HEBREW_BOOKS_CONFIG) {
    try {
      console.log(`[LoadHebrewBooks] Chargement de ${bookConfig.titleFrench}...`);
      const success = await multiBookProcessor.addNewBook(bookConfig);
      
      if (success) {
        loaded++;
        console.log(`[LoadHebrewBooks] ✓ ${bookConfig.titleFrench} chargé avec succès`);
      } else {
        failed++;
        console.error(`[LoadHebrewBooks] ✗ Échec du chargement de ${bookConfig.titleFrench}`);
      }
    } catch (error) {
      failed++;
      console.error(`[LoadHebrewBooks] Erreur pour ${bookConfig.titleFrench}:`, error);
    }
  }
  
  console.log(`[LoadHebrewBooks] Chargement terminé: ${loaded} réussis, ${failed} échecs`);
  return { loaded, failed };
}