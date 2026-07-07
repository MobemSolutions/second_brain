"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2, X, Link2, Unlink, Sparkles } from "lucide-react";

type NoteType = "fleeting" | "literature" | "permanent";
type NoteStatut = "brouillon" | "a_traiter" | "traite" | "archive";

interface Note {
  id: number;
  titre: string;
  type: NoteType;
  statut: NoteStatut;
  tags: string | null;
  contenu: string | null;
  created_at: string;
  updated_at: string;
}

interface LienResult {
  id: number;
  type: string;
  entity_id: number;
  titre: string;
  href: string;
}

interface Suggestion {
  id: number;
  titre: string;
  score: number;
}

const TABS: { key: NoteType | "toutes"; label: string }[] = [
  { key: "fleeting", label: "💭 Fleeting" },
  { key: "literature", label: "📝 Literature" },
  { key: "permanent", label: "💎 Permanent" },
  { key: "toutes", label: "Toutes" },
];

const TYPE_BADGE: Record<NoteType, string> = {
  fleeting: "badge-yellow",
  literature: "badge-blue",
  permanent: "badge-violet",
};

const EMPTY_FORM = { titre: "", type: "fleeting" as NoteType, tags: "", contenu: "" };

function fmt(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function isStaleFleeting(n: Note): boolean {
  if (n.type !== "fleeting" || n.statut === "traite" || n.statut === "archive") return false;
  const hours = (Date.now() - new Date(n.created_at).getTime()) / 3_600_000;
  return hours > 48;
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [tab, setTab] = useState<NoteType | "toutes">("fleeting");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [detail, setDetail] = useState<Note | null>(null);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (tab !== "toutes") params.set("type", tab);
    fetch(`/api/notes?${params.toString()}`).then((r) => r.json()).then(setNotes);
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titre.trim()) return;
    await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm(EMPTY_FORM);
    setShowForm(false);
    load();
  };

  const del = async (id: number) => {
    if (!confirm("Supprimer cette note ?")) return;
    await fetch(`/api/notes/${id}`, { method: "DELETE" });
    setDetail(null);
    load();
  };

  const staleCount = useMemo(() => notes.filter(isStaleFleeting).length, [notes]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Notes</h1>
          <p className="text-zinc-500 text-sm mt-0.5">
            {staleCount > 0 ? `⚠️ ${staleCount} fleeting à traiter depuis plus de 48h` : "Zettelkasten — fleeting → literature → permanent"}
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus size={15} /> Nouvelle note
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="card space-y-3 border-violet-500/30">
          <input
            autoFocus
            value={form.titre}
            onChange={(e) => setForm({ ...form, titre: e.target.value })}
            placeholder="Titre de la note"
            className="input"
          />
          <div className="grid grid-cols-2 gap-2">
            <select className="select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as NoteType })}>
              <option value="fleeting">💭 Fleeting</option>
              <option value="literature">📝 Literature</option>
              <option value="permanent">💎 Permanent</option>
            </select>
            <input
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="Tags (séparés par virgule)"
              className="input"
            />
          </div>
          <textarea
            value={form.contenu}
            onChange={(e) => setForm({ ...form, contenu: e.target.value })}
            placeholder="Contenu…"
            className="input"
            rows={4}
          />
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">Annuler</button>
            <button type="submit" className="btn-primary">Sauvegarder</button>
          </div>
        </form>
      )}

      <div className="flex gap-1 bg-zinc-900 rounded-lg p-1 w-fit border border-zinc-800 flex-wrap">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`tab ${tab === t.key ? "tab-active" : "tab-inactive"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {notes.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-zinc-500 text-sm">Aucune note ici pour l&rsquo;instant</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {notes.map((n) => (
            <button
              key={n.id}
              onClick={() => setDetail(n)}
              className={`card-sm text-left space-y-2 hover:border-zinc-700 transition-colors ${
                isStaleFleeting(n) ? "border-amber-500/40" : ""
              }`}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className={TYPE_BADGE[n.type]}>{n.type}</span>
                {isStaleFleeting(n) && <span className="badge-red">⚠️ &gt;48h</span>}
              </div>
              <p className="text-sm text-zinc-200 line-clamp-2">{n.titre}</p>
              {n.contenu && <p className="text-xs text-zinc-500 line-clamp-3">{n.contenu}</p>}
              <p className="text-xs text-zinc-600">{fmt(n.updated_at)}</p>
            </button>
          ))}
        </div>
      )}

      {detail && (
        <NoteDetailModal
          note={detail}
          onClose={() => setDetail(null)}
          onDelete={() => del(detail.id)}
          onSaved={(updated) => { setDetail(updated); load(); }}
        />
      )}
    </div>
  );
}

function NoteDetailModal({ note, onClose, onDelete, onSaved }: {
  note: Note; onClose: () => void; onDelete: () => void; onSaved: (n: Note) => void;
}) {
  const [titre, setTitre] = useState(note.titre);
  const [type, setType] = useState<NoteType>(note.type);
  const [statut, setStatut] = useState<NoteStatut>(note.statut);
  const [tags, setTags] = useState(note.tags ?? "");
  const [contenu, setContenu] = useState(note.contenu ?? "");
  const [links, setLinks] = useState<LienResult[]>([]);
  const [allNotes, setAllNotes] = useState<Note[]>([]);
  const [linkQuery, setLinkQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  const loadLinks = useCallback(() => {
    fetch(`/api/liens?type=note&id=${note.id}`).then((r) => r.json()).then(setLinks);
  }, [note.id]);

  const loadSuggestions = useCallback(() => {
    fetch(`/api/notes/${note.id}/suggestions`).then((r) => (r.ok ? r.json() : [])).then(setSuggestions).catch(() => setSuggestions([]));
  }, [note.id]);

  useEffect(() => { loadLinks(); loadSuggestions(); }, [loadLinks, loadSuggestions]);
  useEffect(() => { fetch("/api/notes").then((r) => r.json()).then(setAllNotes); }, []);

  const save = async () => {
    const res = await fetch(`/api/notes/${note.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titre, type, statut, tags: tags || null, contenu: contenu || null }),
    });
    onSaved(await res.json());
  };

  const linkTo = async (targetId: number) => {
    await fetch("/api/liens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source_type: "note", source_id: note.id, target_type: "note", target_id: targetId }),
    });
    setLinkQuery("");
    loadLinks();
    loadSuggestions();
  };

  const unlink = async (id: number) => {
    await fetch(`/api/liens?id=${id}`, { method: "DELETE" });
    loadLinks();
  };

  const candidates = allNotes.filter(
    (n) => n.id !== note.id &&
      !links.some((l) => l.type === "note" && l.entity_id === n.id) &&
      n.titre.toLowerCase().includes(linkQuery.toLowerCase())
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <input className="input flex-1 mr-3" value={titre} onChange={(e) => setTitre(e.target.value)} />
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={15} /></button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <select className="select" value={type} onChange={(e) => setType(e.target.value as NoteType)}>
            <option value="fleeting">💭 Fleeting</option>
            <option value="literature">📝 Literature</option>
            <option value="permanent">💎 Permanent</option>
          </select>
          <select className="select" value={statut} onChange={(e) => setStatut(e.target.value as NoteStatut)}>
            <option value="brouillon">Brouillon</option>
            <option value="a_traiter">À traiter</option>
            <option value="traite">Traité</option>
            <option value="archive">Archivé</option>
          </select>
        </div>

        <input className="input" placeholder="Tags" value={tags} onChange={(e) => setTags(e.target.value)} />
        <textarea className="input" rows={6} value={contenu} onChange={(e) => setContenu(e.target.value)} />

        <div>
          <p className="section-label mb-2 flex items-center gap-1.5"><Link2 size={12} /> Notes liées</p>
          {links.length === 0 ? (
            <p className="text-xs text-zinc-600">Aucun lien pour l&rsquo;instant</p>
          ) : (
            <ul className="space-y-1.5 mb-2">
              {links.map((l) => (
                <li key={l.id} className="flex items-center justify-between text-sm">
                  <span className="text-zinc-300 truncate">{l.titre} <span className="text-zinc-600 text-xs">({l.type})</span></span>
                  <button onClick={() => unlink(l.id)} className="p-1 text-zinc-600 hover:text-red-400" title="Délier">
                    <Unlink size={12} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <input
            className="input py-1.5 text-sm"
            placeholder="Lier à une autre note…"
            value={linkQuery}
            onChange={(e) => setLinkQuery(e.target.value)}
          />
          {linkQuery && (
            <ul className="mt-1.5 space-y-1 max-h-32 overflow-y-auto">
              {candidates.slice(0, 8).map((c) => (
                <li key={c.id}>
                  <button onClick={() => linkTo(c.id)} className="text-xs text-zinc-400 hover:text-violet-400 text-left w-full py-0.5">
                    + {c.titre}
                  </button>
                </li>
              ))}
              {candidates.length === 0 && <li className="text-xs text-zinc-600">Aucun résultat</li>}
            </ul>
          )}

          {suggestions.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-zinc-500 mb-1.5 flex items-center gap-1"><Sparkles size={11} className="text-violet-400" /> Suggestions (similarité sémantique locale)</p>
              <ul className="space-y-1">
                {suggestions.map((s) => (
                  <li key={s.id}>
                    <button onClick={() => linkTo(s.id)} className="text-xs text-zinc-400 hover:text-violet-400 text-left w-full py-0.5">
                      + {s.titre} <span className="text-zinc-700">({Math.round(s.score * 100)}%)</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center pt-1">
          <button onClick={onDelete} className="p-1.5 text-zinc-600 hover:text-red-400 rounded hover:bg-zinc-800" title="Supprimer">
            <Trash2 size={14} />
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-ghost">Fermer</button>
            <button onClick={save} className="btn-primary">Enregistrer</button>
          </div>
        </div>
      </div>
    </div>
  );
}
