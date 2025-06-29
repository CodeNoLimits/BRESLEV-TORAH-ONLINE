/**
 * Text Segmentation Service for Breslov texts
 * Intelligently segments text by Hebrew markers (א, ב, ג) and semantic breaks
 */

export interface TextSegment {
  id: string;
  marker?: string; // Hebrew marker like א, ב, ג
  content: string;
  length: number;
  isComplete: boolean;
}

export interface SegmentationResult {
  segments: TextSegment[];
  totalLength: number;
  recommended: TextSegment[]; // Best segments for AI context
}

export class TextSegmenter {
  private static readonly HEBREW_MARKERS = [
    'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י',
    'יא', 'יב', 'יג', 'יד', 'טו', 'טז', 'יז', 'יח', 'יט', 'כ'
  ];

  private static readonly MAX_CONTEXT_LENGTH = 8000; // Safe limit for Gemini
  private static readonly MIN_SEGMENT_LENGTH = 100;
  private static readonly IDEAL_SEGMENT_LENGTH = 2000;

  /**
   * Segments text by Hebrew markers and semantic breaks
   */
  static segmentText(text: string | string[], title?: string): SegmentationResult {
    const fullText = Array.isArray(text) ? text.join('\n\n') : text;
    console.log(`[TextSegmenter] Processing text: ${fullText.length} chars`);

    // Split by Hebrew markers first
    const markerSegments = this.splitByHebrewMarkers(fullText);
    
    // If no markers found, split by paragraphs
    const segments = markerSegments.length > 1 
      ? markerSegments 
      : this.splitByParagraphs(fullText);

    // Select best segments for AI context
    const recommended = this.selectOptimalSegments(segments, title);

    console.log(`[TextSegmenter] Created ${segments.length} segments, ${recommended.length} recommended`);

    return {
      segments,
      totalLength: fullText.length,
      recommended
    };
  }

  /**
   * Split text by Hebrew markers (א, ב, ג, etc.)
   */
  private static splitByHebrewMarkers(text: string): TextSegment[] {
    const segments: TextSegment[] = [];
    
    // Pattern to match Hebrew markers at start of line or after whitespace
    const markerPattern = new RegExp(`(^|\\s+)(${this.HEBREW_MARKERS.join('|')})[\\.\\s-]`, 'gm');
    
    let lastIndex = 0;
    let match;
    let segmentCounter = 0;

    while ((match = markerPattern.exec(text)) !== null) {
      // Add previous segment if it exists
      if (match.index > lastIndex) {
        const content = text.slice(lastIndex, match.index).trim();
        if (content.length > this.MIN_SEGMENT_LENGTH) {
          segments.push({
            id: `seg-${segmentCounter++}`,
            content,
            length: content.length,
            isComplete: true
          });
        }
      }

      const marker = match[2];
      const markerStart = match.index + match[1].length;
      
      // Find next marker or end of text
      const nextMarkerMatch = markerPattern.exec(text);
      const segmentEnd = nextMarkerMatch ? nextMarkerMatch.index : text.length;
      
      // Reset regex position for next iteration
      if (nextMarkerMatch) {
        markerPattern.lastIndex = nextMarkerMatch.index;
      }

      const content = text.slice(markerStart, segmentEnd).trim();
      if (content.length > this.MIN_SEGMENT_LENGTH) {
        segments.push({
          id: `seg-${marker}-${segmentCounter++}`,
          marker,
          content,
          length: content.length,
          isComplete: true
        });
      }

      lastIndex = segmentEnd;
    }

    // Add final segment if remaining text exists
    if (lastIndex < text.length) {
      const content = text.slice(lastIndex).trim();
      if (content.length > this.MIN_SEGMENT_LENGTH) {
        segments.push({
          id: `seg-final-${segmentCounter}`,
          content,
          length: content.length,
          isComplete: true
        });
      }
    }

    return segments;
  }

  /**
   * Split text by paragraphs when no Hebrew markers found
   */
  private static splitByParagraphs(text: string): TextSegment[] {
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > this.MIN_SEGMENT_LENGTH);
    
    return paragraphs.map((paragraph, index) => ({
      id: `para-${index}`,
      content: paragraph.trim(),
      length: paragraph.length,
      isComplete: true
    }));
  }

  /**
   * Select optimal segments for AI context within token limits
   */
  private static selectOptimalSegments(segments: TextSegment[], title?: string): TextSegment[] {
    const recommended: TextSegment[] = [];
    let totalLength = 0;

    // Prioritize segments with markers (main teachings)
    const markedSegments = segments.filter(s => s.marker);
    const unmarkedSegments = segments.filter(s => !s.marker);

    // Add context header if title provided
    if (title) {
      totalLength += title.length + 50; // Account for formatting
    }

    // Add marked segments first (priority content)
    for (const segment of markedSegments) {
      if (totalLength + segment.length <= this.MAX_CONTEXT_LENGTH) {
        recommended.push(segment);
        totalLength += segment.length;
      }
    }

    // Add unmarked segments if space allows
    for (const segment of unmarkedSegments) {
      if (totalLength + segment.length <= this.MAX_CONTEXT_LENGTH) {
        recommended.push(segment);
        totalLength += segment.length;
      }
    }

    // If no segments fit, take the first one (truncated if necessary)
    if (recommended.length === 0 && segments.length > 0) {
      const firstSegment = segments[0];
      const truncatedContent = firstSegment.content.slice(0, this.MAX_CONTEXT_LENGTH - 200);
      
      recommended.push({
        ...firstSegment,
        content: truncatedContent,
        length: truncatedContent.length,
        isComplete: false
      });
    }

    return recommended;
  }

  /**
   * Format segments for AI prompt with proper context structure
   */
  static formatForAI(result: SegmentationResult, title?: string): string {
    const { recommended } = result;
    
    let formatted = '';
    
    if (title) {
      formatted += `=== ${title} ===\n\n`;
    }

    recommended.forEach((segment, index) => {
      if (segment.marker) {
        formatted += `${segment.marker}. ${segment.content}\n\n`;
      } else {
        formatted += `${segment.content}\n\n`;
      }
    });

    if (recommended.some(s => !s.isComplete)) {
      formatted += '\n[Note: Texte tronqué pour respecter les limites de contexte]';
    }

    return formatted.trim();
  }

  /**
   * Get segment by marker for specific analysis
   */
  static getSegmentByMarker(result: SegmentationResult, marker: string): TextSegment | null {
    return result.segments.find(s => s.marker === marker) || null;
  }
}