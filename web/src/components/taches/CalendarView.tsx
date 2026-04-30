"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Settings, X } from "lucide-react";
import { type SharedViewProps, type Tache, PRIO_DOT } from "./types";

interface CalEvent {
  date: string;
  title: string;
  source: "task" | "apple";
  tache?: Tache;
}

const FR_DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const FR_MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

function buildCalendar(year: number, month: number): (Date | null)[][] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  // Monday = 0
  const startDow = (first.getDay() + 6) % 7;
  const days: (Date | null)[] = Array(startDow).fill(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d));
  while (days.length % 7 !== 0) days.push(null);
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

function dateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

export default function CalendarView({ taches, onAdd }: SharedViewProps & { onAdd: () => void }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [appleUrl, setAppleUrl] = useState("");
  const [appleSaved, setAppleSaved] = useState("");
  const [appleEvents, setAppleEvents] = useState<{ date: string; title: string }[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [loadingApple, setLoadingApple] = useState(false);

  const todayStr = dateStr(now);
  const weeks = buildCalendar(year, month);

  // Load saved Apple URL
  useEffect(() => {
    fetch("/api/settings?key=apple_cal_url")
      .then((r) => r.json())
      .then((d: { value: string | null }) => {
        if (d.value) { setAppleSaved(d.value); setAppleUrl(d.value); }
      });
  }, []);

  // Fetch Apple Calendar when URL is set
  useEffect(() => {
    if (!appleSaved) return;
    setLoadingApple(true);
    fetch(`/api/ical-proxy?url=${encodeURIComponent(appleSaved)}`)
      .then((r) => r.json())
      .then((events: { date: string; title: string }[]) => setAppleEvents(events))
      .catch(() => {})
      .finally(() => setLoadingApple(false));
  }, [appleSaved]);

  const saveAppleUrl = async () => {
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "apple_cal_url", value: appleUrl }),
    });
    setAppleSaved(appleUrl);
    setShowSettings(false);
  };

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };

  // Build event map by date
  const eventMap: Record<string, CalEvent[]> = {};
  taches.forEach((t) => {
    if (!t.date_echeance) return;
    const d = new Date(t.date_echeance + "T12:00:00");
    if (d.getFullYear() !== year || d.getMonth() !== month) return;
    const k = t.date_echeance;
    if (!eventMap[k]) eventMap[k] = [];
    eventMap[k].push({ date: k, title: t.titre, source: "task", tache: t });
  });
  appleEvents.forEach((e) => {
    if (!e.date) return;
    const d = new Date(e.date + "T12:00:00");
    if (d.getFullYear() !== year || d.getMonth() !== month) return;
    if (!eventMap[e.date]) eventMap[e.date] = [];
    eventMap[e.date].push({ date: e.date, title: e.title, source: "apple" });
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={prevMonth} className="btn-ghost p-2"><ChevronLeft size={15} /></button>
        <h2 className="text-base font-semibold flex-1 text-center" style={{ color: "#1a1a18" }}>
          {FR_MONTHS[month]} {year}
        </h2>
        <button onClick={nextMonth} className="btn-ghost p-2"><ChevronRight size={15} /></button>
        <button onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth()); }} className="btn-ghost text-xs">Aujourd&apos;hui</button>
        <div className="relative">
          <button onClick={() => setShowSettings((v) => !v)} className="btn-ghost p-2" title="Connecter Apple Calendar">
            <Settings size={14} style={{ color: appleSaved ? "#10b981" : "#9c9c9a" }} />
          </button>
          {showSettings && (
            <div className="absolute right-0 top-10 z-20 w-80 p-4 space-y-3 rounded-lg shadow-xl"
              style={{ backgroundColor: "#ffffff", border: "1px solid #e4e2de" }}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium" style={{ color: "#1a1a18" }}>📅 Apple Calendar</p>
                <button onClick={() => setShowSettings(false)} style={{ color: "#9c9c9a" }}><X size={14} /></button>
              </div>
              <div className="space-y-1">
                <p className="text-xs" style={{ color: "#7a7a78" }}>
                  Pour connecter : dans l&apos;app Calendrier macOS, clic droit sur un calendrier → &quot;Partager le calendrier&quot; → copie l&apos;URL de partage.
                </p>
              </div>
              <input
                value={appleUrl}
                onChange={(e) => setAppleUrl(e.target.value)}
                placeholder="https://p63-caldav.icloud.com/published/..."
                className="input text-xs"
              />
              <button onClick={saveAppleUrl} className="btn-primary w-full text-xs py-2">
                {loadingApple ? "Chargement…" : "Connecter"}
              </button>
              {appleSaved && (
                <button
                  onClick={() => { setAppleSaved(""); setAppleUrl(""); setAppleEvents([]); fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: "apple_cal_url", value: "" }) }); }}
                  className="w-full text-xs text-center" style={{ color: "#9c9c9a" }}>
                  Déconnecter
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs" style={{ color: "#9c9c9a" }}>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: "rgba(109,40,217,0.7)" }} /> Tâches
        </span>
        {appleSaved && (
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: "#3b82f6" }} /> Apple Calendar
            {loadingApple && <span className="text-[10px]">(sync…)</span>}
          </span>
        )}
      </div>

      {/* Calendar grid */}
      <div className="card p-0 overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7" style={{ borderBottom: "1px solid #e4e2de" }}>
          {FR_DAYS.map((d) => (
            <div key={d} className="py-2 text-center text-xs font-medium" style={{ color: "#9c9c9a" }}>{d}</div>
          ))}
        </div>

        {/* Weeks */}
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7" style={{ borderBottom: wi < weeks.length - 1 ? "1px solid #f0eeeb" : "none" }}>
            {week.map((day, di) => {
              const ds = day ? dateStr(day) : null;
              const isToday = ds === todayStr;
              const events = ds ? (eventMap[ds] ?? []) : [];
              const taskEvents = events.filter(e => e.source === "task");
              const appleEvts = events.filter(e => e.source === "apple");

              return (
                <div
                  key={di}
                  className="min-h-[90px] p-1.5 transition-colors"
                  style={{
                    borderRight: di < 6 ? "1px solid #f0eeeb" : "none",
                    backgroundColor: isToday ? "rgba(109,40,217,0.03)" : day ? "transparent" : "#fafaf9",
                  }}
                  onClick={() => day && onAdd()}
                >
                  {day && (
                    <>
                      <div className="flex items-center justify-center w-6 h-6 mb-1 mx-auto">
                        <span
                          className="text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full"
                          style={{
                            backgroundColor: isToday ? "#6d28d9" : "transparent",
                            color: isToday ? "#ffffff" : day.getDay() === 0 || day.getDay() === 6 ? "#b0aea9" : "#2c2c2a",
                          }}
                        >
                          {day.getDate()}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        {taskEvents.slice(0, 3).map((e, i) => (
                          <div key={i} className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] truncate"
                            style={{ backgroundColor: "rgba(109,40,217,0.1)", color: "#6d28d9" }}>
                            <div className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: PRIO_DOT[e.tache?.priorite ?? "normale"] ?? "#9ca3af" }} />
                            <span className="truncate">{e.title}</span>
                          </div>
                        ))}
                        {appleEvts.slice(0, 2).map((e, i) => (
                          <div key={`a${i}`} className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] truncate"
                            style={{ backgroundColor: "rgba(59,130,246,0.1)", color: "#3b82f6" }}>
                            <span className="truncate">{e.title}</span>
                          </div>
                        ))}
                        {events.length > 5 && (
                          <p className="text-[9px] px-1" style={{ color: "#b0aea9" }}>+{events.length - 5} autres</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
