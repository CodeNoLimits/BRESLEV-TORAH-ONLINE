/**
 * Utility for getting current text selection from the page
 */
export const getCurrentSelection = (): string => {
  const selection = window.getSelection();
  return selection?.toString().trim() || '';
};

/**
 * Clear current text selection
 */
export const clearSelection = (): void => {
  if (window.getSelection) {
    window.getSelection()?.removeAllRanges();
  }
};

/**
 * Highlight selected text temporarily
 */
export const highlightSelection = (duration: number = 2000): void => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);
  const span = document.createElement('span');
  span.style.backgroundColor = '#fbbf24';
  span.style.transition = 'background-color 0.3s ease';
  
  try {
    range.surroundContents(span);
    
    setTimeout(() => {
      if (span.parentNode) {
        const parent = span.parentNode;
        parent.insertBefore(document.createTextNode(span.textContent || ''), span);
        parent.removeChild(span);
      }
    }, duration);
  } catch (error) {
    // Selection spans multiple elements, just clear it
    console.log('[TextSelection] Complex selection, clearing');
    clearSelection();
  }
};