import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  searchIcd10, getChapters, getCodesByChapter, getChapterName,
  type Icd10Code, type Icd10Diagnosis, ICD10_MAX_DIAGNOSES,
} from '@/lib/icd10-utils';

interface Icd10SelectorProps {
  value: Icd10Diagnosis[];
  onChange: (diagnoses: Icd10Diagnosis[]) => void;
  maxSelections?: number;
  disabled?: boolean;
}

export function Icd10Selector({
  value,
  onChange,
  maxSelections = ICD10_MAX_DIAGNOSES,
  disabled = false,
}: Icd10SelectorProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [expandedChapter, setExpandedChapter] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedCodes = useMemo(() => new Set(value.map(d => d.code)), [value]);

  const searchResults = useMemo(() => {
    if (!query || query.length < 2) return [];
    return searchIcd10(query, 30);
  }, [query]);

  const chapters = useMemo(() => getChapters(), []);

  const chapterCodes = useMemo(() => {
    if (expandedChapter === null) return [];
    return getCodesByChapter(expandedChapter).filter(c => !selectedCodes.has(c.code));
  }, [expandedChapter, selectedCodes]);

  const handleSelect = useCallback((code: Icd10Code) => {
    if (selectedCodes.has(code.code)) return;
    if (value.length >= maxSelections) return;
    onChange([...value, { code: code.code, es: code.es, en: code.en }]);
    setQuery('');
    inputRef.current?.focus();
  }, [value, onChange, selectedCodes, maxSelections]);

  const handleRemove = useCallback((code: string) => {
    onChange(value.filter(d => d.code !== code));
  }, [value, onChange]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isAtLimit = value.length >= maxSelections;

  return (
    <div ref={containerRef} className="relative">
      {/* Selected chips */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {value.map(d => (
            <Badge key={d.code} variant="secondary" className="gap-1 pr-1 text-xs">
              <span className="font-mono font-bold">{d.code}</span>
              <span className="max-w-[180px] truncate">{d.es}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 hover:bg-destructive/20"
                onClick={() => handleRemove(d.code)}
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); setExpandedChapter(null); }}
          onFocus={() => { setIsOpen(true); setExpandedChapter(null); }}
          placeholder={isAtLimit ? `Máximo ${maxSelections} diagnósticos` : "Buscar por código o descripción CIE-10..."}
          disabled={disabled || isAtLimit}
          className="pl-9"
        />
      </div>

      {/* Dropdown */}
      {isOpen && !isAtLimit && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          <ScrollArea className="max-h-[400px]">
            {query.length >= 2 ? (
              searchResults.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Sin resultados para "{query}"
                </div>
              ) : (
                <div className="p-1">
                  {searchResults.map(code => (
                    <button
                      key={code.code}
                      onClick={() => handleSelect(code)}
                      disabled={selectedCodes.has(code.code)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-sm text-sm hover:bg-accent transition-colors",
                        selectedCodes.has(code.code) && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <span className="font-mono font-bold text-primary shrink-0">{code.code}</span>
                        <div className="min-w-0">
                          <p className="truncate">{code.es}</p>
                          <p className="text-xs text-muted-foreground truncate">{code.en}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )
            ) : (
              <div className="p-1">
                {chapters.map(ch => (
                  <div key={ch.chapter}>
                    <button
                      onClick={() => setExpandedChapter(expandedChapter === ch.chapter ? null : ch.chapter)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent rounded-sm"
                    >
                      {expandedChapter === ch.chapter ? (
                        <ChevronDown className="h-4 w-4 shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0" />
                      )}
                      <span className="truncate text-left">{ch.name}</span>
                      <Badge variant="outline" className="ml-auto text-xs shrink-0">{ch.count}</Badge>
                    </button>
                    {expandedChapter === ch.chapter && (
                      <div className="pl-6">
                        {chapterCodes.slice(0, 50).map(code => (
                          <button
                            key={code.code}
                            onClick={() => handleSelect(code)}
                            className="w-full text-left px-3 py-1.5 rounded-sm text-sm hover:bg-accent transition-colors"
                          >
                            <span className="font-mono font-bold text-primary">{code.code}</span>
                            <span className="ml-2 truncate">{code.es}</span>
                          </button>
                        ))}
                        {chapterCodes.length > 50 && (
                          <p className="px-3 py-1 text-xs text-muted-foreground">
                            +{chapterCodes.length - 50} más... usa la búsqueda
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          <div className="border-t p-2 text-xs text-muted-foreground text-center">
            {value.length}/{maxSelections} diagnósticos
          </div>
        </div>
      )}
    </div>
  );
}
