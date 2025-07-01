import { useState, useEffect } from 'react';
import { breslovCrawler } from '../services/breslovCrawler';

interface BookContentsProps {
  bookTitle: string;
  bookKey: string;
  onTextSelect: (ref: string, title: string) => void;
  onClose: () => void;
}

interface ContentSection {
  title: string;
  ref: string;
  number?: number;
}

export const BookContents = ({ bookTitle, bookKey, onTextSelect, onClose }: BookContentsProps) => {
  const [sections, setSections] = useState<ContentSection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadContents = async () => {
      setLoading(true);
      try {
        console.log(`[BookContents] Loading contents for: ${bookKey}`);
        
        // Get table of contents from Sefaria
        const toc = await breslovCrawler.fetchTOC(bookKey);
        
        const extractedSections: ContentSection[] = [];
        
        // Extract all sections based on book structure
        if (bookKey === 'Likutei_Moharan') {
          // Torah sections 1-286 (Part I) + Part II sections
          for (let i = 1; i <= 99; i++) {
            extractedSections.push({
              title: `Torah ${i}`,
              ref: `Likutei_Moharan.${i}`,
              number: i
            });
          }
          
          // Add Part II sections (Tinyana)
          for (let i = 1; i <= 125; i++) {
            extractedSections.push({
              title: `Part II - Torah ${i}`,
              ref: `Likutei_Moharan,_Part_II.${i}`,
              number: i
            });
          }
        } else if (bookKey === 'Sippurei_Maasiyot') {
          // 13 main tales + additional tales
          const tales = [
            'The Lost Princes',
            'The Emperor and the King', 
            'The Son Who Could Not Walk',
            'The King Who Decreed Conversion',
            'The King\'s Son Who Was Made of Precious Stones',
            'The Humble King',
            'The Fly and the Spider',
            'The Rabbi and His Only Son',
            'The Clever Man and the Simple Man',
            'The Butcher and the Pauper',
            'The King\'s Son and the Maid\'s Son Who Were Exchanged',
            'The Prayer Leader',
            'The Seven Beggars'
          ];
          
          tales.forEach((tale, idx) => {
            extractedSections.push({
              title: `Tale ${idx + 1}: ${tale}`,
              ref: `Sippurei_Maasiyot.${idx + 1}`,
              number: idx + 1
            });
          });
          
          // Additional tales
          extractedSections.push({
            title: 'The Treasure Beneath the Bridge',
            ref: 'Sippurei_Maasiyot.14'
          });
          extractedSections.push({
            title: 'The Gentleman Who Traveled With a Coachman',
            ref: 'Sippurei_Maasiyot.15'
          });
          extractedSections.push({
            title: 'A Story of Trust',
            ref: 'Sippurei_Maasiyot.16'
          });
        } else if (bookKey === 'Sichot_HaRan') {
          // Sichot sections 1-332
          for (let i = 1; i <= 332; i++) {
            extractedSections.push({
              title: `Section ${i}`,
              ref: `Sichot_HaRan.${i}`,
              number: i
            });
          }
        } else if (bookKey === 'Likutei_Tefilot') {
          // Prayers 1-210
          for (let i = 1; i <= 210; i++) {
            extractedSections.push({
              title: `Prayer ${i}`,
              ref: `Likutei_Tefilot.${i}`,
              number: i
            });
          }
        } else if (bookKey === 'Sefer_HaMiddot') {
          // Character traits sections
          const traits = [
            'Anger', 'Arrogance', 'Charity', 'Children', 'Clothing', 'Death', 
            'Dreams', 'Faith', 'Fear', 'Food', 'Forgiveness', 'Gossip', 
            'Honesty', 'Honor', 'Humility', 'Joy', 'Justice', 'Kindness',
            'Knowledge', 'Leadership', 'Marriage', 'Money', 'Peace', 'Prayer',
            'Repentance', 'Respect', 'Righteousness', 'Sabbath', 'Speech',
            'Study', 'Truth', 'Wisdom'
          ];
          
          traits.forEach((trait, idx) => {
            extractedSections.push({
              title: trait,
              ref: `Sefer_HaMiddot,_${trait}.1`
            });
          });
        } else {
          // For other books, extract from actual TOC structure
          const extractFromNode = (node: any, path: string = '') => {
            if (node.ref && (!node.nodes || node.nodes.length === 0)) {
              extractedSections.push({
                title: node.title || node.ref,
                ref: node.ref.replace(/ /g, '_')
              });
            } else if (node.nodes) {
              node.nodes.forEach((child: any) => {
                extractFromNode(child, path ? `${path}.${child.title}` : child.title);
              });
            } else if (node.contents) {
              node.contents.forEach((child: any) => {
                extractFromNode(child, path ? `${path}.${child.title}` : child.title);
              });
            }
          };
          
          if (toc.schema) {
            extractFromNode(toc.schema);
          }
        }
        
        setSections(extractedSections);
        console.log(`[BookContents] Found ${extractedSections.length} sections for ${bookTitle}`);
      } catch (error) {
        console.error('[BookContents] Error loading contents:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadContents();
  }, [bookKey, bookTitle]);

  const handleSectionClick = (section: ContentSection) => {
    onTextSelect(section.ref, `${bookTitle} - ${section.title}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg w-full max-w-4xl h-5/6 flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-600">
          <div>
            <h2 className="text-2xl font-crimson font-semibold text-amber-400">{bookTitle}</h2>
            <p className="text-slate-400 text-sm">Table des matières - {sections.length} sections</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-red-400 transition-colors"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
            </svg>
          </button>
        </div>

        {/* Contents Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center text-slate-400 py-8">
              Chargement des contenus...
            </div>
          ) : (
            <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
              {sections.map((section, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSectionClick(section)}
                  className="p-3 bg-slate-700 hover:bg-slate-600 rounded text-center transition-colors group"
                  title={section.title}
                >
                  <div className="text-amber-400 font-medium text-sm">
                    {section.number || idx + 1}
                  </div>
                  <div className="text-xs text-slate-300 truncate group-hover:text-white">
                    {section.title.length > 12 ? `${section.title.substring(0, 12)}...` : section.title}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-600 text-center">
          <p className="text-sm text-slate-400">
            Cliquez sur un numéro pour accéder au texte complet et à l'analyse spirituelle
          </p>
        </div>
      </div>
    </div>
  );
};