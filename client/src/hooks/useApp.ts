import { useState, useCallback } from 'react';
import { Book, Chapter, ChatMode, UseAppReturn } from '../types';

/**
 * Main application state hook
 * Manages global app state including selected book/chapter, chat mode, and errors
 */
export function useApp(): UseAppReturn {
  const [selectedBook, setSelectedBookState] = useState<Book | null>(null);
  const [selectedChapter, setSelectedChapterState] = useState<Chapter | null>(null);
  const [chatMode, setChatModeState] = useState<ChatMode>('chapter');
  const [isLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Book selection handler
  const setSelectedBook = useCallback((book: Book | null) => {
    setSelectedBookState(book);
    // Clear chapter when changing books
    if (book?.id !== selectedBook?.id) {
      setSelectedChapterState(null);
    }
    setError(null);
  }, [selectedBook?.id]);

  // Chapter selection handler
  const setSelectedChapter = useCallback((chapter: Chapter | null) => {
    setSelectedChapterState(chapter);
    setError(null);
  }, []);

  // Chat mode handler
  const setChatMode = useCallback((mode: ChatMode) => {
    setChatModeState(mode);
    setError(null);
  }, []);

  // Error management
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    selectedBook,
    selectedChapter,
    chatMode,
    isLoading,
    error,
    setSelectedBook,
    setSelectedChapter,
    setChatMode,
    clearError
  };
}