"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2, Copy, Pencil, X, Minus, Download } from "lucide-react";

interface Template {
  id: number;
  nom: string;
}
interface Carte {
  id: number;
  template_id: number;
  titre: string;
  emoji: string | null;
  couleur: string | null;
}
interface Creneau {
  id: number;
  template_id: number;
  carte_id: number;
  jour: number;
  heure_debut: string;
  heure_fin: string;
}

const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const COULEURS = ["#6d28d9", "#3b82f6", "#10b981", "#f59e0b", "#f43f5e", "#06b6d4", "#f97316", "#64748b"];

const DAY_START_MIN = 6 * 60;
const DAY_END_MIN = 24 * 60;
const PX_PER_MIN_DEFAULT = 0.8;
const PX_PER_MIN_MIN = 0.3;
const PX_PER_MIN_MAX = 2;
const HOURS = Array.from({ length: 19 }, (_, i) => 6 + i);
const HALF_HOURS = Array.from({ length: 18 }, (_, i) => (6 + i) * 60 + 30);

function tint(hex: string, amount: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function minutesToTime(m: number): string {
  const clamped = Math.max(0, Math.min(24 * 60, m));
  return `${pad(Math.floor(clamped / 60))}:${pad(clamped % 60)}`;
}
function timeToY(t: string, pxPerMin: number): number {
  return (timeToMinutes(t) - DAY_START_MIN) * pxPerMin;
}
function durationPx(start: string, end: string, pxPerMin: number): number {
  return (timeToMinutes(end) - timeToMinutes(start)) * pxPerMin;
}
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function snap15(m: number): number {
  return Math.round(m / 15) * 15;
}

export default function PlanningPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [cartes, setCartes] = useState<Carte[]>([]);
  const [creneaux, setCreneaux] = useState<Creneau[]>([]);

  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  const [showCarteForm, setShowCarteForm] = useState(false);
  const [carteForm, setCarteForm] = useState({ titre: "", emoji: "", couleur: COULEURS[0] });

  const [editingCreneau, setEditingCreneau] = useState<Creneau | null>(null);
  const [editForm, setEditForm] = useState({ heure_debut: "", heure_fin: "" });

  const [pxPerMin, setPxPerMin] = useState(PX_PER_MIN_DEFAULT);
  const gridRef = useRef<HTMLDivElement>(null);
  const gridHeight = (DAY_END_MIN - DAY_START_MIN) * pxPerMin;

  const loadTemplates = useCallback(async () => {
    const r = await fetch("/api/planning/templates");
    const data: Template[] = await r.json();
    setTemplates(data);
    setActiveId((cur) => (cur && data.some((t) => t.id === cur) ? cur : data[0]?.id ?? null));
  }, []);

  const loadCartes = useCallback(() => {
    if (!activeId) { setCartes([]); return; }
    fetch(`/api/planning/cartes?template_id=${activeId}`).then((r) => r.json()).then(setCartes);
  }, [activeId]);

  const loadCreneaux = useCallback(() => {
    if (!activeId) { setCreneaux([]); return; }
    fetch(`/api/planning/creneaux?template_id=${activeId}`).then((r) => r.json()).then(setCreneaux);
  }, [activeId]);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);
  useEffect(() => { loadCartes(); loadCreneaux(); }, [loadCartes, loadCreneaux]);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      setPxPerMin((p) => Math.min(PX_PER_MIN_MAX, Math.max(PX_PER_MIN_MIN, p * (e.deltaY < 0 ? 1.1 : 0.9))));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [activeId]);

  const activeTemplate = templates.find((t) => t.id === activeId) || null;
  const carteById = useMemo(() => new Map(cartes.map((c) => [c.id, c])), [cartes]);

  const createTemplate = async () => {
    if (!newTemplateName.trim()) return;
    const r = await fetch("/api/planning/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom: newTemplateName.trim() }),
    });
    const created: Template = await r.json();
    setNewTemplateName("");
    setShowNewTemplate(false);
    await loadTemplates();
    setActiveId(created.id);
  };

  const saveRename = async () => {
    if (!activeId || !renameValue.trim()) { setRenaming(false); return; }
    await fetch(`/api/planning/templates/${activeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom: renameValue.trim() }),
    });
    setRenaming(false);
    loadTemplates();
  };

  const duplicateTemplate = async () => {
    if (!activeId) return;
    const r = await fetch(`/api/planning/templates/${activeId}/duplicate`, { method: "POST" });
    const created: Template = await r.json();
    await loadTemplates();
    setActiveId(created.id);
  };

  const deleteTemplate = async () => {
    if (!activeId) return;
    if (!window.confirm(`Supprimer "${activeTemplate?.nom}" et tout son contenu ?`)) return;
    await fetch(`/api/planning/templates/${activeId}`, { method: "DELETE" });
    setActiveId(null);
    loadTemplates();
  };

  const submitCarte = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeId || !carteForm.titre.trim()) return;
    await fetch("/api/planning/cartes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        template_id: activeId,
        titre: carteForm.titre.trim(),
        emoji: carteForm.emoji || null,
        couleur: carteForm.couleur,
      }),
    });
    setCarteForm({ titre: "", emoji: "", couleur: COULEURS[0] });
    setShowCarteForm(false);
    loadCartes();
  };

  const deleteCarte = async (id: number) => {
    await fetch(`/api/planning/cartes/${id}`, { method: "DELETE" });
    loadCartes();
    loadCreneaux();
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, jour: number) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    let startMin = snap15(DAY_START_MIN + y / pxPerMin);
    startMin = Math.max(DAY_START_MIN, Math.min(DAY_END_MIN - 15, startMin));

    const creneauId = e.dataTransfer.getData("application/x-creneau-id");
    const carteId = e.dataTransfer.getData("application/x-carte-id");

    if (creneauId) {
      const cr = creneaux.find((c) => c.id === Number(creneauId));
      if (!cr) return;
      const duration = timeToMinutes(cr.heure_fin) - timeToMinutes(cr.heure_debut);
      let endMin = startMin + duration;
      if (endMin > DAY_END_MIN) { endMin = DAY_END_MIN; startMin = endMin - duration; }
      await fetch(`/api/planning/creneaux/${cr.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jour, heure_debut: minutesToTime(startMin), heure_fin: minutesToTime(endMin) }),
      });
      loadCreneaux();
    } else if (carteId && activeId) {
      const endMin = Math.min(DAY_END_MIN, startMin + 60);
      await fetch("/api/planning/creneaux", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_id: activeId,
          carte_id: Number(carteId),
          jour,
          heure_debut: minutesToTime(startMin),
          heure_fin: minutesToTime(endMin),
        }),
      });
      loadCreneaux();
    }
  };

  const openEdit = (cr: Creneau) => {
    setEditingCreneau(cr);
    setEditForm({ heure_debut: cr.heure_debut, heure_fin: cr.heure_fin });
  };

  const saveEdit = async () => {
    if (!editingCreneau) return;
    await fetch(`/api/planning/creneaux/${editingCreneau.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setEditingCreneau(null);
    loadCreneaux();
  };

  const deleteEditingCreneau = async () => {
    if (!editingCreneau) return;
    await fetch(`/api/planning/creneaux/${editingCreneau.id}`, { method: "DELETE" });
    setEditingCreneau(null);
    loadCreneaux();
  };

  const exportPdf = async () => {
    if (!activeTemplate) return;
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a3" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    const marginLeft = 16, marginTop = 20, marginRight = 6, marginBottom = 8;
    const gridW = pageW - marginLeft - marginRight;
    const gridH = pageH - marginTop - marginBottom;
    const colW = gridW / 7;
    const mmPerMin = gridH / (DAY_END_MIN - DAY_START_MIN);

    doc.setFontSize(15);
    doc.setTextColor(30);
    doc.text(`Planning — ${activeTemplate.nom}`, marginLeft, 12);

    doc.setFontSize(7);
    doc.setTextColor(140);
    for (let h = 6; h <= 24; h++) {
      const y = marginTop + (h * 60 - DAY_START_MIN) * mmPerMin;
      doc.setDrawColor(230);
      doc.line(marginLeft, y, pageW - marginRight, y);
      doc.text(`${pad(h % 24)}:00`, 2, y + 1.2);
    }

    doc.setFontSize(10);
    doc.setTextColor(60);
    JOURS.forEach((label, i) => {
      const x = marginLeft + i * colW;
      doc.text(label, x + colW / 2, marginTop - 4, { align: "center" });
      doc.setDrawColor(210);
      doc.line(x, marginTop, x, marginTop + gridH);
    });
    doc.line(marginLeft + 7 * colW, marginTop, marginLeft + 7 * colW, marginTop + gridH);

    creneaux.forEach((cr) => {
      const carte = carteById.get(cr.carte_id);
      const couleur = carte?.couleur || "#6d28d9";
      const x = marginLeft + cr.jour * colW + 0.6;
      const y = marginTop + (timeToMinutes(cr.heure_debut) - DAY_START_MIN) * mmPerMin;
      const h = Math.max(4, (timeToMinutes(cr.heure_fin) - timeToMinutes(cr.heure_debut)) * mmPerMin);
      const w = colW - 1.2;

      const [r, g, b] = hexToRgb(couleur);
      doc.setFillColor(r, g, b);
      doc.roundedRect(x, y, w, h, 0.8, 0.8, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      const label = `${carte?.emoji ?? ""} ${carte?.titre ?? ""}`.trim();
      doc.text(label, x + 1, y + 3, { maxWidth: w - 2 });
      if (h > 6) {
        doc.setFontSize(6);
        doc.text(`${cr.heure_debut}–${cr.heure_fin}`, x + 1, y + h - 1, { maxWidth: w - 2 });
      }
    });

    doc.save(`planning-${activeTemplate.nom}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Planning</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Construis ta semaine type</p>
        </div>
      </div>

      {/* Template switcher */}
      <div className="flex items-center gap-2 flex-wrap">
        {templates.map((t) => (
          <button
            key={t.id}
            onClick={() => { setActiveId(t.id); setRenaming(false); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              activeId === t.id ? "border-violet-500/50 bg-violet-500/10 text-violet-300" : "border-zinc-800 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {t.nom}
          </button>
        ))}

        {showNewTemplate ? (
          <div className="flex items-center gap-1.5">
            <input
              autoFocus
              className="input py-1.5 text-sm w-40"
              placeholder="Nom du modèle"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") createTemplate(); if (e.key === "Escape") setShowNewTemplate(false); }}
            />
            <button onClick={createTemplate} className="btn-primary py-1.5 px-3 text-xs">OK</button>
            <button onClick={() => setShowNewTemplate(false)} className="btn-ghost py-1.5 px-2 text-xs">Annuler</button>
          </div>
        ) : (
          <button onClick={() => setShowNewTemplate(true)} className="btn-ghost text-xs flex items-center gap-1.5 py-1.5">
            <Plus size={13} /> Nouveau modèle
          </button>
        )}
      </div>

      {!activeTemplate ? (
        <div className="card text-center py-16">
          <p className="text-4xl mb-3">🗓️</p>
          <p className="text-zinc-500 text-sm">Crée un premier modèle de semaine pour commencer</p>
        </div>
      ) : (
        <>
          {/* Active template controls */}
          <div className="flex items-center justify-between">
            {renaming ? (
              <div className="flex items-center gap-1.5">
                <input
                  autoFocus
                  className="input py-1.5 text-sm w-48"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveRename(); if (e.key === "Escape") setRenaming(false); }}
                />
                <button onClick={saveRename} className="btn-primary py-1.5 px-3 text-xs">OK</button>
              </div>
            ) : (
              <button
                onClick={() => { setRenaming(true); setRenameValue(activeTemplate.nom); }}
                className="flex items-center gap-1.5 text-sm text-zinc-300 hover:text-violet-300 transition-colors"
              >
                <Pencil size={12} /> {activeTemplate.nom}
              </button>
            )}
            <div className="flex items-center gap-2">
              <button onClick={duplicateTemplate} className="btn-ghost text-xs flex items-center gap-1.5">
                <Copy size={12} /> Dupliquer
              </button>
              <button onClick={deleteTemplate} className="btn-ghost text-xs flex items-center gap-1.5 text-red-400/80 hover:text-red-400">
                <Trash2 size={12} /> Supprimer
              </button>
            </div>
          </div>

          {/* Cards panel */}
          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <p className="section-label">Mes cartes</p>
              <button onClick={() => setShowCarteForm((v) => !v)} className="btn-ghost text-xs flex items-center gap-1.5 py-1">
                <Plus size={13} /> Nouvelle carte
              </button>
            </div>

            {showCarteForm && (
              <form onSubmit={submitCarte} className="flex items-end gap-3 flex-wrap p-3 rounded-lg border border-zinc-800">
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Titre</label>
                  <input
                    className="input py-1.5 text-sm w-40"
                    placeholder="Sport, Projet X…"
                    value={carteForm.titre}
                    onChange={(e) => setCarteForm((p) => ({ ...p, titre: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Emoji</label>
                  <input
                    className="input py-1.5 text-sm w-16 text-center"
                    placeholder="💪"
                    value={carteForm.emoji}
                    onChange={(e) => setCarteForm((p) => ({ ...p, emoji: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Couleur</label>
                  <div className="flex gap-1.5">
                    {COULEURS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCarteForm((p) => ({ ...p, couleur: c }))}
                        className="w-6 h-6 rounded-full border-2 transition-transform"
                        style={{
                          backgroundColor: c,
                          borderColor: carteForm.couleur === c ? "#1a1a18" : "transparent",
                          transform: carteForm.couleur === c ? "scale(1.15)" : "scale(1)",
                        }}
                      />
                    ))}
                  </div>
                </div>
                <button type="submit" className="btn-primary py-1.5 px-3 text-xs">Créer</button>
              </form>
            )}

            {cartes.length === 0 ? (
              <p className="text-xs text-zinc-600">Aucune carte — crée-en une puis glisse-la dans la semaine</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {cartes.map((c) => (
                  <div
                    key={c.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("application/x-carte-id", String(c.id))}
                    className="group flex items-center gap-1.5 pl-2.5 pr-1.5 py-1.5 rounded-lg border cursor-grab active:cursor-grabbing text-sm"
                    style={{ borderColor: "#e4e2de", borderLeftColor: c.couleur || "#6d28d9", borderLeftWidth: 3, backgroundColor: "#fafaf9" }}
                  >
                    <span>{c.emoji || "•"}</span>
                    <span className="text-zinc-300">{c.titre}</span>
                    <button
                      onClick={() => deleteCarte(c.id)}
                      className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all p-0.5"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Grid toolbar */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <button onClick={() => setPxPerMin((p) => Math.max(PX_PER_MIN_MIN, p - 0.15))} className="btn-ghost p-1.5">
                <Minus size={13} />
              </button>
              <span className="text-xs text-zinc-500 w-11 text-center">{Math.round((pxPerMin / PX_PER_MIN_DEFAULT) * 100)}%</span>
              <button onClick={() => setPxPerMin((p) => Math.min(PX_PER_MIN_MAX, p + 0.15))} className="btn-ghost p-1.5">
                <Plus size={13} />
              </button>
              <span className="text-[11px] text-zinc-600 ml-1">Ctrl + molette pour zoomer</span>
            </div>
            <button onClick={exportPdf} disabled={creneaux.length === 0} className="btn-ghost flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
              <Download size={14} /> Exporter en PDF
            </button>
          </div>

          {/* Week grid */}
          <div className="card p-0 overflow-x-auto" ref={gridRef}>
            <div className="flex" style={{ minWidth: "66rem" }}>
              {/* Time axis */}
              <div className="shrink-0 w-14 relative" style={{ height: gridHeight + 32 }}>
                <div className="h-8" />
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="absolute text-[10px] text-zinc-600 -translate-y-1/2"
                    style={{ top: 32 + (h * 60 - DAY_START_MIN) * pxPerMin, right: 6 }}
                  >
                    {pad(h % 24)}:00
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {JOURS.map((jourLabel, jourIdx) => (
                <div key={jourIdx} className="flex-1 min-w-[9rem] border-l border-zinc-800">
                  <div className="h-8 flex items-center justify-center text-xs font-medium text-zinc-400 border-b border-zinc-800">
                    {jourLabel}
                  </div>
                  <div
                    className="relative"
                    style={{ height: gridHeight }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, jourIdx)}
                  >
                    {HALF_HOURS.map((m) => (
                      <div
                        key={`h-${m}`}
                        className="absolute left-0 right-0 border-t"
                        style={{ top: (m - DAY_START_MIN) * pxPerMin, borderColor: "#eeece9" }}
                      />
                    ))}
                    {HOURS.map((h) => (
                      <div
                        key={h}
                        className="absolute left-0 right-0 border-t border-zinc-800"
                        style={{ top: (h * 60 - DAY_START_MIN) * pxPerMin }}
                      />
                    ))}

                    {creneaux.filter((cr) => cr.jour === jourIdx).map((cr) => {
                      const carte = carteById.get(cr.carte_id);
                      const couleur = carte?.couleur || "#6d28d9";
                      return (
                        <div
                          key={cr.id}
                          draggable
                          onDragStart={(e) => { e.dataTransfer.setData("application/x-creneau-id", String(cr.id)); e.stopPropagation(); }}
                          onClick={() => openEdit(cr)}
                          className="absolute rounded-md overflow-hidden cursor-grab active:cursor-grabbing text-[11px] leading-tight transition-shadow hover:shadow-sm"
                          style={{
                            top: timeToY(cr.heure_debut, pxPerMin),
                            height: Math.max(20, durationPx(cr.heure_debut, cr.heure_fin, pxPerMin)),
                            left: 3,
                            right: 3,
                            backgroundColor: tint(couleur, 0.85),
                            borderLeft: `3px solid ${couleur}`,
                            padding: "3px 6px",
                          }}
                        >
                          <p className="font-medium truncate" style={{ color: tint(couleur, 0.25) }}>
                            {carte?.emoji} {carte?.titre}
                          </p>
                          <p className="truncate" style={{ color: "#8a8886" }}>{cr.heure_debut}–{cr.heure_fin}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Edit creneau modal */}
      {editingCreneau && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setEditingCreneau(null)}>
          <div className="card w-80 space-y-4" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-medium text-zinc-200">
              {carteById.get(editingCreneau.carte_id)?.emoji} {carteById.get(editingCreneau.carte_id)?.titre}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Début</label>
                <input
                  type="time"
                  className="input"
                  value={editForm.heure_debut}
                  onChange={(e) => setEditForm((p) => ({ ...p, heure_debut: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Fin</label>
                <input
                  type="time"
                  className="input"
                  value={editForm.heure_fin}
                  onChange={(e) => setEditForm((p) => ({ ...p, heure_fin: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <button onClick={deleteEditingCreneau} className="text-xs text-red-400/80 hover:text-red-400 flex items-center gap-1.5">
                <Trash2 size={12} /> Supprimer
              </button>
              <div className="flex gap-2">
                <button onClick={() => setEditingCreneau(null)} className="btn-ghost text-xs">Fermer</button>
                <button onClick={saveEdit} className="btn-primary text-xs">Enregistrer</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
