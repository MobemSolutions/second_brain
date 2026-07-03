"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Pencil, FileText, RotateCcw } from "lucide-react";
import PdfModal from "@/components/PdfModal";
import Sparkline from "@/components/Sparkline";

interface Session {
  id: number;
  discipline: string;
  date: string;
  duree?: number;
  rpe?: number;
  meteo?: string;
  notes?: string;
  groupe_musculaire?: string;
  exercice?: string;
  series?: number;
  repetitions?: number;
  charge?: number;
  programme?: string;
  type_course?: string;
  distance?: number;
  temps_min?: number;
  denivele?: number;
  fc_moyenne?: number;
  site?: string;
  voie?: string;
  cotation?: string;
  style_escalade?: string;
  resultat?: string;
  sommet?: string;
  massif?: string;
  altitude?: number;
  cotation_globale?: string;
  partenaires?: string;
  bivouac?: number;
  rapport?: string;
  pdf_path?: string;
}

type Disc = "musculation" | "running" | "natation" | "escalade" | "alpinisme";

const TABS: { id: Disc; label: string; icon: string }[] = [
  { id: "musculation", label: "Musculation", icon: "💪" },
  { id: "running", label: "Running", icon: "🏃" },
  { id: "natation", label: "Natation", icon: "🏊" },
  { id: "escalade", label: "Escalade", icon: "🧗" },
  { id: "alpinisme", label: "Alpinisme", icon: "🏔️" },
];

const NAGES = ["Crawl", "Dos", "Brasse", "Papillon", "4 Nages"];

const GROUPES = ["Dos", "Pectoraux", "Épaules", "Biceps", "Triceps", "Jambes", "Abdos", "Full body"];
const COTATIONS = ["4", "4+", "5a", "5b", "5c", "6a", "6a+", "6b", "6b+", "6c", "6c+", "7a", "7a+", "7b", "7b+", "7c", "7c+", "8a"];
const COTATIONS_ALPI = ["F", "PD-", "PD", "PD+", "AD-", "AD", "AD+", "D-", "D", "D+", "TD-", "TD", "TD+", "ED"];
const RESULTATS = ["🌟 Flash", "✅ Enchainement", "👀 À vue", "🔧 Travaillée", "📌 Projet"];
const METEO = ["☀️ Beau", "🌤️ Nuageux", "🌧️ Pluie", "❄️ Neige"];

const EMPTY_FORM: Record<string, string | number> = {
  date: new Date().toISOString().split("T")[0],
  duree: "", rpe: "", meteo: "", notes: "",
  groupe_musculaire: "", exercice: "", series: "", repetitions: "", charge: "", programme: "",
  type_course: "", distance: "", temps_min: "", denivele: "", fc_moyenne: "",
  site: "", voie: "", cotation: "", style_escalade: "Bloc", resultat: "",
  sommet: "", massif: "", altitude: "", cotation_globale: "", partenaires: "",
  bivouac: "0", rapport: "",
};

function pace(dist: number, timeMin: number): string {
  if (!dist || !timeMin) return "—";
  const secPerKm = (timeMin * 60) / dist;
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")} /km`;
}

function pace100(distM: number, timeMin: number): string {
  if (!distM || !timeMin) return "—";
  const secPer100 = (timeMin * 60) / (distM / 100);
  const m = Math.floor(secPer100 / 60);
  const s = Math.round(secPer100 % 60);
  return `${m}:${String(s).padStart(2, "0")} /100m`;
}

function volume(series?: number, reps?: number, charge?: number): number | null {
  if (!series || !reps || !charge) return null;
  return series * reps * charge;
}

function sessionToForm(s: Session): Record<string, string | number> {
  return {
    date: s.date, duree: s.duree ?? "", rpe: s.rpe ?? "", meteo: s.meteo ?? "", notes: s.notes ?? "",
    groupe_musculaire: s.groupe_musculaire ?? "", exercice: s.exercice ?? "", series: s.series ?? "",
    repetitions: s.repetitions ?? "", charge: s.charge ?? "", programme: s.programme ?? "",
    type_course: s.type_course ?? "", distance: s.distance ?? "", temps_min: s.temps_min ?? "",
    denivele: s.denivele ?? "", fc_moyenne: s.fc_moyenne ?? "",
    site: s.site ?? "", voie: s.voie ?? "", cotation: s.cotation ?? "", style_escalade: s.style_escalade ?? "Bloc",
    resultat: s.resultat ?? "",
    sommet: s.sommet ?? "", massif: s.massif ?? "", altitude: s.altitude ?? "",
    cotation_globale: s.cotation_globale ?? "", partenaires: s.partenaires ?? "",
    bivouac: s.bivouac ? "1" : "0", rapport: s.rapport ?? "",
  };
}

function computePRs(sessions: Session[], disc: Disc): Set<number> {
  const prIds = new Set<number>();
  const chron = [...sessions].sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);

  if (disc === "musculation") {
    const best1rm = new Map<string, number>();
    for (const s of chron) {
      if (!s.exercice || !s.charge || !s.repetitions) continue;
      const key = s.exercice.trim().toLowerCase();
      const est1rm = s.charge * (1 + s.repetitions / 30);
      if (est1rm > (best1rm.get(key) ?? 0)) { best1rm.set(key, est1rm); prIds.add(s.id); }
    }
  } else if (disc === "running") {
    let bestDist = 0, bestPaceSec = Infinity;
    for (const s of chron) {
      let isPr = false;
      if (s.distance && s.distance > bestDist) { bestDist = s.distance; isPr = true; }
      if (s.distance && s.temps_min) {
        const secPerKm = (s.temps_min * 60) / s.distance;
        if (secPerKm < bestPaceSec) { bestPaceSec = secPerKm; isPr = true; }
      }
      if (isPr) prIds.add(s.id);
    }
  } else if (disc === "natation") {
    let bestPaceSec = Infinity;
    for (const s of chron) {
      if (!s.distance || !s.temps_min) continue;
      const secPer100 = (s.temps_min * 60) / (s.distance / 100);
      if (secPer100 < bestPaceSec) { bestPaceSec = secPer100; prIds.add(s.id); }
    }
  } else if (disc === "escalade") {
    let bestIdx = -1;
    for (const s of chron) {
      if (!s.cotation) continue;
      const idx = COTATIONS.indexOf(s.cotation);
      if (idx > bestIdx) { bestIdx = idx; prIds.add(s.id); }
    }
  } else if (disc === "alpinisme") {
    let bestAlt = 0;
    for (const s of chron) {
      if (s.altitude && s.altitude > bestAlt) { bestAlt = s.altitude; prIds.add(s.id); }
    }
  }
  return prIds;
}

function periodStart(disc: Disc): Date {
  const now = new Date();
  if (disc === "escalade") return new Date(now.getFullYear(), now.getMonth(), 1);
  if (disc === "alpinisme") return new Date(now.getFullYear(), 0, 1);
  const dow = (now.getDay() + 6) % 7; // Monday = 0
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow);
  return monday;
}

function periodLabel(disc: Disc): string {
  if (disc === "escalade") return "ce mois-ci";
  if (disc === "alpinisme") return "cette année";
  return "cette semaine";
}

export default function SportPage() {
  const [tab, setTab] = useState<Disc>("musculation");
  const [sessionsByTab, setSessionsByTab] = useState<Partial<Record<Disc, Session[]>>>({});
  const [showForm, setShowForm] = useState(false);
  const [formTouched, setFormTouched] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(15);
  const [planPdf, setPlanPdf] = useState<string | null>(null);
  const [pdfViewer, setPdfViewer] = useState<{ url: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string | number>>(EMPTY_FORM);

  const sessions = sessionsByTab[tab] ?? [];

  const f = (k: string, v: string | number) => {
    setForm((p) => ({ ...p, [k]: v }));
    setFormTouched(true);
  };

  const load = useCallback(() => {
    fetch(`/api/sport?discipline=${tab}&limit=60`)
      .then((r) => r.json())
      .then((data: Session[]) => setSessionsByTab((p) => ({ ...p, [tab]: data })));
  }, [tab]);

  const loadPlan = useCallback(async () => {
    const r = await fetch(`/api/pinned?key=sport_${tab}`);
    const data = await r.json() as { pdf_path: string | null };
    setPlanPdf(data.pdf_path);
  }, [tab]);

  useEffect(() => { load(); loadPlan(); }, [load, loadPlan]);
  useEffect(() => { setVisibleCount(15); }, [tab]);

  const prIds = useMemo(() => computePRs(sessions, tab), [sessions, tab]);

  const trend = useMemo(() => {
    const start = periodStart(tab);
    const inPeriod = sessions.filter((s) => new Date(s.date + "T12:00:00") >= start);
    const last10 = sessions.slice(0, 10).slice().reverse();
    let total = 0;
    let unit = "";
    let sparkValues: number[] = [];

    if (tab === "musculation") {
      total = inPeriod.reduce((sum, s) => sum + (volume(s.series, s.repetitions, s.charge) ?? 0), 0);
      unit = "kg soulevés";
      sparkValues = last10.map((s) => volume(s.series, s.repetitions, s.charge) ?? 0);
    } else if (tab === "running") {
      total = inPeriod.reduce((sum, s) => sum + (s.distance ?? 0), 0);
      unit = "km";
      sparkValues = last10.map((s) => s.distance ?? 0);
    } else if (tab === "natation") {
      total = inPeriod.reduce((sum, s) => sum + (s.distance ?? 0), 0);
      unit = "m";
      sparkValues = last10.map((s) => s.distance ?? 0);
    } else if (tab === "escalade") {
      total = inPeriod.length;
      unit = "séances";
      sparkValues = last10.map((s) => (s.cotation ? COTATIONS.indexOf(s.cotation) + 1 : 0));
    } else {
      total = inPeriod.length;
      unit = "sommets";
      sparkValues = last10.map((s) => s.altitude ?? 0);
    }
    return { count: inPeriod.length, total, unit, sparkValues, label: periodLabel(tab) };
  }, [sessions, tab]);

  const openNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormTouched(false);
    setError(null);
    setShowForm(true);
  };

  const openEdit = (s: Session) => {
    setEditingId(s.id);
    setForm(sessionToForm(s));
    setFormTouched(false);
    setError(null);
    setShowForm(true);
  };

  const repeatLast = () => {
    if (!sessions[0]) return;
    setEditingId(null);
    setForm({ ...sessionToForm(sessions[0]), date: new Date().toISOString().split("T")[0], notes: "", rapport: "" });
    setFormTouched(false);
    setError(null);
    setShowForm(true);
  };

  const switchTab = (t: Disc) => {
    if (showForm && formTouched && !confirm("Des modifications non enregistrées seront perdues. Continuer ?")) return;
    setTab(t);
    setShowForm(false);
    setEditingId(null);
    setFormTouched(false);
    setError(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const body: Record<string, unknown> = editingId ? {} : { discipline: tab };
    for (const [k, v] of Object.entries(form)) {
      if (v === "" || v === null) continue;
      body[k] = k === "bivouac" ? (v === "1" ? 1 : 0) : v;
    }
    try {
      const res = editingId
        ? await fetch(`/api/sport/${editingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/sport", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
      if (!res.ok) throw new Error();
      setShowForm(false);
      setEditingId(null);
      setFormTouched(false);
      load();
    } catch {
      setError("Échec de l'enregistrement — réessayez.");
    }
  };

  const uploadPlan = async (file: File) => {
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const up = await fetch("/api/upload", { method: "POST", body: fd });
      if (!up.ok) throw new Error();
      const { filename } = await up.json() as { filename: string };
      const pin = await fetch("/api/pinned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: `sport_${tab}`, pdf_path: filename }),
      });
      if (!pin.ok) throw new Error();
      setPlanPdf(filename);
    } catch {
      setError("Échec de l'envoi du PDF — réessayez.");
    }
  };

  const del = async (id: number) => {
    if (!confirm("Supprimer cette séance ?")) return;
    setError(null);
    try {
      const res = await fetch(`/api/sport/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      load();
    } catch {
      setError("Échec de la suppression — réessayez.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold text-zinc-100">Sport</h1>
        <div className="flex items-center gap-2">
          {sessions.length > 0 && (
            <button onClick={repeatLast} className="btn-ghost flex items-center gap-2" title="Répéter la dernière séance">
              <RotateCcw size={14} /> Répéter la dernière
            </button>
          )}
          <button onClick={() => (showForm ? setShowForm(false) : openNew())} className="btn-primary flex items-center gap-2">
            <Plus size={15} /> Nouvelle séance
          </button>
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900 rounded-xl p-1 border border-zinc-800 w-full sm:w-fit overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => switchTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0 ${
              tab === t.id ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Plan PDF */}
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-zinc-800 bg-zinc-900/60">
        <FileText size={13} className="text-zinc-600 shrink-0" />
        {planPdf ? (
          <>
            <button
              onClick={() => setPdfViewer({ url: `/api/files/${planPdf}`, name: planPdf.replace(/^\d+-/, "") })}
              className="flex-1 text-sm text-zinc-300 hover:text-violet-300 transition-colors truncate text-left"
            >
              {planPdf.replace(/^\d+-/, "")}
            </button>
            <label className="text-xs text-zinc-600 hover:text-zinc-300 cursor-pointer transition-colors shrink-0">
              Remplacer
              <input type="file" accept="application/pdf" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPlan(f); e.target.value = ""; }} />
            </label>
          </>
        ) : (
          <>
            <span className="flex-1 text-sm text-zinc-600">Aucun plan — programme {TABS.find((t) => t.id === tab)?.label}</span>
            <label className="btn-ghost text-xs py-1 cursor-pointer shrink-0">
              + Ajouter PDF
              <input type="file" accept="application/pdf" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPlan(f); e.target.value = ""; }} />
            </label>
          </>
        )}
      </div>

      {/* Trend strip */}
      {sessions.length > 0 && (
        <div className="card-sm flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="section-label mb-1">{TABS.find((t) => t.id === tab)?.label} — {trend.label}</p>
            <p className="text-sm text-zinc-300">
              <span className="text-lg font-bold text-zinc-100">{trend.count}</span> séance{trend.count !== 1 ? "s" : ""}
              {trend.unit !== "séances" && (
                <span className="text-zinc-500"> · {trend.total.toFixed(0)} {trend.unit}</span>
              )}
            </p>
          </div>
          {trend.sparkValues.filter((v) => v > 0).length >= 2 && (
            <Sparkline values={trend.sparkValues} />
          )}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <form onSubmit={submit} className="card space-y-4 border-violet-500/30">
          <h2 className="text-sm font-semibold text-zinc-200">
            {TABS.find((t) => t.id === tab)?.icon} {editingId ? "Modifier la séance" : "Nouvelle séance"} — {TABS.find((t) => t.id === tab)?.label}
          </h2>

          {/* Common fields */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Date</label>
              <input type="date" className="input" value={form.date as string}
                onChange={(e) => f("date", e.target.value)} required />
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Durée (min)</label>
              <input type="number" className="input" placeholder="60" value={form.duree as string}
                onChange={(e) => f("duree", e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">RPE (1-10)</label>
              <input type="number" min="1" max="10" className="input" placeholder="7" value={form.rpe as string}
                onChange={(e) => f("rpe", e.target.value)} />
            </div>
          </div>

          {/* Musculation */}
          {tab === "musculation" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Groupe musculaire</label>
                <select className="select" value={form.groupe_musculaire as string}
                  onChange={(e) => f("groupe_musculaire", e.target.value)}>
                  <option value="">—</option>
                  {GROUPES.map((g) => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Exercice principal</label>
                <input className="input" placeholder="Squat, Bench…" value={form.exercice as string}
                  onChange={(e) => f("exercice", e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Séries</label>
                <input type="number" className="input" placeholder="5" value={form.series as string}
                  onChange={(e) => f("series", e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Répétitions</label>
                <input type="number" className="input" placeholder="5" value={form.repetitions as string}
                  onChange={(e) => f("repetitions", e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Charge (kg)</label>
                <input type="number" step="0.5" className="input" placeholder="80" value={form.charge as string}
                  onChange={(e) => f("charge", e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Programme</label>
                <select className="select" value={form.programme as string}
                  onChange={(e) => f("programme", e.target.value)}>
                  <option value="">—</option>
                  {["PPL", "5x5", "Hypertrophie", "Force", "Full Body", "Libre"].map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Running */}
          {tab === "running" && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Type</label>
                <select className="select" value={form.type_course as string}
                  onChange={(e) => f("type_course", e.target.value)}>
                  <option value="">—</option>
                  {["Endurance", "Fractionné", "Trail", "Récupération", "Compétition"].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Distance (km)</label>
                <input type="number" step="0.1" className="input" placeholder="10" value={form.distance as string}
                  onChange={(e) => f("distance", e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Temps (min)</label>
                <input type="number" step="0.5" className="input" placeholder="50" value={form.temps_min as string}
                  onChange={(e) => f("temps_min", e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Dénivelé (m)</label>
                <input type="number" className="input" placeholder="150" value={form.denivele as string}
                  onChange={(e) => f("denivele", e.target.value)} />
              </div>
            </div>
          )}

          {/* Natation */}
          {tab === "natation" && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Nage</label>
                <select className="select" value={form.type_course as string}
                  onChange={(e) => f("type_course", e.target.value)}>
                  <option value="">—</option>
                  {NAGES.map((n) => <option key={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Distance (m)</label>
                <input type="number" step="50" className="input" placeholder="1000" value={form.distance as string}
                  onChange={(e) => f("distance", e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Temps (min)</label>
                <input type="number" step="0.5" className="input" placeholder="30" value={form.temps_min as string}
                  onChange={(e) => f("temps_min", e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">FC moyenne (bpm)</label>
                <input type="number" className="input" placeholder="140" value={form.fc_moyenne as string}
                  onChange={(e) => f("fc_moyenne", e.target.value)} />
              </div>
            </div>
          )}

          {/* Escalade */}
          {tab === "escalade" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Site</label>
                <input className="input" placeholder="Nom du site" value={form.site as string}
                  onChange={(e) => f("site", e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Voie</label>
                <input className="input" placeholder="Nom de la voie" value={form.voie as string}
                  onChange={(e) => f("voie", e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Style</label>
                <select className="select" value={form.style_escalade as string}
                  onChange={(e) => f("style_escalade", e.target.value)}>
                  {["Bloc", "Couenne", "Grande voie"].map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Cotation principale</label>
                <select className="select" value={form.cotation as string}
                  onChange={(e) => f("cotation", e.target.value)}>
                  <option value="">—</option>
                  {COTATIONS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Résultat</label>
                <select className="select" value={form.resultat as string}
                  onChange={(e) => f("resultat", e.target.value)}>
                  <option value="">—</option>
                  {RESULTATS.map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Alpinisme */}
          {tab === "alpinisme" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Sommet / Objectif</label>
                <input className="input" placeholder="Mont Blanc, Aiguille…" value={form.sommet as string}
                  onChange={(e) => f("sommet", e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Massif</label>
                <select className="select" value={form.massif as string}
                  onChange={(e) => f("massif", e.target.value)}>
                  <option value="">—</option>
                  {["Mont-Blanc", "Écrins", "Vanoise", "Chartreuse", "Vercors", "Jura", "Pyrénées", "Autre"].map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Altitude (m)</label>
                <input type="number" className="input" placeholder="4808" value={form.altitude as string}
                  onChange={(e) => f("altitude", e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Cotation</label>
                <select className="select" value={form.cotation_globale as string}
                  onChange={(e) => f("cotation_globale", e.target.value)}>
                  <option value="">—</option>
                  {COTATIONS_ALPI.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs text-zinc-500 mb-1 block">Partenaires</label>
                <input className="input" placeholder="Noms des cordistes" value={form.partenaires as string}
                  onChange={(e) => f("partenaires", e.target.value)} />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input type="checkbox" id="bivouac" className="w-4 h-4"
                  checked={form.bivouac === "1"}
                  onChange={(e) => f("bivouac", e.target.checked ? "1" : "0")} />
                <label htmlFor="bivouac" className="text-sm text-zinc-400 cursor-pointer">Bivouac</label>
              </div>
              <div className="col-span-2">
                <label className="text-xs text-zinc-500 mb-1 block">Rapport / compte-rendu</label>
                <textarea className="input" rows={3} placeholder="Conditions, itinéraire, difficultés…"
                  value={form.rapport as string} onChange={(e) => f("rapport", e.target.value)} />
              </div>
            </div>
          )}

          {/* Météo + Notes */}
          <div className="grid grid-cols-2 gap-3">
            <select className="select" value={form.meteo as string} onChange={(e) => f("meteo", e.target.value)}>
              <option value="">Météo…</option>
              {METEO.map((m) => <option key={m}>{m}</option>)}
            </select>
            <input className="input" placeholder="Notes libres" value={form.notes as string}
              onChange={(e) => f("notes", e.target.value)} />
          </div>

          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null); setFormTouched(false); }} className="btn-ghost">Annuler</button>
            <button type="submit" className="btn-primary">{editingId ? "Enregistrer les modifications" : "Enregistrer"}</button>
          </div>
        </form>
      )}

      {/* Sessions list */}
      {sessions.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">{TABS.find((t) => t.id === tab)?.icon}</p>
          <p className="text-zinc-500 text-sm">Aucune séance enregistrée</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="section-label">Historique</p>
          {sessions.slice(0, visibleCount).map((s) => {
            const isPr = prIds.has(s.id);
            return (
              <div key={s.id} className="card-sm flex items-start gap-4 group hover:border-zinc-700 transition-colors">
                <div className="shrink-0 text-center">
                  <p className="text-xs text-zinc-500">
                    {new Date(s.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                  </p>
                  {s.duree && <p className="text-xs text-zinc-600 mt-0.5">{s.duree}min</p>}
                </div>

                <div className="flex-1 min-w-0">
                  {tab === "musculation" && (
                    <>
                      <p className="text-sm text-zinc-200">
                        {s.groupe_musculaire || "—"}
                        {s.exercice && <span className="text-zinc-500"> · {s.exercice}</span>}
                        {isPr && <span className="ml-2 badge-yellow">🏆 PR</span>}
                        {s.programme && <span className="ml-2 badge-gray">{s.programme}</span>}
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {s.series && s.repetitions && s.charge
                          ? `${s.series}×${s.repetitions} @ ${s.charge}kg · Vol: ${volume(s.series, s.repetitions, s.charge)?.toFixed(0)}kg`
                          : "—"}
                      </p>
                    </>
                  )}
                  {tab === "running" && (
                    <>
                      <p className="text-sm text-zinc-200">
                        {s.type_course || "Course"} · {s.distance ? `${s.distance} km` : "—"}
                        {isPr && <span className="ml-2 badge-yellow">🏆 PR</span>}
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Allure : {s.distance && s.temps_min ? pace(s.distance, s.temps_min) : "—"}
                        {s.denivele ? ` · D+ ${s.denivele}m` : ""}
                      </p>
                    </>
                  )}
                  {tab === "natation" && (
                    <>
                      <p className="text-sm text-zinc-200">
                        {s.type_course || "Natation"} · {s.distance ? `${s.distance} m` : "—"}
                        {isPr && <span className="ml-2 badge-yellow">🏆 PR</span>}
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Allure : {s.distance && s.temps_min ? pace100(s.distance, s.temps_min) : "—"}
                        {s.fc_moyenne && ` · FC moy. ${s.fc_moyenne} bpm`}
                      </p>
                    </>
                  )}
                  {tab === "escalade" && (
                    <>
                      <p className="text-sm text-zinc-200">
                        {s.site || "—"}
                        {s.voie && <span className="text-zinc-500"> · {s.voie}</span>}
                        {s.cotation && <span className="ml-2 badge-violet">{s.cotation}</span>}
                        {isPr && <span className="ml-2 badge-yellow">🏆 PR</span>}
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">{s.resultat || ""}</p>
                    </>
                  )}
                  {tab === "alpinisme" && (
                    <>
                      <p className="text-sm text-zinc-200">
                        {s.sommet || "—"}
                        {s.altitude && <span className="text-zinc-500"> · {s.altitude}m</span>}
                        {isPr && <span className="ml-2 badge-yellow">🏆 PR</span>}
                        {!!s.bivouac && <span className="ml-2 badge-gray">Bivouac</span>}
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {s.massif && `${s.massif} · `}
                        {s.cotation_globale || ""}
                      </p>
                      {s.rapport && <p className="text-xs text-zinc-600 mt-1 italic">{s.rapport}</p>}
                    </>
                  )}
                  {s.notes && <p className="text-xs text-zinc-600 mt-1 italic">{s.notes}</p>}
                </div>

                {s.rpe && (
                  <div className="shrink-0 text-center">
                    <p className="text-xs text-zinc-600">RPE</p>
                    <p className={`text-sm font-bold ${s.rpe >= 8 ? "text-red-400" : s.rpe >= 6 ? "text-amber-400" : "text-emerald-400"}`}>
                      {s.rpe}
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-1 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all">
                  <button onClick={() => openEdit(s)} className="text-zinc-700 hover:text-violet-400 p-1" title="Modifier">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => del(s.id)} className="text-zinc-700 hover:text-red-400 p-1" title="Supprimer">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
          {sessions.length > visibleCount && (
            <button onClick={() => setVisibleCount((v) => v + 15)} className="btn-ghost text-xs w-full py-2">
              Charger plus
            </button>
          )}
        </div>
      )}
      {pdfViewer && (
        <PdfModal
          url={pdfViewer.url}
          filename={pdfViewer.name}
          onClose={() => setPdfViewer(null)}
        />
      )}
    </div>
  );
}
