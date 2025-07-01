import { describe, test, expect, vi, beforeEach } from 'vitest';
import { validateRefAsync, generatePath, generateValidatedPath, fetchBooksMeta, clearMetaCache } from '../../client/src/utils/validateRef';

// Mock fetch
global.fetch = vi.fn();

const mockMetaResponse = {
  books: {
    "Sefer HaMiddot": {
      maxSections: 31,
      verified: true,
      baseRef: "Sefer HaMiddot",
      hebrewTitle: "ספר המידות",
      category: "Sefer HaMiddot"
    },
    "Chayei Moharan": {
      maxSections: 14,
      verified: true,
      baseRef: "Chayei Moharan",
      hebrewTitle: "חיי מוהר\"ן",
      category: "Chayei Moharan"
    },
    "Likutei Tefilot": {
      maxSections: 210,
      verified: false,
      baseRef: "Likutei Tefilot",
      hebrewTitle: "ליקוטי תפילות",
      category: "Likutei Tefilot"
    }
  },
  totalBooks: 3,
  lastUpdated: "2025-06-30T23:35:00.000Z",
  cacheValidityMinutes: 5
};

describe('validateRef utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearMetaCache();
    
    (fetch as vi.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockMetaResponse)
    });
  });

  test('fetchBooksMeta should fetch and cache data', async () => {
    const result = await fetchBooksMeta();
    
    expect(fetch).toHaveBeenCalledWith('/api/books/meta');
    expect(result).toEqual(mockMetaResponse);
  });

  test('fetchBooksMeta should use cache on second call', async () => {
    await fetchBooksMeta();
    await fetchBooksMeta();
    
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  test('validateRefAsync should validate existing sections correctly', async () => {
    const result = await validateRefAsync('Sefer HaMiddot', 15);
    
    expect(result.valid).toBe(true);
    expect(result.message).toBeUndefined();
  });

  test('validateRefAsync should reject sections beyond maxSections', async () => {
    const result = await validateRefAsync('Sefer HaMiddot', 34);
    
    expect(result.valid).toBe(false);
    expect(result.message).toContain('Section 34 does not exist');
    expect(result.message).toContain('31 sections maximum');
    expect(result.maxSections).toBe(31);
  });

  test('validateRefAsync should reject sections for Chayei Moharan beyond 14', async () => {
    const result = await validateRefAsync('Chayei Moharan', 15);
    
    expect(result.valid).toBe(false);
    expect(result.message).toContain('Section 15 does not exist');
    expect(result.message).toContain('14 sections maximum');
    expect(result.maxSections).toBe(14);
  });

  test('validateRefAsync should reject unverified books', async () => {
    const result = await validateRefAsync('Likutei Tefilot', 5);
    
    expect(result.valid).toBe(false);
    expect(result.message).toContain('not fully verified');
    expect(result.maxSections).toBe(210);
  });

  test('validateRefAsync should reject unknown books', async () => {
    const result = await validateRefAsync('Unknown Book', 1);
    
    expect(result.valid).toBe(false);
    expect(result.message).toContain('not found in library');
  });

  test('validateRefAsync should reject invalid section numbers', async () => {
    const result = await validateRefAsync('Sefer HaMiddot', 0);
    
    expect(result.valid).toBe(false);
    expect(result.message).toContain('must be greater than 0');
  });

  test('generatePath should create kebab-case URLs', () => {
    expect(generatePath('Sefer HaMiddot', 15)).toBe('/docs/sefer-hamiddot/15');
    expect(generatePath('Chayei Moharan', 5)).toBe('/docs/chayei-moharan/5');
  });

  test('generateValidatedPath should return path for valid references', async () => {
    const result = await generateValidatedPath('Sefer HaMiddot', 15);
    
    expect(result.path).toBe('/docs/sefer-hamiddot/15');
    expect(result.error).toBeUndefined();
  });

  test('generateValidatedPath should return error for invalid references', async () => {
    const result = await generateValidatedPath('Sefer HaMiddot', 34);
    
    expect(result.path).toBeNull();
    expect(result.error).toContain('Section 34 does not exist');
  });

  test('should handle fetch errors gracefully', async () => {
    (fetch as vi.Mock).mockRejectedValue(new Error('Network error'));
    
    const result = await validateRefAsync('Sefer HaMiddot', 15);
    
    expect(result.valid).toBe(false);
    expect(result.message).toContain('server error');
  });
});