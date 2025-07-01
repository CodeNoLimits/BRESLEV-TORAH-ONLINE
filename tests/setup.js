// Test setup file
import { beforeEach } from 'vitest';

// Mock localStorage for tests
beforeEach(() => {
  global.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    length: 0,
    key: () => null
  };
});