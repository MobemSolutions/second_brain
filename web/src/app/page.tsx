"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Inbox,
  CheckSquare,
  Heart,
  CreditCard,
  Circle,
  CheckCircle2,
  ChevronRight,
  Search,
  Plus,
  Dumbbell,
  ShoppingCart,
  Film,
  BookOpen,
  Apple,
  Sparkles,
  ListChecks,
  Link2,
  Lightbulb,
  Send,
} from "lucide-react";
import { isHabitDone } from "@/lib/habitScore";

interface Task {
  id: number;
  titre: string;
  priorite: string;
  projet_titre?: string;
}
interface Project {
  id: number;
  titre: string;
  deadline?: string;
  total_taches: number;
  taches_faites: number;
}
interface SportRow {
  id: number;
  discipline: string;
  date: string;
  duree?: number;
  rpe?: number;
  groupe_musculaire?: string;
  exercice?: string;
  series?: number;
  repetitions?: number;
  charge?: number;
  distance?: number;
  type_course?: string;
  site?: string;
  voie?: string;
  cotation?: string;
  sommet?: string;
  massif?: string;
  altitude?: number;
}
interface LastSession {
  discipline: string;
  date: string;
  exercises: SportRow[];
}
interface Sub {
  id: number;
  service: string;
  prix: number;
  frequence: string;
  actif: number;
  cout_mensuel: number;
  jours_restants: number | null;
}
interface Stats {
  tasks_today: Task[];
  active_projects: Project[];
  habit_score: number;
  monthly_cost: number;
  last_session: LastSession | null;
  sport_week_count: number;
  inbox_count: number;
}
interface HabitDef {
  id: number;
  label: string;
  emoji: string | null;
  type: "checkbox" | "metric";
  unite: string | null;
  cible: number | null;
  score_impact: "positif" | "negatif" | "aucun";
  prioritaire: number;
}
interface HabitValue {
  habit_id: number;
  valeur: number | null;
}
interface TacheFull {
  id: number;
  titre: string;
  statut: string;
  date_echeance?: string | null;
}
interface AppleEvent {
  date: string;
  title: string;
}

const DISC_ICON: Record<string, string> = {
  musculation: "💪",
  running: "🏃",
  natation: "🏊",
  escalade: "🧗",
  alpinisme: "🏔️",
};
const DISC_LABEL: Record<string, string> = {
  musculation: "Musculation",
  running: "Running",
  natation: "Natation",
  escalade: "Escalade",
  alpinisme: "Alpinisme",
};

const PRIO_COLOR: Record<string, string> = {
  haute: "text-red-400",
  critique: "text-red-400",
  moyenne: "text-amber-400",
  basse: "text-zinc-500",
  normal: "text-zinc-500",
};

const CAPTURE_TYPES: { value: string; label: string; icon: typeof CheckSquare }[] = [
  { value: "tâche", label: "Tâche", icon: CheckSquare },
  { value: "note", label: "Note", icon: BookOpen },
  { value: "lien", label: "Lien", icon: Link2 },
  { value: "idée", label: "Idée", icon: Lightbulb },
];

function deadlineDays(d?: string) {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000);
}
function deadlineLabel(d?: string) {
  const days = deadlineDays(d);
  if (days === null) return "";
  if (days < 0) return `Dépassé ${Math.abs(days)}j`;
  if (days === 0) return "Aujourd'hui";
  return `J-${days}`;
}
function deadlineColor(d?: string) {
  const days = deadlineDays(d);
  if (days === null) return "text-zinc-600";
  if (days < 0 || days <= 7) return "text-red-400";
  if (days <= 30) return "text-amber-400";
  return "text-emerald-400";
}

function toDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function weekDates(): Date[] {
  const now = new Date();
  const dow = now.getDay(); // 0 Sun..6 Sat
  const offset = dow === 0 ? 6 : dow - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - offset);
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}
const FR_DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function relativeDay(dateStr: string): string {
  const today = toDateStr(new Date());
  const yesterday = toDateStr(new Date(Date.now() - 86_400_000));
  if (dateStr === today) return "Aujourd'hui";
  if (dateStr === yesterday) return "Hier";
  return new Date(dateStr + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function sessionLine(s: SportRow): string {
  switch (s.discipline) {
    case "musculation": {
      const sets = s.series && s.repetitions ? `${s.series}×${s.repetitions}` : "";
      const charge = s.charge ? ` @ ${s.charge}kg` : "";
      return `${s.exercice || s.groupe_musculaire || "Exercice"}${sets ? ` — ${sets}` : ""}${charge}`;
    }
    case "running":
    case "natation": {
      const parts = [];
      if (s.type_course) parts.push(s.type_course);
      if (s.distance) parts.push(`${s.distance} km`);
      if (s.duree) parts.push(`${s.duree} min`);
      return parts.join(" · ") || DISC_LABEL[s.discipline];
    }
    case "escalade": {
      const parts = [s.site, s.voie].filter(Boolean);
      if (s.cotation) parts.push(`(${s.cotation})`);
      return parts.join(" — ") || "Escalade";
    }
    case "alpinisme": {
      const parts = [s.sommet || s.massif].filter(Boolean);
      if (s.altitude) parts.push(`${s.altitude}m`);
      return parts.join(" — ") || "Alpinisme";
    }
    default:
      return DISC_LABEL[s.discipline] || s.discipline;
  }
}

function openCapture() {
  window.dispatchEvent(new CustomEvent("open-command-palette"));
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [habitDefs, setHabitDefs] = useState<HabitDef[]>([]);
  const [habitValues, setHabitValues] = useState<Record<number, number | null>>({});
  const [subs, setSubs] = useState<Sub[]>([]);
  const [coursesCount, setCoursesCount] = useState(0);
  const [mediaCount, setMediaCount] = useState(0);
  const [notesCount, setNotesCount] = useState(0);
  const [nutritionKcal, setNutritionKcal] = useState<number | null>(null);
  const [insightsCount, setInsightsCount] = useState(0);
  const [taches, setTaches] = useState<TacheFull[]>([]);
  const [appleEvents, setAppleEvents] = useState<AppleEvent[]>([]);
  const [selectedDay, setSelectedDay] = useState(toDateStr(new Date()));
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [captureType, setCaptureType] = useState(CAPTURE_TYPES[0].value);
  const [captureText, setCaptureText] = useState("");
  const [capturing, setCapturing] = useState(false);

  const load = useCallback(() => {
    fetch("/api/stats").then((r) => r.json()).then(setStats);
  }, []);

  useEffect(() => {
    load();
    const todayStr = toDateStr(new Date());
    fetch("/api/habit-definitions").then((r) => (r.ok ? r.json() : [])).then(setHabitDefs).catch(() => {});
    fetch(`/api/habit-values?date=${todayStr}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: HabitValue[]) => setHabitValues(Object.fromEntries(rows.map((v) => [v.habit_id, v.valeur]))))
      .catch(() => {});
    fetch("/api/abonnements").then((r) => (r.ok ? r.json() : [])).then(setSubs).catch(() => {});
    fetch("/api/courses").then((r) => (r.ok ? r.json() : [])).then((rows: unknown[]) => setCoursesCount(rows.length)).catch(() => {});
    fetch("/api/media").then((r) => (r.ok ? r.json() : [])).then((rows: unknown[]) => setMediaCount(rows.length)).catch(() => {});
    fetch("/api/notes").then((r) => (r.ok ? r.json() : [])).then((rows: unknown[]) => setNotesCount(rows.length)).catch(() => {});
    fetch("/api/insights").then((r) => (r.ok ? r.json() : { findings: [] })).then((d: { findings: unknown[] }) => setInsightsCount(d.findings?.length ?? 0)).catch(() => {});
    fetch(`/api/nutrition?date=${todayStr}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((row: { calories?: number } | null) => {
        if (row?.calories) { setNutritionKcal(row.calories); return; }
        return fetch("/api/nutrition/profile")
          .then((r) => (r.ok ? r.json() : null))
          .then((p: { cible_calories?: number } | null) => setNutritionKcal(p?.cible_calories ?? null));
      })
      .catch(() => {});
    fetch("/api/taches").then((r) => (r.ok ? r.json() : [])).then(setTaches).catch(() => {});
    fetch("/api/settings?key=apple_cal_url")
      .then((r) => r.json())
      .then((d: { value: string | null }) => {
        if (!d.value) return;
        return fetch(`/api/ical-proxy?url=${encodeURIComponent(d.value)}`)
          .then((r) => (r.ok ? r.json() : []))
          .then((events: AppleEvent[]) => setAppleEvents(Array.isArray(events) ? events : []));
      })
      .catch(() => {});
  }, [load]);

  const markDone = async (id: number) => {
    await fetch(`/api/taches/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut: "termine" }),
    });
    load();
  };

  const addTask = async () => {
    const titre = newTaskTitle.trim();
    if (!titre) return;
    setNewTaskTitle("");
    await fetch("/api/taches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titre, date_echeance: toDateStr(new Date()), priorite: "moyenne" }),
    });
    load();
  };

  const submitCapture = async () => {
    const titre = captureText.trim();
    if (!titre || capturing) return;
    setCapturing(true);
    await fetch("/api/inbox", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titre, type: captureType, priorite: "moyenne" }),
    });
    setCaptureText("");
    setCapturing(false);
    load();
  };

  const week = useMemo(weekDates, []);
  const eventsByDay = useMemo(() => {
    const map: Record<string, { tasks: string[]; apple: string[] }> = {};
    for (const t of taches) {
      if (!t.date_echeance || t.statut === "termine") continue;
      (map[t.date_echeance] ??= { tasks: [], apple: [] }).tasks.push(t.titre);
    }
    for (const e of appleEvents) {
      if (!e.date) continue;
      (map[e.date] ??= { tasks: [], apple: [] }).apple.push(e.title);
    }
    return map;
  }, [taches, appleEvents]);

  const visibleHabits = useMemo(() => {
    const hasPriority = habitDefs.some((d) => d.prioritaire);
    return (hasPriority ? habitDefs.filter((d) => d.prioritaire) : habitDefs).slice(0, 5);
  }, [habitDefs]);

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const hour = new Date().getHours();
  const greeting = hour < 6 ? "Bonsoir" : hour < 18 ? "Bonjour" : "Bonsoir";

  const habitColor =
    stats.habit_score >= 7 ? "green" : stats.habit_score >= 4 ? "yellow" : "red";
  const habitScorePillColor =
    stats.habit_score >= 7
      ? { bg: "rgba(16,185,129,0.1)", text: "#059669" }
      : stats.habit_score >= 4
      ? { bg: "rgba(245,158,11,0.1)", text: "#d97706" }
      : { bg: "rgba(239,68,68,0.1)", text: "#dc2626" };

  const dayAgenda = eventsByDay[selectedDay] ?? { tasks: [], apple: [] };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">{greeting} 👋</h1>
          <p className="text-zinc-500 mt-0.5 capitalize">{today}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openCapture}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-zinc-500 border border-zinc-800 hover:border-zinc-700 hover:text-zinc-300 transition-colors"
          >
            <Search size={14} />
            Rechercher…
            <kbd className="text-[10px] text-zinc-600 border border-zinc-700 rounded px-1">⌘K</kbd>
          </button>
          <button onClick={openCapture} className="btn-primary flex items-center gap-1.5">
            <Plus size={14} /> Nouvelle entrée
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard icon={<Inbox size={14} />} label="Inbox" value={stats.inbox_count} sub="non traités" accent={stats.inbox_count > 0 ? "violet" : "gray"} href="/inbox" />
        <StatCard icon={<CheckSquare size={14} />} label="Tâches aujourd'hui" value={stats.tasks_today.length} sub="à faire" accent="blue" href="/taches" />
        <StatCard icon={<Heart size={14} />} label="Habitudes" value={`${stats.habit_score}/10`} sub="score du jour" accent={habitColor} href="/habitudes" />
        <StatCard icon={<Dumbbell size={14} />} label="Sport" value={stats.sport_week_count} sub="séances cette semaine" accent="orange" href="/sport" />
        <StatCard icon={<CreditCard size={14} />} label="Abonnements" value={`${stats.monthly_cost.toFixed(0)}€`} sub="/mois" accent="gray" href="/abonnements" />
      </div>

      {/* Row 1: Tasks / Projects / Last session */}
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="card">
          <SectionHeader title="Tâches du jour" href="/taches" />
          {stats.tasks_today.length === 0 ? (
            <Empty text="Aucune tâche planifiée aujourd'hui ✓" />
          ) : (
            <ul className="space-y-2.5 mt-4">
              {stats.tasks_today.slice(0, 6).map((t) => (
                <li key={t.id} className="flex items-start gap-3 group">
                  <button
                    onClick={() => markDone(t.id)}
                    className="mt-0.5 shrink-0 text-zinc-600 hover:text-emerald-400 transition-colors"
                  >
                    <Circle size={14} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-200 truncate">{t.titre}</p>
                    {t.projet_titre && (
                      <p className="text-xs text-zinc-600 mt-0.5">{t.projet_titre}</p>
                    )}
                  </div>
                  <span className={`text-xs shrink-0 mt-0.5 ${PRIO_COLOR[t.priorite] || "text-zinc-500"}`}>
                    {t.priorite}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-zinc-800">
            <input
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTask()}
              placeholder="Ajouter une tâche…"
              className="input text-sm py-1.5"
            />
            <button onClick={addTask} className="btn-ghost shrink-0 p-2">
              <Plus size={15} />
            </button>
          </div>
        </div>

        <div className="card">
          <SectionHeader title="Projets actifs" href="/projets" />
          {stats.active_projects.length === 0 ? (
            <Empty text="Aucun projet en cours" />
          ) : (
            <ul className="space-y-4 mt-4">
              {stats.active_projects.slice(0, 4).map((p) => {
                const total = p.total_taches || 0;
                const done = p.taches_faites || 0;
                const pct = total === 0 ? 0 : Math.round((done / total) * 100);
                return (
                  <li key={p.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm text-zinc-200 truncate flex-1 mr-2">{p.titre}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        {p.deadline && (
                          <span className={`text-xs ${deadlineColor(p.deadline)}`}>
                            {deadlineLabel(p.deadline)}
                          </span>
                        )}
                        <span className="text-xs text-zinc-500">{pct}%</span>
                      </div>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-zinc-600 mt-1">{done}/{total} tâches</p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="card">
          <SectionHeader title="Dernière séance" href="/sport" />
          {!stats.last_session ? (
            <Empty text="Aucune séance enregistrée" />
          ) : (
            <>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-xl">{DISC_ICON[stats.last_session.discipline] || "🏋️"}</span>
                <div>
                  <p className="text-sm font-medium text-zinc-200">
                    {DISC_LABEL[stats.last_session.discipline] || stats.last_session.discipline}
                  </p>
                  <p className="text-xs text-zinc-600">{relativeDay(stats.last_session.date)}</p>
                </div>
              </div>
              <ul className="space-y-1.5 mt-3">
                {stats.last_session.exercises.slice(0, 5).map((s) => (
                  <li key={s.id} className="text-sm text-zinc-300 truncate">
                    {sessionLine(s)}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      {/* Row 2: Week / Habits / Subscriptions */}
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="card">
          <SectionHeader title="Cette semaine" href="/taches" />
          <div className="grid grid-cols-7 gap-1 mt-4">
            {week.map((d) => {
              const ds = toDateStr(d);
              const isToday = ds === toDateStr(new Date());
              const hasEvents = (eventsByDay[ds]?.tasks.length ?? 0) + (eventsByDay[ds]?.apple.length ?? 0) > 0;
              return (
                <button
                  key={ds}
                  onClick={() => setSelectedDay(ds)}
                  className="flex flex-col items-center gap-1 py-1 rounded-md transition-colors"
                  style={{ backgroundColor: selectedDay === ds ? "rgba(109,40,217,0.07)" : "transparent" }}
                >
                  <span className="text-[10px] text-zinc-600">{FR_DAYS[(d.getDay() + 6) % 7]}</span>
                  <span
                    className="text-xs w-6 h-6 flex items-center justify-center rounded-full"
                    style={{
                      backgroundColor: isToday ? "#6d28d9" : "transparent",
                      color: isToday ? "#ffffff" : "#2c2c2a",
                    }}
                  >
                    {d.getDate()}
                  </span>
                  <span
                    className="w-1 h-1 rounded-full"
                    style={{ backgroundColor: hasEvents ? "#6d28d9" : "transparent" }}
                  />
                </button>
              );
            })}
          </div>
          <div className="mt-3 pt-3 border-t border-zinc-800 space-y-1.5">
            {dayAgenda.tasks.length === 0 && dayAgenda.apple.length === 0 ? (
              <p className="text-zinc-600 text-sm py-2 text-center">Rien de prévu</p>
            ) : (
              <>
                {dayAgenda.tasks.map((t, i) => (
                  <div key={`t${i}`} className="flex items-center gap-2 text-sm text-zinc-300">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: "#6d28d9" }} />
                    <span className="truncate">{t}</span>
                  </div>
                ))}
                {dayAgenda.apple.map((t, i) => (
                  <div key={`a${i}`} className="flex items-center gap-2 text-sm text-zinc-300">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: "#3b82f6" }} />
                    <span className="truncate">{t}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        <div className="card">
          <SectionHeader title="Habitudes du jour" href="/habitudes" />
          {visibleHabits.length === 0 ? (
            <Empty text="Aucune habitude configurée" />
          ) : (
            <ul className="space-y-3 mt-4">
              {visibleHabits.map((d) => {
                const v = habitValues[d.id];
                const done = isHabitDone(d, v);
                return (
                  <li key={d.id} className="flex items-center gap-3">
                    <span className="text-sm shrink-0">{d.emoji || "•"}</span>
                    <span className="text-sm text-zinc-300 flex-1 truncate">{d.label}</span>
                    {d.type === "metric" && (
                      <span className="text-xs text-zinc-500 shrink-0">
                        {v ?? 0}{d.cible ? ` / ${d.cible}` : ""}{d.unite ? ` ${d.unite}` : ""}
                      </span>
                    )}
                    {done ? (
                      <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                    ) : (
                      <Circle size={16} className="text-zinc-700 shrink-0" />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <div
            className="mt-4 py-2 rounded-md text-center text-sm font-medium"
            style={{ backgroundColor: habitScorePillColor.bg, color: habitScorePillColor.text }}
          >
            Score du jour : {stats.habit_score}/10
          </div>
        </div>

        <div className="card">
          <SectionHeader title="Abonnements" href="/abonnements" />
          {subs.filter((s) => s.actif).length === 0 ? (
            <Empty text="Aucun abonnement actif" />
          ) : (
            <ul className="space-y-3 mt-4">
              {subs.filter((s) => s.actif).slice(0, 5).map((s) => (
                <li key={s.id} className="flex items-center gap-3">
                  <span
                    className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-semibold shrink-0"
                    style={{ backgroundColor: "rgba(109,40,217,0.1)", color: "#6d28d9" }}
                  >
                    {s.service.charAt(0).toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-200 truncate">{s.service}</p>
                    <p className="text-xs text-zinc-600">{s.cout_mensuel.toFixed(2)}€ / mois</p>
                  </div>
                  {s.jours_restants !== null && (
                    <span
                      className="text-xs shrink-0 px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: s.jours_restants <= 7 ? "rgba(239,68,68,0.1)" : "rgba(0,0,0,0.06)",
                        color: s.jours_restants <= 7 ? "#dc2626" : "#5a5a58",
                      }}
                    >
                      {s.jours_restants <= 0 ? "Expiré" : `${s.jours_restants} j`}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-zinc-800 text-sm">
            <span className="text-zinc-500">Total</span>
            <span className="font-semibold text-zinc-200">{stats.monthly_cost.toFixed(2)}€ / mois</span>
          </div>
        </div>
      </div>

      {/* Row 3: Quick collections / Quick capture */}
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="card lg:col-span-2">
          <h2 className="text-sm font-semibold text-zinc-200 mb-4">Collections rapides</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <CollectionTile icon={<ShoppingCart size={16} />} label="Courses" value={coursesCount} sub="produits" href="/courses" />
            <CollectionTile icon={<Film size={16} />} label="Médiathèque" value={mediaCount} sub="éléments" href="/media" />
            <CollectionTile icon={<BookOpen size={16} />} label="Notes" value={notesCount} sub="notes" href="/notes" />
            <CollectionTile icon={<Apple size={16} />} label="Nutrition" value={nutritionKcal ?? "—"} sub="kcal" href="/nutrition" />
            <CollectionTile icon={<Sparkles size={16} />} label="Insights" value={insightsCount} sub="analyses" href="/insights" />
            <CollectionTile icon={<ListChecks size={16} />} label="Revue guidée" value="" sub="Commencer" href="/revue" />
          </div>
        </div>

        <div className="card flex flex-col">
          <h2 className="text-sm font-semibold text-zinc-200 mb-3">Capture rapide</h2>
          <div className="flex items-center gap-1.5 mb-2">
            {CAPTURE_TYPES.map((t) => {
              const Icon = t.icon;
              const active = captureType === t.value;
              return (
                <button
                  key={t.value}
                  onClick={() => setCaptureType(t.value)}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors"
                  style={{
                    backgroundColor: active ? "rgba(109,40,217,0.1)" : "transparent",
                    color: active ? "#6d28d9" : "#7a7a78",
                  }}
                >
                  <Icon size={12} /> {t.label}
                </button>
              );
            })}
          </div>
          <div className="flex items-end gap-2 flex-1">
            <textarea
              value={captureText}
              onChange={(e) => setCaptureText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitCapture(); }
              }}
              placeholder="Notez une idée, une tâche, un lien…"
              rows={3}
              className="input text-sm flex-1 resize-none"
            />
            <button onClick={submitCapture} disabled={capturing} className="btn-primary p-2.5 shrink-0 disabled:opacity-50">
              <Send size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, accent, href }: {
  icon: React.ReactNode; label: string; value: string | number;
  sub: string; accent: string; href: string;
}) {
  const colors: Record<string, string> = {
    violet: "text-violet-400", blue: "text-blue-400",
    green: "text-emerald-400", yellow: "text-amber-400",
    red: "text-red-400", orange: "text-orange-400", gray: "text-zinc-500",
  };
  return (
    <Link href={href} className="stat-card hover:border-zinc-700 transition-colors group">
      <div className={`flex items-center gap-1.5 mb-2 ${colors[accent] || "text-zinc-500"}`}>
        {icon}
        <span className="section-label">{label}</span>
      </div>
      <p className="text-2xl font-bold text-zinc-100 group-hover:text-zinc-50">{value}</p>
      <p className="text-xs text-zinc-600 mt-0.5">{sub}</p>
    </Link>
  );
}

function CollectionTile({ icon, label, value, sub, href }: {
  icon: React.ReactNode; label: string; value: string | number; sub: string; href: string;
}) {
  return (
    <Link href={href} className="card-sm flex items-center gap-3">
      <span className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 text-violet-400" style={{ backgroundColor: "rgba(109,40,217,0.08)" }}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-sm text-zinc-200 truncate">{label}</p>
        <p className="text-xs text-zinc-600 truncate">
          {value !== "" && <span className="text-zinc-300 font-medium">{value} </span>}
          {sub}
        </p>
      </div>
    </Link>
  );
}

function SectionHeader({ title, href }: { title: string; href: string }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-sm font-semibold text-zinc-200">{title}</h2>
      <Link href={href} className="text-xs text-zinc-600 hover:text-violet-400 transition-colors flex items-center gap-0.5">
        Voir tout <ChevronRight size={11} />
      </Link>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-zinc-600 text-sm py-6 text-center">{text}</p>;
}
