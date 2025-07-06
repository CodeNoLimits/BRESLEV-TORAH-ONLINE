#!/usr/bin/env node

// Script pour charger tous les livres hébreux dans le système multi-livres

const HEBREW_BOOKS = [
  {
    id: 'likutei_moharan_tinyana',
    title: 'Likutei Moharan Tinyana',
    titleFrench: 'Les Enseignements du Rabbi Nahman - Tome 2',
    titleHebrew: 'ליקוטי מוהרן תנינא',
    filename: 'ליקוטי מוהרן תנינא_1751481234338.docx',
    language: 'hebrew'
  },
  {
    id: 'sippurei_maasiyot',
    title: 'Sippurei Maasiyot',
    titleFrench: 'Les Contes du Rabbi Nahman',
    titleHebrew: 'סיפורי מעשיות',
    filename: 'סיפורי מעשיות_1751481234338.docx',
    language: 'hebrew'
  },
  {
    id: 'likutei_tefilot',
    title: 'Likutei Tefilot',
    titleFrench: 'Recueil de Prières',
    titleHebrew: 'ליקוטי תפילות',
    filename: 'ליקוטי תפילות_1751481234338.docx',
    language: 'hebrew'
  },
  {
    id: 'chayei_moharan_hebrew',
    title: 'Chayei Moharan',
    titleFrench: 'La Vie du Rabbi Nahman (Hébreu)',
    titleHebrew: 'חיי מוהרן',
    filename: 'חיי מוהרן_1751481234338.docx',
    language: 'hebrew'
  },
  {
    id: 'shivchei_haran',
    title: 'Shivchei HaRan',
    titleFrench: 'Les Louanges du Rabbi Nahman',
    titleHebrew: 'שבחי ושיחות הרן',
    filename: 'שבחי ושיחות הרן_1751481234339.docx',
    language: 'hebrew'
  },
  {
    id: 'sefer_hamidot',
    title: 'Sefer HaMidot',
    titleFrench: 'Le Livre des Traits de Caractère',
    titleHebrew: 'ספר המידות',
    filename: 'ספר המידות_1751481234338.docx',
    language: 'hebrew'
  },
  {
    id: 'likutei_etzot',
    title: 'Likutei Etzot',
    titleFrench: 'Recueil de Conseils',
    titleHebrew: 'ליקוטי עצות',
    filename: 'ליקוטי עצות_1751481234338.docx',
    language: 'hebrew'
  },
  {
    id: 'kitzur_likutei_moharan',
    title: 'Kitzur Likutei Moharan',
    titleFrench: 'Abrégé des Enseignements - Tome 1',
    titleHebrew: 'קיצור ליקוטי מוהרן',
    filename: 'קיצור ליקוטי מוהרן_1751481234339.docx',
    language: 'hebrew'
  },
  {
    id: 'kitzur_likutei_moharan_tinyana',
    title: 'Kitzur Likutei Moharan Tinyana',
    titleFrench: 'Abrégé des Enseignements - Tome 2',
    titleHebrew: 'קיצור ליקוטי מוהרן תנינא',
    filename: 'קיצור ליקוטי מוהרן תנינא_1751481234339.docx',
    language: 'hebrew'
  }
];

async function loadBook(book) {
  try {
    console.log(`📚 Chargement de ${book.titleFrench}...`);
    
    const response = await fetch('http://localhost:5000/api/multi-book/add-book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(book)
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ ${book.titleFrench} chargé avec succès!`);
      return true;
    } else {
      console.error(`❌ Échec du chargement de ${book.titleFrench}:`, data.error);
      return false;
    }
  } catch (error) {
    console.error(`❌ Erreur lors du chargement de ${book.titleFrench}:`, error.message);
    return false;
  }
}

async function loadAllBooks() {
  console.log('🚀 Début du chargement de tous les livres hébreux...\n');
  
  let success = 0;
  let failed = 0;
  
  for (const book of HEBREW_BOOKS) {
    const result = await loadBook(book);
    if (result) {
      success++;
    } else {
      failed++;
    }
    
    // Attendre un peu entre chaque livre pour ne pas surcharger
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n📊 Résumé du chargement:');
  console.log(`✅ Livres chargés avec succès: ${success}`);
  console.log(`❌ Échecs de chargement: ${failed}`);
  console.log(`📚 Total: ${HEBREW_BOOKS.length} livres`);
}

// Exécuter le script
loadAllBooks().catch(error => {
  console.error('Erreur fatale:', error);
  process.exit(1);
});