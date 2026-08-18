"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { RoutineZone } from "@/data/looksmaxing";
import RoutineZonePanel from "./RoutineZonePanel";

interface RoutineImageStageProps {
  imageSrc: string;
  imageAlt: string;
  aspectRatio: number;
  zones: RoutineZone[];
  activeZoneId: string | null;
  onZoneClick: (id: string) => void;
}

interface Geom {
  side: "left" | "right";
  top: number;
  panelLeft: number;
  line: { x1: number; y1: number; x2: number; y2: number };
}

// Rail layout only kicks in at lg+ — below that, the outer box has no room
// reserved for side rails (see className below) and we fall back to an
// inline panel under the image instead.
const RAIL_WIDTH = 320;
const PANEL_WIDTH = 296;
const PANEL_MAX_HEIGHT = 420;
const PAD = 12;

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

export default function RoutineImageStage({
  imageSrc,
  imageAlt,
  aspectRatio,
  zones,
  activeZoneId,
  onZoneClick,
}: RoutineImageStageProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [geom, setGeom] = useState<Geom | null>(null);

  const activeZone = zones.find((z) => z.id === activeZoneId) ?? null;

  useLayoutEffect(() => {
    if (!activeZone) {
      setGeom(null);
      return;
    }

    const recompute = () => {
      const outer = outerRef.current;
      const btn = buttonRefs.current[activeZone.id];
      if (!outer || !btn) return;

      const outerRect = outer.getBoundingClientRect();
      const btnRect = btn.getBoundingClientRect();

      const hx = btnRect.left + btnRect.width / 2 - outerRect.left;
      const hy = btnRect.top + btnRect.height / 2 - outerRect.top;

      const side: "left" | "right" = activeZone.x < 50 ? "left" : "right";
      const panelLeft = side === "left" ? PAD : outerRect.width - RAIL_WIDTH + PAD;

      const top = clamp(
        hy - PANEL_MAX_HEIGHT / 2,
        PAD,
        Math.max(PAD, outerRect.height - PANEL_MAX_HEIGHT - PAD),
      );

      const lineX2 = side === "left" ? panelLeft + PANEL_WIDTH : panelLeft;
      const lineY2 = clamp(hy, top + 16, top + PANEL_MAX_HEIGHT - 16);

      setGeom({ side, top, panelLeft, line: { x1: hx, y1: hy, x2: lineX2, y2: lineY2 } });
    };

    recompute();
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, [activeZone]);

  return (
    <div
      ref={outerRef}
      className="relative mx-auto w-full max-w-[440px] lg:max-w-[1160px]"
    >
      <div
        className="relative mx-auto w-full max-w-[440px] lg:max-w-[520px]"
        style={{ aspectRatio: String(aspectRatio) }}
      >
        <img
          src={imageSrc}
          alt={imageAlt}
          draggable={false}
          className="w-full h-full object-contain pointer-events-none select-none"
        />

        {zones.map((zone) => {
          const isActive = activeZoneId === zone.id;
          return (
            <button
              key={zone.id}
              ref={(el) => {
                buttonRefs.current[zone.id] = el;
              }}
              type="button"
              aria-label={zone.label}
              aria-pressed={isActive}
              onClick={() => onZoneClick(zone.id)}
              className="absolute flex flex-col items-center gap-1 cursor-pointer"
              style={{ left: `${zone.x}%`, top: `${zone.y}%`, transform: "translate(-50%, -50%)" }}
            >
              <span
                className="rounded-full transition-all"
                style={{
                  width: isActive ? 12 : 9,
                  height: isActive ? 12 : 9,
                  backgroundColor: isActive ? "#6d28d9" : zone.empty ? "transparent" : "#ffffff",
                  border: `2px ${zone.empty ? "dashed" : "solid"} #6d28d9`,
                  boxShadow: isActive ? "0 0 0 4px rgba(109,40,217,0.15)" : "0 1px 2px rgba(0,0,0,0.15)",
                }}
              />
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded whitespace-nowrap"
                style={{
                  backgroundColor: isActive ? "#6d28d9" : "rgba(255,255,255,0.9)",
                  color: isActive ? "#ffffff" : zone.empty ? "#b0aea9" : "#1a1a18",
                  border: isActive ? "none" : "1px solid #e4e2de",
                }}
              >
                {zone.label}
              </span>
            </button>
          );
        })}
      </div>

      {activeZone && geom && (
        <div className="hidden lg:block">
          <svg
            className="absolute inset-0 w-full h-full"
            style={{ overflow: "visible", pointerEvents: "none" }}
          >
            <line
              x1={geom.line.x1}
              y1={geom.line.y1}
              x2={geom.line.x2}
              y2={geom.line.y2}
              stroke="#6d28d9"
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
            <circle cx={geom.line.x1} cy={geom.line.y1} r={3} fill="#6d28d9" />
          </svg>
          <div
            className="card absolute z-20"
            style={{
              top: geom.top,
              left: geom.panelLeft,
              width: PANEL_WIDTH,
              maxHeight: PANEL_MAX_HEIGHT,
              overflowY: "auto",
            }}
          >
            <RoutineZonePanel zone={activeZone} onClose={() => onZoneClick(activeZone.id)} />
          </div>
        </div>
      )}

      {activeZone && (
        <div className="mt-3 lg:hidden">
          <div className="card">
            <RoutineZonePanel zone={activeZone} onClose={() => onZoneClick(activeZone.id)} />
          </div>
        </div>
      )}
    </div>
  );
}
