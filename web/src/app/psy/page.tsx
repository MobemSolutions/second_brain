"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2, FileText, ChevronLeft, ChevronRight, Download } from "lucide-react";
import PdfModal from "@/components/PdfModal";

interface Seance {
  id: number;
  date: string;
  titre: string | null;
  notes: string | null;
  pdf_path: string | null;
}

interface Exercice {
  id: number;
  date: string;
  heure: string | null;
  sensation: string | null;
  intelligence: string | null;
  monde: string | null;
}

interface Observation {
  id: number;
  date: string;
  heure: string | null;
  contexte: string | null;
  emotions: string | null;
  pensees: string | null;
  comportements: string | null;
  comportements_entourage: string | null;
}

type Tab = "seances" | "exercices" | "observation";
type Periode = "semaine" | "mois";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "seances", label: "Séances", icon: "📝" },
  { id: "exercices", label: "Exercices", icon: "🧠" },
  { id: "observation", label: "Auto-observation", icon: "📊" },
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function fmt(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day));
  return date;
}
function endOfWeek(d: Date): Date {
  const s = startOfWeek(d);
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  return e;
}
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function computeRange(periode: Periode, refDate: Date): { from: Date; to: Date } {
  return periode === "semaine"
    ? { from: startOfWeek(refDate), to: endOfWeek(refDate) }
    : { from: startOfMonth(refDate), to: endOfMonth(refDate) };
}
function computeRangeLabel(periode: Periode, range: { from: Date; to: Date }): string {
  if (periode === "mois") {
    return capitalize(range.from.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }));
  }
  const short: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  return `${range.from.toLocaleDateString("fr-FR", short)} – ${range.to.toLocaleDateString("fr-FR", { ...short, year: "numeric" })}`;
}
function shiftRefDate(periode: Periode, dir: 1 | -1) {
  return (d: Date) => {
    const nd = new Date(d);
    if (periode === "semaine") nd.setDate(nd.getDate() + dir * 7);
    else nd.setMonth(nd.getMonth() + dir);
    return nd;
  };
}

function PeriodNav({
  periode, setPeriode, onPrev, onNext, onToday, label,
}: {
  periode: Periode; setPeriode: (p: Periode) => void;
  onPrev: () => void; onNext: () => void; onToday: () => void; label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1.5 p-1 rounded-lg" style={{ backgroundColor: "#f0eeeb" }}>
        {([{ id: "semaine", label: "Semaine" }, { id: "mois", label: "Mois" }] as const).map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriode(p.id)}
            className="px-3 py-1.5 text-xs font-medium rounded-md transition-all"
            style={{
              backgroundColor: periode === p.id ? "#ffffff" : "transparent",
              color: periode === p.id ? "#1a1a18" : "#9c9c9a",
              boxShadow: periode === p.id ? "0 1px 3px rgba(0,0,0,0.09)" : "none",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
      <button onClick={onPrev} className="btn-ghost p-2"><ChevronLeft size={15} /></button>
      <span className="text-sm text-zinc-300 min-w-[10rem] text-center">{label}</span>
      <button onClick={onNext} className="btn-ghost p-2"><ChevronRight size={15} /></button>
      <button onClick={onToday} className="btn-ghost text-xs">Aujourd&apos;hui</button>
    </div>
  );
}

const EMPTY_SEANCE = { date: fmt(new Date()), titre: "", notes: "" };
const EMPTY_EXERCICE = { date: fmt(new Date()), heure: "", sensation: "", intelligence: "", monde: "" };
const EMPTY_OBS = {
  date: fmt(new Date()), heure: "",
  contexte: "", emotions: "", pensees: "", comportements: "", comportements_entourage: "",
};

const SIM_FIELDS = [
  { key: "sensation", label: "Sensation", ph: "Ce que je ressens dans mon corps" },
  { key: "intelligence", label: "Intelligence", ph: "Je m'observe en train d'avoir cette pensée" },
  { key: "monde", label: "Monde", ph: "Ce que je vis / je vois / j'entends (le contexte)" },
] as const;

const OBS_FIELDS = [
  { key: "contexte", label: "Contexte", ph: "Date/heure, où, avec qui, action en cours, déclencheur…" },
  { key: "emotions", label: "Émotions et symptômes physiques", ph: "Coter de 0 à 10 l'intensité (ex : anxiété 7/10, tremblements 5/10)" },
  { key: "pensees", label: "Pensées", ph: "Pensées automatiques associées" },
  { key: "comportements", label: "Comportements", ph: "Ce que tu as fait / évité" },
  { key: "comportements_entourage", label: "Comportements de l'entourage", ph: "Réactions des personnes présentes" },
] as const;

export default function PsyPage() {
  const [tab, setTab] = useState<Tab>("seances");

  const [seances, setSeances] = useState<Seance[]>([]);
  const [showSeanceForm, setShowSeanceForm] = useState(false);
  const [seanceForm, setSeanceForm] = useState(EMPTY_SEANCE);
  const [planPdf, setPlanPdf] = useState<string | null>(null);
  const [pdfViewer, setPdfViewer] = useState<{ url: string; name: string } | null>(null);

  const [periodeEx, setPeriodeEx] = useState<Periode>("semaine");
  const [refDateEx, setRefDateEx] = useState(new Date());
  const [exercices, setExercices] = useState<Exercice[]>([]);
  const [showExerciceForm, setShowExerciceForm] = useState(false);
  const [exerciceForm, setExerciceForm] = useState<Record<string, string>>(EMPTY_EXERCICE);

  const [periode, setPeriode] = useState<Periode>("semaine");
  const [refDate, setRefDate] = useState(new Date());
  const [observations, setObservations] = useState<Observation[]>([]);
  const [showObsForm, setShowObsForm] = useState(false);
  const [obsForm, setObsForm] = useState<Record<string, string>>(EMPTY_OBS);

  const rangeEx = useMemo(() => computeRange(periodeEx, refDateEx), [periodeEx, refDateEx]);
  const rangeLabelEx = useMemo(() => computeRangeLabel(periodeEx, rangeEx), [periodeEx, rangeEx]);

  const range = useMemo(() => computeRange(periode, refDate), [periode, refDate]);
  const rangeLabel = useMemo(() => computeRangeLabel(periode, range), [periode, range]);

  const loadSeances = useCallback(() => {
    fetch("/api/psy/seances?days=180").then((r) => r.json()).then(setSeances);
  }, []);
  const loadExercices = useCallback(() => {
    fetch(`/api/psy/exercices?from=${fmt(rangeEx.from)}&to=${fmt(rangeEx.to)}`)
      .then((r) => r.json())
      .then(setExercices);
  }, [rangeEx]);
  const loadPlan = useCallback(async () => {
    const r = await fetch("/api/pinned?key=psy");
    const data = (await r.json()) as { pdf_path: string | null };
    setPlanPdf(data.pdf_path);
  }, []);
  const loadObservations = useCallback(() => {
    fetch(`/api/psy/observations?from=${fmt(range.from)}&to=${fmt(range.to)}`)
      .then((r) => r.json())
      .then(setObservations);
  }, [range]);

  useEffect(() => { loadSeances(); loadPlan(); }, [loadSeances, loadPlan]);
  useEffect(() => { loadExercices(); }, [loadExercices]);
  useEffect(() => { loadObservations(); }, [loadObservations]);

  const uploadPlan = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    const up = await fetch("/api/upload", { method: "POST", body: fd });
    if (!up.ok) return;
    const { filename } = (await up.json()) as { filename: string };
    await fetch("/api/pinned", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "psy", pdf_path: filename }),
    });
    setPlanPdf(filename);
  };

  const submitSeance = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/psy/seances", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(seanceForm),
    });
    setSeanceForm(EMPTY_SEANCE);
    setShowSeanceForm(false);
    loadSeances();
  };
  const delSeance = async (id: number) => {
    await fetch(`/api/psy/seances/${id}`, { method: "DELETE" });
    loadSeances();
  };

  const submitExercice = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/psy/exercices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(exerciceForm),
    });
    setExerciceForm(EMPTY_EXERCICE);
    setShowExerciceForm(false);
    loadExercices();
  };
  const delExercice = async (id: number) => {
    await fetch(`/api/psy/exercices/${id}`, { method: "DELETE" });
    loadExercices();
  };

  const submitObs = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/psy/observations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(obsForm),
    });
    setObsForm(EMPTY_OBS);
    setShowObsForm(false);
    loadObservations();
  };
  const delObs = async (id: number) => {
    await fetch(`/api/psy/observations/${id}`, { method: "DELETE" });
    loadObservations();
  };

  const exportObsPdf = async () => {
    const [{ default: jsPDF }, { autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(13);
    doc.text(`Auto-observation des situations problèmes — ${rangeLabel}`, 14, 15);
    autoTable(doc, {
      startY: 20,
      head: [["Date", "Contexte", "Émotions / symptômes (0-10)", "Pensées", "Comportements", "Comportements de l'entourage"]],
      body: observations.map((o) => [
        o.heure ? `${o.date} ${o.heure}` : o.date,
        o.contexte || "",
        o.emotions || "",
        o.pensees || "",
        o.comportements || "",
        o.comportements_entourage || "",
      ]),
      styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak" },
      headStyles: { fillColor: [109, 40, 217] },
      columnStyles: { 0: { cellWidth: 22 } },
    });
    doc.save(`auto-observation-${periode}-${fmt(range.from)}.pdf`);
  };

  const exportExPdf = async () => {
    const [{ default: jsPDF }, { autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(13);
    doc.text(`Carte SIM — ${rangeLabelEx}`, 14, 15);
    autoTable(doc, {
      startY: 20,
      head: [["Date", "Sensation", "Intelligence", "Monde"]],
      body: exercices.map((ex) => [
        ex.heure ? `${ex.date} ${ex.heure}` : ex.date,
        ex.sensation || "",
        ex.intelligence || "",
        ex.monde || "",
      ]),
      styles: { fontSize: 9, cellPadding: 2, overflow: "linebreak" },
      headStyles: { fillColor: [109, 40, 217] },
      columnStyles: { 0: { cellWidth: 22 } },
    });
    doc.save(`carte-sim-${periodeEx}-${fmt(rangeEx.from)}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Suivi Psy TCC</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Séances, exercices et auto-observation</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900 rounded-xl p-1 border border-zinc-800 w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ---------------- Séances ---------------- */}
      {tab === "seances" && (
        <>
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
                <span className="flex-1 text-sm text-zinc-600">Aucun plan de suivi</span>
                <label className="btn-ghost text-xs py-1 cursor-pointer shrink-0">
                  + Ajouter PDF
                  <input type="file" accept="application/pdf" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPlan(f); e.target.value = ""; }} />
                </label>
              </>
            )}
          </div>

          <div className="flex justify-end">
            <button onClick={() => setShowSeanceForm((v) => !v)} className="btn-primary flex items-center gap-2">
              <Plus size={15} /> Nouvelle note de séance
            </button>
          </div>

          {showSeanceForm && (
            <form onSubmit={submitSeance} className="card space-y-4 border-violet-500/30">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Date</label>
                  <input type="date" className="input" value={seanceForm.date}
                    onChange={(e) => setSeanceForm((p) => ({ ...p, date: e.target.value }))} required />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Titre</label>
                  <input className="input" placeholder="Séance du…" value={seanceForm.titre}
                    onChange={(e) => setSeanceForm((p) => ({ ...p, titre: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Notes</label>
                <textarea className="input" rows={5} placeholder="Contenu abordé, ressentis, points à retravailler…"
                  value={seanceForm.notes} onChange={(e) => setSeanceForm((p) => ({ ...p, notes: e.target.value }))} />
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowSeanceForm(false)} className="btn-ghost">Annuler</button>
                <button type="submit" className="btn-primary">Enregistrer</button>
              </div>
            </form>
          )}

          {seances.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-4xl mb-3">📝</p>
              <p className="text-zinc-500 text-sm">Aucune note de séance</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="section-label">Historique</p>
              {seances.map((s) => (
                <div key={s.id} className="card-sm flex items-start gap-4 group hover:border-zinc-700 transition-colors">
                  <div className="shrink-0 text-xs text-zinc-500 w-16">
                    {new Date(s.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-200">{s.titre || "Séance"}</p>
                    {s.notes && <p className="text-xs text-zinc-500 mt-1 whitespace-pre-wrap">{s.notes}</p>}
                  </div>
                  <button onClick={() => delSeance(s.id)}
                    className="shrink-0 text-zinc-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ---------------- Exercices (carte SIM) ---------------- */}
      {tab === "exercices" && (
        <>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <PeriodNav
              periode={periodeEx}
              setPeriode={setPeriodeEx}
              onPrev={() => setRefDateEx(shiftRefDate(periodeEx, -1))}
              onNext={() => setRefDateEx(shiftRefDate(periodeEx, 1))}
              onToday={() => setRefDateEx(new Date())}
              label={rangeLabelEx}
            />
            <div className="flex items-center gap-2">
              <button onClick={exportExPdf} disabled={exercices.length === 0}
                className="btn-ghost flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
                <Download size={14} /> Exporter en PDF
              </button>
              <button onClick={() => setShowExerciceForm((v) => !v)} className="btn-primary flex items-center gap-2">
                <Plus size={15} /> Nouvelle carte SIM
              </button>
            </div>
          </div>

          {showExerciceForm && (
            <form onSubmit={submitExercice} className="card space-y-4 border-violet-500/30">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Date</label>
                  <input type="date" className="input" value={exerciceForm.date}
                    onChange={(e) => setExerciceForm((p) => ({ ...p, date: e.target.value }))} required />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Heure</label>
                  <input type="time" className="input" value={exerciceForm.heure}
                    onChange={(e) => setExerciceForm((p) => ({ ...p, heure: e.target.value }))} />
                </div>
              </div>
              {SIM_FIELDS.map(({ key, label, ph }) => (
                <div key={key}>
                  <label className="text-xs text-zinc-500 mb-1 block">{label}</label>
                  <textarea className="input" rows={2} placeholder={ph}
                    value={exerciceForm[key]} onChange={(e) => setExerciceForm((p) => ({ ...p, [key]: e.target.value }))} />
                </div>
              ))}
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowExerciceForm(false)} className="btn-ghost">Annuler</button>
                <button type="submit" className="btn-primary">Enregistrer</button>
              </div>
            </form>
          )}

          {exercices.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-4xl mb-3">🧠</p>
              <p className="text-zinc-500 text-sm">Aucune carte SIM sur cette période</p>
            </div>
          ) : (
            <div className="card p-0 overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-left text-zinc-500">
                    <th className="p-3 whitespace-nowrap">Date</th>
                    <th className="p-3 min-w-[12rem]">Sensation</th>
                    <th className="p-3 min-w-[12rem]">Intelligence</th>
                    <th className="p-3 min-w-[12rem]">Monde</th>
                    <th className="p-3 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {exercices.map((ex) => (
                    <tr key={ex.id} className="border-b border-zinc-800/50 align-top group">
                      <td className="p-3 whitespace-nowrap text-zinc-500">
                        {new Date(ex.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                        {ex.heure && <span className="block text-zinc-600">{ex.heure}</span>}
                      </td>
                      <td className="p-3 text-zinc-300 whitespace-pre-wrap">{ex.sensation || "—"}</td>
                      <td className="p-3 text-zinc-300 whitespace-pre-wrap">{ex.intelligence || "—"}</td>
                      <td className="p-3 text-zinc-300 whitespace-pre-wrap">{ex.monde || "—"}</td>
                      <td className="p-3">
                        <button onClick={() => delExercice(ex.id)}
                          className="text-zinc-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ---------------- Auto-observation ---------------- */}
      {tab === "observation" && (
        <>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <PeriodNav
              periode={periode}
              setPeriode={setPeriode}
              onPrev={() => setRefDate(shiftRefDate(periode, -1))}
              onNext={() => setRefDate(shiftRefDate(periode, 1))}
              onToday={() => setRefDate(new Date())}
              label={rangeLabel}
            />

            <div className="flex items-center gap-2">
              <button onClick={exportObsPdf} disabled={observations.length === 0}
                className="btn-ghost flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
                <Download size={14} /> Exporter en PDF
              </button>
              <button onClick={() => setShowObsForm((v) => !v)} className="btn-primary flex items-center gap-2">
                <Plus size={15} /> Ajouter une situation
              </button>
            </div>
          </div>

          {showObsForm && (
            <form onSubmit={submitObs} className="card space-y-4 border-violet-500/30">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Date</label>
                  <input type="date" className="input" value={obsForm.date}
                    onChange={(e) => setObsForm((p) => ({ ...p, date: e.target.value }))} required />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Heure</label>
                  <input type="time" className="input" value={obsForm.heure}
                    onChange={(e) => setObsForm((p) => ({ ...p, heure: e.target.value }))} />
                </div>
              </div>
              {OBS_FIELDS.map(({ key, label, ph }) => (
                <div key={key}>
                  <label className="text-xs text-zinc-500 mb-1 block">{label}</label>
                  <textarea className="input" rows={2} placeholder={ph}
                    value={obsForm[key]} onChange={(e) => setObsForm((p) => ({ ...p, [key]: e.target.value }))} />
                </div>
              ))}
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowObsForm(false)} className="btn-ghost">Annuler</button>
                <button type="submit" className="btn-primary">Enregistrer</button>
              </div>
            </form>
          )}

          {observations.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-4xl mb-3">📊</p>
              <p className="text-zinc-500 text-sm">Aucune situation notée sur cette période</p>
            </div>
          ) : (
            <div className="card p-0 overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-left text-zinc-500">
                    <th className="p-3 whitespace-nowrap">Date</th>
                    <th className="p-3 min-w-[10rem]">Contexte</th>
                    <th className="p-3 min-w-[10rem]">Émotions / symptômes</th>
                    <th className="p-3 min-w-[10rem]">Pensées</th>
                    <th className="p-3 min-w-[10rem]">Comportements</th>
                    <th className="p-3 min-w-[10rem]">Comportements de l&apos;entourage</th>
                    <th className="p-3 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {observations.map((o) => (
                    <tr key={o.id} className="border-b border-zinc-800/50 align-top group">
                      <td className="p-3 whitespace-nowrap text-zinc-500">
                        {new Date(o.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                        {o.heure && <span className="block text-zinc-600">{o.heure}</span>}
                      </td>
                      <td className="p-3 text-zinc-300 whitespace-pre-wrap">{o.contexte || "—"}</td>
                      <td className="p-3 text-zinc-300 whitespace-pre-wrap">{o.emotions || "—"}</td>
                      <td className="p-3 text-zinc-300 whitespace-pre-wrap">{o.pensees || "—"}</td>
                      <td className="p-3 text-zinc-300 whitespace-pre-wrap">{o.comportements || "—"}</td>
                      <td className="p-3 text-zinc-300 whitespace-pre-wrap">{o.comportements_entourage || "—"}</td>
                      <td className="p-3">
                        <button onClick={() => delObs(o.id)}
                          className="text-zinc-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {pdfViewer && (
        <PdfModal url={pdfViewer.url} filename={pdfViewer.name} onClose={() => setPdfViewer(null)} />
      )}
    </div>
  );
}
