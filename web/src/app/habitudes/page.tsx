"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Save, Plus, Pencil, Trash2, GripVertical } from "lucide-react";

type Section = "metriques" | "general" | "matin" | "soir" | "ponctuel";
type ScoreImpact = "positif" | "negatif" | "aucun";

interface HabitDef {
  id: number;
  cle: string;
  label: string;
  emoji: string | null;
  type: "checkbox" | "metric";
  section: Section;
  unite: string | null;
  cible: number | null;
  target_freq: string | null;
  score_impact: ScoreImpact;
  ordre: number;
}

interface HistValue {
  date: string;
  habit_id: number;
  valeur: number | null;
}

interface Journal {
  humeur: number | null;
  energie: number | null;
  notes: string;
}

const SECTIONS: { key: Section; title: string }[] = [
  { key: "metriques", title: "Métriques" },
  { key: "general", title: "Check-list" },
  { key: "matin", title: "Matin" },
  { key: "soir", title: "Soir" },
  { key: "ponctuel", title: "Ponctuel" },
];

function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function calcScore(defs: HabitDef[], values: Record<number, number | null | undefined>): number {
  let pos = 0, neg = 0;
  for (const d of defs) {
    if (d.score_impact === "aucun") continue;
    const v = values[d.id];
    const done = d.type === "metric"
      ? (d.cible != null ? (v ?? 0) >= d.cible : (v ?? 0) > 0)
      : !!v;
    if (!done) continue;
    if (d.score_impact === "positif") pos++;
    else neg++;
  }
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

function daysAgo(dateStr: string): number {
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((now.getTime() - d.getTime()) / 86400000);
}

function lastDoneLabel(history: HistValue[], habitId: number, doneToday: boolean): string {
  if (doneToday) return "Aujourd'hui";
  const done = history
    .filter((h) => h.habit_id === habitId && !!h.valeur)
    .sort((a, b) => b.date.localeCompare(a.date));
  if (!done.length) return "Jamais (35j)";
  const days = daysAgo(done[0].date);
  if (days <= 0) return "Aujourd'hui";
  if (days === 1) return "Hier";
  return `Il y a ${days}j`;
}

const EMPTY_FORM = { label: "", emoji: "", unite: "", cible: "", target_freq: "", score_impact: "aucun" as ScoreImpact };

export default function HabitudesPage() {
  const [defs, setDefs] = useState<HabitDef[]>([]);
  const [valuesToday, setValuesToday] = useState<Record<number, number | null>>({});
  const [history, setHistory] = useState<HistValue[]>([]);
  const [journal, setJournal] = useState<Journal>({ humeur: null, energie: null, notes: "" });
  const [saved, setSaved] = useState(false);

  const [addingSection, setAddingSection] = useState<Section | null>(null);
  const [editingDef, setEditingDef] = useState<HabitDef | null>(null);

  const todayStr = toLocalDateStr(new Date());

  const loadDefs = useCallback(() => {
    fetch("/api/habit-definitions").then((r) => (r.ok ? r.json() : [])).then(setDefs).catch(() => {});
  }, []);

  const loadValuesToday = useCallback(() => {
    fetch(`/api/habit-values?date=${todayStr}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: { habit_id: number; valeur: number | null }[]) => {
        const map: Record<number, number | null> = {};
        for (const r of rows) map[r.habit_id] = r.valeur;
        setValuesToday(map);
      })
      .catch(() => {});
  }, [todayStr]);

  const loadHistory = useCallback(() => {
    fetch("/api/habit-values?days=35").then((r) => (r.ok ? r.json() : [])).then(setHistory).catch(() => {});
  }, []);

  const loadJournal = useCallback(() => {
    fetch(`/api/habitudes?date=${todayStr}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { humeur?: number; energie?: number; notes?: string } | null) => {
        setJournal(data ? { humeur: data.humeur ?? null, energie: data.energie ?? null, notes: data.notes ?? "" } : { humeur: null, energie: null, notes: "" });
      })
      .catch(() => {});
  }, [todayStr]);

  useEffect(() => { loadDefs(); loadHistory(); }, [loadDefs, loadHistory]);
  useEffect(() => { loadValuesToday(); loadJournal(); }, [loadValuesToday, loadJournal]);

  const score = calcScore(defs, valuesToday);

  const numSaveTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const postValue = useCallback((habitId: number, valeur: number | null) =>
    fetch("/api/habit-values", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: todayStr, values: [{ habit_id: habitId, valeur }] }),
    }), [todayStr]);

  // Retries once after a short delay to ride through transient network/DB blips before giving up
  const saveValue = useCallback(async (habitId: number, valeur: number | null) => {
    try {
      let res = await postValue(habitId, valeur);
      if (!res.ok) {
        await new Promise((r) => setTimeout(r, 800));
        res = await postValue(habitId, valeur);
      }
      if (!res.ok) throw new Error();
      loadHistory();
      return true;
    } catch {
      return false;
    }
  }, [postValue, loadHistory]);

  const setNum = (habitId: number, v: string) => {
    const parsed = v === "" ? null : parseFloat(v);
    setValuesToday((p) => ({ ...p, [habitId]: parsed }));
    if (numSaveTimers.current[habitId]) clearTimeout(numSaveTimers.current[habitId]);
    numSaveTimers.current[habitId] = setTimeout(async () => {
      const ok = await saveValue(habitId, parsed);
      if (!ok) alert("Échec de l'enregistrement — réessaie.");
    }, 600);
  };

  const toggle = async (habitId: number) => {
    const prevVal = valuesToday[habitId] ?? null;
    const nextVal = prevVal ? 0 : 1;
    setValuesToday((p) => ({ ...p, [habitId]: nextVal }));
    const ok = await saveValue(habitId, nextVal);
    if (!ok) {
      setValuesToday((p) => ({ ...p, [habitId]: prevVal }));
      alert("Échec de l'enregistrement — réessaie.");
    }
  };

  const save = async () => {
    await fetch("/api/habitudes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: todayStr, humeur: journal.humeur, energie: journal.energie, notes: journal.notes }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const createHabit = async (section: Section, type: "checkbox" | "metric", form: typeof EMPTY_FORM) => {
    await fetch("/api/habit-definitions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: form.label, emoji: form.emoji || null, type, section,
        unite: form.unite || null, cible: form.cible ? parseFloat(form.cible) : null,
        target_freq: form.target_freq || null, score_impact: form.score_impact,
      }),
    });
    setAddingSection(null);
    loadDefs();
  };

  const updateHabit = async (id: number, form: typeof EMPTY_FORM) => {
    await fetch(`/api/habit-definitions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: form.label, emoji: form.emoji || null,
        unite: form.unite || null, cible: form.cible ? parseFloat(form.cible) : null,
        target_freq: form.target_freq || null, score_impact: form.score_impact,
      }),
    });
    setEditingDef(null);
    loadDefs();
  };

  const deleteHabit = async (id: number) => {
    await fetch(`/api/habit-definitions/${id}`, { method: "DELETE" });
    loadDefs();
  };

  const reorderHabits = async (ids: number[]) => {
    setDefs((prev) => {
      const idSet = new Set(ids);
      const reordered = ids.map((id) => prev.find((d) => d.id === id)).filter((d): d is HabitDef => !!d);
      let idx = 0;
      return prev.map((d) => (idSet.has(d.id) ? reordered[idx++] : d));
    });
    await fetch("/api/habit-definitions/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    loadDefs();
  };

  const historyByDate = useMemo(() => {
    const m = new Map<string, Record<number, number | null>>();
    for (const h of history) {
      if (!m.has(h.date)) m.set(h.date, {});
      m.get(h.date)![h.habit_id] = h.valeur;
    }
    return m;
  }, [history]);

  const gridDays: { date: string; score: number | null }[] = [];
  for (let i = 34; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = toLocalDateStr(d);
    const values = historyByDate.get(dateStr);
    gridDays.push({ date: dateStr, score: values ? calcScore(defs, values) : null });
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
        <div className="text-right">
          <p className="text-3xl font-bold text-zinc-100">{score}<span className="text-zinc-600 text-lg">/10</span></p>
          <p className="text-xs text-zinc-500 mt-0.5">{scoreLabel(score)}</p>
        </div>
      </div>

      <div className="progress-track h-2">
        <div className={`h-full rounded-full transition-all ${scoreColor(score)}`} style={{ width: `${score * 10}%` }} />
      </div>

      {/* Form */}
      <div className="card space-y-5">
        {SECTIONS.map((s) => (
          <HabitSection
            key={s.key}
            section={s.key}
            title={s.title}
            defs={defs.filter((d) => d.section === s.key)}
            valuesToday={valuesToday}
            history={history}
            onToggle={toggle}
            onNum={setNum}
            onEdit={setEditingDef}
            onDelete={deleteHabit}
            onReorder={reorderHabits}
            adding={addingSection === s.key}
            onAddClick={() => setAddingSection(s.key)}
            onAddCancel={() => setAddingSection(null)}
            onAddSubmit={(form) => createHabit(s.key, s.key === "metriques" ? "metric" : "checkbox", form)}
          />
        ))}

        {/* Mood / Energy */}
        <div>
          <p className="section-label mb-3">Ressenti</p>
          <div className="grid grid-cols-2 gap-4">
            <SliderInput
              label="😊 Humeur"
              value={journal.humeur ?? 3}
              onChange={(v) => setJournal((p) => ({ ...p, humeur: v }))}
              labels={["😞", "😐", "🙂", "😊", "😄"]}
            />
            <SliderInput
              label="⚡ Énergie"
              value={journal.energie ?? 3}
              onChange={(v) => setJournal((p) => ({ ...p, energie: v }))}
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
            value={journal.notes}
            onChange={(e) => setJournal((p) => ({ ...p, notes: e.target.value }))}
          />
        </div>

        <div>
          <button onClick={save} className={`btn-primary w-full flex items-center justify-center gap-2 ${saved ? "bg-emerald-600 hover:bg-emerald-500" : ""}`}>
            <Save size={15} />
            {saved ? "Journal sauvegardé !" : "Sauvegarder le journal"}
          </button>
          <p className="text-[11px] text-zinc-600 mt-1.5 text-center">Les habitudes ci-dessus sont enregistrées automatiquement à chaque case cochée.</p>
        </div>
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

      {editingDef && (
        <HabitFormModal
          title={`Modifier « ${editingDef.label} »`}
          type={editingDef.type}
          section={editingDef.section}
          initial={{
            label: editingDef.label, emoji: editingDef.emoji ?? "",
            unite: editingDef.unite ?? "", cible: editingDef.cible?.toString() ?? "",
            target_freq: editingDef.target_freq ?? "", score_impact: editingDef.score_impact,
          }}
          onSubmit={(form) => updateHabit(editingDef.id, form)}
          onCancel={() => setEditingDef(null)}
        />
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function HabitSection({
  section, title, defs, valuesToday, history, onToggle, onNum, onEdit, onDelete, onReorder,
  adding, onAddClick, onAddCancel, onAddSubmit,
}: {
  section: Section; title: string; defs: HabitDef[];
  valuesToday: Record<number, number | null>; history: HistValue[];
  onToggle: (id: number) => void; onNum: (id: number, v: string) => void;
  onEdit: (d: HabitDef) => void; onDelete: (id: number) => void;
  onReorder: (ids: number[]) => void;
  adding: boolean; onAddClick: () => void; onAddCancel: () => void;
  onAddSubmit: (form: typeof EMPTY_FORM) => void;
}) {
  const isMetriques = section === "metriques";
  const done = !isMetriques ? defs.filter((d) => !!valuesToday[d.id]).length : 0;

  const [dragId, setDragId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);

  const handleDrop = (targetId: number) => {
    if (dragId !== null && dragId !== targetId) {
      const ids = defs.map((d) => d.id);
      const fromIdx = ids.indexOf(dragId);
      const toIdx = ids.indexOf(targetId);
      if (fromIdx !== -1 && toIdx !== -1) {
        ids.splice(fromIdx, 1);
        ids.splice(toIdx, 0, dragId);
        onReorder(ids);
      }
    }
    setDragId(null);
    setDragOverId(null);
  };

  const dragProps = (id: number) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => { setDragId(id); e.dataTransfer.effectAllowed = "move"; },
    onDragEnd: () => { setDragId(null); setDragOverId(null); },
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); if (dragOverId !== id) setDragOverId(id); },
    onDragLeave: () => setDragOverId((cur) => (cur === id ? null : cur)),
    onDrop: (e: React.DragEvent) => { e.preventDefault(); handleDrop(id); },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="section-label">{title}</p>
        <div className="flex items-center gap-2">
          {!isMetriques && defs.length > 0 && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${done === defs.length ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-800 text-zinc-500"}`}>
              {done}/{defs.length}
            </span>
          )}
          <button onClick={onAddClick} className="text-zinc-600 hover:text-violet-500 transition-colors p-0.5">
            <Plus size={14} />
          </button>
        </div>
      </div>

      {adding && (
        <div className="mb-3">
          <HabitFormInline type={isMetriques ? "metric" : "checkbox"} section={section} onSubmit={onAddSubmit} onCancel={onAddCancel} />
        </div>
      )}

      {defs.length === 0 && !adding ? (
        <p className="text-xs text-zinc-600">Aucun item — clique sur + pour en ajouter un</p>
      ) : isMetriques ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {defs.map((d) => (
            <div
              key={d.id}
              className={`relative group cursor-grab active:cursor-grabbing rounded-lg transition-all ${
                dragOverId === d.id && dragId !== d.id ? "ring-2 ring-violet-500 ring-offset-2 ring-offset-zinc-900" : ""
              } ${dragId === d.id ? "opacity-40" : ""}`}
              {...dragProps(d.id)}
            >
              <NumInput
                label={d.emoji ? `${d.emoji} ${d.label}` : d.label}
                sublabel={d.unite ?? ""}
                value={valuesToday[d.id] ?? ""}
                onChange={(v) => onNum(d.id, v)}
                placeholder={d.cible?.toString() ?? "0"}
                highlight={d.cible != null && (valuesToday[d.id] ?? 0) >= d.cible}
              />
              <ItemActions onEdit={() => onEdit(d)} onDelete={() => onDelete(d.id)} />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {defs.map((d) => {
            const last = section === "ponctuel" ? lastDoneLabel(history, d.id, !!valuesToday[d.id]) : undefined;
            const sublabel = last && d.target_freq ? `${last} · cible ${d.target_freq}` : last;
            return (
              <div
                key={d.id}
                className={`relative group cursor-grab active:cursor-grabbing rounded-lg transition-all ${
                  dragOverId === d.id && dragId !== d.id ? "ring-2 ring-violet-500 ring-offset-2 ring-offset-zinc-900" : ""
                } ${dragId === d.id ? "opacity-40" : ""}`}
                {...dragProps(d.id)}
              >
                <CheckItem
                  label={d.emoji ? `${d.emoji} ${d.label}` : d.label}
                  checked={!!valuesToday[d.id]}
                  onChange={() => onToggle(d.id)}
                  positive={d.score_impact !== "negatif"}
                  sublabel={sublabel}
                />
                <ItemActions onEdit={() => onEdit(d)} onDelete={() => onDelete(d.id)} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ItemActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="absolute top-1 right-1 flex items-center gap-0.5">
      <div className="text-zinc-400/70 group-hover:text-zinc-500 transition-colors p-1 pointer-events-none">
        <GripVertical size={11} />
      </div>
      <button onClick={onEdit} className="p-1 rounded bg-white/90 text-zinc-500 hover:text-violet-600 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
        <Pencil size={10} />
      </button>
      <button onClick={onDelete} className="p-1 rounded bg-white/90 text-zinc-500 hover:text-red-500 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
        <Trash2 size={10} />
      </button>
    </div>
  );
}

function HabitFormInline({ type, section, initial, onSubmit, onCancel }: {
  type: "checkbox" | "metric"; section: Section; initial?: typeof EMPTY_FORM;
  onSubmit: (form: typeof EMPTY_FORM) => void; onCancel: () => void;
}) {
  const [form, setForm] = useState(initial ?? EMPTY_FORM);
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (form.label.trim()) onSubmit(form); }}
      className="flex items-end gap-3 flex-wrap p-3 rounded-lg border border-zinc-800"
    >
      <div>
        <label className="text-xs text-zinc-500 mb-1 block">Nom</label>
        <input className="input py-1.5 text-sm w-40" value={form.label}
          onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))} required />
      </div>
      <div>
        <label className="text-xs text-zinc-500 mb-1 block">Emoji</label>
        <input className="input py-1.5 text-sm w-16 text-center" placeholder="✨" value={form.emoji}
          onChange={(e) => setForm((p) => ({ ...p, emoji: e.target.value }))} />
      </div>
      {type === "metric" && (
        <>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Unité</label>
            <input className="input py-1.5 text-sm w-24" placeholder="minutes" value={form.unite}
              onChange={(e) => setForm((p) => ({ ...p, unite: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Cible</label>
            <input type="number" className="input py-1.5 text-sm w-20" value={form.cible}
              onChange={(e) => setForm((p) => ({ ...p, cible: e.target.value }))} />
          </div>
        </>
      )}
      {type === "checkbox" && section === "ponctuel" && (
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">Fréquence cible</label>
          <input className="input py-1.5 text-sm w-32" placeholder="2x/semaine" value={form.target_freq}
            onChange={(e) => setForm((p) => ({ ...p, target_freq: e.target.value }))} />
        </div>
      )}
      <div>
        <label className="text-xs text-zinc-500 mb-1 block">Impact score</label>
        <select className="select py-1.5 text-sm" value={form.score_impact}
          onChange={(e) => setForm((p) => ({ ...p, score_impact: e.target.value as ScoreImpact }))}>
          <option value="aucun">Aucun</option>
          <option value="positif">Positif</option>
          <option value="negatif">Négatif</option>
        </select>
      </div>
      <button type="submit" className="btn-primary py-1.5 px-3 text-xs">{initial ? "Enregistrer" : "Ajouter"}</button>
      <button type="button" onClick={onCancel} className="btn-ghost py-1.5 px-2 text-xs">Annuler</button>
    </form>
  );
}

function HabitFormModal(props: { title: string } & Parameters<typeof HabitFormInline>[0]) {
  const { title, ...rest } = props;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={rest.onCancel}>
      <div className="card w-fit max-w-2xl space-y-3" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm font-medium text-zinc-200">{title}</p>
        <HabitFormInline {...rest} />
      </div>
    </div>
  );
}

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

function CheckItem({ label, checked, onChange, positive, sublabel }: {
  label: string; checked: boolean; onChange: () => void; positive: boolean; sublabel?: string;
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
      <div className="min-w-0">
        <span className="text-sm block truncate">{label}</span>
        {sublabel && <span className="text-[10px] text-zinc-600 block">{sublabel}</span>}
      </div>
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
