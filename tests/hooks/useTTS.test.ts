import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTTS } from '../../client/src/hooks/useTTS';

describe('useTTS Hook', () => {
  let mockSpeechSynthesis: any;
  let mockUtteranceInstance: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Create mock utterance instance
    mockUtteranceInstance = {
      text: '',
      lang: '',
      voice: null,
      volume: 1,
      rate: 1,
      pitch: 1,
      onstart: null,
      onend: null,
      onerror: null
    };

    // Mock speechSynthesis
    mockSpeechSynthesis = {
      speak: vi.fn((utterance) => {
        // Simulate immediate start
        if (utterance.onstart) {
          setTimeout(() => utterance.onstart(), 0);
        }
        // Simulate end after 100ms
        if (utterance.onend) {
          setTimeout(() => utterance.onend(), 100);
        }
      }),
      cancel: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      getVoices: vi.fn(() => [
        { name: 'French Voice', lang: 'fr-FR', default: false, localService: true, voiceURI: 'fr' }
      ]),
      speaking: false,
      paused: false,
      pending: false,
      onvoiceschanged: null
    };

    // Setup window.speechSynthesis
    Object.defineProperty(window, 'speechSynthesis', {
      writable: true,
      configurable: true,
      value: mockSpeechSynthesis
    });

    // Mock SpeechSynthesisUtterance
    global.SpeechSynthesisUtterance = vi.fn((text) => {
      const utterance = { ...mockUtteranceInstance };
      utterance.text = text;
      return utterance;
    }) as any;

    // Mock console.log to avoid noise in tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should enable TTS on mount', () => {
    const { result } = renderHook(() => useTTS());
    
    expect(result.current.isSupported).toBe(true);
    expect(result.current.voices.length).toBeGreaterThan(0);
  });

  it('speak() should run when called with valid text', async () => {
    const { result } = renderHook(() => useTTS());
    
    await act(async () => {
      await result.current.speak('Test text to speak', 'fr-FR');
      // Wait for the setTimeout in speak function (200ms) + extra buffer
      await new Promise(resolve => setTimeout(resolve, 300));
    });
    
    expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
    expect(global.SpeechSynthesisUtterance).toHaveBeenCalledWith('Test text to speak');
  });

  it('speak() should not run with empty text', async () => {
    const { result } = renderHook(() => useTTS());
    
    await act(async () => {
      await result.current.speak('', 'fr-FR');
      await new Promise(resolve => setTimeout(resolve, 300));
    });
    
    expect(mockSpeechSynthesis.speak).not.toHaveBeenCalled();
  });

  it('speak() should clean text before speaking', async () => {
    const { result } = renderHook(() => useTTS());
    
    await act(async () => {
      await result.current.speak('<p>Test **text** with *markup*</p>', 'fr-FR');
      await new Promise(resolve => setTimeout(resolve, 300));
    });
    
    expect(global.SpeechSynthesisUtterance).toHaveBeenCalledWith('Test text with markup');
    expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
  });

  it('should provide stop functionality', () => {
    const { result } = renderHook(() => useTTS());
    
    act(() => {
      result.current.stop();
    });
    
    expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
  });

  it('should handle voice selection for different languages', () => {
    mockSpeechSynthesis.getVoices.mockReturnValue([
      { name: 'French Voice', lang: 'fr-FR', default: false, localService: true, voiceURI: 'fr' },
      { name: 'English Voice', lang: 'en-US', default: false, localService: true, voiceURI: 'en' },
      { name: 'Hebrew Voice', lang: 'he-IL', default: false, localService: true, voiceURI: 'he' }
    ]);

    const { result } = renderHook(() => useTTS());
    
    expect(result.current.voices).toHaveLength(3);
  });

  it('should handle speakGreeting functionality', async () => {
    const { result } = renderHook(() => useTTS());
    
    await act(async () => {
      await result.current.speakGreeting();
      // Wait for the setTimeout in speak function (200ms) + extra buffer
      await new Promise(resolve => setTimeout(resolve, 300));
    });
    
    expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
    expect(global.SpeechSynthesisUtterance).toHaveBeenCalledWith(
      "Bienvenue sur Le Compagnon du Cœur. Que puis-je pour vous aujourd'hui ?"
    );
  });
});