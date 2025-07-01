import { describe, test, expect } from 'vitest';
import { generateAllReferences, getTotalReferenceCount } from '../client/src/utils/generateAllReferences.js';

describe('Breslov References Generation', () => {
  test('generateAllReferences() should return 1365+ texts', () => {
    const references = generateAllReferences();
    
    expect(references).toBeDefined();
    expect(Array.isArray(references)).toBe(true);
    expect(references.length).toBeGreaterThanOrEqual(1365);
    
    console.log(`✓ Generated ${references.length} references (target: ≥1365)`);
  });

  test('getTotalReferenceCount() should match actual generation', () => {
    const totalCount = getTotalReferenceCount();
    const actualReferences = generateAllReferences();
    
    expect(totalCount).toBe(actualReferences.length);
    expect(totalCount).toBeGreaterThanOrEqual(1365);
    
    console.log(`✓ Total count matches: ${totalCount} references`);
  });

  test('All references should have required properties', () => {
    const references = generateAllReferences();
    
    references.forEach(ref => {
      expect(ref).toHaveProperty('ref');
      expect(ref).toHaveProperty('title');
      expect(ref).toHaveProperty('book');
      expect(ref).toHaveProperty('section');
      expect(ref).toHaveProperty('hebrewTitle');
      expect(ref).toHaveProperty('category');
      expect(ref).toHaveProperty('verified');
      
      expect(typeof ref.ref).toBe('string');
      expect(typeof ref.title).toBe('string');
      expect(typeof ref.book).toBe('string');
      expect(typeof ref.section).toBe('number');
      expect(typeof ref.hebrewTitle).toBe('string');
      expect(typeof ref.category).toBe('string');
      expect(typeof ref.verified).toBe('boolean');
    });
    
    console.log(`✓ All ${references.length} references have valid properties`);
  });

  test('Section numbers should be within valid ranges', () => {
    const references = generateAllReferences();
    
    references.forEach(ref => {
      expect(ref.section).toBeGreaterThan(0);
      
      // Specific validation for known problematic books
      if (ref.book === 'Sefer HaMiddot') {
        expect(ref.section).toBeLessThanOrEqual(31);
      }
      if (ref.book === 'Chayei Moharan') {
        expect(ref.section).toBeLessThanOrEqual(14);
      }
    });
    
    console.log(`✓ All section numbers are within valid ranges`);
  });
});