// Fichier : generateSefariaTree.js
import fetch from 'node-fetch';
import fs from 'fs';

const BASE_URL = 'https://www.sefaria.org/api';

/**
 * Fonction principale pour parcourir l'arbre des textes de Sefaria.
 * Elle se déplace de manière récursive à travers les catégories et les livres.
 */
async function crawl(url, path = []) {
    console.log(`🔎 Crawling: ${url}`);
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`❌ Failed to fetch ${url}: ${response.statusText}`);
            return [];
        }
        const node = await response.json();

        // Cas 1 : Le noeud est un livre avec un schéma complexe (ex: Likutei Moharan)
        // Nous devons générer les références à partir de sa structure.
        if (node.schema) {
            return generateRefsFromSchema(node.schema, path);
        }

        // Cas 2 : Le noeud est une catégorie contenant d'autres livres/catégories
        if (node.contents) {
            let results = [];
            for (const content of node.contents) {
                // Si l'élément a un `ref`, c'est une référence directe
                if (content.ref) {
                     results.push({ title: content.title, ref: content.ref });
                }
                // Si l'élément est une sous-catégorie, on la crawl
                else if (content.category) {
                    const newPath = [...path, content.title];
                    const apiUrl = `${BASE_URL}/index/${content.title.replace(/ /g, '_')}`;
                    results = results.concat(await crawl(apiUrl, newPath));
                }
            }
            return results;
        }

        return [];
    } catch (error) {
        console.error(`🚨 Error crawling ${url}:`, error);
        return [];
    }
}

/**
 * Génère toutes les références possibles pour un livre à partir de son "schéma".
 * C'est la partie la plus complexe, elle gère les livres avec chapitres/sections.
 */
function generateRefsFromSchema(schema, path) {
    let refs = [];
    const bookTitle = schema.title || path[path.length - 1];

    // Gère les structures simples (ex: un livre avec X chapitres)
    if (schema.nodeType === 'JaggedArrayNode') {
        const depths = schema.depths; // ex: [nombre de chapitres, nombre de versets par chapitre]
        const sections = schema.sectionNames; // ex: ["Chapter", "Verse"]

        // Cette logique est simplifiée. Pour un livre comme Likutei Moharan (286 chapitres),
        // nous créons une référence pour chaque chapitre.
        // Une version plus avancée pourrait générer chaque verset.
        const chapterCount = depths[0];
        for (let i = 1; i <= chapterCount; i++) {
            refs.push({ title: `${bookTitle} ${i}`, ref: `${bookTitle} ${i}` });
        }
    }
    
    // Gère les structures complexes qui contiennent d'autres noeuds
    if (schema.nodes) {
        for (const node of schema.nodes) {
            const newPath = [...path, node.title || bookTitle];
            refs = refs.concat(generateRefsFromSchema(node, newPath));
        }
    }
    
    return refs;
}


/**
 * Point d'entrée du script.
 */
async function main() {
    console.log("🚀 Starting Sefaria Breslov library scan...");
    
    const breslovRootUrl = `${BASE_URL}/index/Breslov`;
    const allRefs = await crawl(breslovRootUrl, ["Breslov"]);

    // Sauvegarder les résultats dans un fichier JSON
    const outputPath = './client/src/breslov_library.json';
    fs.writeFileSync(outputPath, JSON.stringify(allRefs, null, 2));

    console.log(`✅ Success! ${allRefs.length} references found.`);
    console.log(`📚 Library saved to: ${outputPath}`);
}

main();