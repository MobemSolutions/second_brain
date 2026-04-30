"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X, ExternalLink, Settings, Check } from "lucide-react";

type MediaType = "film" | "serie" | "anime" | "livre" | "jeu";

export interface SearchResult {
  titre: string;
  createur: string;
  genre: string;
  description: string;
  casting: string;
  cover: string | null;
  annee?: string;
}

interface Props {
  type: MediaType;
  onSelect: (result: SearchResult) => void;
  onClose: () => void;
}

const NEEDS_KEY: Record<MediaType, "tmdb" | "rawg" | null> = {
  film:  "tmdb",
  serie: "tmdb",
  anime: null,
  livre: null,
  jeu:   "rawg",
};

const KEY_LABELS: Record<string, { label: string; url: string; setting: string }> = {
  tmdb: { label: "TMDB API key", url: "https://www.themoviedb.org/settings/api", setting: "tmdb_key" },
  rawg: { label: "RAWG API key", url: "https://rawg.io/apidocs", setting: "rawg_key" },
};

// ── Open Library for books ─────────────────────────────────────────────────
async function searchBooks(q: string): Promise<SearchResult[]> {
  const r = await fetch(
    `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=8&fields=title,author_name,first_sentence,subject,cover_i,first_publish_year`
  );
  if (!r.ok) return [];
  const data = await r.json() as { docs?: Record<string, unknown>[] };
  return (data.docs ?? []).slice(0, 8).map((d) => {
    const sentence = d.first_sentence;
    const description = typeof sentence === "string"
      ? sentence.slice(0, 280)
      : (sentence && typeof sentence === "object" && "value" in sentence)
        ? (sentence as { value: string }).value.slice(0, 280)
        : "";
    return {
      titre: d.title as string ?? "",
      createur: Array.isArray(d.author_name) ? (d.author_name as string[]).slice(0, 2).join(", ") : "",
      genre: Array.isArray(d.subject) ? (d.subject as string[]).slice(0, 4).join(", ") : "",
      description,
      casting: "",
      cover: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : null,
      annee: d.first_publish_year ? String(d.first_publish_year) : "",
    };
  });
}

// ── Jikan for anime ───────────────────────────────────────────────────────
async function searchAnime(q: string): Promise<SearchResult[]> {
  const r = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(q)}&limit=8&order_by=popularity&sort=asc`);
  if (!r.ok) return [];
  const data = await r.json() as { data?: Record<string, unknown>[] };
  return (data.data ?? []).slice(0, 8).map((d) => {
    const studios = Array.isArray(d.studios)
      ? (d.studios as Array<{ name: string }>).map((s) => s.name).join(", ")
      : "";
    const genres = Array.isArray(d.genres)
      ? (d.genres as Array<{ name: string }>).map((g) => g.name).join(", ")
      : "";
    const images = d.images as Record<string, Record<string, string>> | undefined;
    return {
      titre: (d.title_french || d.title) as string ?? "",
      createur: studios,
      genre: genres,
      description: ((d.synopsis as string) ?? "").replace(/\[Written by MAL Rewrite\]/g, "").trim().slice(0, 280),
      casting: "",
      cover: images?.jpg?.image_url ?? null,
      annee: d.year ? String(d.year) : "",
    };
  });
}

// ── Backend proxy (films/séries/jeux) ────────────────────────────────────
async function searchViaProxy(type: MediaType, q: string): Promise<SearchResult[]> {
  const r = await fetch(`/api/search-media?type=${type}&q=${encodeURIComponent(q)}`);
  if (!r.ok) return [];
  return r.json();
}

async function doSearch(type: MediaType, q: string): Promise<SearchResult[]> {
  if (type === "livre") return searchBooks(q);
  if (type === "anime") return searchAnime(q);
  return searchViaProxy(type, q);
}

export default function MediaSearchModal({ type, onSelect, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showKeyConfig, setShowKeyConfig] = useState(false);
  const [keyValue, setKeyValue] = useState("");
  const [keySaved, setKeySaved] = useState(false);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const needsKeyId = NEEDS_KEY[type];
  const keyInfo = needsKeyId ? KEY_LABELS[needsKeyId] : null;

  useEffect(() => {
    inputRef.current?.focus();
    if (needsKeyId && keyInfo) {
      fetch(`/api/settings?key=${keyInfo.setting}`)
        .then((r) => r.json())
        .then((d: { value: string | null }) => setHasKey(!!d.value));
    } else {
      setHasKey(true);
    }
  }, [needsKeyId, keyInfo]);

  useEffect(() => {
    if (!query.trim() || query.length < 2) { setResults([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await doSearch(type, query);
        setResults(r);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, type]);

  const saveKey = async () => {
    if (!keyInfo || !keyValue.trim()) return;
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: keyInfo.setting, value: keyValue.trim() }),
    });
    setHasKey(true);
    setKeySaved(true);
    setShowKeyConfig(false);
    setTimeout(() => setKeySaved(false), 2000);
  };

  const TYPE_LABELS: Record<MediaType, string> = {
    film: "films", serie: "séries", anime: "animés", livre: "livres", jeu: "jeux",
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="w-full max-w-2xl flex flex-col"
        style={{ backgroundColor: "#ffffff", border: "1px solid #e4e2de", borderRadius: "8px", maxHeight: "85vh", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ borderBottom: "1px solid #e4e2de" }}>
          <Search size={15} style={{ color: "#9c9c9a" }} className="shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Rechercher des ${TYPE_LABELS[type]}…`}
            className="flex-1 outline-none text-sm bg-transparent"
            style={{ color: "#1a1a18" }}
          />
          {needsKeyId && (
            <button
              onClick={() => setShowKeyConfig((v) => !v)}
              title="Configurer clé API"
              className="p-1.5 rounded transition-colors shrink-0"
              style={{ color: hasKey ? "#10b981" : "#b0aea9" }}
            >
              {keySaved ? <Check size={14} /> : <Settings size={14} />}
            </button>
          )}
          <button onClick={onClose} className="p-1.5 rounded transition-colors shrink-0" style={{ color: "#9c9c9a" }}>
            <X size={15} />
          </button>
        </div>

        {/* API key config */}
        {showKeyConfig && keyInfo && (
          <div className="px-4 py-3 shrink-0" style={{ borderBottom: "1px solid #e4e2de", backgroundColor: "#fafaf9" }}>
            <p className="text-xs font-medium mb-2" style={{ color: "#5a5a58" }}>{keyInfo.label}</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={keyValue}
                onChange={(e) => setKeyValue(e.target.value)}
                placeholder="Colle ta clé API ici…"
                className="input flex-1 text-xs"
              />
              <button onClick={saveKey} className="btn-primary text-xs px-3 py-1.5">Sauvegarder</button>
            </div>
            <a
              href={keyInfo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-xs"
              style={{ color: "#7c3aed" }}
            >
              Obtenir une clé gratuite <ExternalLink size={10} />
            </a>
          </div>
        )}

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-3">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
            </div>
          )}

          {!loading && hasKey === false && !showKeyConfig && needsKeyId && (
            <div className="text-center py-12 space-y-3">
              <p className="text-2xl">🔑</p>
              <p className="text-sm font-medium" style={{ color: "#2c2c2a" }}>Clé API requise</p>
              <p className="text-xs" style={{ color: "#9c9c9a" }}>
                Clique sur <Settings size={11} className="inline" /> pour configurer ta clé {keyInfo?.label ?? "API"} gratuite.
              </p>
            </div>
          )}

          {!loading && query.length >= 2 && results.length === 0 && (hasKey || !needsKeyId) && (
            <div className="text-center py-12">
              <p className="text-sm" style={{ color: "#b0aea9" }}>Aucun résultat pour « {query} »</p>
            </div>
          )}

          {!loading && query.length < 2 && !showKeyConfig && (hasKey || !needsKeyId) && (
            <div className="text-center py-12">
              <p className="text-sm" style={{ color: "#b0aea9" }}>Tape au moins 2 caractères pour rechercher</p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="space-y-2">
              {results.map((r, i) => (
                <button
                  key={i}
                  onClick={() => { onSelect(r); onClose(); }}
                  className="w-full flex gap-3 p-3 rounded-lg border text-left transition-all group"
                  style={{ borderColor: "#e4e2de", backgroundColor: "transparent" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "#c8c6c2";
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#fafaf9";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "#e4e2de";
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
                  }}
                >
                  {/* Cover */}
                  <div className="shrink-0 w-12 h-16 rounded overflow-hidden" style={{ backgroundColor: "#eeece9" }}>
                    {r.cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.cover} alt={r.titre} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl">
                        {type === "livre" ? "📚" : type === "anime" ? "⛩️" : type === "film" ? "🎬" : type === "serie" ? "📺" : "🎮"}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-1">
                      <p className="text-sm font-medium leading-tight flex-1" style={{ color: "#1a1a18" }}>{r.titre}</p>
                      {r.annee && <span className="text-xs shrink-0 mt-0.5" style={{ color: "#b0aea9" }}>{r.annee}</span>}
                    </div>
                    {r.createur && (
                      <p className="text-xs mb-1" style={{ color: "#7a7a78" }}>{r.createur}</p>
                    )}
                    {r.genre && (
                      <p className="text-xs mb-1.5" style={{ color: "#b0aea9" }}>{r.genre}</p>
                    )}
                    {r.description && (
                      <p className="text-xs line-clamp-2" style={{ color: "#9c9c9a" }}>{r.description}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 shrink-0 text-xs" style={{ borderTop: "1px solid #e4e2de", color: "#c8c6c2" }}>
          {type === "livre" && "Source : Open Library"}
          {type === "anime" && "Source : MyAnimeList via Jikan"}
          {(type === "film" || type === "serie") && "Source : The Movie Database (TMDB)"}
          {type === "jeu" && "Source : RAWG"}
          {" · Cliquer pour pré-remplir le formulaire"}
        </div>
      </div>
    </div>
  );
}
