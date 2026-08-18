"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { FACE_ZONES, BODY_ZONES } from "@/data/looksmaxing";
import RoutineImageStage from "./RoutineImageStage";

const IMAGES = [
  {
    key: "face",
    label: "Visage & cheveux",
    src: "/visage_cheveux_gros_plan.svg",
    aspectRatio: 1254 / 1254,
    zones: FACE_ZONES,
  },
  {
    key: "body",
    label: "Corps entier",
    src: "/corps_entier_vue_face_minimaliste.svg",
    aspectRatio: 1024 / 1536,
    zones: BODY_ZONES,
  },
] as const;

export default function RoutineSchema() {
  const [imageIndex, setImageIndex] = useState(0);
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const current = IMAGES[imageIndex];

  useEffect(() => {
    setActiveZoneId(null);
  }, [imageIndex]);

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setActiveZoneId(null);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveZoneId(null);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const toggleZone = (id: string) => setActiveZoneId((cur) => (cur === id ? null : id));
  const go = (dir: 1 | -1) => setImageIndex((i) => (i + dir + IMAGES.length) % IMAGES.length);

  return (
    <div ref={wrapperRef}>
      <div className="flex items-center justify-center gap-3 mb-4">
        <button
          onClick={() => go(-1)}
          aria-label="Schéma précédent"
          className="btn-ghost p-1.5 rounded-full"
        >
          <ChevronLeft size={18} />
        </button>
        <p className="text-sm font-medium w-44 text-center" style={{ color: "#1a1a18" }}>
          {current.label}
        </p>
        <button
          onClick={() => go(1)}
          aria-label="Schéma suivant"
          className="btn-ghost p-1.5 rounded-full"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <RoutineImageStage
        key={current.key}
        imageSrc={current.src}
        imageAlt={current.label}
        aspectRatio={current.aspectRatio}
        zones={current.zones}
        activeZoneId={activeZoneId}
        onZoneClick={toggleZone}
      />
    </div>
  );
}
