"use client";

import { useMemo, useState } from "react";
import { type SharedViewProps, PRIO_DOT, today } from "./types";

type GroupBy = "contexte" | "projet" | "priorite";

const GROUP_COLORS = [
  "#6d28d9", "#2563eb", "#059669", "#d97706", "#dc2626",
  "#7c3aed", "#0284c7", "#16a34a", "#b45309", "#b91c1c",
  "#9333ea", "#0369a1", "#15803d", "#92400e", "#991b1b",
];

const cx = 520, cy = 340;
const R1 = 190; // group radius
const R2 = 340; // task radius

function polarToCart(angle: number, r: number) {
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  return `M ${x1} ${y1} Q ${(x1 + mx) / 2} ${(y1 + my) / 2} ${mx} ${my} Q ${(mx + x2) / 2} ${(my + y2) / 2} ${x2} ${y2}`;
}

export default function MindMapView({ taches, projets, onAdd }: SharedViewProps & { onAdd: () => void }) {
  const [groupBy, setGroupBy] = useState<GroupBy>("contexte");
  const [hovered, setHovered] = useState<number | null>(null);

  const groups = useMemo(() => {
    const map: Record<string, typeof taches> = {};
    taches.filter((t) => t.statut !== "termine").forEach((t) => {
      let key: string;
      if (groupBy === "contexte") key = t.contexte || "Sans contexte";
      else if (groupBy === "projet") key = t.projet_titre || "Sans projet";
      else key = { haute: "🔴 Haute", moyenne: "🟡 Moyenne", basse: "⚪ Basse" }[t.priorite] ?? "Normal";
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return Object.entries(map).sort((a, b) => b[1].length - a[1].length);
  }, [taches, groupBy]);

  const nodes = useMemo(() => {
    const groupNodes: { key: string; x: number; y: number; angle: number; color: string; tasks: typeof taches }[] = [];
    const taskNodes: { task: (typeof taches)[0]; x: number; y: number; gx: number; gy: number; color: string }[] = [];

    const n = groups.length;
    if (n === 0) return { groupNodes, taskNodes };

    groups.forEach(([key, tasks], gi) => {
      const angle = (gi / n) * 2 * Math.PI - Math.PI / 2;
      const gPos = polarToCart(angle, R1);
      const color = GROUP_COLORS[gi % GROUP_COLORS.length];
      groupNodes.push({ key, x: gPos.x, y: gPos.y, angle, color, tasks });

      const m = tasks.length;
      tasks.forEach((t, ti) => {
        const spread = Math.min(0.6, (m * 0.12));
        const taskAngle = angle + (ti - (m - 1) / 2) * (m > 1 ? spread / (m - 1) : 0);
        const tPos = polarToCart(taskAngle, R2);
        taskNodes.push({ task: t, x: tPos.x, y: tPos.y, gx: gPos.x, gy: gPos.y, color });
      });
    });

    return { groupNodes, taskNodes };
  }, [groups]);

  const { groupNodes, taskNodes } = nodes;
  const totalActive = taches.filter((t) => t.statut !== "termine").length;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-2">
        <span className="text-xs" style={{ color: "#9c9c9a" }}>Grouper par</span>
        <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: "#f0eeeb" }}>
          {([["contexte", "Contexte"], ["projet", "Projet"], ["priorite", "Priorité"]] as [GroupBy, string][]).map(([v, l]) => (
            <button key={v} onClick={() => setGroupBy(v)}
              className="px-3 py-1.5 text-xs font-medium rounded-md transition-all"
              style={{ backgroundColor: groupBy === v ? "#ffffff" : "transparent", color: groupBy === v ? "#1a1a18" : "#9c9c9a", boxShadow: groupBy === v ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}>
              {l}
            </button>
          ))}
        </div>
        <span className="text-xs ml-auto" style={{ color: "#b0aea9" }}>{totalActive} tâches actives</span>
      </div>

      {/* SVG mind map */}
      <div className="card p-0 overflow-hidden" style={{ backgroundColor: "#fafaf9" }}>
        {totalActive === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <p className="text-4xl">🎉</p>
            <p className="text-sm" style={{ color: "#9c9c9a" }}>Toutes les tâches sont terminées !</p>
            <button onClick={onAdd} className="btn-primary text-sm">Ajouter une tâche</button>
          </div>
        ) : (
          <svg viewBox="0 0 1040 680" className="w-full" style={{ maxHeight: "600px" }}>
            {/* Background subtle grid */}
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e4e2de" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="1040" height="680" fill="url(#grid)" opacity="0.4" />

            {/* Center → group edges */}
            {groupNodes.map(({ key, x, y, color }) => (
              <path key={`cg-${key}`} d={cubicBezier(cx, cy, x, y)}
                fill="none" stroke={color} strokeWidth="1.5" opacity="0.25" />
            ))}

            {/* Group → task edges */}
            {taskNodes.map(({ task, x, y, gx, gy, color }) => (
              <path key={`gt-${task.id}`} d={cubicBezier(gx, gy, x, y)}
                fill="none" stroke={color} strokeWidth="1"
                opacity={hovered === task.id ? 0.8 : 0.2} />
            ))}

            {/* Task nodes */}
            {taskNodes.map(({ task, x, y, color }) => {
              const isH = hovered === task.id;
              const isOverdue = task.date_echeance && task.date_echeance < today();
              const r = task.priorite === "haute" ? 7 : task.priorite === "moyenne" ? 5.5 : 4.5;
              const labelW = Math.min(100, task.titre.length * 5.5);

              return (
                <g key={`t-${task.id}`} style={{ cursor: "pointer" }}
                  onMouseEnter={() => setHovered(task.id)}
                  onMouseLeave={() => setHovered(null)}>
                  {/* Hover tooltip bg */}
                  {isH && (
                    <rect x={x - labelW / 2 - 6} y={y + r + 4} width={labelW + 12} height={20} rx="4"
                      fill="#1a1a18" opacity="0.85" />
                  )}

                  <circle cx={x} cy={y} r={isH ? r * 1.5 : r}
                    fill={color} opacity={isH ? 1 : 0.7}
                    style={{ transition: "r 0.1s, opacity 0.1s" }} />

                  {/* Overdue ring */}
                  {isOverdue && (
                    <circle cx={x} cy={y} r={r + 3} fill="none" stroke="#ef4444" strokeWidth="1.5" opacity="0.6"
                      strokeDasharray="3 2" />
                  )}

                  {/* Priority dot */}
                  <circle cx={x + r * 0.6} cy={y - r * 0.6} r={2}
                    fill={PRIO_DOT[task.priorite] ?? "#9ca3af"} opacity="0.9" />

                  {/* Hover label */}
                  {isH && (
                    <text x={x} y={y + r + 18} textAnchor="middle" fontSize="10" fill="#ffffff" fontWeight="500">
                      {task.titre.length > 18 ? task.titre.slice(0, 17) + "…" : task.titre}
                    </text>
                  )}

                  {/* Static short label for big nodes */}
                  {!isH && task.priorite === "haute" && (
                    <text x={x} y={y + r + 12} textAnchor="middle" fontSize="9" fill="#7a7a78">
                      {task.titre.length > 12 ? task.titre.slice(0, 11) + "…" : task.titre}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Group nodes */}
            {groupNodes.map(({ key, x, y, color, tasks }) => (
              <g key={`g-${key}`}>
                <circle cx={x} cy={y} r={20} fill={color} opacity="0.12" />
                <circle cx={x} cy={y} r={14} fill={color} opacity="0.2" />
                <text x={x} y={y - 24} textAnchor="middle" fontSize="11" fontWeight="600" fill={color}>
                  {key.length > 14 ? key.slice(0, 13) + "…" : key}
                </text>
                <text x={x} y={y + 4} textAnchor="middle" fontSize="9" fill={color} opacity="0.8">
                  {tasks.length}
                </text>
              </g>
            ))}

            {/* Center node */}
            <circle cx={cx} cy={cy} r={36} fill="rgba(109,40,217,0.08)" stroke="rgba(109,40,217,0.25)" strokeWidth="1.5" />
            <circle cx={cx} cy={cy} r={26} fill="rgba(109,40,217,0.12)" />
            <text x={cx} y={cy - 6} textAnchor="middle" fontSize="12" fontWeight="700" fill="#6d28d9">Tâches</text>
            <text x={cx} y={cy + 10} textAnchor="middle" fontSize="10" fill="#9c9c9a">{totalActive} actives</text>
          </svg>
        )}
      </div>

      {/* Legend */}
      {groupNodes.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {groupNodes.map(({ key, color, tasks }) => (
            <div key={key} className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border"
              style={{ borderColor: color + "40", backgroundColor: color + "08" }}>
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span style={{ color: "#5a5a58" }}>{key}</span>
              <span className="font-medium" style={{ color }}>{tasks.length}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
