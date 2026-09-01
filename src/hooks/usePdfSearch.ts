import { useState, useCallback, useMemo } from 'react';
import type { PdfPageText } from '@/lib/pdf-utils';

interface SearchResult {
  pageNumber: number;
  text: string;
  matchCount: number;
}

interface UsePdfSearchOptions {
  pageTexts: PdfPageText[];
}

interface UsePdfSearchResult {
  query: string;
  setQuery: (query: string) => void;
  results: SearchResult[];
  totalMatches: number;
  currentResultIndex: number;
  setCurrentResultIndex: (index: number) => void;
  currentResult: SearchResult | null;
  nextResult: () => void;
  prevResult: () => void;
  highlightedPages: Set<number>;
}

export function usePdfSearch({ pageTexts }: UsePdfSearchOptions): UsePdfSearchResult {
  const [query, setQuery] = useState('');
  const [currentResultIndex, setCurrentResultIndex] = useState(0);

  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim()) return [];
    const lowerQuery = query.toLowerCase();

    return pageTexts
      .filter(page => page.fullText.toLowerCase().includes(lowerQuery))
      .map(page => ({
        pageNumber: page.pageNumber,
        text: page.fullText,
        matchCount: (page.fullText.toLowerCase().split(lowerQuery).length - 1),
      }));
  }, [pageTexts, query]);

  const totalMatches = useMemo(() => {
    return results.reduce((sum, r) => sum + r.matchCount, 0);
  }, [results]);

  const highlightedPages = useMemo(() => {
    return new Set(results.map(r => r.pageNumber));
  }, [results]);

  const currentResult = results[currentResultIndex] || null;

  const nextResult = useCallback(() => {
    if (results.length === 0) return;
    setCurrentResultIndex(prev => (prev + 1) % results.length);
  }, [results.length]);

  const prevResult = useCallback(() => {
    if (results.length === 0) return;
    setCurrentResultIndex(prev => (prev - 1 + results.length) % results.length);
  }, [results.length]);

  const handleSetQuery = useCallback((newQuery: string) => {
    setQuery(newQuery);
    setCurrentResultIndex(0);
  }, []);

  return {
    query,
    setQuery: handleSetQuery,
    results,
    totalMatches,
    currentResultIndex,
    setCurrentResultIndex,
    currentResult,
    nextResult,
    prevResult,
    highlightedPages,
  };
}
