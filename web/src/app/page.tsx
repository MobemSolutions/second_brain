"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Inbox,
  CheckSquare,
  Heart,
  CreditCard,
  Circle,
  ChevronRight,
  AlertCircle,
} from "lucide-react";

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
interface Sport {
  id: number;
  discipline: string;
  date: string;
  duree?: number;
  groupe_musculaire?: string;
  distance?: number;
  sommet?: string;
}
interface Sub {
  id: number;
  service: string;
  jours_restants: number;
  prix: number;
  frequence: string;
}
interface Stats {
  tasks_today: Task[];
  active_projects: Project[];
  habit_score: number;
  monthly_cost: number;
  sub_alerts: Sub[];
  recent_sport: Sport[];
  inbox_count: number;
}

const DISC_ICON: Record<string, string> = {
  musculation: "💪",
  running: "🏃",
  escalade: "🧗",
  alpinisme: "🏔️",
};

const PRIO_COLOR: Record<string, string> = {
  haute: "text-red-400",
  critique: "text-red-400",
  moyenne: "text-amber-400",
  basse: "text-zinc-500",
  normal: "text-zinc-500",
};

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

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  const load = useCallback(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const markDone = async (id: number) => {
    await fetch(`/api/taches/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut: "termine" }),
    });
    load();
  };

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

  const habitColor =
    stats.habit_score >= 7
      ? "green"
      : stats.habit_score >= 4
      ? "yellow"
      : "red";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">Bonjour 👋</h1>
        <p className="text-zinc-500 mt-0.5 capitalize">{today}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<Inbox size={14} />} label="Inbox" value={stats.inbox_count} sub="non traités" accent={stats.inbox_count > 0 ? "violet" : "gray"} href="/inbox" />
        <StatCard icon={<CheckSquare size={14} />} label="Aujourd'hui" value={stats.tasks_today.length} sub="tâches" accent="blue" href="/projets" />
        <StatCard icon={<Heart size={14} />} label="Habitudes" value={`${stats.habit_score}/10`} sub="score du jour" accent={habitColor} href="/habitudes" />
        <StatCard icon={<CreditCard size={14} />} label="Abonnements" value={`${stats.monthly_cost.toFixed(0)}€`} sub="/mois" accent="gray" href="/abonnements" />
      </div>

      {/* Grid */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Tasks today */}
        <div className="card">
          <SectionHeader title="Tâches du jour" href="/projets" />
          {stats.tasks_today.length === 0 ? (
            <Empty text="Aucune tâche planifiée aujourd'hui ✓" />
          ) : (
            <ul className="space-y-2.5 mt-4">
              {stats.tasks_today.slice(0, 7).map((t) => (
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
        </div>

        {/* Active projects */}
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

        {/* Recent sport */}
        <div className="card">
          <SectionHeader title="Dernières séances" href="/sport" />
          {stats.recent_sport.length === 0 ? (
            <Empty text="Aucune séance enregistrée" />
          ) : (
            <ul className="space-y-3 mt-4">
              {stats.recent_sport.map((s) => (
                <li key={s.id} className="flex items-center gap-3">
                  <span className="text-xl">{DISC_ICON[s.discipline] || "🏃"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-200 capitalize">
                      {s.discipline}
                      {s.groupe_musculaire && ` · ${s.groupe_musculaire}`}
                      {s.distance && ` · ${s.distance} km`}
                      {s.sommet && ` · ${s.sommet}`}
                    </p>
                    <p className="text-xs text-zinc-600">
                      {new Date(s.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                      {s.duree && ` · ${s.duree} min`}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Sub alerts */}
        <div className="card">
          <SectionHeader title="Abonnements à renouveler" href="/abonnements" />
          {stats.sub_alerts.length === 0 ? (
            <Empty text="Aucune alerte — tout est OK ✓" />
          ) : (
            <ul className="space-y-3 mt-4">
              {stats.sub_alerts.map((s) => {
                const coutM =
                  s.frequence === "mensuel"
                    ? s.prix
                    : s.frequence === "trimestriel"
                    ? s.prix / 3
                    : s.prix / 12;
                return (
                  <li key={s.id} className="flex items-center gap-3">
                    <AlertCircle
                      size={14}
                      className={s.jours_restants <= 7 ? "text-red-400" : "text-amber-400"}
                    />
                    <div className="flex-1">
                      <p className="text-sm text-zinc-200">{s.service}</p>
                      <p className="text-xs text-zinc-500">
                        {s.jours_restants <= 0 ? "Expiré" : `dans ${s.jours_restants}j`}
                      </p>
                    </div>
                    <span className="text-xs text-zinc-400">{coutM.toFixed(0)}€/m</span>
                  </li>
                );
              })}
            </ul>
          )}
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
    red: "text-red-400", gray: "text-zinc-500",
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
