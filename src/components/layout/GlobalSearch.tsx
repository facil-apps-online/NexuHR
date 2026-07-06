import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Loader2, Users, GraduationCap, ClipboardCheck, HeartPulse, Stethoscope, ShieldCheck, FileSignature, Mail, Shirt, BookOpen, CornerDownLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useGlobalSearch, SearchCategory, CATEGORY_META, SearchResult } from "@/hooks/useGlobalSearch";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Users, GraduationCap, ClipboardCheck, HeartPulse, Stethoscope,
  ShieldCheck, FileSignature, Mail, Shirt, BookOpen,
};

function SearchResults({
  query,
  results,
  isLoading,
  activeIndex,
  onSelect,
  onHover,
}: {
  query: string;
  results: ReturnType<typeof useGlobalSearch>["data"];
  isLoading: boolean;
  activeIndex: number;
  onSelect: (result: SearchResult) => void;
  onHover: (index: number) => void;
}) {
  const allResults: SearchResult[] = results ? Object.values(results).flat() : [];
  const categoryKeys = results
    ? (Object.keys(results) as SearchCategory[]).filter((k) => results[k]!.length > 0)
    : [];

  const flatIndexedResults: { result: SearchResult; globalIndex: number }[] = [];
  let idx = 0;
  for (const cat of categoryKeys) {
    for (const r of results![cat]!) {
      flatIndexedResults.push({ result: r, globalIndex: idx });
      idx++;
    }
  }

  const showDropdown = query.trim().length >= 2;
  const showNoResults = showDropdown && !isLoading && !allResults.length;

  if (!showDropdown) return null;

  return (
    <ScrollArea className="max-h-[70vh] sm:max-h-[400px]">
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Buscando...
        </div>
      ) : showNoResults ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          No se encontraron resultados para "<span className="font-medium text-foreground">{query}</span>"
        </div>
      ) : (
        <div className="py-1">
          {categoryKeys.map((catKey) => {
            const cat = CATEGORY_META[catKey];
            const items = results![catKey]!;
            const IconComponent = ICON_MAP[cat.icon] || Users;

            return (
              <div key={catKey}>
                <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <IconComponent className="h-3 w-3" />
                  {cat.label}
                  <span className="ml-auto text-[10px] bg-muted rounded-full px-1.5 py-0.5">{items.length}</span>
                </div>
                {items.map((item) => {
                  const globalIdx = flatIndexedResults.find(
                    (f) => f.result.id === item.id && f.result.category === item.category
                  )?.globalIndex ?? -1;
                  return (
                    <button
                      key={`${item.category}-${item.id}`}
                      onClick={() => onSelect(item)}
                      onMouseEnter={() => onHover(globalIdx)}
                      className={cn(
                        "w-full flex items-start gap-3 px-3 py-2 text-left text-sm transition-colors",
                        activeIndex === globalIdx
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-muted/50"
                      )}
                    >
                      <IconComponent className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{item.title}</div>
                        {item.subtitle && (
                          <div className="text-xs text-muted-foreground truncate">{item.subtitle}</div>
                        )}
                      </div>
                      {activeIndex === globalIdx && (
                        <CornerDownLeft className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </ScrollArea>
  );
}

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const { data: results, isLoading } = useGlobalSearch(query);

  const allResults: SearchResult[] = results ? Object.values(results).flat() : [];

  const flatIndexedResults: { result: SearchResult; globalIndex: number }[] = [];
  let idx = 0;
  const categoryKeys = results
    ? (Object.keys(results) as SearchCategory[]).filter((k) => results[k]!.length > 0)
    : [];
  for (const cat of categoryKeys) {
    for (const r of results![cat]!) {
      flatIndexedResults.push({ result: r, globalIndex: idx });
      idx++;
    }
  }

  const handleSelect = useCallback(
    (result: SearchResult) => {
      navigate(result.route);
      setQuery("");
      setIsOpen(false);
      setMobileOpen(false);
      setActiveIndex(-1);
    },
    [navigate]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => (prev < flatIndexedResults.length - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : flatIndexedResults.length - 1));
      } else if (e.key === "Enter" && activeIndex >= 0) {
        e.preventDefault();
        handleSelect(flatIndexedResults[activeIndex].result);
      } else if (e.key === "Escape") {
        setIsOpen(false);
        setMobileOpen(false);
        setActiveIndex(-1);
      }
    },
    [activeIndex, flatIndexedResults, handleSelect]
  );

  // Close desktop dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard shortcut: Ctrl/Cmd + K
  useEffect(() => {
    function handleShortcut(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    }
    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, []);

  // Focus mobile input when dialog opens
  useEffect(() => {
    if (mobileOpen) {
      setTimeout(() => mobileInputRef.current?.focus(), 100);
    }
  }, [mobileOpen]);

  // Reset query when mobile dialog closes
  const handleMobileOpenChange = (open: boolean) => {
    setMobileOpen(open);
    if (!open) {
      setQuery("");
      setActiveIndex(-1);
    }
  };

  const showDropdown = isOpen && query.trim().length >= 2;

  return (
    <>
      {/* Desktop */}
      <div ref={containerRef} className="relative hidden sm:block">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          placeholder="Buscar... (Ctrl+K)"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => {
            if (query.trim().length >= 2) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className="w-64 lg:w-80 pl-10 pr-16"
        />
        <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 xl:flex">
          <span className="text-xs">Ctrl</span>
          <span className="text-xs">K</span>
        </kbd>

        {showDropdown && (
          <div className="absolute top-full left-0 z-50 mt-1 w-[420px] rounded-lg border bg-popover shadow-xl">
            <SearchResults
              query={query}
              results={results}
              isLoading={isLoading}
              activeIndex={activeIndex}
              onSelect={handleSelect}
              onHover={setActiveIndex}
            />
          </div>
        )}
      </div>

      {/* Mobile button */}
      <Button
        variant="ghost"
        size="icon"
        className="sm:hidden"
        onClick={() => setMobileOpen(true)}
      >
        <Search className="h-5 w-5" />
      </Button>

      {/* Mobile dialog */}
      <Dialog open={mobileOpen} onOpenChange={handleMobileOpenChange}>
        <DialogContent className="top-[5%] translate-y-0 p-0 gap-0 max-h-[85vh] flex flex-col">
          <DialogTitle className="sr-only">Buscar</DialogTitle>
          <div className="flex items-center border-b px-4 py-3">
            <Search className="mr-3 h-5 w-5 shrink-0 text-muted-foreground" />
            <input
              ref={mobileInputRef}
              type="text"
              placeholder="Buscar empleados, documentos..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(-1);
              }}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="overflow-y-auto flex-1">
            <SearchResults
              query={query}
              results={results}
              isLoading={isLoading}
              activeIndex={activeIndex}
              onSelect={handleSelect}
              onHover={setActiveIndex}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
