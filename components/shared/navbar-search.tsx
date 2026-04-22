"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useOnClickOutside } from "@/hooks/useOnClickOutside";
import { getPosterUrl } from "@/lib/poster";
import { cn } from "@/lib/utils";

const SEARCH_DEBOUNCE_MS = 350;
const SEARCH_RESULTS_LIMIT = 6;
const SEARCH_DROPDOWN_ID = "navbar-search-results";
const SEARCH_ENDPOINT = "/api/search";

interface AnimeShowcaseItem {
  id: number;
  title: string;
  image_url: string;
  score: number | null;
}

interface SearchApiResponse {
  results?: AnimeShowcaseItem[];
}

export function NavbarSearch() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<AnimeShowcaseItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const activeSearchControllerRef = useRef<AbortController | null>(null);
  const router = useRouter();

  const closeDropdown = useCallback(() => {
    setIsDropdownOpen(false);
    setActiveIndex(-1);
  }, []);

  useOnClickOutside(searchContainerRef, closeDropdown, isDropdownOpen);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [query]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!debouncedQuery) {
      activeSearchControllerRef.current?.abort();
      activeSearchControllerRef.current = null;
      setResults([]);
      setIsSearching(false);
      setHasSearched(false);
      return;
    }

    activeSearchControllerRef.current?.abort();
    const controller = new AbortController();
    activeSearchControllerRef.current = controller;

    setIsSearching(true);
    setHasSearched(false);
    setIsDropdownOpen(true);
    setActiveIndex(-1);

    const searchParams = new URLSearchParams({
      q: debouncedQuery,
      limit: String(SEARCH_RESULTS_LIMIT),
    });

    void fetch(`${SEARCH_ENDPOINT}?${searchParams.toString()}`, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Search API request failed: ${response.status}`);
        }

        const payload = (await response.json()) as SearchApiResponse;

        return Array.isArray(payload.results) ? payload.results : [];
      })
      .then((items) => {
        if (controller.signal.aborted) {
          return;
        }

        setResults(items);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        if (controller.signal.aborted) {
          return;
        }

        setResults([]);
      })
      .finally(() => {
        if (controller.signal.aborted) {
          return;
        }

        setIsSearching(false);
        setHasSearched(true);
      });

    return () => {
      controller.abort();

      if (activeSearchControllerRef.current === controller) {
        activeSearchControllerRef.current = null;
      }
    };
  }, [debouncedQuery]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    return () => {
      activeSearchControllerRef.current?.abort();
      activeSearchControllerRef.current = null;
    };
  }, []);

  const isDropdownVisible = useMemo(() => {
    if (!isDropdownOpen || !query.trim()) {
      return false;
    }

    if (isSearching) {
      return true;
    }

    return results.length > 0 || hasSearched;
  }, [hasSearched, isDropdownOpen, isSearching, query, results.length]);

  const activeDescendantId =
    activeIndex >= 0 && results[activeIndex]
      ? `navbar-search-result-${results[activeIndex].id}`
      : undefined;

  const navigateToSearchPage = useCallback(
    (rawQuery: string) => {
      const normalizedQuery = rawQuery.trim();

      if (!normalizedQuery) {
        return;
      }

      closeDropdown();
      router.push(`/search?q=${encodeURIComponent(normalizedQuery)}`);
    },
    [closeDropdown, router],
  );

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    navigateToSearchPage(query);
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextQuery = event.target.value;

    setQuery(nextQuery);
    setActiveIndex(-1);

    if (!nextQuery.trim()) {
      activeSearchControllerRef.current?.abort();
      activeSearchControllerRef.current = null;
      setResults([]);
      setIsSearching(false);
      setHasSearched(false);
      closeDropdown();
    }
  };

  const handleInputFocus = () => {
    if (!query.trim()) {
      return;
    }

    if (isSearching || results.length > 0 || hasSearched) {
      setIsDropdownOpen(true);
    }
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      closeDropdown();
      return;
    }

    if (results.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsDropdownOpen(true);
      setActiveIndex((currentIndex) =>
        currentIndex < results.length - 1 ? currentIndex + 1 : 0,
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setIsDropdownOpen(true);
      setActiveIndex((currentIndex) =>
        currentIndex > 0 ? currentIndex - 1 : results.length - 1,
      );
      return;
    }

    if (event.key === "Enter" && activeIndex >= 0) {
      const selectedAnime = results[activeIndex];

      if (!selectedAnime) {
        return;
      }

      event.preventDefault();
      closeDropdown();
      router.push(`/anime/${selectedAnime.id}`);
    }
  };

  return (
    <form
      onSubmit={handleSearch}
      className="order-3 flex w-full items-center gap-2 sm:order-2 sm:w-auto sm:max-w-xl sm:flex-1"
    >
      <div ref={searchContainerRef} className="relative min-w-0 flex-1">
        <Input
          aria-label="РџРѕРёСЃРє Р°РЅРёРјРµ"
          aria-autocomplete="list"
          aria-controls={isDropdownVisible ? SEARCH_DROPDOWN_ID : undefined}
          aria-expanded={isDropdownVisible}
          aria-haspopup="listbox"
          aria-activedescendant={activeDescendantId}
          role="combobox"
          placeholder="РќР°Р№С‚Рё С‚Р°Р№С‚Р», Р¶Р°РЅСЂ РёР»Рё СЃС‚СѓРґРёСЋ"
          className="h-10 min-w-0 flex-1 bg-muted/40"
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleInputKeyDown}
        />

        {isDropdownVisible && (
          <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-xl border border-border/70 bg-popover/95 shadow-2xl backdrop-blur">
            {isSearching ? (
              <div className="space-y-2 p-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={`search-skeleton-${index}`} className="flex items-center gap-3">
                    <Skeleton className="h-12 w-9 shrink-0 rounded-md" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-4/5" />
                      <Skeleton className="h-3 w-2/5" />
                    </div>
                  </div>
                ))}
              </div>
            ) : results.length > 0 ? (
              <ul
                id={SEARCH_DROPDOWN_ID}
                role="listbox"
                className="max-h-80 overflow-y-auto overflow-x-hidden p-1.5 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-700 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-600"
                onMouseLeave={() => setActiveIndex(-1)}
              >
                {results.map((anime, index) => {
                  const isActive = activeIndex === index;

                  return (
                    <li
                      key={anime.id}
                      id={`navbar-search-result-${anime.id}`}
                      role="option"
                      aria-selected={isActive}
                    >
                      <Link
                        href={`/anime/${anime.id}`}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-2 py-2 transition-colors",
                          isActive
                            ? "bg-muted text-foreground"
                            : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                        )}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={closeDropdown}
                      >
                        <div className="relative h-12 w-9 shrink-0 overflow-hidden rounded-md border border-border/60">
                          <Image
                            src={getPosterUrl(anime.image_url)}
                            alt={anime.title}
                            fill
                            sizes="36px"
                            className="object-cover"
                          />
                        </div>

                        <div className="min-w-0">
                          <p className="line-clamp-1 text-sm font-medium text-foreground">
                            {anime.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {anime.score !== null
                              ? `РћС†РµРЅРєР°: ${anime.score.toFixed(2)}`
                              : "РћС†РµРЅРєР°: N/A"}
                          </p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="px-4 py-3 text-sm text-muted-foreground">
                РџРѕ РІР°С€РµРјСѓ Р·Р°РїСЂРѕСЃСѓ РЅРёС‡РµРіРѕ РЅРµ РЅР°Р№РґРµРЅРѕ
              </p>
            )}
          </div>
        )}
      </div>

      <Button type="submit" className="h-10">
        <Search className="size-4 sm:hidden" />
        <span className="sr-only sm:hidden">РџРѕРёСЃРє</span>
        <span className="hidden sm:inline">РџРѕРёСЃРє</span>
      </Button>
    </form>
  );
}
