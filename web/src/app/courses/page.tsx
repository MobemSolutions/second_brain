"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Link2, Pencil, Calendar } from "lucide-react";

interface Course {
  id: number;
  titre: string;
  categorie: string | null;
  tags: string | null;
  prix: number | null;
  lien: string | null;
  date: string | null;
  achete: number;
}

const EMPTY_FORM = { titre: "", categorie: "", tags: "", prix: "", lien: "", date: "" };

function formatDate(d: string): string {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function parseTags(tags: string | null): string[] {
  if (!tags) return [];
  return tags.split(",").map((t) => t.trim()).filter(Boolean);
}

export default function CoursesPage() {
  const [items, setItems] = useState<Course[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);

  const load = useCallback(() => {
    fetch("/api/courses").then((r) => r.json()).then(setItems);
  }, []);

  useEffect(() => { load(); }, [load]);

  const startEdit = (item: Course) => {
    setEditingId(item.id);
    setForm({
      titre: item.titre,
      categorie: item.categorie || "",
      tags: item.tags || "",
      prix: item.prix != null ? String(item.prix) : "",
      lien: item.lien || "",
      date: item.date || "",
    });
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titre.trim()) return;
    const body = {
      titre: form.titre.trim(),
      categorie: form.categorie.trim() || null,
      tags: form.tags.trim() || null,
      prix: form.prix ? parseFloat(form.prix) : null,
      lien: form.lien.trim() || null,
      date: form.date || null,
    };
    await fetch(editingId ? `/api/courses/${editingId}` : "/api/courses", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    cancelForm();
    load();
  };

  const toggleAchete = async (item: Course) => {
    await fetch(`/api/courses/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ achete: item.achete ? 0 : 1 }),
    });
    load();
  };

  const del = async (id: number) => {
    await fetch(`/api/courses/${id}`, { method: "DELETE" });
    load();
  };

  const total = useMemo(
    () => items.filter((i) => !i.achete).reduce((s, i) => s + (i.prix || 0), 0),
    [items]
  );

  const renderForm = () => (
    <form onSubmit={submit} className="card space-y-4 border-violet-500/30">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">Titre</label>
          <input className="input" placeholder="Article" value={form.titre}
            onChange={(e) => setForm((p) => ({ ...p, titre: e.target.value }))} required />
        </div>
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">Catégorie</label>
          <input className="input" placeholder="Maison, Vêtements…" value={form.categorie}
            onChange={(e) => setForm((p) => ({ ...p, categorie: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">Tags</label>
          <input className="input" placeholder="urgent, cadeau…" value={form.tags}
            onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">Prix (€)</label>
          <input type="number" step="0.01" min="0" className="input" placeholder="29.99" value={form.prix}
            onChange={(e) => setForm((p) => ({ ...p, prix: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">Date</label>
          <input type="date" className="input" value={form.date}
            onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">Lien</label>
          <input className="input" placeholder="https://…" value={form.lien}
            onChange={(e) => setForm((p) => ({ ...p, lien: e.target.value }))} />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={cancelForm} className="btn-ghost">Annuler</button>
        <button type="submit" className="btn-primary">{editingId ? "Enregistrer" : "Ajouter"}</button>
      </div>
    </form>
  );

  const grouped = useMemo(() => {
    const cats = Array.from(new Set(items.map((i) => i.categorie || "Sans catégorie")));
    cats.sort((a, b) => (a === "Sans catégorie" ? 1 : b === "Sans catégorie" ? -1 : a.localeCompare(b)));
    return cats.map((cat) => ({
      categorie: cat,
      items: items.filter((i) => (i.categorie || "Sans catégorie") === cat),
    }));
  }, [items]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Courses</h1>
          <p className="text-zinc-500 text-sm mt-0.5">
            {total > 0 ? `${total.toFixed(2)} € à acheter` : "Liste de courses"}
          </p>
        </div>
        <button
          onClick={() => (showForm ? cancelForm() : setShowForm(true))}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={15} /> Ajouter un article
        </button>
      </div>

      {/* Form — shown at the top only when adding (no item being edited) */}
      {showForm && editingId === null && renderForm()}

      {/* List */}
      {items.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">🛒</p>
          <p className="text-zinc-500 text-sm">Ta liste de courses est vide</p>
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map((group) => (
            <div key={group.categorie}>
              <p className="section-label mb-2">{group.categorie}</p>
              <div className="space-y-2">
                {group.items.map((item) => (
                  <div key={item.id}>
                  <div
                    className={`card-sm flex items-center gap-3 group hover:border-zinc-700 transition-colors ${item.achete ? "opacity-50" : ""}`}
                  >
                    <button
                      onClick={() => toggleAchete(item)}
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        item.achete ? "border-emerald-400 bg-emerald-500" : "border-zinc-600"
                      }`}
                    >
                      {!!item.achete && <span className="text-white text-xs">✓</span>}
                    </button>

                    <div className="flex-1 min-w-0">
                      <p className={`text-sm text-zinc-200 ${item.achete ? "line-through" : ""}`}>{item.titre}</p>
                      {(parseTags(item.tags).length > 0 || item.date) && (
                        <div className="flex flex-wrap items-center gap-1 mt-1">
                          {item.date && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-500 flex items-center gap-1">
                              <Calendar size={10} /> {formatDate(item.date)}
                            </span>
                          )}
                          {parseTags(item.tags).map((t) => (
                            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-500">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {item.prix != null && (
                      <span className="text-sm text-zinc-400 shrink-0">{item.prix.toFixed(2)} €</span>
                    )}

                    {item.lien && (
                      <a href={item.lien} target="_blank" rel="noopener noreferrer"
                        className="shrink-0 text-zinc-600 hover:text-violet-400 transition-colors p-1">
                        <Link2 size={14} />
                      </a>
                    )}

                    <button onClick={() => startEdit(item)}
                      className="shrink-0 text-zinc-700 hover:text-violet-400 opacity-0 group-hover:opacity-100 transition-all p-1">
                      <Pencil size={13} />
                    </button>

                    <button onClick={() => del(item.id)}
                      className="shrink-0 text-zinc-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1">
                      <Trash2 size={13} />
                    </button>
                  </div>
                  {editingId === item.id && <div className="mt-2">{renderForm()}</div>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
