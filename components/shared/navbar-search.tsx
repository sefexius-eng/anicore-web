"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { Mic, Search } from "lucide-react";
import { useRouter } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";
import { useOnClickOutside } from "@/hooks/useOnClickOutside";
import { cn, getImageUrl } from "@/lib/utils";

const SEARCH_DEBOUNCE_MS = 350;
const SEARCH_RESULTS_LIMIT = 6;
const SEARCH_DROPDOWN_ID = "navbar-search-results";

const subscribeToSpeechRecognitionSupport = () => () => undefined;

const getSpeechRecognitionSupportSnapshot = () =>
  typeof window !== "undefined" &&
  Boolean(window.SpeechRecognition ?? window.webkitSpeechRecognition);

const getServerSpeechRecognitionSupportSnapshot = () => false;

interface AnimeShowcaseItem {
  id: number;
  title: string;
  image_url: string;
  score: number | null;
}

interface BrowserSpeechRecognitionAlternative {
  transcript: string;
}

interface BrowserSpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: BrowserSpeechRecognitionAlternative;
}

interface BrowserSpeechRecognitionResultList {
  readonly length: number;
  [index: number]: BrowserSpeechRecognitionResult;
}

interface BrowserSpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: BrowserSpeechRecognitionResultList;
}

interface BrowserSpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}

interface BrowserSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onend: ((event: Event) => void) | null;
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onstart: ((event: Event) => void) | null;
  abort: () => void;
  start: () => void;
  stop: () => void;
}

interface BrowserSpeechRecognitionConstructor {
  new (): BrowserSpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  }
}

export function NavbarSearch() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<AnimeShowcaseItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isListening, setIsListening] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const activeSearchControllerRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const router = useRouter();
  const isSpeechRecognitionSupported = useSyncExternalStore(
    subscribeToSpeechRecognitionSupport,
    getSpeechRecognitionSupportSnapshot,
    getServerSpeechRecognitionSupportSnapshot,
  );

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

    async function loadSearchResults() {
      const { searchAnime } = await import("@/services/jikanApi");

      if (controller.signal.aborted) {
        return [];
      }

      return searchAnime(debouncedQuery, SEARCH_RESULTS_LIMIT, {
        signal: controller.signal,
      });
    }

    void loadSearchResults()
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

  useEffect(() => {
    const SpeechRecognitionApi =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!SpeechRecognitionApi) {
      recognitionRef.current = null;
      return;
    }

    const recognition = new SpeechRecognitionApi();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang =
      document.documentElement.lang || navigator.language || "ru-RU";
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let transcript = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const candidate = result?.[0]?.transcript?.trim();

        if (result?.isFinal && candidate) {
          transcript = transcript ? `${transcript} ${candidate}` : candidate;
        }
      }

      if (!transcript) {
        return;
      }

      setQuery(transcript);
      setDebouncedQuery(transcript);
      navigateToSearchPage(transcript);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.abort();

      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }
    };
  }, [navigateToSearchPage]);

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

  const handleMicrophoneClick = () => {
    const recognition = recognitionRef.current;

    if (!recognition) {
      return;
    }

    if (isListening) {
      recognition.stop();
      return;
    }

    try {
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  return (
    <>
      <style jsx global>{`
        .search-results-container::-webkit-scrollbar {
          width: 6px;
        }

        .search-results-container::-webkit-scrollbar-track {
          background: transparent;
        }

        .search-results-container::-webkit-scrollbar-thumb {
          background-color: #4b5563;
          border-radius: 10px;
        }
      `}</style>

      <form onSubmit={handleSearch} className="flex w-full min-w-0 items-center gap-3">
        <div ref={searchContainerRef} className="relative flex min-w-0 flex-1">
          <input
            aria-label="Поиск аниме"
            aria-autocomplete="list"
            aria-controls={isDropdownVisible ? SEARCH_DROPDOWN_ID : undefined}
            aria-expanded={isDropdownVisible}
            aria-haspopup="listbox"
            aria-activedescendant={activeDescendantId}
            role="combobox"
            placeholder="Введите запрос"
            className="flex-1 rounded-l-full border border-[#303030] bg-[#121212] px-5 py-2.5 text-white placeholder:text-[#717171] focus:border-blue-500 focus:outline-none"
            value={query}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onKeyDown={handleInputKeyDown}
          />

          <button
            type="submit"
            aria-label="Поиск"
            className="group rounded-r-full border border-[#303030] border-l-0 bg-[#222222] px-4 py-2 text-white transition-colors hover:bg-[#303030]"
          >
            <span className="flex items-center justify-center rounded-full p-2 transition-colors group-hover:bg-white/10">
              <Search className="size-6" />
            </span>
          </button>

          {isDropdownVisible ? (
            <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-2xl border border-[#303030] bg-[#1f1f1f] shadow-2xl">
              {isSearching ? (
                <div className="space-y-2 p-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={`search-skeleton-${index}`}
                      className="flex items-center gap-3"
                    >
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
                  className="search-results-container max-h-80 overflow-y-auto overflow-x-hidden p-1.5"
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
                            "flex items-center gap-3 rounded-xl px-2 py-2 transition-colors",
                            isActive
                              ? "bg-[#2f2f2f] text-white"
                              : "text-[#b3b3b3] hover:bg-[#2a2a2a] hover:text-white",
                          )}
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={closeDropdown}
                        >
                          <div className="relative h-12 w-9 shrink-0 overflow-hidden rounded-md border border-[#303030]">
                            <Image
                              src={getImageUrl(anime.image_url)}
                              alt={anime.title}
                              fill
                              sizes="36px"
                              className="object-cover"
                            />
                          </div>

                          <div className="min-w-0">
                            <p className="line-clamp-1 text-sm font-medium text-white">
                              {anime.title}
                            </p>
                            <p className="text-xs text-[#b3b3b3]">
                              {anime.score !== null
                                ? `Оценка: ${anime.score.toFixed(2)}`
                                : "Оценка: Нет"}
                            </p>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="px-4 py-3 text-sm text-[#b3b3b3]">
                  По вашему запросу ничего не найдено
                </p>
              )}
            </div>
          ) : null}
        </div>

        {isSpeechRecognitionSupported ? (
          <button
            type="button"
            aria-label={
              isListening
                ? "Остановить голосовой поиск"
                : "Начать голосовой поиск"
            }
            aria-pressed={isListening}
            title={
              isSpeechRecognitionSupported
                ? "Голосовой поиск"
                : "Ваш браузер не поддерживает голосовой поиск"
            }
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#303030] p-2 text-white transition-colors focus:outline-none",
              isListening
                ? "animate-pulse border-red-500 bg-red-600 hover:bg-red-500"
                : "bg-[#1a1a1a] hover:bg-white/10",
            )}
            onClick={handleMicrophoneClick}
          >
            <Mic className="size-6" />
          </button>
        ) : null}
      </form>
    </>
  );
}
