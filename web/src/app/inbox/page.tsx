"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Plus, Trash2, CheckCircle2, Circle, ExternalLink,
  ArrowRight, Check, Archive, Pencil, Search, X,
} from "lucide-react";

interface Item {
  id: number;
  titre: string;
  type: string;
  contexte: string | null;
  priorite: string;
  url: string | null;
  traite: number;
  destination: string | null;
  destination_id: number | null;
  destination_titre: string | null;
  notes: string | null;
  created_at: string;
}

interface Projet {
  id: number;
  titre: string;
}

type ConvertTarget = "tache" | "projet";

const TYPES = ["note", "idée", "tâche", "lien", "référence"];
const PRIOS = ["haute", "moyenne", "basse"];
const CONTEXTES = ["", "Travail", "Sport", "Personnel", "Apprentissage"];

const TYPE_COLOR: Record<string, string> = {
  "idée": "badge-violet", tâche: "badge-red", lien: "badge-blue",
  "référence": "badge-green", note: "badge-gray",
};
const PRIO_COLOR: Record<string, string> = {
  haute: "badge-red", moyenne: "badge-yellow", basse: "badge-gray",
};
const DEST_BADGE: Record<string, { label: string; cls: string }> = {
  tache: { label: "→ Tâche", cls: "badge-blue" },
  projet: { label: "→ Projet", cls: "badge-violet" },
  fait: { label: "Fait", cls: "badge-green" },
  archive: { label: "Archivé", cls: "badge-gray" },
};

const EMPTY_FORM = { titre: "", type: "note", priorite: "moyenne", contexte: "", url: "", notes: "" };
const EMPTY_CONVERT_FORM = { titre: "", contexte: "", priorite: "moyenne", notes: "", projet_id: "", date_echeance: "" };

function fmt(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function InboxPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [projets, setProjets] = useState<Projet[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "done">("pending");
  const [contexteFilter, setContexteFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [convertTarget, setConvertTarget] = useState<{ item: Item; target: ConvertTarget } | null>(null);
  const [convertForm, setConvertForm] = useState(EMPTY_CONVERT_FORM);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (filter === "pending") params.set("traite", "0");
    if (filter === "done") params.set("traite", "1");
    if (search.trim()) params.set("q", search.trim());
    if (contexteFilter) params.set("contexte", contexteFilter);
    fetch(`/api/inbox?${params.toString()}`).then((r) => r.json()).then(setItems);
  }, [filter, search, contexteFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { fetch("/api/projets").then((r) => r.json()).then(setProjets); }, []);
  useEffect(() => { if (showForm) titleRef.current?.focus(); }, [showForm]);

  const openNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (item: Item) => {
    setEditingId(item.id);
    setForm({
      titre: item.titre, type: item.type, priorite: item.priorite,
      contexte: item.contexte ?? "", url: item.url ?? "", notes: item.notes ?? "",
    });
    setShowForm(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titre.trim()) return;
    if (editingId) {
      await fetch(`/api/inbox/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } else {
      await fetch("/api/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }
    setForm(EMPTY_FORM);
    setShowForm(false);
    setEditingId(null);
    load();
  };

  const toggle = async (item: Item) => {
    await fetch(`/api/inbox/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ traite: item.traite ? 0 : 1 }),
    });
    load();
  };

  const del = async (id: number) => {
    if (!confirm("Supprimer cet élément de l'inbox ?")) return;
    await fetch(`/api/inbox/${id}`, { method: "DELETE" });
    load();
  };

  const quickConvert = async (item: Item, target: "fait" | "archive") => {
    await fetch(`/api/inbox/${item.id}/convert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target }),
    });
    load();
  };

  const openConvert = (item: Item, target: ConvertTarget) => {
    setConvertTarget({ item, target });
    setConvertForm({
      titre: item.titre,
      contexte: item.contexte ?? "",
      priorite: item.priorite,
      notes: item.notes ?? "",
      projet_id: "",
      date_echeance: "",
    });
  };

  const submitConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertTarget) return;
    await fetch(`/api/inbox/${convertTarget.item.id}/convert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target: convertTarget.target,
        overrides: {
          titre: convertForm.titre,
          contexte: convertForm.contexte || undefined,
          priorite: convertForm.priorite,
          notes: convertForm.notes || undefined,
          projet_id: convertForm.projet_id ? parseInt(convertForm.projet_id) : undefined,
          date_echeance: convertForm.date_echeance || undefined,
        },
      }),
    });
    setConvertTarget(null);
    load();
  };

  const pending = items.filter((i) => !i.traite).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Inbox</h1>
          <p className="text-zinc-500 text-sm mt-0.5">
            {pending} élément{pending !== 1 ? "s" : ""} à traiter
          </p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2">
          <Plus size={15} /> Capturer
        </button>
      </div>

      {/* Quick capture / edit inline */}
      {showForm && (
        <form onSubmit={submit} className="card space-y-3 border-violet-500/30">
          <div className="flex items-center gap-2">
            <input
              ref={titleRef}
              value={form.titre}
              onChange={(e) => setForm({ ...form, titre: e.target.value })}
              placeholder="Qu'avez-vous en tête ?"
              className="input flex-1"
              onKeyDown={(e) => e.key === "Escape" && setShowForm(false)}
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <select className="select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
            <select className="select" value={form.priorite} onChange={(e) => setForm({ ...form, priorite: e.target.value })}>
              {PRIOS.map((p) => <option key={p}>{p}</option>)}
            </select>
            <select className="select" value={form.contexte} onChange={(e) => setForm({ ...form, contexte: e.target.value })}>
              {CONTEXTES.map((c) => <option key={c} value={c}>{c || "Contexte…"}</option>)}
            </select>
          </div>
          <input
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            placeholder="URL (optionnel)"
            className="input"
            type="url"
          />
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Notes (optionnel)"
            className="input"
            rows={2}
          />
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="btn-ghost">Annuler</button>
            <button type="submit" className="btn-primary">{editingId ? "Enregistrer" : "Sauvegarder"}</button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1 bg-zinc-900 rounded-lg p-1 w-fit border border-zinc-800">
          {(["pending", "all", "done"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`tab ${filter === f ? "tab-active" : "tab-inactive"}`}
            >
              {f === "pending" ? "À traiter" : f === "all" ? "Tout" : "Traités"}
            </button>
          ))}
        </div>
        <select className="select w-auto text-sm py-1.5" value={contexteFilter} onChange={(e) => setContexteFilter(e.target.value)}>
          {CONTEXTES.map((c) => <option key={c} value={c}>{c || "Tous les contextes"}</option>)}
        </select>
        <div className="relative flex-1 min-w-[160px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Rechercher…"
            className="input pl-8 py-1.5 text-sm"
          />
        </div>
      </div>

      {/* List */}
      {items.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-zinc-500 text-sm">
            {filter === "pending" ? "Inbox vide — beau travail ! 🎉" : "Aucun élément"}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const dest = item.destination ? DEST_BADGE[item.destination] : null;
            return (
              <li
                key={item.id}
                className={`card-sm flex items-start gap-3 transition-colors hover:border-zinc-700 ${
                  item.traite ? "opacity-60" : ""
                }`}
              >
                <button
                  onClick={() => toggle(item)}
                  className={`mt-0.5 shrink-0 transition-colors ${
                    item.traite ? "text-emerald-500" : "text-zinc-600 hover:text-emerald-400"
                  }`}
                  title={item.traite ? "Remettre en attente" : "Marquer traité (sans conversion)"}
                >
                  {item.traite ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                </button>

                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${item.traite ? "line-through text-zinc-500" : "text-zinc-200"}`}>
                    {item.titre}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className={TYPE_COLOR[item.type] || "badge-gray"}>{item.type}</span>
                    {item.priorite !== "moyenne" && (
                      <span className={PRIO_COLOR[item.priorite] || "badge-gray"}>{item.priorite}</span>
                    )}
                    {item.contexte && (
                      <span className="badge-gray">{item.contexte}</span>
                    )}
                    {item.traite === 1 && (
                      <span className={dest?.cls ?? "badge-gray"}>
                        {dest?.label ?? "Traité"}
                        {dest && item.destination_titre ? ` — ${item.destination_titre}` : ""}
                      </span>
                    )}
                    <span className="text-xs text-zinc-600">{fmt(item.created_at)}</span>
                  </div>
                  {item.notes && (
                    <p className="text-xs text-zinc-500 mt-1.5 line-clamp-2">{item.notes}</p>
                  )}
                </div>

                <div className="flex items-center gap-1 flex-wrap justify-end shrink-0">
                  {!item.traite && (
                    <>
                      <button onClick={() => openConvert(item, "tache")} className="btn-ghost text-xs py-1 px-2 flex items-center gap-1" title="Convertir en tâche">
                        <ArrowRight size={11} /> Tâche
                      </button>
                      <button onClick={() => openConvert(item, "projet")} className="btn-ghost text-xs py-1 px-2 flex items-center gap-1" title="Convertir en projet">
                        <ArrowRight size={11} /> Projet
                      </button>
                      <button onClick={() => quickConvert(item, "fait")} className="p-1.5 text-zinc-600 hover:text-emerald-400 rounded hover:bg-zinc-800" title="Fait — rien à créer">
                        <Check size={14} />
                      </button>
                      <button onClick={() => quickConvert(item, "archive")} className="p-1.5 text-zinc-600 hover:text-zinc-300 rounded hover:bg-zinc-800" title="Archiver">
                        <Archive size={14} />
                      </button>
                      <button onClick={() => openEdit(item)} className="p-1.5 text-zinc-600 hover:text-violet-400 rounded hover:bg-zinc-800" title="Modifier">
                        <Pencil size={13} />
                      </button>
                    </>
                  )}
                  {item.url && (
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-zinc-600 hover:text-zinc-300 rounded hover:bg-zinc-800">
                      <ExternalLink size={13} />
                    </a>
                  )}
                  <button onClick={() => del(item.id)} className="p-1.5 text-zinc-600 hover:text-red-400 rounded hover:bg-zinc-800" title="Supprimer">
                    <Trash2 size={13} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Conversion modal */}
      {convertTarget && (
        <div className="modal-overlay" onClick={() => setConvertTarget(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-zinc-100">
                {convertTarget.target === "tache" ? "Convertir en tâche" : "Convertir en projet"}
              </h2>
              <button onClick={() => setConvertTarget(null)} className="btn-ghost p-1.5"><X size={15} /></button>
            </div>
            <form onSubmit={submitConvert} className="space-y-3">
              <input
                autoFocus className="input" placeholder="Titre"
                value={convertForm.titre}
                onChange={(e) => setConvertForm({ ...convertForm, titre: e.target.value })}
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <select className="select" value={convertForm.priorite} onChange={(e) => setConvertForm({ ...convertForm, priorite: e.target.value })}>
                  {PRIOS.map((p) => <option key={p}>{p}</option>)}
                </select>
                <select className="select" value={convertForm.contexte} onChange={(e) => setConvertForm({ ...convertForm, contexte: e.target.value })}>
                  {CONTEXTES.map((c) => <option key={c} value={c}>{c || "Contexte…"}</option>)}
                </select>
              </div>
              {convertTarget.target === "tache" && (
                <div className="grid grid-cols-2 gap-3">
                  <select className="select" value={convertForm.projet_id} onChange={(e) => setConvertForm({ ...convertForm, projet_id: e.target.value })}>
                    <option value="">Aucun projet</option>
                    {projets.map((p) => <option key={p.id} value={p.id}>{p.titre}</option>)}
                  </select>
                  <input type="date" className="input" value={convertForm.date_echeance}
                    onChange={(e) => setConvertForm({ ...convertForm, date_echeance: e.target.value })} />
                </div>
              )}
              <textarea className="input" rows={2} placeholder="Notes (optionnel)"
                value={convertForm.notes} onChange={(e) => setConvertForm({ ...convertForm, notes: e.target.value })} />
              <div className="flex gap-2 justify-end pt-1">
                <button type="button" onClick={() => setConvertTarget(null)} className="btn-ghost">Annuler</button>
                <button type="submit" className="btn-primary">Convertir</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
