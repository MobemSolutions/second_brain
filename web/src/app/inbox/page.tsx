"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Trash2, CheckCircle2, Circle, ExternalLink, Filter } from "lucide-react";

interface Item {
  id: number;
  titre: string;
  type: string;
  contexte: string | null;
  priorite: string;
  url: string | null;
  traite: number;
  notes: string | null;
  created_at: string;
}

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

function fmt(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function InboxPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "done">("pending");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ titre: "", type: "note", priorite: "moyenne", contexte: "", url: "", notes: "" });
  const titleRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    const q = filter === "pending" ? "?traite=0" : filter === "done" ? "?traite=1" : "";
    fetch(`/api/inbox${q}`).then((r) => r.json()).then(setItems);
  }, [filter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (showForm) titleRef.current?.focus(); }, [showForm]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titre.trim()) return;
    await fetch("/api/inbox", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ titre: "", type: "note", priorite: "moyenne", contexte: "", url: "", notes: "" });
    setShowForm(false);
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
    await fetch(`/api/inbox/${id}`, { method: "DELETE" });
    load();
  };

  const pending = items.filter((i) => !i.traite).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Inbox</h1>
          <p className="text-zinc-500 text-sm mt-0.5">
            {pending} élément{pending !== 1 ? "s" : ""} à traiter
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus size={15} /> Capturer
        </button>
      </div>

      {/* Quick capture inline */}
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
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">Annuler</button>
            <button type="submit" className="btn-primary">Sauvegarder</button>
          </div>
        </form>
      )}

      {/* Filter tabs */}
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

      {/* List */}
      {items.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-zinc-500 text-sm">
            {filter === "pending" ? "Inbox vide — beau travail ! 🎉" : "Aucun élément"}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className={`card-sm flex items-start gap-3 group transition-colors hover:border-zinc-700 ${
                item.traite ? "opacity-50" : ""
              }`}
            >
              <button
                onClick={() => toggle(item)}
                className={`mt-0.5 shrink-0 transition-colors ${
                  item.traite ? "text-emerald-500" : "text-zinc-600 hover:text-emerald-400"
                }`}
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
                  <span className="text-xs text-zinc-600">{fmt(item.created_at)}</span>
                </div>
                {item.notes && (
                  <p className="text-xs text-zinc-500 mt-1.5 line-clamp-2">{item.notes}</p>
                )}
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                {item.url && (
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="btn-ghost p-2">
                    <ExternalLink size={13} />
                  </a>
                )}
                <button onClick={() => del(item.id)} className="btn-danger">
                  <Trash2 size={13} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
