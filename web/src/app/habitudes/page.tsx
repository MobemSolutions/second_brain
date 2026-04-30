"use client";

import { useCallback, useEffect, useState } from "react";
import { Save } from "lucide-react";

interface Habitude {
  id?: number;
  date: string;
  sommeil: number | null;
  eau: number | null;
  meditation: number | null;
  lecture: number | null;
  sport_fait: number;
  alcool: number;
  ecran_dodo: number;
  nofap: number;
  brossage_matin: number;
  brossage_soir: number;
  gratte_langue: number;
  fil_dentaire: number;
  creme_solaire: number;
  soin_peau_soir: number;
  humeur: number | null;
  energie: number | null;
  notes: string;
}

interface HistoryEntry {
  date: string;
  score: number;
}

function calcScore(h: Habitude): number {
  const pos =
    (h.sport_fait ? 1 : 0) +
    (h.nofap ? 1 : 0) +
    ((h.sommeil ?? 0) >= 7 ? 1 : 0) +
    ((h.eau ?? 0) >= 2 ? 1 : 0) +
    ((h.meditation ?? 0) >= 10 ? 1 : 0) +
    ((h.lecture ?? 0) >= 20 ? 1 : 0);
  const neg = (h.alcool ? 1 : 0) + (h.ecran_dodo ? 1 : 0);
  return Math.max(0, Math.min(10, pos * 2 - neg));
}

function scoreColor(s: number): string {
  if (s >= 8) return "bg-emerald-500";
  if (s >= 6) return "bg-emerald-600";
  if (s >= 4) return "bg-amber-500";
  if (s >= 2) return "bg-orange-600";
  return "bg-zinc-700";
}

function scoreLabel(s: number): string {
  if (s >= 8) return "🌟 Excellente";
  if (s >= 6) return "✅ Bonne";
  if (s >= 4) return "🟡 Moyenne";
  return "🔴 Difficile";
}

const EMPTY: Habitude = {
  date: new Date().toISOString().split("T")[0],
  sommeil: null, eau: null, meditation: null, lecture: null,
  sport_fait: 0, alcool: 0, ecran_dodo: 0, nofap: 0,
  brossage_matin: 0, brossage_soir: 0, gratte_langue: 0,
  fil_dentaire: 0, creme_solaire: 0, soin_peau_soir: 0,
  humeur: null, energie: null, notes: "",
};

export default function HabitudesPage() {
  const [today, setToday] = useState<Habitude>({ ...EMPTY });
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [saved, setSaved] = useState(false);

  const todayStr = new Date().toISOString().split("T")[0];
  const score = calcScore(today);

  const loadToday = useCallback(async () => {
    const r = await fetch(`/api/habitudes?date=${todayStr}`);
    const data = await r.json();
    if (data) setToday({ ...EMPTY, ...data });
  }, [todayStr]);

  const loadHistory = useCallback(async () => {
    const r = await fetch("/api/habitudes?days=35");
    const rows: Habitude[] = await r.json();
    setHistory(rows.map((h) => ({ date: h.date, score: calcScore(h) })));
  }, []);

  useEffect(() => {
    loadToday();
    loadHistory();
  }, [loadToday, loadHistory]);

  const save = async () => {
    await fetch("/api/habitudes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...today, date: todayStr }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    loadHistory();
  };

  const num = (k: keyof Habitude, v: string) =>
    setToday((p) => ({ ...p, [k]: v === "" ? null : parseFloat(v) }));

  const bool = (k: keyof Habitude) =>
    setToday((p) => ({ ...p, [k]: p[k] ? 0 : 1 }));

  // Build 35-day grid
  const gridDays: { date: string; score: number | null }[] = [];
  for (let i = 34; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const entry = history.find((h) => h.date === dateStr);
    gridDays.push({ date: dateStr, score: entry?.score ?? null });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Habitudes</h1>
          <p className="text-zinc-500 text-sm mt-0.5">
            {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        {/* Score display */}
        <div className="text-right">
          <p className="text-3xl font-bold text-zinc-100">{score}<span className="text-zinc-600 text-lg">/10</span></p>
          <p className="text-xs text-zinc-500 mt-0.5">{scoreLabel(score)}</p>
        </div>
      </div>

      {/* Score bar */}
      <div className="progress-track h-2">
        <div
          className={`h-full rounded-full transition-all ${scoreColor(score)}`}
          style={{ width: `${score * 10}%` }}
        />
      </div>

      {/* Form */}
      <div className="card space-y-5">
        {/* Numbers row */}
        <div>
          <p className="section-label mb-3">Métriques</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <NumInput
              label="😴 Sommeil"
              sublabel="heures"
              value={today.sommeil ?? ""}
              onChange={(v) => num("sommeil", v)}
              placeholder="7.5"
              step="0.5"
              highlight={(today.sommeil ?? 0) >= 7}
            />
            <NumInput
              label="💧 Eau"
              sublabel="litres"
              value={today.eau ?? ""}
              onChange={(v) => num("eau", v)}
              placeholder="2"
              step="0.25"
              highlight={(today.eau ?? 0) >= 2}
            />
            <NumInput
              label="🧘 Méditation"
              sublabel="minutes"
              value={today.meditation ?? ""}
              onChange={(v) => num("meditation", v)}
              placeholder="10"
              highlight={(today.meditation ?? 0) >= 10}
            />
            <NumInput
              label="📚 Lecture"
              sublabel="minutes"
              value={today.lecture ?? ""}
              onChange={(v) => num("lecture", v)}
              placeholder="20"
              highlight={(today.lecture ?? 0) >= 20}
            />
          </div>
        </div>

        {/* Checkboxes */}
        <div>
          <p className="section-label mb-3">Check-list</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <CheckItem
              label="🏋️ Sport fait"
              checked={!!today.sport_fait}
              onChange={() => bool("sport_fait")}
              positive
            />
            <CheckItem
              label="🔒 Nofap"
              checked={!!today.nofap}
              onChange={() => bool("nofap")}
              positive
            />
            <CheckItem
              label="🍷 Alcool"
              checked={!!today.alcool}
              onChange={() => bool("alcool")}
              positive={false}
            />
            <CheckItem
              label="📱 Écran avant dodo"
              checked={!!today.ecran_dodo}
              onChange={() => bool("ecran_dodo")}
              positive={false}
            />
          </div>
        </div>

        {/* Hygiène */}
        <div>
          {(() => {
            const hygieneItems = [
              { key: "brossage_matin", label: "🪥 Brossage matin" },
              { key: "brossage_soir",  label: "🌙 Brossage soir" },
              { key: "gratte_langue",  label: "👅 Gratte-langue" },
              { key: "fil_dentaire",   label: "🦷 Fil dentaire" },
              { key: "creme_solaire",  label: "☀️ Crème solaire" },
              { key: "soin_peau_soir", label: "🧴 Soin peau soir" },
            ] as const;
            const done = hygieneItems.filter((i) => !!today[i.key]).length;
            return (
              <>
                <div className="flex items-center justify-between mb-3">
                  <p className="section-label">Hygiène</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${done === hygieneItems.length ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-800 text-zinc-500"}`}>
                    {done}/{hygieneItems.length}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {hygieneItems.map((item) => (
                    <CheckItem
                      key={item.key}
                      label={item.label}
                      checked={!!today[item.key]}
                      onChange={() => bool(item.key)}
                      positive
                    />
                  ))}
                </div>
              </>
            );
          })()}
        </div>

        {/* Mood / Energy */}
        <div>
          <p className="section-label mb-3">Ressenti</p>
          <div className="grid grid-cols-2 gap-4">
            <SliderInput
              label="😊 Humeur"
              value={today.humeur ?? 3}
              onChange={(v) => setToday((p) => ({ ...p, humeur: v }))}
              labels={["😞", "😐", "🙂", "😊", "😄"]}
            />
            <SliderInput
              label="⚡ Énergie"
              value={today.energie ?? 3}
              onChange={(v) => setToday((p) => ({ ...p, energie: v }))}
              labels={["😴", "🥱", "😐", "💪", "⚡"]}
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs text-zinc-500 mb-1.5 block">Journal du jour (optionnel)</label>
          <textarea
            className="input"
            rows={3}
            placeholder="Comment s'est passée cette journée ?"
            value={today.notes}
            onChange={(e) => setToday((p) => ({ ...p, notes: e.target.value }))}
          />
        </div>

        {/* Save */}
        <button onClick={save} className={`btn-primary w-full flex items-center justify-center gap-2 ${saved ? "bg-emerald-600 hover:bg-emerald-500" : ""}`}>
          <Save size={15} />
          {saved ? "Sauvegardé !" : "Sauvegarder"}
        </button>
      </div>

      {/* 35-day heatmap */}
      <div className="card">
        <p className="section-label mb-3">Historique 35 jours</p>
        <div className="grid grid-cols-7 gap-1.5">
          {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
            <p key={i} className="text-center text-[10px] text-zinc-600">{d}</p>
          ))}
          {gridDays.map((day) => (
            <div
              key={day.date}
              title={`${day.date}${day.score !== null ? ` — score ${day.score}/10` : " — aucune donnée"}`}
              className={`h-8 rounded-md transition-colors cursor-default ${
                day.date === todayStr ? "ring-2 ring-violet-500 ring-offset-1 ring-offset-zinc-900" : ""
              } ${day.score !== null ? scoreColor(day.score) : "bg-zinc-800"}`}
            />
          ))}
        </div>
        <div className="flex items-center justify-end gap-3 mt-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-zinc-800" />
            <span className="text-xs text-zinc-600">Aucune donnée</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-orange-600" />
            <span className="text-xs text-zinc-600">Faible</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-amber-500" />
            <span className="text-xs text-zinc-600">Moyen</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-emerald-500" />
            <span className="text-xs text-zinc-600">Excellent</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function NumInput({ label, sublabel, value, onChange, placeholder, step = "1", highlight }: {
  label: string; sublabel: string; value: number | string;
  onChange: (v: string) => void; placeholder: string; step?: string; highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg p-3 border transition-colors ${highlight ? "border-emerald-500/40 bg-emerald-500/5" : "border-zinc-800 bg-zinc-800/50"}`}>
      <label className="text-xs text-zinc-400 block mb-2">{label}</label>
      <input
        type="number"
        step={step}
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-xl font-bold text-zinc-100 outline-none placeholder-zinc-700"
      />
      <p className="text-xs text-zinc-600 mt-1">{sublabel}</p>
    </div>
  );
}

function CheckItem({ label, checked, onChange, positive }: {
  label: string; checked: boolean; onChange: () => void; positive: boolean;
}) {
  const activeClass = positive
    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
    : "border-red-500/50 bg-red-500/10 text-red-300";

  return (
    <button
      onClick={onChange}
      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors text-left w-full ${
        checked ? activeClass : "border-zinc-800 bg-zinc-800/50 text-zinc-400 hover:border-zinc-700"
      }`}
    >
      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
        checked
          ? positive ? "border-emerald-400 bg-emerald-500" : "border-red-400 bg-red-500"
          : "border-zinc-600"
      }`}>
        {checked && <span className="text-white text-xs">✓</span>}
      </div>
      <span className="text-sm">{label}</span>
    </button>
  );
}

function SliderInput({ label, value, onChange, labels }: {
  label: string; value: number; onChange: (v: number) => void; labels: string[];
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs text-zinc-400">{label}</label>
        <span className="text-lg">{labels[(value ?? 1) - 1]}</span>
      </div>
      <input
        type="range"
        min="1"
        max="5"
        value={value ?? 3}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full accent-violet-500"
      />
      <div className="flex justify-between text-xs text-zinc-700 mt-0.5">
        <span>1</span><span>5</span>
      </div>
    </div>
  );
}
