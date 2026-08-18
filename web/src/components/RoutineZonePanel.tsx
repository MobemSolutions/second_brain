"use client";

import { X } from "lucide-react";
import type { RoutineZone } from "@/data/looksmaxing";
import RoutineBlockRenderer from "./RoutineBlockRenderer";

export default function RoutineZonePanel({ zone, onClose }: { zone: RoutineZone; onClose: () => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3 sticky top-0 pb-2" style={{ backgroundColor: "#ffffff" }}>
        <p className="text-sm font-semibold" style={{ color: "#1a1a18" }}>
          {zone.label}
        </p>
        <button
          onClick={onClose}
          aria-label="Fermer"
          className="p-1 rounded-md shrink-0"
          style={{ color: "#9c9c9a" }}
        >
          <X size={15} />
        </button>
      </div>
      <RoutineBlockRenderer blocks={zone.blocks} />
    </div>
  );
}
