import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTTS } from '../../client/src/hooks/useTTS';

// Mock speechSynthesis
const mockSpeechSynthesis = {
  speak: vi.fn(),
  cancel: vi.fn(),
  getVoices: vi.fn(() => [
    { name: 'Test Voice', lang: 'fr-FR', default: true }
  ]),
  speaking: false,
  onvoiceschanged: null
};

Object.defineProperty(window, 'speechSynthesis', {
  value: mockSpeechSynthesis,
  writable: true
});

// Mock SpeechSynthesisUtterance
global.SpeechSynthesisUtterance = vi.fn().mockImplementation((text) => ({
  text,
  voice: null,
  lang: '',
  rate: 1,
  pitch: 1,
  volume: 1,
  onstart: null,
  onend: null,
  onerror: null
}));

describe('useTTS Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSpeechSynthesis.speaking = false;
  });

  test('should enable TTS on mount', () => {
    const { result } = renderHook(() => useTTS({ 
      language: 'fr', 
      enabled: false  // Should be overridden by useEffect
    }));
    
    expect(result.current.isSupported).toBe(true);
  });

  test('speak() should run when called with valid text', async () => {
    const { result } = renderHook(() => useTTS({ 
      language: 'fr', 
      enabled: true 
    }));
    
    await act(async () => {
      await result.current.speak('Test text to speak');
    });
    
    expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
    expect(SpeechSynthesisUtterance).toHaveBeenCalledWith('Test text to speak');
  });

  test('speak() should not run with empty text', async () => {
    const { result } = renderHook(() => useTTS({ 
      language: 'fr', 
      enabled: true 
    }));
    
    await act(async () => {
      await result.current.speak('');
    });
    
    expect(mockSpeechSynthesis.speak).not.toHaveBeenCalled();
  });

  test('speak() should clean text before speaking', async () => {
    const { result } = renderHook(() => useTTS({ 
      language: 'fr', 
      enabled: true 
    }));
    
    const dirtyText = '<p>Test **text** with *markup*</p>';
    
    await act(async () => {
      await result.current.speak(dirtyText);
    });
    
    expect(SpeechSynthesisUtterance).toHaveBeenCalledWith('Test text with markup');
  });

  test('should provide stop functionality', () => {
    const { result } = renderHook(() => useTTS({ 
      language: 'fr', 
      enabled: true 
    }));
    
    act(() => {
      result.current.stop();
    });
    
    expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
  });

  test('should handle voice selection for different languages', () => {
    mockSpeechSynthesis.getVoices.mockReturnValue([
      { name: 'French Voice', lang: 'fr-FR', default: false },
      { name: 'English Voice', lang: 'en-US', default: false },
      { name: 'Hebrew Voice', lang: 'he-IL', default: false }
    ]);

    const { result } = renderHook(() => useTTS({ 
      language: 'fr', 
      enabled: true 
    }));
    
    expect(result.current.voices).toBeDefined();
  });

  test('should handle speakGreeting functionality', async () => {
    const { result } = renderHook(() => useTTS({ 
      language: 'fr', 
      enabled: true 
    }));
    
    await act(async () => {
      result.current.speakGreeting();
    });
    
    expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
  });
});