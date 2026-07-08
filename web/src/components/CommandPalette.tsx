"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, Mic, Inbox as InboxIcon, ArrowRight } from "lucide-react";

interface SearchResult {
  type: string;
  id: number;
  titre: string;
  href: string;
  snippet?: string;
}

const PAGES = [
  { href: "/", label: "Dashboard" },
  { href: "/inbox", label: "Inbox" },
  { href: "/revue", label: "Revue guidée" },
  { href: "/projets", label: "Projets" },
  { href: "/taches", label: "Tâches" },
  { href: "/planning", label: "Planning" },
  { href: "/sport", label: "Sport" },
  { href: "/nutrition", label: "Nutrition" },
  { href: "/habitudes", label: "Habitudes" },
  { href: "/notes", label: "Notes" },
  { href: "/psy", label: "Psy TCC" },
  { href: "/courses", label: "Courses" },
  { href: "/media", label: "Médiathèque" },
  { href: "/abonnements", label: "Abonnements" },
];

const TYPE_LABEL: Record<string, string> = {
  inbox: "Inbox", projet: "Projet", tache: "Tâche", note: "Note", media: "Média", sport: "Sport",
};

// Minimal typing for the vendor-prefixed Web Speech API — not in lib.dom.d.ts.
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null;
  onend: (() => void) | null;
}

export default function CommandPalette() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [listening, setListening] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setResults([]);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape" && open) {
        close();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  // Lets other components (e.g. the dashboard header's search/capture
  // buttons) open the palette without lifting its state up.
  useEffect(() => {
    const onOpenRequest = () => setOpen(true);
    window.addEventListener("open-command-palette", onOpenRequest);
    return () => window.removeEventListener("open-command-palette", onOpenRequest);
  }, []);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 0); }, [open]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query.trim())}`)
        .then((r) => (r.ok ? r.json() : []))
        .then(setResults)
        .catch(() => setResults([]));
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  if (pathname === "/login") return null;

  const filteredPages = PAGES.filter((p) => p.label.toLowerCase().includes(query.toLowerCase()));

  const goTo = (href: string) => {
    close();
    router.push(href);
  };

  const quickCapture = async () => {
    const titre = query.trim();
    if (!titre) return;
    await fetch("/api/inbox", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titre, type: "note", priorite: "moyenne" }),
    });
    close();
  };

  const toggleVoice = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    type SpeechWindow = Window & {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const w = window as SpeechWindow;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) { alert("Dictée vocale non supportée par ce navigateur."); return; }
    const recognition = new Ctor();
    recognition.lang = "fr-FR";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setQuery((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  };

  if (!open) return null;

  return (
    <div className="modal-overlay items-start pt-24" onClick={close}>
      <div className="modal-card w-full max-w-lg p-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
          <Search size={15} className="text-zinc-500 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Naviguer, rechercher ou capturer…"
            className="flex-1 bg-transparent outline-none text-sm text-zinc-100 placeholder-zinc-600"
          />
          <button
            onClick={toggleVoice}
            className={`p-1 rounded transition-colors ${listening ? "text-red-400" : "text-zinc-600 hover:text-violet-400"}`}
            title="Dicter"
            type="button"
          >
            <Mic size={14} />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {results.length > 0 && (
            <div className="mb-2">
              <p className="section-label px-2 mb-1">Résultats</p>
              {results.map((r) => (
                <button
                  key={`${r.type}-${r.id}`}
                  onClick={() => goTo(r.href)}
                  className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-md hover:bg-zinc-800 text-sm text-zinc-300"
                >
                  <span className="badge-gray shrink-0 text-[10px]">{TYPE_LABEL[r.type] ?? r.type}</span>
                  <span className="truncate">{r.titre}</span>
                </button>
              ))}
            </div>
          )}

          {query.trim() && (
            <button
              onClick={quickCapture}
              className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-md hover:bg-zinc-800 text-sm text-violet-400"
            >
              <InboxIcon size={13} />
              Capturer « {query.trim()} » dans l&rsquo;Inbox
            </button>
          )}

          <div className="mt-2">
            <p className="section-label px-2 mb-1">Naviguer</p>
            {filteredPages.map((p) => (
              <button
                key={p.href}
                onClick={() => goTo(p.href)}
                className="flex items-center justify-between gap-2 w-full text-left px-2 py-1.5 rounded-md hover:bg-zinc-800 text-sm text-zinc-300"
              >
                {p.label}
                <ArrowRight size={11} className="text-zinc-600" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
