"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { type SharedViewProps, PRIO_BORDER, isOverdue } from "./types";

const ZOOM_DAYS = { semaine: 21, mois: 60, trimestre: 90 } as const;
type Zoom = keyof typeof ZOOM_DAYS;

function addDays(base: Date, n: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function formatHeader(d: Date, zoom: Zoom): string {
  if (zoom === "semaine") return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" });
  if (zoom === "mois") return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export default function GanttView({ taches, onAdd }: SharedViewProps & { onAdd: () => void }) {
  const [zoom, setZoom] = useState<Zoom>("mois");
  const [offset, setOffset] = useState(0);

  const totalDays = ZOOM_DAYS[zoom];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const windowStart = addDays(today, offset);
  const windowEnd = addDays(windowStart, totalDays);

  const headerStep = zoom === "semaine" ? 1 : zoom === "mois" ? 7 : 14;
  const headerDates: Date[] = [];
  for (let d = 0; d < totalDays; d += headerStep) {
    headerDates.push(addDays(windowStart, d));
  }

  // Tasks with at least one date
  const scheduled = taches.filter((t) => t.date_echeance || t.date_debut);
  const unscheduled = taches.filter((t) => !t.date_echeance && !t.date_debut && t.statut !== "termine");

  const rows = useMemo(() => {
    return scheduled.map((t) => {
      const start = t.date_debut
        ? new Date(t.date_debut + "T12:00:00")
        : t.date_echeance
          ? new Date(t.date_echeance + "T12:00:00")
          : today;
      const end = t.date_echeance
        ? new Date(t.date_echeance + "T12:00:00")
        : start;

      const isMilestone = !t.date_debut || daysBetween(start, end) === 0;
      const startOffset = Math.max(0, daysBetween(windowStart, start));
      const endOffset = Math.min(totalDays, daysBetween(windowStart, end) + 1);
      const left = (startOffset / totalDays) * 100;
      const width = Math.max(0.5, ((endOffset - startOffset) / totalDays) * 100);
      const isVisible = endOffset > 0 && startOffset < totalDays;

      return { t, start, end, isMilestone, left, width, isVisible };
    });
  }, [scheduled, windowStart, totalDays]); // eslint-disable-line react-hooks/exhaustive-deps

  const todayLeft = (daysBetween(windowStart, today) / totalDays) * 100;
  const showTodayLine = todayLeft >= 0 && todayLeft <= 100;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: "#f0eeeb" }}>
          {(["semaine", "mois", "trimestre"] as Zoom[]).map((z) => (
            <button key={z} onClick={() => { setZoom(z); setOffset(0); }}
              className="px-3 py-1.5 text-xs font-medium rounded-md transition-all capitalize"
              style={{ backgroundColor: zoom === z ? "#ffffff" : "transparent", color: zoom === z ? "#1a1a18" : "#9c9c9a", boxShadow: zoom === z ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}>
              {z}
            </button>
          ))}
        </div>
        <button onClick={() => setOffset((o) => o - totalDays)} className="btn-ghost p-2"><ChevronLeft size={14} /></button>
        <button onClick={() => setOffset(0)} className="btn-ghost text-xs">Aujourd&apos;hui</button>
        <button onClick={() => setOffset((o) => o + totalDays)} className="btn-ghost p-2"><ChevronRight size={14} /></button>
        <span className="text-xs ml-auto" style={{ color: "#9c9c9a" }}>
          {windowStart.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} → {windowEnd.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
        </span>
      </div>

      {/* Chart */}
      <div className="card p-0 overflow-hidden">
        {/* Timeline header */}
        <div className="flex" style={{ borderBottom: "1px solid #e4e2de", backgroundColor: "#fafaf9" }}>
          <div className="shrink-0 w-48 px-3 py-2 text-xs font-medium" style={{ color: "#9c9c9a", borderRight: "1px solid #e4e2de" }}>Tâche</div>
          <div className="flex-1 relative h-8">
            {headerDates.map((d, i) => {
              const left = (daysBetween(windowStart, d) / totalDays) * 100;
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
              return (
                <div key={i} className="absolute h-full flex items-center" style={{ left: `${left}%` }}>
                  <span className="text-[10px] px-1" style={{ color: isWeekend ? "#c8c6c2" : "#9c9c9a", whiteSpace: "nowrap" }}>
                    {formatHeader(d, zoom)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rows */}
        <div className="divide-y" style={{ borderColor: "#f0eeeb" }}>
          {rows.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <p className="text-sm mb-2" style={{ color: "#9c9c9a" }}>Aucune tâche avec une date</p>
                <button onClick={onAdd} className="btn-primary text-xs">Créer une tâche</button>
              </div>
            </div>
          )}

          {rows.map(({ t, isMilestone, left, width, isVisible }) => {
            const overdue = isOverdue(t);
            const isDone = t.statut === "termine";
            const barColor = isDone ? "#059669" : overdue ? "#ef4444" : PRIO_BORDER[t.priorite] || "#7c3aed";

            return (
              <div key={t.id} className="flex items-center group hover:bg-[#fafaf9] transition-colors" style={{ minHeight: "40px" }}>
                {/* Label */}
                <div className="shrink-0 w-48 px-3 py-2 flex items-center gap-2" style={{ borderRight: "1px solid #f0eeeb" }}>
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: barColor }} />
                  <span className="text-xs truncate" style={{ color: isDone ? "#b0aea9" : "#2c2c2a", textDecoration: isDone ? "line-through" : "none" }}>
                    {t.titre}
                  </span>
                </div>

                {/* Bar area */}
                <div className="flex-1 relative h-10">
                  {/* Weekend shading */}
                  {headerDates.filter(d => d.getDay() === 0 || d.getDay() === 6).map((d, i) => (
                    <div key={i} className="absolute inset-y-0" style={{ left: `${(daysBetween(windowStart, d) / totalDays) * 100}%`, width: `${(headerStep / totalDays) * 100}%`, backgroundColor: "rgba(0,0,0,0.02)" }} />
                  ))}

                  {/* Today line */}
                  {showTodayLine && (
                    <div className="absolute inset-y-0 w-px z-10" style={{ left: `${todayLeft}%`, backgroundColor: "rgba(109,40,217,0.3)" }} />
                  )}

                  {/* Bar */}
                  {isVisible && (
                    isMilestone ? (
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rotate-45 rounded-sm z-10"
                        style={{ left: `calc(${left}% - 6px)`, backgroundColor: barColor }}
                        title={t.titre}
                      />
                    ) : (
                      <div
                        className="absolute top-1/2 -translate-y-1/2 h-5 rounded flex items-center px-2 z-10"
                        style={{ left: `${left}%`, width: `${width}%`, backgroundColor: barColor + "25", border: `1px solid ${barColor}50`, minWidth: "4px" }}
                        title={t.titre}
                      >
                        <span className="text-[10px] truncate font-medium" style={{ color: barColor }}>{width > 8 ? t.titre : ""}</span>
                      </div>
                    )
                  )}

                  {/* Out of range indicator */}
                  {!isVisible && left < 0 && (
                    <div className="absolute left-1 top-1/2 -translate-y-1/2 text-[10px]" style={{ color: "#c8c6c2" }}>←</div>
                  )}
                  {!isVisible && left >= 100 && (
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px]" style={{ color: "#c8c6c2" }}>→</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Unscheduled */}
      {unscheduled.length > 0 && (
        <div className="card p-3">
          <p className="section-label mb-2">Sans date ({unscheduled.length})</p>
          <div className="flex flex-wrap gap-2">
            {unscheduled.map((t) => (
              <span key={t.id} className="text-xs px-2.5 py-1 rounded border" style={{ borderColor: "#e4e2de", color: "#7a7a78" }}>{t.titre}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
