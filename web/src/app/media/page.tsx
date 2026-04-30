"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Star, Search, Pencil } from "lucide-react";
import MediaSearchModal, { type SearchResult } from "@/components/MediaSearchModal";

interface Media {
  id: number;
  titre: string;
  type: string;
  statut: string;
  note: number | null;
  date_fin: string | null;
  genre: string | null;
  createur: string | null;
  plateforme: string | null;
  avis: string | null;
  description: string | null;
  casting: string | null;
}

type MediaType = "film" | "serie" | "anime" | "livre" | "jeu";

const TYPES: { id: MediaType; label: string; icon: string; createur: string; aVoir: string }[] = [
  { id: "film",   label: "Films",   icon: "🎬", createur: "Réalisateur", aVoir: "À regarder" },
  { id: "serie",  label: "Séries",  icon: "📺", createur: "Showrunner",  aVoir: "À regarder" },
  { id: "anime",  label: "Animés",  icon: "⛩️", createur: "Studio",      aVoir: "À regarder" },
  { id: "livre",  label: "Livres",  icon: "📚", createur: "Auteur",      aVoir: "À lire" },
  { id: "jeu",    label: "Jeux",    icon: "🎮", createur: "Développeur", aVoir: "À jouer" },
];

const STATUTS = ["tous", "a_voir", "en_cours", "termine", "abandonne"] as const;
const STATUT_LABEL: Record<string, string> = {
  tous: "Tous", a_voir: "À voir", en_cours: "En cours", termine: "Terminé", abandonne: "Abandonné",
};
const STATUT_DOT: Record<string, string> = {
  a_voir: "bg-zinc-500", en_cours: "bg-violet-500", termine: "bg-emerald-500", abandonne: "bg-red-800",
};

const INIT = {
  titre: "", statut: "a_voir", genre: "", createur: "", plateforme: "", note: "", date_fin: "",
  avis: "", description: "", casting: "",
};

function StarRating({ note, onChange }: { note: number | null; onChange?: (n: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange?.(n)}
          className={`transition-colors ${n <= (note ?? 0) ? "text-amber-400" : "text-zinc-700"} ${onChange ? "hover:text-amber-300" : ""}`}>
          <Star size={12} fill={n <= (note ?? 0) ? "currentColor" : "none"} />
        </button>
      ))}
    </div>
  );
}

export default function MediaPage() {
  const [type, setType] = useState<MediaType>("film");
  const [filter, setFilter] = useState<string>("tous");
  const [items, setItems] = useState<Media[]>([]);
  const [modal, setModal] = useState(false);
  const [searchModal, setSearchModal] = useState(false);
  const [form, setForm] = useState(INIT);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<Media | null>(null);

  const currentType = TYPES.find((t) => t.id === type)!;

  const load = useCallback(() => {
    const params = new URLSearchParams({ type });
    if (filter !== "tous") params.set("statut", filter);
    fetch(`/api/media?${params}`).then((r) => r.json()).then(setItems);
  }, [type, filter]);

  useEffect(() => { load(); }, [load]);

  const f = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSearchSelect = (result: SearchResult) => {
    setForm({
      titre: result.titre,
      statut: "a_voir",
      genre: result.genre,
      createur: result.createur,
      plateforme: "",
      note: "",
      date_fin: "",
      avis: "",
      description: result.description,
      casting: result.casting,
    });
    setModal(true);
  };

  const openEdit = (item: Media) => {
    setEditingItem(item);
    setForm({
      titre: item.titre,
      statut: item.statut,
      genre: item.genre ?? "",
      createur: item.createur ?? "",
      plateforme: item.plateforme ?? "",
      note: item.note?.toString() ?? "",
      date_fin: item.date_fin ?? "",
      avis: item.avis ?? "",
      description: item.description ?? "",
      casting: item.casting ?? "",
    });
    setModal(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titre.trim()) return;
    const payload = {
      ...form,
      type,
      note: form.note ? parseInt(form.note) : null,
      date_fin: form.date_fin || null,
      genre: form.genre || null,
      createur: form.createur || null,
      plateforme: form.plateforme || null,
      avis: form.avis || null,
      description: form.description || null,
      casting: form.casting || null,
    };
    if (editingItem) {
      await fetch(`/api/media/${editingItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    setEditingItem(null);
    setForm(INIT);
    setModal(false);
    load();
  };

  const updateStatut = async (id: number, statut: string) => {
    await fetch(`/api/media/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut }),
    });
    load();
  };

  const del = async (id: number) => {
    if (!confirm("Supprimer ?")) return;
    await fetch(`/api/media/${id}`, { method: "DELETE" });
    load();
  };

  const updateNote = async (id: number, note: number) => {
    await fetch(`/api/media/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    });
    load();
  };

  const counts = {
    termine: items.filter((i) => i.statut === "termine").length,
    total: items.filter((i) => i.statut !== "abandonne").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Médiathèque</h1>
          <p className="text-zinc-500 text-sm mt-0.5">
            {counts.termine} terminés · {counts.total} entrées
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSearchModal(true)}
            className="btn-ghost flex items-center gap-2 border"
            style={{ borderColor: "#e4e2de" }}
          >
            <Search size={14} /> Rechercher
          </button>
          <button onClick={() => { setForm(INIT); setModal(true); }} className="btn-primary flex items-center gap-2">
            <Plus size={15} /> Ajouter
          </button>
        </div>
      </div>

      {/* Type tabs */}
      <div className="flex gap-1 rounded-xl p-1 border w-fit" style={{ backgroundColor: "#f0eeeb", borderColor: "#e4e2de" }}>
        {TYPES.map((t) => (
          <button
            key={t.id}
            onClick={() => { setType(t.id); setFilter("tous"); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor: type === t.id ? "#ffffff" : "transparent",
              color: type === t.id ? "#1a1a18" : "#9c9c9a",
              boxShadow: type === t.id ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Status filter */}
      <div className="flex gap-1 rounded-lg p-1 border w-fit" style={{ backgroundColor: "#f0eeeb", borderColor: "#e4e2de" }}>
        {STATUTS.map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`tab ${filter === s ? "tab-active" : "tab-inactive"}`}>
            {s === "a_voir" ? currentType.aVoir : STATUT_LABEL[s]}
          </button>
        ))}
      </div>

      {/* List */}
      {items.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">{currentType.icon}</p>
          <p className="text-zinc-500 text-sm">Aucune entrée — utilise Rechercher pour trouver et ajouter rapidement</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="card-sm group">
              <div className="flex items-center gap-3">
                {/* Status select */}
                <select
                  value={item.statut}
                  onChange={(e) => updateStatut(item.id, e.target.value)}
                  className="text-xs border rounded px-1.5 py-1 cursor-pointer shrink-0"
                  style={{ borderColor: "#e4e2de", backgroundColor: "#f8f7f5", color: "#5a5a58" }}
                >
                  <option value="a_voir">{currentType.aVoir}</option>
                  <option value="en_cours">En cours</option>
                  <option value="termine">Terminé</option>
                  <option value="abandonne">Abandonné</option>
                </select>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <button
                      onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                      className={`text-sm font-medium text-left ${item.statut === "abandonne" ? "line-through text-zinc-500" : "text-zinc-200"} ${(item.description || item.casting) ? "hover:text-violet-400 transition-colors" : ""}`}
                    >
                      {item.titre}
                    </button>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    {item.genre && <span className="text-xs text-zinc-500">{item.genre}</span>}
                    {item.createur && <span className="text-xs text-zinc-600">{item.createur}</span>}
                    {item.plateforme && (
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: "#eeece9", color: "#7a7a78" }}>
                        {item.plateforme}
                      </span>
                    )}
                    {item.date_fin && (
                      <span className="text-xs text-zinc-600">
                        {new Date(item.date_fin).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Rating */}
                <div className="shrink-0">
                  <StarRating note={item.note} onChange={(n) => updateNote(item.id, n)} />
                </div>

                {/* Edit + Delete */}
                <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-all">
                  <button onClick={() => openEdit(item)} className="p-1 text-zinc-600 hover:text-violet-400 transition-colors">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => del(item.id)} className="p-1 text-zinc-700 hover:text-red-400 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Expanded details */}
              {expanded === item.id && (item.description || item.casting || item.avis) && (
                <div className="mt-3 pt-3 space-y-2" style={{ borderTop: "1px solid #e4e2de" }}>
                  {item.description && (
                    <p className="text-xs leading-relaxed" style={{ color: "#7a7a78" }}>{item.description}</p>
                  )}
                  {item.casting && (
                    <p className="text-xs" style={{ color: "#9c9c9a" }}>
                      <span className="font-medium" style={{ color: "#5a5a58" }}>Casting : </span>{item.casting}
                    </p>
                  )}
                  {item.avis && (
                    <p className="text-xs italic" style={{ color: "#9c9c9a" }}>« {item.avis} »</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => { setModal(false); setEditingItem(null); }}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-zinc-100 mb-5">
              {currentType.icon} {editingItem ? "Modifier" : "Ajouter"} — {currentType.label}
            </h2>
            <form onSubmit={submit} className="space-y-3">
              <input autoFocus placeholder="Titre *" className="input"
                value={form.titre} onChange={(e) => f("titre", e.target.value)} required />
              <div className="grid grid-cols-2 gap-3">
                <select className="select" value={form.statut} onChange={(e) => f("statut", e.target.value)}>
                  <option value="a_voir">{currentType.aVoir}</option>
                  <option value="en_cours">En cours</option>
                  <option value="termine">Terminé</option>
                  <option value="abandonne">Abandonné</option>
                </select>
                <input placeholder="Genre" className="input"
                  value={form.genre} onChange={(e) => f("genre", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input placeholder={currentType.createur} className="input"
                  value={form.createur} onChange={(e) => f("createur", e.target.value)} />
                <input placeholder="Plateforme / Éditeur" className="input"
                  value={form.plateforme} onChange={(e) => f("plateforme", e.target.value)} />
              </div>
              <textarea
                placeholder="Synopsis / Description"
                className="input" rows={2}
                value={form.description} onChange={(e) => f("description", e.target.value)}
              />
              <input
                placeholder="Casting / Acteurs principaux"
                className="input"
                value={form.casting} onChange={(e) => f("casting", e.target.value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Date de fin</label>
                  <input type="date" className="input"
                    value={form.date_fin} onChange={(e) => f("date_fin", e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Note</label>
                  <select className="select" value={form.note} onChange={(e) => f("note", e.target.value)}>
                    <option value="">—</option>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>{"★".repeat(n)}{"☆".repeat(5 - n)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <textarea placeholder="Avis personnel (optionnel)" className="input" rows={2}
                value={form.avis} onChange={(e) => f("avis", e.target.value)} />
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => { setModal(false); setEditingItem(null); }} className="btn-ghost">Annuler</button>
                <button type="submit" className="btn-primary">{editingItem ? "Enregistrer" : "Ajouter"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Search modal */}
      {searchModal && (
        <MediaSearchModal
          type={type}
          onSelect={handleSearchSelect}
          onClose={() => setSearchModal(false)}
        />
      )}
    </div>
  );
}
