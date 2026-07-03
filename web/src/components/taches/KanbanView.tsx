"use client";

import { useRef, useState } from "react";
import { Plus, Trash2, Pencil, CalendarDays, GripVertical, X } from "lucide-react";
import { type SharedViewProps, type Tache, PRIO_BORDER, isOverdue, parseContextes } from "./types";

type Statut = "a_faire" | "en_cours" | "termine";

const COLS: { id: Statut; label: string; accent: string; bg: string; dot: string }[] = [
  { id: "a_faire",  label: "À faire",  accent: "#9ca3af", bg: "#f9f9f7", dot: "#9ca3af" },
  { id: "en_cours", label: "En cours", accent: "#7c3aed", bg: "#faf8ff", dot: "#7c3aed" },
  { id: "termine",  label: "Terminé",  accent: "#059669", bg: "#f7fdf9", dot: "#059669" },
];

const EMPTY = { titre: "", projet_id: "", priorite: "moyenne", date_echeance: "", contexte: "" };

function handleTitleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>, setTitre: (v: string) => void) {
  if (e.key !== "Enter") return;
  const el = e.currentTarget;
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const next = el.value.slice(0, start) + "\n" + el.value.slice(end);
    setTitre(next);
    requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = start + 1; });
  } else {
    e.preventDefault();
    el.form?.requestSubmit();
  }
}

interface Props extends SharedViewProps {
  onCreate: (payload: Record<string, unknown>) => Promise<void>;
}

export default function KanbanView({ taches, projets, onDelete, onMove, onEdit, onCreate }: Props) {
  const [addingIn, setAddingIn] = useState<Statut | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [dragId, setDragId] = useState<number | null>(null);
  const [dragOverCol, setDragOverCol] = useState<Statut | null>(null);
  const dragCounters = useRef<Record<string, number>>({ a_faire: 0, en_cours: 0, termine: 0 });

  const f = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const addTask = (e: React.FormEvent, statut: Statut) => {
    e.preventDefault();
    if (!form.titre.trim()) return;
    const payload = {
      titre: form.titre, projet_id: form.projet_id ? parseInt(form.projet_id) : null,
      priorite: form.priorite, date_echeance: form.date_echeance || null,
      contexte: form.contexte || null, statut,
    };
    setForm(EMPTY);
    setAddingIn(null);
    onCreate(payload);
  };

  const byStatut = (s: Statut) => taches.filter((t) => t.statut === s);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {COLS.map((col) => {
        const cards = byStatut(col.id);
        const isDragOver = dragOverCol === col.id;
        return (
          <div key={col.id} className="flex flex-col gap-2"
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
            onDragEnter={(e) => { e.preventDefault(); dragCounters.current[col.id] = (dragCounters.current[col.id] || 0) + 1; setDragOverCol(col.id); }}
            onDragLeave={() => { dragCounters.current[col.id] = (dragCounters.current[col.id] || 0) - 1; if (dragCounters.current[col.id] <= 0) { dragCounters.current[col.id] = 0; setDragOverCol(null); } }}
            onDrop={(e) => { e.preventDefault(); dragCounters.current[col.id] = 0; setDragOverCol(null); if (dragId !== null) onMove(dragId, col.id); }}
          >
            <div className="flex items-center justify-between px-2 py-1.5 rounded"
              style={{ backgroundColor: isDragOver ? col.bg : "transparent", border: `1px solid ${isDragOver ? col.accent + "40" : "transparent"}`, transition: "all 0.15s ease" }}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.dot }} />
                <span className="text-sm font-medium" style={{ color: col.accent }}>{col.label}</span>
                <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "#eeece9", color: "#9c9c9a", fontSize: "11px" }}>{cards.length}</span>
              </div>
              <button onClick={() => { setAddingIn(col.id); setForm(EMPTY); }} style={{ color: "#b0aea9", padding: "2px", borderRadius: "3px", transition: "color 0.1s" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#1a1a18")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#b0aea9")}>
                <Plus size={14} />
              </button>
            </div>

            <div className="flex-1 space-y-2 min-h-[120px] rounded transition-all"
              style={{ padding: isDragOver ? "6px" : "0", backgroundColor: isDragOver ? col.bg : "transparent", border: `1.5px dashed ${isDragOver ? col.accent + "60" : "transparent"}`, transition: "all 0.15s ease" }}>

              {addingIn === col.id && (
                <form onSubmit={(e) => addTask(e, col.id)} className="card space-y-2 p-3" style={{ borderTop: `3px solid ${col.accent}`, borderRadius: "5px" }}>
                  <textarea autoFocus rows={2} placeholder="Titre… (Ctrl+Entrée = retour à la ligne)" className="input text-sm py-1.5"
                    value={form.titre} onChange={(e) => f("titre", e.target.value)} onKeyDown={(e) => handleTitleKeyDown(e, (v) => f("titre", v))} required />
                  <input placeholder="Contexte — @sport, @finance…" className="input text-sm py-1.5" value={form.contexte} onChange={(e) => f("contexte", e.target.value)} />
                  <select className="select text-sm py-1.5" value={form.projet_id} onChange={(e) => f("projet_id", e.target.value)}>
                    <option value="">Aucun projet</option>
                    {projets.map((p) => <option key={p.id} value={p.id}>{p.titre}</option>)}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <select className="select text-sm py-1.5" value={form.priorite} onChange={(e) => f("priorite", e.target.value)}>
                      <option value="haute">🔴 Haute</option>
                      <option value="moyenne">🟡 Moyenne</option>
                      <option value="basse">⚪ Basse</option>
                    </select>
                    <input type="date" className="input text-sm py-1.5" value={form.date_echeance} onChange={(e) => f("date_echeance", e.target.value)} />
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className="btn-primary text-xs py-1 flex-1">Ajouter</button>
                    <button type="button" onClick={() => setAddingIn(null)} className="btn-ghost text-xs py-1"><X size={13} /></button>
                  </div>
                </form>
              )}

              {cards.map((t) => {
                const overdue = isOverdue(t);
                const isDraggingThis = dragId === t.id;
                return (
                  <div key={t.id} draggable
                    onDragStart={(e) => { setDragId(t.id); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(t.id)); }}
                    onDragEnd={() => { setDragId(null); setDragOverCol(null); Object.keys(dragCounters.current).forEach(k => { dragCounters.current[k] = 0; }); }}
                    className="group"
                    style={{ backgroundColor: "#ffffff", border: `1px solid #e4e2de`, borderLeft: `3px solid ${PRIO_BORDER[t.priorite] || "#e4e2de"}`, borderRadius: "5px", padding: "10px 12px", boxShadow: "0 1px 2px rgba(0,0,0,0.05)", cursor: isDraggingThis ? "grabbing" : "grab", opacity: isDraggingThis ? 0.4 : 1, transition: "opacity 0.1s, box-shadow 0.15s", userSelect: "none" }}
                    onMouseEnter={(e) => { if (!isDraggingThis) { const el = e.currentTarget as HTMLElement; el.style.boxShadow = "0 4px 12px rgba(0,0,0,0.09)"; el.style.borderColor = "#c8c6c2"; } }}
                    onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = "0 1px 2px rgba(0,0,0,0.05)"; el.style.borderColor = "#e4e2de"; }}
                  >
                    <div className="flex items-start gap-1.5 mb-2">
                      <GripVertical size={12} style={{ color: "#d0ceca", marginTop: "2px", flexShrink: 0 }} />
                      <p className="text-sm flex-1 leading-snug whitespace-pre-line" style={{ color: t.statut === "termine" ? "#b0aea9" : "#1a1a18", textDecoration: t.statut === "termine" ? "line-through" : "none" }}>{t.titre}</p>
                      <div className="flex items-center gap-0.5 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button onClick={() => onEdit(t)} style={{ color: "#d0ceca", padding: "2px" }} title="Modifier"
                          onMouseEnter={(e) => (e.currentTarget.style.color = "#6d28d9")} onMouseLeave={(e) => (e.currentTarget.style.color = "#d0ceca")}>
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => onDelete(t.id)} style={{ color: "#d0ceca", padding: "2px" }} title="Supprimer"
                          onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")} onMouseLeave={(e) => (e.currentTarget.style.color = "#d0ceca")}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {parseContextes(t.contexte).map((c) => (
                        <span key={c} className="text-[11px] px-1.5 py-0.5 rounded" style={{ backgroundColor: "#f0eeed", color: "#7a7a78" }}>{c}</span>
                      ))}
                      {t.projet_titre && <span className="badge badge-violet text-[10px]">{t.projet_titre}</span>}
                      {t.date_echeance && (
                        <span className="text-[10px] flex items-center gap-0.5" style={{ color: overdue ? "#ef4444" : "#9c9c9a" }}>
                          <CalendarDays size={10} />
                          {new Date(t.date_echeance + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {cards.length === 0 && addingIn !== col.id && !isDragOver && (
                <div className="flex items-center justify-center" style={{ minHeight: "80px", color: "#d0ceca", fontSize: "12px" }}>Vide</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
