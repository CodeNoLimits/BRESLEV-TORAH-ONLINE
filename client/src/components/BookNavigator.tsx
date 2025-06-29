import { useState, useEffect } from 'react';
import { SefariaText, Language } from '../types';

interface BookSection {
  ref: string;
  title: string;
  number: string;
}

interface BookNavigatorProps {
  bookTitle: string;
  onSectionSelect: (ref: string) => void;
  onClose: () => void;
  language: Language;
}

export const BookNavigator = ({ bookTitle, onSectionSelect, onClose, language }: BookNavigatorProps) => {
  const [sections, setSections] = useState<BookSection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookIndex = async () => {
      try {
        setLoading(true);
        console.log(`[BookNavigator] Fetching complete structure for: ${bookTitle}`);
        
        // First try the new book sections endpoint
        const sectionsResponse = await fetch(`/api/book-sections/${encodeURIComponent(bookTitle)}`);
        if (sectionsResponse.ok) {
          const bookSections = await sectionsResponse.json();
          setSections(bookSections);
          console.log(`[BookNavigator] Found ${bookSections.length} sections for ${bookTitle} via book sections endpoint`);
          return;
        }
        
        // Fallback to Sefaria index
        const response = await fetch(`/sefaria-api/index/${encodeURIComponent(bookTitle)}`);
        if (response.ok) {
          const indexData = await response.json();
          
          // Generate section references based on book structure
          const bookSections: BookSection[] = [];
          
          if (indexData.schema?.nodes) {
            // Complex book structure - extract all available sections
            indexData.schema.nodes.forEach((node: any, index: number) => {
              if (node.nodeType === 'JaggedArrayNode' || node.nodeType === 'ArrayMapNode') {
                const sectionNum = index + 1;
                bookSections.push({
                  ref: `${bookTitle} ${sectionNum}`,
                  title: node.title || `Section ${sectionNum}`,
                  number: sectionNum.toString()
                });
              }
            });
          } else if (indexData.lengths && Array.isArray(indexData.lengths)) {
            // Use actual lengths to determine available sections
            const totalSections = indexData.lengths[0] || 10;
            for (let i = 1; i <= totalSections; i++) {
              bookSections.push({
                ref: `${bookTitle} ${i}`,
                title: `Torah ${i}`,
                number: i.toString()
              });
            }
          } else {
            // Default sections for known books
            for (let i = 1; i <= 10; i++) {
              bookSections.push({
                ref: `${bookTitle} ${i}`,
                title: `Section ${i}`,
                number: i.toString()
              });
            }
          }
          
          setSections(bookSections);
          console.log(`[BookNavigator] Found ${bookSections.length} sections for ${bookTitle} via Sefaria fallback`);
        } else {
          console.error(`[BookNavigator] Failed to fetch book index for ${bookTitle}`);
        }
      } catch (error) {
        console.error(`[BookNavigator] Error fetching book structure:`, error);
      } finally {
        setLoading(false);
      }
    };

    fetchBookIndex();
  }, [bookTitle]);

  return (
    <div className="bg-slate-850 border-b border-slate-700 p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-crimson font-semibold text-amber-400">
          {bookTitle} - Navigation
        </h3>
        <button
          className="text-slate-400 hover:text-red-400 transition-colors"
          onClick={onClose}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
          </svg>
        </button>
      </div>
      
      {loading ? (
        <div className="text-slate-400">Loading book structure...</div>
      ) : (
        <div className="bg-slate-800 rounded-lg p-4 max-h-60 overflow-y-auto">
          <div className="text-slate-300 mb-4">
            Click on any section to read the complete text:
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {sections.map((section) => (
              <button
                key={section.ref}
                onClick={() => onSectionSelect(section.ref)}
                className="bg-slate-700 hover:bg-slate-600 text-slate-200 p-2 rounded transition-colors text-sm"
              >
                {section.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};