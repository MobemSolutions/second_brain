"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, X, LayoutGrid, Columns2, CalendarDays, GanttChartSquare, GitFork } from "lucide-react";
import KanbanView from "@/components/taches/KanbanView";
import GridView from "@/components/taches/GridView";
import CalendarView from "@/components/taches/CalendarView";
import GanttView from "@/components/taches/GanttView";
import MindMapView from "@/components/taches/MindMapView";
import type { Tache, Projet } from "@/components/taches/types";

type View = "kanban" | "grid" | "calendar" | "gantt" | "mindmap";

const VIEWS: { id: View; label: string; icon: React.ElementType }[] = [
  { id: "kanban",   label: "Kanban",     icon: Columns2 },
  { id: "grid",     label: "Grille",     icon: LayoutGrid },
  { id: "calendar", label: "Calendrier", icon: CalendarDays },
  { id: "gantt",    label: "Gantt",      icon: GanttChartSquare },
  { id: "mindmap",  label: "Mindmap",    icon: GitFork },
];

const EMPTY_FORM = {
  titre: "", projet_id: "", priorite: "moyenne",
  date_debut: "", date_echeance: "", contexte: "", notes: "",
};

export default function TachesPage() {
  const [view, setView] = useState<View>("kanban");
  const [taches, setTaches] = useState<Tache[]>([]);
  const [projets, setProjets] = useState<Projet[]>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(() => {
    fetch("/api/taches").then((r) => r.json()).then(setTaches);
  }, []);

  useEffect(() => {
    load();
    fetch("/api/projets").then((r) => r.json()).then(setProjets);
  }, [load]);

  const f = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titre.trim()) return;
    await fetch("/api/taches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titre: form.titre,
        projet_id: form.projet_id ? parseInt(form.projet_id) : null,
        priorite: form.priorite,
        date_debut: form.date_debut || null,
        date_echeance: form.date_echeance || null,
        contexte: form.contexte || null,
        notes: form.notes || null,
        statut: "a_faire",
      }),
    });
    setForm(EMPTY_FORM);
    setModal(false);
    load();
  };

  const onMove = async (id: number, statut: string) => {
    await fetch(`/api/taches/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut }),
    });
    load();
  };

  const onDelete = async (id: number) => {
    await fetch(`/api/taches/${id}`, { method: "DELETE" });
    load();
  };

  const sharedProps = { taches, projets, onDelete, onMove, onAdd: () => { setForm(EMPTY_FORM); setModal(true); } };
  const active = taches.filter((t) => t.statut !== "termine").length;

  return (
    <div className="space-y-5" style={{ animation: "fade-up 0.2s ease-out" }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "#1a1a18" }}>Tâches</h1>
          <p className="text-sm mt-0.5" style={{ color: "#9c9c9a" }}>{active} active{active !== 1 ? "s" : ""}</p>
        </div>

        <div className="flex items-center gap-2">
          {/* View switcher */}
          <div className="flex gap-0.5 p-1 rounded-lg" style={{ backgroundColor: "#f0eeeb", border: "1px solid #e4e2de" }}>
            {VIEWS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setView(id)}
                title={label}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                style={{
                  backgroundColor: view === id ? "#ffffff" : "transparent",
                  color: view === id ? "#1a1a18" : "#9c9c9a",
                  boxShadow: view === id ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                }}
              >
                <Icon size={13} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          <button
            onClick={() => { setForm(EMPTY_FORM); setModal(true); }}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus size={14} /> Tâche
          </button>
        </div>
      </div>

      {/* View content */}
      {view === "kanban" && (
        <KanbanView {...sharedProps} onRefresh={load} />
      )}
      {view === "grid" && (
        <GridView {...sharedProps} />
      )}
      {view === "calendar" && (
        <CalendarView {...sharedProps} />
      )}
      {view === "gantt" && (
        <GanttView {...sharedProps} />
      )}
      {view === "mindmap" && (
        <MindMapView {...sharedProps} />
      )}

      {/* Add task modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold" style={{ color: "#1a1a18" }}>Nouvelle tâche</h2>
              <button onClick={() => setModal(false)} className="btn-ghost p-1.5"><X size={15} /></button>
            </div>
            <form onSubmit={addTask} className="space-y-3">
              <input
                autoFocus placeholder="Titre de la tâche *" className="input"
                value={form.titre} onChange={(e) => f("titre", e.target.value)} required
              />
              <input
                placeholder="Contexte — @sport, @finance, @maison…"
                className="input"
                value={form.contexte} onChange={(e) => f("contexte", e.target.value)}
              />
              <select className="select" value={form.projet_id} onChange={(e) => f("projet_id", e.target.value)}>
                <option value="">Aucun projet</option>
                {projets.map((p) => <option key={p.id} value={p.id}>{p.titre}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <select className="select" value={form.priorite} onChange={(e) => f("priorite", e.target.value)}>
                  <option value="haute">🔴 Haute</option>
                  <option value="moyenne">🟡 Moyenne</option>
                  <option value="basse">⚪ Basse</option>
                </select>
                <select className="select" defaultValue="a_faire" onChange={() => {}}>
                  <option value="a_faire">À faire</option>
                  <option value="en_cours">En cours</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "#9c9c9a" }}>Date de début</label>
                  <input type="date" className="input" value={form.date_debut} onChange={(e) => f("date_debut", e.target.value)} />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "#9c9c9a" }}>Date d&apos;échéance</label>
                  <input type="date" className="input" value={form.date_echeance} onChange={(e) => f("date_echeance", e.target.value)} />
                </div>
              </div>
              <textarea placeholder="Notes (optionnel)" className="input" rows={2}
                value={form.notes} onChange={(e) => f("notes", e.target.value)} />
              <div className="flex gap-2 justify-end pt-1">
                <button type="button" onClick={() => setModal(false)} className="btn-ghost">Annuler</button>
                <button type="submit" className="btn-primary">Créer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
