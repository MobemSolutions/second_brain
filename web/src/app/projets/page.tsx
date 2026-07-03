"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Pencil, ChevronDown, ChevronRight, Circle, CheckCircle2, X } from "lucide-react";

interface Projet {
  id: number;
  titre: string;
  statut: string;
  priorite: string;
  deadline?: string;
  notes?: string;
  okr_trimestre?: string;
  total_taches: number;
  taches_faites: number;
}
interface Tache {
  id: number;
  titre: string;
  statut: string;
  priorite: string;
  date_echeance?: string;
  contexte?: string;
  projet_id: number;
}

const COLONNES = [
  { id: "a_faire", label: "À faire", color: "text-zinc-400" },
  { id: "en_cours", label: "En cours", color: "text-blue-400" },
  { id: "en_attente", label: "En attente", color: "text-amber-400" },
  { id: "termine", label: "Terminé", color: "text-emerald-400" },
];

const PRIO_BADGE: Record<string, string> = {
  critique: "badge-red", important: "badge-orange",
  normal: "badge-blue", optionnel: "badge-gray",
};

function deadlineDays(d?: string) {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000);
}
function deadlineLabel(d?: string) {
  const n = deadlineDays(d);
  if (n === null) return null;
  if (n < 0) return { text: `Dépassé ${Math.abs(n)}j`, cls: "text-red-400" };
  if (n === 0) return { text: "Aujourd'hui", cls: "text-red-400" };
  if (n <= 7) return { text: `J-${n}`, cls: "text-red-400" };
  if (n <= 30) return { text: `J-${n}`, cls: "text-amber-400" };
  return { text: `J-${n}`, cls: "text-zinc-500" };
}

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

const INIT_PROJET = { titre: "", statut: "a_faire", priorite: "normal", deadline: "", notes: "", okr_trimestre: "" };
const INIT_TACHE = { titre: "", priorite: "moyenne", date_echeance: "", contexte: "" };

export default function ProjetsPage() {
  const [projets, setProjets] = useState<Projet[]>([]);
  const [taches, setTaches] = useState<Tache[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [modal, setModal] = useState<"projet" | "tache" | null>(null);
  const [editingProjetId, setEditingProjetId] = useState<number | null>(null);
  const [editingTacheId, setEditingTacheId] = useState<number | null>(null);
  const [projetForm, setProjetForm] = useState(INIT_PROJET);
  const [tacheForm, setTacheForm] = useState(INIT_TACHE);
  const [tacheProjetId, setTacheProjetId] = useState<number | null>(null);

  const loadProjets = useCallback(async () => {
    const r = await fetch("/api/projets");
    setProjets(await r.json());
  }, []);

  const loadTaches = useCallback(async (projetId: number) => {
    const r = await fetch(`/api/taches?projet_id=${projetId}`);
    setTaches(await r.json());
  }, []);

  useEffect(() => { loadProjets(); }, [loadProjets]);

  const toggleExpand = (id: number) => {
    if (expanded === id) { setExpanded(null); setTaches([]); return; }
    setExpanded(id);
    loadTaches(id);
  };

  // Locally adjust a project's aggregate task counts so the progress bar updates instantly
  const bumpCounts = (projetId: number | null | undefined, deltaTotal: number, deltaDone: number) => {
    if (!projetId) return;
    setProjets((prev) => prev.map((p) => p.id === projetId
      ? { ...p, total_taches: Math.max(0, (p.total_taches || 0) + deltaTotal), taches_faites: Math.max(0, (p.taches_faites || 0) + deltaDone) }
      : p));
  };

  const changeStatut = async (id: number, statut: string) => {
    const prev = projets;
    setProjets((cur) => cur.map((p) => (p.id === id ? { ...p, statut } : p)));
    try {
      const res = await fetch(`/api/projets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setProjets(prev);
      alert("Échec du changement de statut — réessaie.");
    }
  };

  const deleteProjet = async (id: number) => {
    if (!confirm("Supprimer ce projet ?")) return;
    const prev = projets;
    setProjets((cur) => cur.filter((p) => p.id !== id));
    if (expanded === id) { setExpanded(null); setTaches([]); }
    try {
      const res = await fetch(`/api/projets/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setProjets(prev);
      alert("Échec de la suppression — réessaie.");
    }
  };

  const openNewProjet = () => {
    setEditingProjetId(null);
    setProjetForm(INIT_PROJET);
    setModal("projet");
  };

  const openEditProjet = (p: Projet) => {
    setEditingProjetId(p.id);
    setProjetForm({
      titre: p.titre, statut: p.statut, priorite: p.priorite,
      deadline: p.deadline ?? "", notes: p.notes ?? "", okr_trimestre: p.okr_trimestre ?? "",
    });
    setModal("projet");
  };

  const submitProjet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projetForm.titre.trim()) return;
    setModal(null);

    if (editingProjetId) {
      const id = editingProjetId;
      const prev = projets;
      setProjets((cur) => cur.map((p) => (p.id === id ? { ...p, ...projetForm } : p)));
      setEditingProjetId(null);
      setProjetForm(INIT_PROJET);
      try {
        const res = await fetch(`/api/projets/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(projetForm),
        });
        if (!res.ok) throw new Error();
      } catch {
        setProjets(prev);
        alert("Échec de la modification — réessaie.");
      }
    } else {
      const tempId = -Date.now();
      const optimistic: Projet = { id: tempId, total_taches: 0, taches_faites: 0, ...projetForm };
      setProjets((cur) => [...cur, optimistic]);
      setProjetForm(INIT_PROJET);
      try {
        const res = await fetch("/api/projets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(projetForm),
        });
        if (!res.ok) throw new Error();
        const real = await res.json();
        setProjets((cur) => cur.map((p) => (p.id === tempId ? { ...real, total_taches: 0, taches_faites: 0 } : p)));
      } catch {
        setProjets((cur) => cur.filter((p) => p.id !== tempId));
        alert("Échec de la création — réessaie.");
      }
    }
  };

  const openNewTache = (projetId: number) => {
    setEditingTacheId(null);
    setTacheProjetId(projetId);
    setTacheForm(INIT_TACHE);
    setModal("tache");
  };

  const openEditTache = (t: Tache) => {
    setEditingTacheId(t.id);
    setTacheProjetId(t.projet_id);
    setTacheForm({
      titre: t.titre, priorite: t.priorite,
      date_echeance: t.date_echeance ?? "", contexte: t.contexte ?? "",
    });
    setModal("tache");
  };

  const submitTache = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tacheForm.titre.trim() || !tacheProjetId) return;
    setModal(null);

    if (editingTacheId) {
      const id = editingTacheId;
      const prev = taches;
      setTaches((cur) => cur.map((t) => (t.id === id ? { ...t, ...tacheForm } : t)));
      setEditingTacheId(null);
      setTacheForm(INIT_TACHE);
      try {
        const res = await fetch(`/api/taches/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(tacheForm),
        });
        if (!res.ok) throw new Error();
      } catch {
        setTaches(prev);
        alert("Échec de la modification — réessaie.");
      }
    } else {
      const projetId = tacheProjetId;
      const tempId = -Date.now();
      const optimistic: Tache = { id: tempId, statut: "a_faire", projet_id: projetId, ...tacheForm };
      if (expanded === projetId) setTaches((cur) => [...cur, optimistic]);
      bumpCounts(projetId, 1, 0);
      setTacheForm(INIT_TACHE);
      try {
        const res = await fetch("/api/taches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...tacheForm, projet_id: projetId }),
        });
        if (!res.ok) throw new Error();
        const real = await res.json();
        if (expanded === projetId) setTaches((cur) => cur.map((t) => (t.id === tempId ? real : t)));
      } catch {
        if (expanded === projetId) setTaches((cur) => cur.filter((t) => t.id !== tempId));
        bumpCounts(projetId, -1, 0);
        alert("Échec de la création de la tâche — réessaie.");
      }
    }
  };

  const toggleTache = async (t: Tache) => {
    const prev = taches;
    const willBeDone = t.statut !== "termine";
    setTaches((cur) => cur.map((x) => (x.id === t.id ? { ...x, statut: willBeDone ? "termine" : "a_faire" } : x)));
    bumpCounts(t.projet_id, 0, willBeDone ? 1 : -1);
    try {
      const res = await fetch(`/api/taches/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut: willBeDone ? "termine" : "a_faire" }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setTaches(prev);
      bumpCounts(t.projet_id, 0, willBeDone ? -1 : 1);
      alert("Échec — réessaie.");
    }
  };

  const deleteTache = async (t: Tache) => {
    const prev = taches;
    setTaches((cur) => cur.filter((x) => x.id !== t.id));
    bumpCounts(t.projet_id, -1, t.statut === "termine" ? -1 : 0);
    try {
      const res = await fetch(`/api/taches/${t.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setTaches(prev);
      bumpCounts(t.projet_id, 1, t.statut === "termine" ? 1 : 0);
      alert("Échec de la suppression — réessaie.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Projets</h1>
          <p className="text-zinc-500 text-sm mt-0.5">
            {projets.filter((p) => p.statut === "en_cours").length} en cours
          </p>
        </div>
        <button onClick={openNewProjet} className="btn-primary flex items-center gap-2">
          <Plus size={15} /> Nouveau projet
        </button>
      </div>

      {/* Kanban */}
      {projets.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-zinc-500 text-sm">Aucun projet — crée-en un pour commencer</p>
        </div>
      ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {COLONNES.map((col) => {
          const colProjets = projets.filter((p) => p.statut === col.id);
          if (colProjets.length === 0) return null;
          return (
            <div key={col.id}>
              {/* Column header */}
              <div className="flex items-center gap-2 mb-3 px-1">
                <span className={`text-xs font-semibold ${col.color}`}>{col.label}</span>
                <span className="text-xs text-zinc-600 bg-zinc-800 rounded-full px-1.5 py-0.5">
                  {colProjets.length}
                </span>
              </div>

              {/* Cards */}
              <div className="space-y-3">
                {colProjets.map((p) => {
                  const total = p.total_taches || 0;
                  const done = p.taches_faites || 0;
                  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
                  const dl = deadlineLabel(p.deadline);
                  const isOpen = expanded === p.id;

                  return (
                    <div key={p.id} className="card-sm group hover:border-zinc-700 transition-colors">
                      {/* Card top */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <p className="text-sm font-medium text-zinc-100 leading-snug flex-1 whitespace-pre-line">{p.titre}</p>
                        <div className="flex items-center gap-0.5 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-colors">
                          <button
                            onClick={() => openEditProjet(p)}
                            className="text-zinc-700 hover:text-violet-400 transition-colors p-0.5"
                            title="Modifier"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => deleteProjet(p.id)}
                            className="text-zinc-700 hover:text-red-400 transition-colors p-0.5"
                            title="Supprimer"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Meta */}
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        {p.priorite && p.priorite !== "normal" && (
                          <span className={PRIO_BADGE[p.priorite] || "badge-gray"}>{p.priorite}</span>
                        )}
                        {dl && <span className={`text-xs ${dl.cls}`}>{dl.text}</span>}
                        {p.okr_trimestre && (
                          <span className="badge-gray">{p.okr_trimestre}</span>
                        )}
                      </div>

                      {/* Progress */}
                      {total > 0 && (
                        <div className="mb-3">
                          <div className="progress-track mb-1">
                            <div className="progress-fill" style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-xs text-zinc-600">{done}/{total} tâches · {pct}%</p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 justify-between">
                        <select
                          value={p.statut}
                          onChange={(e) => changeStatut(p.id, e.target.value)}
                          className="text-xs bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-400 cursor-pointer"
                        >
                          {COLONNES.map((c) => (
                            <option key={c.id} value={c.id}>{c.label}</option>
                          ))}
                        </select>

                        <div className="flex gap-1">
                          <button
                            onClick={() => openNewTache(p.id)}
                            className="text-xs text-zinc-500 hover:text-violet-400 transition-colors px-2 py-1 rounded hover:bg-zinc-800"
                          >
                            + Tâche
                          </button>
                          <button
                            onClick={() => toggleExpand(p.id)}
                            className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 rounded hover:bg-zinc-800"
                          >
                            {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                          </button>
                        </div>
                      </div>

                      {/* Expanded tasks */}
                      {isOpen && (
                        <div className="mt-3 pt-3 border-t border-zinc-800 space-y-2">
                          {taches.length === 0 ? (
                            <p className="text-xs text-zinc-600 text-center py-1">Aucune tâche</p>
                          ) : (
                            taches.map((t) => (
                              <div key={t.id} className="flex items-center gap-2 group/task">
                                <button
                                  onClick={() => toggleTache(t)}
                                  className={`shrink-0 transition-colors ${
                                    t.statut === "termine"
                                      ? "text-emerald-500"
                                      : "text-zinc-600 hover:text-emerald-400"
                                  }`}
                                >
                                  {t.statut === "termine" ? <CheckCircle2 size={13} /> : <Circle size={13} />}
                                </button>
                                <span className={`text-xs flex-1 whitespace-pre-line ${t.statut === "termine" ? "line-through text-zinc-600" : "text-zinc-300"}`}>
                                  {t.titre}
                                </span>
                                <button
                                  onClick={() => openEditTache(t)}
                                  className="text-zinc-700 hover:text-violet-400 opacity-100 sm:opacity-0 sm:group-hover/task:opacity-100 transition-all"
                                  title="Modifier"
                                >
                                  <Pencil size={11} />
                                </button>
                                <button
                                  onClick={() => deleteTache(t)}
                                  className="text-zinc-700 hover:text-red-400 opacity-100 sm:opacity-0 sm:group-hover/task:opacity-100 transition-all"
                                  title="Supprimer"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Modal Projet */}
      {modal === "projet" && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-zinc-100">{editingProjetId ? "Modifier le projet" : "Nouveau projet"}</h2>
              <button onClick={() => setModal(null)} className="btn-ghost p-1.5"><X size={15} /></button>
            </div>
            <form onSubmit={submitProjet} className="space-y-3">
              <textarea autoFocus rows={2} placeholder="Titre du projet (Ctrl+Entrée = retour à la ligne)" className="input"
                value={projetForm.titre} onChange={(e) => setProjetForm({ ...projetForm, titre: e.target.value })}
                onKeyDown={(e) => handleTitleKeyDown(e, (v) => setProjetForm((p) => ({ ...p, titre: v })))} required />
              <div className="grid grid-cols-2 gap-3">
                <select className="select" value={projetForm.statut} onChange={(e) => setProjetForm({ ...projetForm, statut: e.target.value })}>
                  {COLONNES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
                <select className="select" value={projetForm.priorite} onChange={(e) => setProjetForm({ ...projetForm, priorite: e.target.value })}>
                  {["normal", "important", "critique", "optionnel"].map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Deadline</label>
                  <input type="date" className="input" value={projetForm.deadline}
                    onChange={(e) => setProjetForm({ ...projetForm, deadline: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">OKR</label>
                  <select className="select" value={projetForm.okr_trimestre} onChange={(e) => setProjetForm({ ...projetForm, okr_trimestre: e.target.value })}>
                    <option value="">—</option>
                    {["Q1", "Q2", "Q3", "Q4"].map((q) => <option key={q}>{q}</option>)}
                  </select>
                </div>
              </div>
              <textarea placeholder="Notes" className="input" rows={2} value={projetForm.notes}
                onChange={(e) => setProjetForm({ ...projetForm, notes: e.target.value })} />
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setModal(null)} className="btn-ghost">Annuler</button>
                <button type="submit" className="btn-primary">{editingProjetId ? "Enregistrer" : "Créer"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tâche */}
      {modal === "tache" && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-zinc-100">
                {editingTacheId ? "Modifier la tâche" : "Nouvelle tâche"} — {projets.find((p) => p.id === tacheProjetId)?.titre}
              </h2>
              <button onClick={() => setModal(null)} className="btn-ghost p-1.5"><X size={15} /></button>
            </div>
            <form onSubmit={submitTache} className="space-y-3">
              <textarea autoFocus rows={2} placeholder="Titre de la tâche (Ctrl+Entrée = retour à la ligne)" className="input"
                value={tacheForm.titre} onChange={(e) => setTacheForm({ ...tacheForm, titre: e.target.value })}
                onKeyDown={(e) => handleTitleKeyDown(e, (v) => setTacheForm((p) => ({ ...p, titre: v })))} required />
              <div className="grid grid-cols-2 gap-3">
                <select className="select" value={tacheForm.priorite} onChange={(e) => setTacheForm({ ...tacheForm, priorite: e.target.value })}>
                  {["haute", "moyenne", "basse"].map((p) => <option key={p}>{p}</option>)}
                </select>
                <input type="date" className="input" value={tacheForm.date_echeance}
                  onChange={(e) => setTacheForm({ ...tacheForm, date_echeance: e.target.value })} />
              </div>
              <select className="select" value={tacheForm.contexte} onChange={(e) => setTacheForm({ ...tacheForm, contexte: e.target.value })}>
                <option value="">Contexte…</option>
                {["@Bureau", "@Maison", "@Tel", "@Dehors"].map((c) => <option key={c}>{c}</option>)}
              </select>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setModal(null)} className="btn-ghost">Annuler</button>
                <button type="submit" className="btn-primary">{editingTacheId ? "Enregistrer" : "Ajouter"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
