"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Save, FlaskConical, Zap } from "lucide-react";

interface FormProfile {
  poids: string; taille: string; age: string;
  sexe: "homme" | "femme";
  masse_grasse: string;
  activite: string;
  objectif: string;
  deficit: string; // stored as percentage, e.g. "-15" means −15% of TDEE
}

export interface DayTargets {
  calories: number; proteines: number; glucides: number; lipides: number;
}

export interface NutritionTargets {
  standard: DayTargets;
  intensif: DayTargets;
  repos: DayTargets;
}

interface CalcResult {
  bmr: number; tdee: number; deltaKcal: number;
  formula: "katch-mcardle" | "mifflin";
  leanMass: number;
  standard: DayTargets; intensif: DayTargets; repos: DayTargets;
}

const ACTIVITY_FACTORS = [
  { id: "sedentaire",  label: "Sédentaire",            desc: "Bureau, peu ou pas de sport",        factor: 1.2 },
  { id: "leger",       label: "Légèrement actif",       desc: "Sport 1–3×/semaine",                 factor: 1.375 },
  { id: "modere",      label: "Modérément actif",       desc: "Sport 3–5×/semaine",                 factor: 1.55 },
  { id: "actif",       label: "Très actif",             desc: "Sport 6–7×/semaine",                 factor: 1.725 },
  { id: "tres_actif",  label: "Extrêmement actif",      desc: "Sport intensif + travail physique",  factor: 1.9 },
];

const OBJECTIFS = [
  { id: "seche",           emoji: "🔥", label: "Sèche",           desc: "−15% · déficit recommandé muscle",    delta: -15 },
  { id: "seche_legere",    emoji: "🌿", label: "Sèche légère",     desc: "−10% · progression douce",            delta: -10 },
  { id: "maintien",        emoji: "⚖️", label: "Maintien",         desc: "Stabilité du poids",                  delta: 0 },
  { id: "lean_bulk",       emoji: "💎", label: "Lean bulk",        desc: "+5% · prise propre et lente",         delta: 5 },
  { id: "prise_masse",     emoji: "💪", label: "Prise de masse",   desc: "+10% · croissance max",               delta: 10 },
];

const EMPTY: FormProfile = {
  poids: "", taille: "", age: "", sexe: "homme", masse_grasse: "",
  activite: "modere", objectif: "seche", deficit: "-15",
};

function buildDay(cal: number, proteines: number): DayTargets {
  if (!Number.isFinite(cal) || !Number.isFinite(proteines)) {
    return { calories: 0, proteines: 0, glucides: 0, lipides: 80 };
  }
  const lipides = 80;
  const glucides = Math.max(30, Math.round((cal - proteines * 4 - lipides * 9) / 4));
  return { calories: Math.round(cal), proteines, glucides, lipides };
}

function compute(p: FormProfile): CalcResult | null {
  const poids = parseFloat(p.poids);
  const taille = parseFloat(p.taille);
  const age = parseInt(p.age);
  if (!poids || !taille || !age) return null;
  if (!Number.isFinite(poids) || !Number.isFinite(taille) || !Number.isFinite(age)) return null;

  const mg = parseFloat(p.masse_grasse);
  const hasBodyFat = Number.isFinite(mg) && mg > 0 && mg < 60;
  const leanMass = hasBodyFat ? poids * (1 - mg / 100) : poids * 0.82;

  let bmr: number;
  let formula: "katch-mcardle" | "mifflin";

  if (hasBodyFat) {
    bmr = Math.round(370 + 21.6 * leanMass);
    formula = "katch-mcardle";
  } else {
    bmr = Math.round(10 * poids + 6.25 * taille - 5 * age + (p.sexe === "homme" ? 5 : -161));
    formula = "mifflin";
  }

  if (!Number.isFinite(bmr)) return null;
  const factor = ACTIVITY_FACTORS.find((a) => a.id === p.activite)?.factor ?? 1.55;
  const tdee = Math.round(bmr * factor);
  if (!Number.isFinite(tdee)) return null;

  // Percentage-based deficit: "-15" = −15% of TDEE, "+10" = +10%
  const rawPct = parseFloat(p.deficit) / 100;
  const deltaPct = Number.isFinite(rawPct) ? Math.max(-0.35, Math.min(0.35, rawPct)) : -0.15;
  const deltaKcal = Math.round(tdee * deltaPct);

  const proteines = Math.round(leanMass * 2.2);
  const stdCal = Math.max(1200, tdee + deltaKcal);

  return {
    bmr, tdee, deltaKcal, formula,
    leanMass: Math.round(leanMass * 10) / 10,
    standard: buildDay(stdCal, proteines),
    intensif: buildDay(Math.max(1400, stdCal + 350), proteines),
    repos: buildDay(Math.max(1200, stdCal - 300), proteines),
  };
}

export function MacroProgress({ label, current, target, color }: {
  label: string; current: number; target: number; color: string;
}) {
  const p = (target > 0 && Number.isFinite(target))
    ? Math.min(110, Math.round((current / target) * 100))
    : 0;
  const ok = p >= 95 && p <= 105;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-zinc-500">{label}</span>
        <span className={ok ? "text-emerald-500" : "text-zinc-500"}>
          {current}/{target}g · {p}%
        </span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: "#eeece9" }}>
        <div
          style={{ width: `${Math.min(100, p)}%` }}
          className={`h-full rounded-full transition-all ${ok ? "bg-emerald-500" : p >= 75 ? "bg-amber-500" : p > 105 ? "bg-red-500" : color}`}
        />
      </div>
    </div>
  );
}

export default function NutritionCalculator({
  onTargetsChange,
}: {
  onTargetsChange: (t: NutritionTargets | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormProfile>(EMPTY);
  const [savedTargets, setSavedTargets] = useState<NutritionTargets | null>(null);
  const [saving, setSaving] = useState(false);

  const calc = compute(form);

  useEffect(() => {
    fetch("/api/nutrition/profile")
      .then((r) => r.json())
      .then((data: {
        poids?: number; taille?: number; age?: number; sexe?: string; masse_grasse?: number;
        activite?: string; objectif?: string; deficit?: number; day_types?: string;
        cible_calories?: number;
      } | null) => {
        if (!data) return;

        // Detect legacy kcal deficit (absolute values > 100 → convert to nearest preset)
        let deficitStr = data.deficit?.toString() ?? "-15";
        const defNum = data.deficit ?? 0;
        if (Math.abs(defNum) > 100) {
          // Old kcal format — pick nearest OBJECTIFS preset
          const nearest = OBJECTIFS.reduce((a, b) =>
            Math.abs(b.delta - Math.round(defNum / 10)) < Math.abs(a.delta - Math.round(defNum / 10)) ? b : a
          );
          deficitStr = nearest.delta.toString();
        }

        const restored: FormProfile = {
          poids: data.poids?.toString() ?? "",
          taille: data.taille?.toString() ?? "",
          age: data.age?.toString() ?? "",
          sexe: (data.sexe as "homme" | "femme") ?? "homme",
          masse_grasse: data.masse_grasse?.toString() ?? "",
          activite: data.activite ?? "modere",
          objectif: data.objectif ?? "seche",
          deficit: deficitStr,
        };
        setForm(restored);

        if (data.day_types) {
          try {
            const parsed = JSON.parse(data.day_types) as NutritionTargets;
            if (parsed.standard?.calories > 0 && parsed.intensif?.calories > 0 && parsed.repos?.calories > 0) {
              setSavedTargets(parsed);
              onTargetsChange(parsed);
              return;
            }
          } catch {}
        }

        if (data.cible_calories) {
          const recomputed = compute(restored);
          if (recomputed) {
            setSavedTargets(recomputed);
            onTargetsChange(recomputed);
          }
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const f = (k: keyof FormProfile, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const selectObjectif = (obj: typeof OBJECTIFS[number]) =>
    setForm((p) => ({ ...p, objectif: obj.id, deficit: obj.delta.toString() }));

  const save = async () => {
    if (!calc) return;
    setSaving(true);
    const body = {
      poids: parseFloat(form.poids) || null,
      taille: parseFloat(form.taille) || null,
      age: parseInt(form.age) || null,
      sexe: form.sexe,
      masse_grasse: parseFloat(form.masse_grasse) || null,
      activite: form.activite,
      objectif: form.objectif,
      deficit: parseInt(form.deficit) || 0,
      cible_calories: calc.standard.calories,
      cible_proteines: calc.standard.proteines,
      cible_glucides: calc.standard.glucides,
      cible_lipides: calc.standard.lipides,
      day_types: JSON.stringify({ standard: calc.standard, intensif: calc.intensif, repos: calc.repos }),
    };
    await fetch("/api/nutrition/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const t: NutritionTargets = { standard: calc.standard, intensif: calc.intensif, repos: calc.repos };
    setSavedTargets(t);
    onTargetsChange(t);
    setSaving(false);
    setOpen(false);
  };

  const DAY_COLS = [
    { key: "repos",    emoji: "😴", label: "Repos",          extra: "−300 kcal", extraCls: "text-blue-500" },
    { key: "intensif", emoji: "🏋️", label: "Entraînement",   extra: "+350 kcal", extraCls: "text-emerald-500" },
  ] as const;

  return (
    <div className="card p-0 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 transition-colors text-left"
      >
        <FlaskConical size={14} style={{ color: "#7c3aed" }} className="shrink-0" />
        <span className="text-sm font-medium shrink-0" style={{ color: "#2c2c2a" }}>Objectifs nutritionnels</span>
        {savedTargets ? (
          <span className="flex-1 text-xs truncate" style={{ color: "#9c9c9a" }}>
            🏋️ {savedTargets.intensif.calories} kcal · P {savedTargets.intensif.proteines}g · G {savedTargets.intensif.glucides}g · L {savedTargets.intensif.lipides}g
          </span>
        ) : (
          <span className="flex-1 text-xs" style={{ color: "#bcbcba" }}>Non définis — calculer tes macros</span>
        )}
        {open
          ? <ChevronUp size={14} style={{ color: "#bcbcba" }} className="shrink-0" />
          : <ChevronDown size={14} style={{ color: "#bcbcba" }} className="shrink-0" />}
      </button>

      {open && (
        <div className="p-4 space-y-5" style={{ borderTop: "1px solid #e4e2de" }}>

          {/* Mensurations */}
          <div>
            <p className="section-label mb-3">Mensurations</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              {[
                { k: "poids",        label: "Poids (kg)",      ph: "80",  step: "0.5" },
                { k: "taille",       label: "Taille (cm)",     ph: "178", step: "1" },
                { k: "age",          label: "Âge",             ph: "25",  step: "1" },
                { k: "masse_grasse", label: "Masse grasse %",  ph: "— optionnel", step: "0.5" },
              ].map(({ k, label, ph, step }) => (
                <div key={k}>
                  <label className="text-xs mb-1 block" style={{ color: "#9c9c9a" }}>{label}</label>
                  <input
                    type="number" step={step} className="input" placeholder={ph}
                    value={form[k as keyof FormProfile]}
                    onChange={(e) => f(k as keyof FormProfile, e.target.value)}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              {(["homme", "femme"] as const).map((s) => (
                <button
                  key={s} type="button" onClick={() => f("sexe", s)}
                  className="flex-1 py-2 rounded-lg border text-sm font-medium transition-colors capitalize"
                  style={{
                    borderColor: form.sexe === s ? "rgba(109,40,217,0.5)" : "#e4e2de",
                    backgroundColor: form.sexe === s ? "rgba(109,40,217,0.07)" : "transparent",
                    color: form.sexe === s ? "#6d28d9" : "#7a7a78",
                  }}
                >
                  {s === "homme" ? "♂ Homme" : "♀ Femme"}
                </button>
              ))}
            </div>
          </div>

          {/* Activité */}
          <div>
            <p className="section-label mb-3">Activité quotidienne</p>
            <div className="space-y-1.5">
              {ACTIVITY_FACTORS.map((a) => {
                const active = form.activite === a.id;
                return (
                  <button
                    key={a.id} type="button" onClick={() => f("activite", a.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors"
                    style={{
                      borderColor: active ? "rgba(109,40,217,0.5)" : "#e4e2de",
                      backgroundColor: active ? "rgba(109,40,217,0.07)" : "transparent",
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: active ? "#6d28d9" : "#2c2c2a" }}>{a.label}</p>
                      <p className="text-xs" style={{ color: "#b0aea9" }}>{a.desc}</p>
                    </div>
                    <span className="text-xs shrink-0" style={{ color: "#b0aea9" }}>×{a.factor}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Objectif */}
          <div>
            <p className="section-label mb-3">Objectif</p>
            <div className="grid grid-cols-1 gap-1.5 mb-3">
              {OBJECTIFS.map((o) => {
                const active = form.objectif === o.id;
                const kcalPreview = calc ? Math.round(calc.tdee * o.delta / 100) : null;
                return (
                  <button
                    key={o.id} type="button" onClick={() => selectObjectif(o)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors"
                    style={{
                      borderColor: active ? "rgba(109,40,217,0.5)" : "#e4e2de",
                      backgroundColor: active ? "rgba(109,40,217,0.07)" : "transparent",
                    }}
                  >
                    <span className="text-base shrink-0">{o.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: active ? "#6d28d9" : "#2c2c2a" }}>{o.label}</p>
                      <p className="text-xs" style={{ color: "#b0aea9" }}>{o.desc}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-medium" style={{ color: o.delta < 0 ? "#ef4444" : o.delta > 0 ? "#10b981" : "#9c9c9a" }}>
                        {o.delta > 0 ? "+" : ""}{o.delta}%
                      </p>
                      {kcalPreview !== null && (
                        <p className="text-[10px]" style={{ color: "#c8c6c2" }}>
                          {kcalPreview > 0 ? "+" : ""}{kcalPreview} kcal
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "#9c9c9a" }}>Ajustement personnalisé (%)</label>
              <div className="relative">
                <input
                  type="number" min="-35" max="35" step="1" className="input pr-8" placeholder="-15"
                  value={form.deficit} onChange={(e) => f("deficit", e.target.value)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none" style={{ color: "#9c9c9a" }}>%</span>
              </div>
              <p className="text-xs mt-1" style={{ color: "#c8c6c2" }}>Négatif = déficit · positif = surplus · recommandé: −10 à −20%</p>
            </div>
          </div>

          {/* Results */}
          {calc ? (
            <div className="rounded-lg p-4 space-y-4" style={{ border: "1px solid rgba(109,40,217,0.2)", backgroundColor: "rgba(109,40,217,0.04)" }}>

              {/* Formula + stats */}
              <div className="flex items-center gap-3 flex-wrap">
                <span
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium"
                  style={{
                    backgroundColor: calc.formula === "katch-mcardle" ? "rgba(109,40,217,0.15)" : "rgba(0,0,0,0.06)",
                    color: calc.formula === "katch-mcardle" ? "#6d28d9" : "#7a7a78",
                  }}
                >
                  <Zap size={10} />
                  {calc.formula === "katch-mcardle" ? "Katch-McArdle ✓" : "Mifflin-St Jeor"}
                </span>
                <span className="text-xs" style={{ color: "#9c9c9a" }}>
                  BMR <strong style={{ color: "#2c2c2a" }}>{calc.bmr}</strong> kcal
                </span>
                <span style={{ color: "#e4e2de" }}>·</span>
                <span className="text-xs" style={{ color: "#9c9c9a" }}>
                  TDEE <strong style={{ color: "#2c2c2a" }}>{calc.tdee}</strong> kcal
                </span>
                <span style={{ color: "#e4e2de" }}>·</span>
                <span className="text-xs" style={{ color: "#9c9c9a" }}>
                  Δ <strong style={{ color: calc.deltaKcal < 0 ? "#ef4444" : calc.deltaKcal > 0 ? "#10b981" : "#9c9c9a" }}>
                    {calc.deltaKcal > 0 ? "+" : ""}{calc.deltaKcal}
                  </strong> kcal ({form.deficit}%)
                </span>
                {calc.formula === "mifflin" && (
                  <span className="text-xs w-full" style={{ color: "#b0aea9" }}>— Renseigne ta MG pour Katch-McArdle (plus précis)</span>
                )}
              </div>

              {/* 2 day-type columns */}
              <div className="grid grid-cols-2 gap-2">
                {DAY_COLS.map(({ key, emoji, label, extra, extraCls }) => {
                  const day = calc[key];
                  const totalKcal = day.proteines * 4 + day.glucides * 4 + day.lipides * 9;
                  return (
                    <div
                      key={key}
                      className="rounded-lg p-3"
                      style={{ border: "1px solid #e4e2de", backgroundColor: "#fafaf9" }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium" style={{ color: "#7a7a78" }}>
                          {emoji} {label}
                        </span>
                        <span className={`text-[10px] font-medium ${extraCls}`}>{extra}</span>
                      </div>
                      <p className="text-2xl font-bold leading-none" style={{ color: "#1a1a18" }}>
                        {day.calories}
                      </p>
                      <p className="text-[10px] mb-3" style={{ color: "#b0aea9" }}>kcal</p>
                      <div className="space-y-1">
                        {[
                          { lbl: "P", val: day.proteines, col: "#3b82f6" },
                          { lbl: "G", val: day.glucides,  col: "#f59e0b" },
                          { lbl: "L", val: day.lipides,   col: "#f43f5e" },
                        ].map(({ lbl, val, col }) => (
                          <div key={lbl} className="flex justify-between items-center">
                            <span className="text-[11px] font-medium" style={{ color: col }}>{lbl}</span>
                            <span className="text-[11px]" style={{ color: "#5a5a58" }}>{val}g</span>
                          </div>
                        ))}
                      </div>
                      {totalKcal > 0 && (
                        <div className="mt-2 h-1 rounded-full overflow-hidden flex" style={{ backgroundColor: "#eeece9" }}>
                          <div style={{ width: `${(day.proteines * 4 / totalKcal) * 100}%`, backgroundColor: "#3b82f6" }} />
                          <div style={{ width: `${(day.glucides * 4 / totalKcal) * 100}%`, backgroundColor: "#f59e0b" }} />
                          <div style={{ width: `${(day.lipides * 9 / totalKcal) * 100}%`, backgroundColor: "#f43f5e" }} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <p className="text-[11px]" style={{ color: "#b0aea9" }}>
                Masse maigre {calc.leanMass} kg · Lipides fixes 80g · Protéines 2,2g/kg masse maigre · Glucides variables
              </p>
            </div>
          ) : (
            <div className="rounded-lg p-4 text-center text-xs" style={{ border: "1px solid #e4e2de", backgroundColor: "#fafaf9", color: "#b0aea9" }}>
              Renseigne poids, taille et âge pour voir le calcul
            </div>
          )}

          <button
            onClick={save}
            disabled={!calc || saving}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={14} />
            {saving ? "Enregistrement…" : "Enregistrer et appliquer ces objectifs"}
          </button>
        </div>
      )}
    </div>
  );
}
