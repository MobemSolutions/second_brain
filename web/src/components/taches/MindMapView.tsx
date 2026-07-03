"use client";

import { useMemo, useRef, useState } from "react";
import { Minus, Plus, RotateCcw, X, CalendarDays, Pencil } from "lucide-react";
import { type SharedViewProps, PRIO_DOT, PRIO_LABEL, parseContextes, today } from "./types";

type GroupBy = "contexte" | "projet" | "priorite";

const GROUP_COLORS = [
  "#6d28d9", "#2563eb", "#059669", "#d97706", "#dc2626",
  "#7c3aed", "#0284c7", "#16a34a", "#b45309", "#b91c1c",
  "#9333ea", "#0369a1", "#15803d", "#92400e", "#991b1b",
];

const cx = 520, cy = 340;
const R1 = 190; // group radius
const R2 = 340; // task radius
const SVG_W = 1040, SVG_H = 680;
const SCALE_MIN = 0.5, SCALE_MAX = 4;

function polarToCart(angle: number, r: number) {
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  return `M ${x1} ${y1} Q ${(x1 + mx) / 2} ${(y1 + my) / 2} ${mx} ${my} Q ${(mx + x2) / 2} ${(my + y2) / 2} ${x2} ${y2}`;
}

export default function MindMapView({ taches, onAdd, onEdit }: SharedViewProps & { onAdd: () => void }) {
  const [groupBy, setGroupBy] = useState<GroupBy>("contexte");
  const [hovered, setHovered] = useState<number | null>(null);
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const [dragging, setDragging] = useState(false);
  const [selected, setSelected] = useState<{ task: (typeof taches)[0]; left: number; top: number } | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; viewX: number; viewY: number } | null>(null);
  const draggedRef = useRef(false);

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

  const clampScale = (s: number) => Math.max(SCALE_MIN, Math.min(SCALE_MAX, s));

  const zoomAt = (factor: number, clientX?: number, clientY?: number) => {
    setView((v) => {
      const newScale = clampScale(v.scale * factor);
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect || clientX == null || clientY == null) return { ...v, scale: newScale };
      const svgX = ((clientX - rect.left) / rect.width) * SVG_W;
      const svgY = ((clientY - rect.top) / rect.height) * SVG_H;
      const worldX = (svgX - v.x) / v.scale;
      const worldY = (svgY - v.y) / v.scale;
      return { scale: newScale, x: svgX - worldX * newScale, y: svgY - worldY * newScale };
    });
  };

  const focusOn = (x: number, y: number, scale = 1.8) => {
    setView({ scale, x: SVG_W / 2 - x * scale, y: SVG_H / 2 - y * scale });
  };

  const resetView = () => setView({ x: 0, y: 0, scale: 1 });

  const onWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX, e.clientY);
  };

  // No setPointerCapture here: capturing the pointer on the svg redirects
  // the browser's synthesized "click" event to the capturing element too,
  // which silently ate clicks on task/group nodes. onPointerLeave below
  // covers the case where the cursor exits the canvas mid-drag instead.
  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    dragRef.current = { startX: e.clientX, startY: e.clientY, viewX: view.x, viewY: view.y };
    draggedRef.current = false;
    setDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!drag || !rect) return; // only pan while the pointer is actually held down
    const dxClient = e.clientX - drag.startX;
    const dyClient = e.clientY - drag.startY;
    if (!draggedRef.current && (Math.abs(dxClient) > 3 || Math.abs(dyClient) > 3)) {
      draggedRef.current = true;
      setSelected(null); // detail box position is stale once the canvas moves
    }
    const dx = dxClient * (SVG_W / rect.width);
    const dy = dyClient * (SVG_H / rect.height);
    setView((v) => ({ ...v, x: drag.viewX + dx, y: drag.viewY + dy }));
  };
  const onPointerUp = () => {
    dragRef.current = null; // stop panning as soon as the button is released
    setDragging(false);
  };

  // draggedRef stays true for the single click event that follows a real
  // drag (so it doesn't also open the detail box / re-focus), then resets.
  const handleTaskClick = (e: React.MouseEvent, task: (typeof taches)[0]) => {
    e.stopPropagation();
    if (draggedRef.current) { draggedRef.current = false; return; }
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setSelected({ task, left: e.clientX - rect.left, top: e.clientY - rect.top });
  };
  const handleGroupClick = (e: React.MouseEvent, x: number, y: number) => {
    e.stopPropagation();
    if (draggedRef.current) { draggedRef.current = false; return; }
    setSelected(null);
    focusOn(x, y);
  };

  return (
    <div className="space-y-4 relative" ref={containerRef} onClick={() => setSelected(null)}>
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
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
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button onClick={() => zoomAt(1 / 1.2)} className="btn-ghost p-1.5" title="Zoom arrière"><Minus size={13} /></button>
            <span className="text-xs w-11 text-center" style={{ color: "#9c9c9a" }}>{Math.round(view.scale * 100)}%</span>
            <button onClick={() => zoomAt(1.2)} className="btn-ghost p-1.5" title="Zoom avant"><Plus size={13} /></button>
            <button onClick={resetView} className="btn-ghost p-1.5" title="Réinitialiser la vue"><RotateCcw size={13} /></button>
          </div>
          <span className="text-[11px] hidden sm:inline" style={{ color: "#b0aea9" }}>Molette pour zoomer · glisser pour déplacer</span>
          <span className="text-xs" style={{ color: "#b0aea9" }}>{totalActive} tâches actives</span>
        </div>
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
          <svg
            ref={svgRef}
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            className="w-full touch-none"
            style={{ maxHeight: "600px", cursor: dragging ? "grabbing" : "grab", userSelect: "none", WebkitUserSelect: "none" }}
            onWheel={onWheel}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          >
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e4e2de" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width={SVG_W} height={SVG_H} fill="url(#grid)" opacity="0.4" />

            <g transform={`translate(${view.x} ${view.y}) scale(${view.scale})`}>
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
                const isSelected = selected?.task.id === task.id;
                const isOverdue = task.date_echeance && task.date_echeance < today();
                const r = task.priorite === "haute" ? 7 : task.priorite === "moyenne" ? 5.5 : 4.5;

                return (
                  <g key={`t-${task.id}`} style={{ cursor: "pointer" }}
                    onMouseEnter={() => setHovered(task.id)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={(e) => handleTaskClick(e, task)}
                  >
                    <circle cx={x} cy={y} r={isH || isSelected ? r * 1.5 : r}
                      fill={color} opacity={isH || isSelected ? 1 : 0.7}
                      style={{ transition: "r 0.1s, opacity 0.1s" }} />

                    {/* Selected ring — click a node to open its detail box */}
                    {isSelected && (
                      <circle cx={x} cy={y} r={r * 1.5 + 3} fill="none" stroke="#6d28d9" strokeWidth="1.5" opacity="0.7" />
                    )}

                    {/* Overdue ring */}
                    {isOverdue && (
                      <circle cx={x} cy={y} r={r + 3} fill="none" stroke="#ef4444" strokeWidth="1.5" opacity="0.6"
                        strokeDasharray="3 2" />
                    )}

                    {/* Priority dot */}
                    <circle cx={x + r * 0.6} cy={y - r * 0.6} r={2}
                      fill={PRIO_DOT[task.priorite] ?? "#9ca3af"} opacity="0.9" />
                  </g>
                );
              })}

              {/* Group nodes */}
              {groupNodes.map(({ key, x, y, color, tasks }) => (
                <g key={`g-${key}`} style={{ cursor: "pointer" }}
                  onClick={(e) => handleGroupClick(e, x, y)}
                >
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
            </g>
          </svg>
        )}
      </div>

      {/* Task detail box — opens on click, shows the full title (no more
          truncated "…" inline labels) plus context/priority/date/notes. */}
      {selected && (() => {
        const t = selected.task;
        const overdue = t.date_echeance && t.date_echeance < today();
        const boxW = 260;
        const containerW = containerRef.current?.clientWidth ?? boxW + 16;
        const left = Math.min(Math.max(8, selected.left - boxW / 2), Math.max(8, containerW - boxW - 8));
        const top = selected.top + 14;
        return (
          <div
            className="absolute z-20 rounded-lg p-3 space-y-2"
            style={{ left, top, width: boxW, backgroundColor: "#ffffff", border: "1px solid #e4e2de", boxShadow: "0 10px 28px rgba(0,0,0,0.18)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium leading-snug flex-1" style={{ color: "#1a1a18" }}>{t.titre}</p>
              <button onClick={() => setSelected(null)} style={{ color: "#b0aea9" }} className="shrink-0"><X size={14} /></button>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] px-1.5 py-0.5 rounded flex items-center gap-1" style={{ backgroundColor: "#f0eeed", color: "#5a5a58" }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: PRIO_DOT[t.priorite] ?? "#9ca3af" }} />
                {PRIO_LABEL[t.priorite] ?? t.priorite}
              </span>
              {t.projet_titre && <span className="badge badge-violet text-[10px]">{t.projet_titre}</span>}
              {t.date_echeance && (
                <span className="text-[11px] flex items-center gap-1" style={{ color: overdue ? "#ef4444" : "#7a7a78" }}>
                  <CalendarDays size={11} />
                  {new Date(t.date_echeance + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                </span>
              )}
            </div>

            {parseContextes(t.contexte).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {parseContextes(t.contexte).map((c) => (
                  <span key={c} className="text-[11px] px-1.5 py-0.5 rounded" style={{ backgroundColor: "#f0eeed", color: "#7a7a78" }}>{c}</span>
                ))}
              </div>
            )}

            {t.notes && (
              <p className="text-xs leading-snug" style={{ color: "#7a7a78" }}>{t.notes}</p>
            )}

            <button
              onClick={() => { onEdit(t); setSelected(null); }}
              className="btn-primary text-xs py-1.5 w-full flex items-center justify-center gap-1.5"
            >
              <Pencil size={12} /> Modifier
            </button>
          </div>
        );
      })()}

      {/* Legend */}
      {groupNodes.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {groupNodes.map(({ key, x, y, color, tasks }) => (
            <button key={key} onClick={() => focusOn(x, y)}
              className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border"
              style={{ borderColor: color + "40", backgroundColor: color + "08" }}>
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span style={{ color: "#5a5a58" }}>{key}</span>
              <span className="font-medium" style={{ color }}>{tasks.length}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
