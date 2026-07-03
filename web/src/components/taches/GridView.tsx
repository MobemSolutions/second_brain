"use client";

import { useState } from "react";
import { CalendarDays, Trash2, Pencil, Plus } from "lucide-react";
import { type SharedViewProps, PRIO_BORDER, PRIO_DOT, PRIO_LABEL, isOverdue } from "./types";

const STATUT_LABEL: Record<string, string> = {
  a_faire: "À faire", en_cours: "En cours", termine: "Terminé",
};
const STATUT_COLOR: Record<string, string> = {
  a_faire: "#9ca3af", en_cours: "#7c3aed", termine: "#059669",
};

export default function GridView({ taches, projets, onDelete, onMove, onAdd, onEdit }: SharedViewProps) {
  const [filterContexte, setFilterContexte] = useState<string>("tous");
  const [filterStatut, setFilterStatut] = useState<string>("actif");
  const [filterPrio, setFilterPrio] = useState<string>("tous");

  const contextes = ["tous", ...Array.from(new Set(taches.map((t) => t.contexte).filter(Boolean))).sort()] as string[];

  const filtered = taches.filter((t) => {
    if (filterContexte !== "tous" && t.contexte !== filterContexte) return false;
    if (filterStatut === "actif" && t.statut === "termine") return false;
    if (filterStatut !== "tous" && filterStatut !== "actif" && t.statut !== filterStatut) return false;
    if (filterPrio !== "tous" && t.priorite !== filterPrio) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Context tags */}
        <div className="flex gap-1.5 flex-wrap">
          {contextes.map((c) => (
            <button
              key={c}
              onClick={() => setFilterContexte(c)}
              className="text-xs px-3 py-1.5 rounded-full border transition-all font-medium"
              style={{
                borderColor: filterContexte === c ? "#6d28d9" : "#e4e2de",
                backgroundColor: filterContexte === c ? "rgba(109,40,217,0.08)" : "transparent",
                color: filterContexte === c ? "#6d28d9" : "#7a7a78",
              }}
            >
              {c === "tous" ? "🏷️ Tous" : c}
            </button>
          ))}
        </div>

        <div className="h-4 w-px" style={{ backgroundColor: "#e4e2de" }} />

        {/* Status filter */}
        <div className="flex gap-1">
          {[["actif", "Actives"], ["tous", "Toutes"], ["a_faire", "À faire"], ["en_cours", "En cours"], ["termine", "Terminées"]].map(([v, l]) => (
            <button key={v} onClick={() => setFilterStatut(v)}
              className="text-xs px-2.5 py-1.5 rounded border transition-all"
              style={{
                borderColor: filterStatut === v ? "#6d28d9" : "#e4e2de",
                backgroundColor: filterStatut === v ? "rgba(109,40,217,0.08)" : "transparent",
                color: filterStatut === v ? "#6d28d9" : "#9c9c9a",
              }}>
              {l}
            </button>
          ))}
        </div>

        <div className="h-4 w-px" style={{ backgroundColor: "#e4e2de" }} />

        {/* Priority filter */}
        <div className="flex gap-1">
          {[["tous", "Toutes"], ["haute", "🔴"], ["moyenne", "🟡"], ["basse", "⚪"]].map(([v, l]) => (
            <button key={v} onClick={() => setFilterPrio(v)}
              className="text-xs px-2.5 py-1.5 rounded border transition-all"
              style={{
                borderColor: filterPrio === v ? "#6d28d9" : "#e4e2de",
                backgroundColor: filterPrio === v ? "rgba(109,40,217,0.08)" : "transparent",
                color: filterPrio === v ? "#6d28d9" : "#9c9c9a",
              }}>
              {l}
            </button>
          ))}
        </div>

        <span className="text-xs ml-auto" style={{ color: "#b0aea9" }}>{filtered.length} tâche{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-3xl mb-3">✓</p>
          <p className="text-sm" style={{ color: "#9c9c9a" }}>Aucune tâche correspondante</p>
          <button onClick={onAdd} className="btn-primary mt-4 inline-flex items-center gap-2 text-sm">
            <Plus size={14} /> Nouvelle tâche
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
          {filtered.map((t) => {
            const overdue = isOverdue(t);
            return (
              <div
                key={t.id}
                className="group card-sm"
                style={{ borderLeft: `3px solid ${PRIO_BORDER[t.priorite] || "#e4e2de"}` }}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <p
                    className="text-sm font-medium leading-snug flex-1 whitespace-pre-line"
                    style={{ color: t.statut === "termine" ? "#b0aea9" : "#1a1a18", textDecoration: t.statut === "termine" ? "line-through" : "none" }}
                  >
                    {t.titre}
                  </p>
                  <div className="flex items-center gap-0.5 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(t)}
                      className="p-1 rounded" style={{ color: "#d0ceca" }} title="Modifier"
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#6d28d9")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "#d0ceca")}>
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => onDelete(t.id)}
                      className="p-1 rounded" style={{ color: "#d0ceca" }} title="Supprimer"
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "#d0ceca")}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap mb-3">
                  {t.contexte && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: "rgba(109,40,217,0.08)", color: "#6d28d9" }}>
                      {t.contexte}
                    </span>
                  )}
                  {t.projet_titre && (
                    <span className="badge badge-violet text-[10px]">{t.projet_titre}</span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: PRIO_DOT[t.priorite] }} />
                    <span className="text-[11px]" style={{ color: "#9c9c9a" }}>{PRIO_LABEL[t.priorite]}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {t.date_echeance && (
                      <span className="text-[11px] flex items-center gap-0.5" style={{ color: overdue ? "#ef4444" : "#9c9c9a" }}>
                        <CalendarDays size={10} />
                        {new Date(t.date_echeance + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                      </span>
                    )}
                    <select
                      value={t.statut}
                      onChange={(e) => onMove(t.id, e.target.value)}
                      className="text-[11px] border rounded px-1.5 py-0.5 outline-none transition-colors"
                      style={{ borderColor: STATUT_COLOR[t.statut] + "40", color: STATUT_COLOR[t.statut], backgroundColor: STATUT_COLOR[t.statut] + "10" }}
                    >
                      <option value="a_faire">{STATUT_LABEL.a_faire}</option>
                      <option value="en_cours">{STATUT_LABEL.en_cours}</option>
                      <option value="termine">{STATUT_LABEL.termine}</option>
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
