"use client";

import { useCallback, useEffect, useState } from "react";
import { Save, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import PdfModal from "@/components/PdfModal";
import NutritionCalculator, { type NutritionTargets, type DayTargets, MacroProgress } from "@/components/NutritionCalculator";

interface Nutrition {
  id?: number;
  date: string;
  calories: number | null;
  proteines: number | null;
  glucides: number | null;
  lipides: number | null;
  notes: string | null;
  pdf_path: string | null;
  day_type: string | null;
}

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function shiftDate(date: string, days: number): string {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

function MacroBar({ proteines, glucides, lipides }: { proteines: number; glucides: number; lipides: number }) {
  const calP = proteines * 4;
  const calG = glucides * 4;
  const calL = lipides * 9;
  const total = calP + calG + calL;
  if (total === 0) return null;
  const pP = (calP / total) * 100;
  const pG = (calG / total) * 100;
  const pL = (calL / total) * 100;
  return (
    <div className="space-y-2">
      <div className="h-3 rounded-full overflow-hidden flex bg-zinc-800">
        <div style={{ width: `${pP}%` }} className="bg-blue-500" title={`Protéines ${pP.toFixed(0)}%`} />
        <div style={{ width: `${pG}%` }} className="bg-amber-500" title={`Glucides ${pG.toFixed(0)}%`} />
        <div style={{ width: `${pL}%` }} className="bg-rose-500" title={`Lipides ${pL.toFixed(0)}%`} />
      </div>
      <div className="flex gap-4 text-xs">
        <span className="flex items-center gap-1.5 text-zinc-500">
          <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
          Prot. {proteines}g ({pP.toFixed(0)}%)
        </span>
        <span className="flex items-center gap-1.5 text-zinc-500">
          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
          Gluc. {glucides}g ({pG.toFixed(0)}%)
        </span>
        <span className="flex items-center gap-1.5 text-zinc-500">
          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
          Lip. {lipides}g ({pL.toFixed(0)}%)
        </span>
      </div>
    </div>
  );
}

const EMPTY_FORM = { calories: "", proteines: "", glucides: "", lipides: "", notes: "" };

export default function NutritionPage() {
  const [date, setDate] = useState(todayStr());
  const [form, setForm] = useState(EMPTY_FORM);
  const [planPdf, setPlanPdf] = useState<string | null>(null);
  const [targets, setTargets] = useState<NutritionTargets | null>(null);
  const [dayType, setDayType] = useState<"repos" | "intensif">("repos");
  const activeTargets: DayTargets | null = targets ? targets[dayType] : null;
  const [history, setHistory] = useState<Nutrition[]>([]);
  const [saved, setSaved] = useState(false);
  const [pdfViewer, setPdfViewer] = useState<{ url: string; name: string } | null>(null);

  const loadDay = useCallback(async () => {
    const r = await fetch(`/api/nutrition?date=${date}`);
    const data: Nutrition | null = await r.json();
    if (data) {
      setForm({
        calories: data.calories?.toString() ?? "",
        proteines: data.proteines?.toString() ?? "",
        glucides: data.glucides?.toString() ?? "",
        lipides: data.lipides?.toString() ?? "",
        notes: data.notes ?? "",
      });
      setDayType(data.day_type === "intensif" ? "intensif" : "repos");
    } else {
      setForm(EMPTY_FORM);
      setDayType("repos");
    }
  }, [date]);

  const loadHistory = useCallback(async () => {
    const r = await fetch("/api/nutrition?days=14");
    setHistory(await r.json());
  }, []);

  const loadPlan = useCallback(async () => {
    const r = await fetch("/api/pinned?key=nutrition");
    const data = await r.json() as { pdf_path: string | null };
    setPlanPdf(data.pdf_path);
  }, []);

  useEffect(() => { loadDay(); }, [loadDay]);
  useEffect(() => { loadHistory(); loadPlan(); }, [loadHistory, loadPlan]);

  const uploadPlan = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    const up = await fetch("/api/upload", { method: "POST", body: fd });
    if (!up.ok) return;
    const { filename } = await up.json() as { filename: string };
    await fetch("/api/pinned", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "nutrition", pdf_path: filename }),
    });
    setPlanPdf(filename);
  };

  const f = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    const body: Record<string, unknown> = { date, day_type: dayType };
    if (form.calories) body.calories = parseInt(form.calories);
    if (form.proteines) body.proteines = parseFloat(form.proteines);
    if (form.glucides) body.glucides = parseFloat(form.glucides);
    if (form.lipides) body.lipides = parseFloat(form.lipides);
    if (form.notes) body.notes = form.notes;

    await fetch("/api/nutrition", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    loadHistory();
  };

  const p = parseFloat(form.proteines) || 0;
  const g = parseFloat(form.glucides) || 0;
  const l = parseFloat(form.lipides) || 0;
  const isToday = date === todayStr();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Nutrition</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Suivi alimentaire quotidien</p>
        </div>
        {/* Date nav */}
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setDate(shiftDate(date, -1))} className="btn-ghost p-2">
            <ChevronLeft size={15} />
          </button>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input text-sm py-1.5 px-2 w-36"
          />
          <button onClick={() => setDate(shiftDate(date, 1))} className="btn-ghost p-2"
            disabled={date >= todayStr()}>
            <ChevronRight size={15} />
          </button>
          {!isToday && (
            <button onClick={() => setDate(todayStr())} className="btn-ghost text-xs">
              Aujourd&apos;hui
            </button>
          )}
        </div>
      </div>

      {/* Plan nutritionnel épinglé */}
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
            <span className="flex-1 text-sm text-zinc-600">Aucun plan nutritionnel</span>
            <label className="btn-ghost text-xs py-1 cursor-pointer shrink-0">
              + Ajouter PDF
              <input type="file" accept="application/pdf" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPlan(f); e.target.value = ""; }} />
            </label>
          </>
        )}
      </div>

      {/* Calculateur & objectifs */}
      <NutritionCalculator onTargetsChange={(t) => setTargets(t)} />

      {/* Form */}
      <div className="card space-y-5">

        {/* Day type selector */}
        {targets && (
          <div className="flex gap-1.5 p-1 rounded-lg" style={{ backgroundColor: "#f0eeeb" }}>
            {([
              { key: "repos",    emoji: "😴", label: "Repos" },
              { key: "intensif", emoji: "🏋️", label: "Entraînement" },
            ] as const).map(({ key, emoji, label }) => (
              <button
                key={key}
                onClick={() => setDayType(key)}
                className="flex-1 py-1.5 text-xs font-medium rounded-md transition-all"
                style={{
                  backgroundColor: dayType === key ? "#ffffff" : "transparent",
                  color: dayType === key ? "#1a1a18" : "#9c9c9a",
                  boxShadow: dayType === key ? "0 1px 3px rgba(0,0,0,0.09)" : "none",
                }}
              >
                {emoji} {label}
              </button>
            ))}
          </div>
        )}

        {/* Calories */}
        <div className="text-center">
          <label className="text-xs text-zinc-500 block mb-2">
            Calories totales
            {activeTargets && <span className="ml-1 text-zinc-700">/ {activeTargets.calories} kcal objectif</span>}
          </label>
          <div className="flex items-end justify-center gap-1">
            <input
              type="number"
              value={form.calories}
              onChange={(e) => f("calories", e.target.value)}
              placeholder="2000"
              className="bg-transparent text-4xl font-bold text-zinc-100 outline-none placeholder-zinc-700 w-32 text-center"
            />
            <span className="text-zinc-500 text-sm mb-1">kcal</span>
          </div>
          {activeTargets && (activeTargets.calories ?? 0) > 0 && form.calories && (
            <div className="mt-3 px-4">
              {(() => {
                const cur = parseInt(form.calories) || 0;
                const p = Math.min(110, Math.round((cur / activeTargets.calories) * 100));
                const col = p >= 95 && p <= 105 ? "bg-emerald-500" : p >= 75 ? "bg-amber-500" : p > 105 ? "bg-red-500" : "bg-zinc-600";
                return (
                  <>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div style={{ width: `${Math.min(100, p)}%` }} className={`h-full rounded-full transition-all ${col}`} />
                    </div>
                    <p className={`text-xs mt-1 ${p >= 95 && p <= 105 ? "text-emerald-400" : "text-zinc-600"}`}>{p}%</p>
                  </>
                );
              })()}
            </div>
          )}
        </div>

        {/* Macros */}
        <div>
          <p className="section-label mb-3">Macronutriments</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { key: "proteines", label: "🔵 Protéines", unit: "g", color: "border-blue-500/40 bg-blue-500/5", bar: "bg-blue-500" },
              { key: "glucides",  label: "🟡 Glucides",  unit: "g", color: "border-amber-500/40 bg-amber-500/5", bar: "bg-amber-500" },
              { key: "lipides",   label: "🔴 Lipides",   unit: "g", color: "border-rose-500/40 bg-rose-500/5", bar: "bg-rose-500" },
            ].map(({ key, label, unit, color, bar }) => {
              const target = activeTargets?.[key as keyof DayTargets] ?? 0;
              const cur = parseFloat(form[key as keyof typeof form] as string) || 0;
              const pct = target > 0 && cur > 0 ? Math.min(110, Math.round((cur / target) * 100)) : 0;
              return (
                <div key={key} className={`rounded-lg p-3 border ${color}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs text-zinc-400">{label}</label>
                    {target > 0 && <span className="text-xs text-zinc-600">/ {target}g</span>}
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={form[key as keyof typeof form]}
                    onChange={(e) => f(key, e.target.value)}
                    placeholder="0"
                    className="w-full bg-transparent text-xl font-bold text-zinc-100 outline-none placeholder-zinc-700"
                  />
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-zinc-600">{unit}</p>
                    {pct > 0 && <span className={`text-xs ${pct >= 90 && pct <= 110 ? "text-emerald-400" : "text-zinc-500"}`}>{pct}%</span>}
                  </div>
                  {pct > 0 && (
                    <div className="h-1 bg-zinc-800 rounded-full overflow-hidden mt-1.5">
                      <div style={{ width: `${Math.min(100, pct)}%` }} className={`h-full rounded-full transition-all ${bar}`} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Macro bar */}
        {(p > 0 || g > 0 || l > 0) && <MacroBar proteines={p} glucides={g} lipides={l} />}

        {/* Progress vs targets */}
        {activeTargets && (p > 0 || g > 0 || l > 0) && (
          <div className="space-y-2">
            <p className="text-xs text-zinc-600 font-medium uppercase tracking-wide">Vs objectifs</p>
            <MacroProgress label="Protéines" current={p} target={activeTargets.proteines} color="bg-blue-500" />
            <MacroProgress label="Glucides"  current={g} target={activeTargets.glucides}  color="bg-amber-500" />
            <MacroProgress label="Lipides"   current={l} target={activeTargets.lipides}   color="bg-rose-500" />
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="text-xs text-zinc-500 mb-1.5 block">Notes / Repas du jour</label>
          <textarea
            className="input"
            rows={3}
            placeholder="Petit déj, déjeuner, dîner…"
            value={form.notes}
            onChange={(e) => f("notes", e.target.value)}
          />
        </div>

        <button
          onClick={save}
          className={`btn-primary w-full flex items-center justify-center gap-2 ${saved ? "bg-emerald-600 hover:bg-emerald-500" : ""}`}
        >
          <Save size={15} />
          {saved ? "Sauvegardé !" : "Sauvegarder"}
        </button>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="card">
          <p className="section-label mb-3">Historique 14 jours</p>
          <div className="space-y-2">
            {history.map((entry) => {
              const ep = entry.proteines ?? 0;
              const eg = entry.glucides ?? 0;
              const el = entry.lipides ?? 0;
              const isSelected = entry.date === date;
              return (
                <button
                  key={entry.date}
                  onClick={() => setDate(entry.date)}
                  className={`w-full flex items-center gap-4 p-3 rounded-lg border transition-colors text-left ${
                    isSelected ? "border-violet-500/40 bg-violet-500/5" : "border-zinc-800 hover:border-zinc-700"
                  }`}
                >
                  <div className="shrink-0 text-xs text-zinc-500 w-16">
                    {new Date(entry.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      {entry.calories && (
                        <span className="text-sm font-semibold text-zinc-200">{entry.calories} kcal</span>
                      )}
                      {ep > 0 && <span className="text-xs text-blue-400">P: {ep}g</span>}
                      {eg > 0 && <span className="text-xs text-amber-400">G: {eg}g</span>}
                      {el > 0 && <span className="text-xs text-rose-400">L: {el}g</span>}
                    </div>
                    {(ep > 0 || eg > 0 || el > 0) && (
                      <div className="h-1.5 rounded-full overflow-hidden flex bg-zinc-800">
                        {(() => {
                          const tc = ep * 4 + eg * 4 + el * 9;
                          return tc > 0 ? (
                            <>
                              <div style={{ width: `${(ep * 4 / tc) * 100}%` }} className="bg-blue-500" />
                              <div style={{ width: `${(eg * 4 / tc) * 100}%` }} className="bg-amber-500" />
                              <div style={{ width: `${(el * 9 / tc) * 100}%` }} className="bg-rose-500" />
                            </>
                          ) : null;
                        })()}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
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
