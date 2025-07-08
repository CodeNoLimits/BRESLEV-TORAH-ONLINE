"use client"

import { useQuery } from '@tanstack/react-query'
import { booksApi, textsApi, type Book, type Text } from '@/lib/api'

export function useBooks() {
  return useQuery({
    queryKey: ['books'],
    queryFn: () => booksApi.getAll().then(res => res.data),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useBook(slug: string) {
  return useQuery({
    queryKey: ['books', slug],
    queryFn: () => booksApi.getBySlug(slug).then(res => res.data),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  })
}

export function useTextSearch(query: string, bookSlug?: string, language = 'he') {
  return useQuery({
    queryKey: ['texts', 'search', query, bookSlug, language],
    queryFn: () => textsApi.search(query, bookSlug, language).then(res => res.data),
    enabled: !!query && query.length > 2,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

export function useText(ref: string) {
  return useQuery({
    queryKey: ['texts', ref],
    queryFn: () => textsApi.getByRef(ref).then(res => res.data),
    enabled: !!ref,
    staleTime: 5 * 60 * 1000,
  })
}

export function useTextRange(
  bookSlug: string, 
  startChapter: number, 
  endChapter: number, 
  language = 'he'
) {
  return useQuery({
    queryKey: ['texts', 'range', bookSlug, startChapter, endChapter, language],
    queryFn: () => textsApi.getRange(bookSlug, startChapter, endChapter, language).then(res => res.data),
    enabled: !!bookSlug && startChapter > 0 && endChapter >= startChapter,
    staleTime: 5 * 60 * 1000,
  })
}