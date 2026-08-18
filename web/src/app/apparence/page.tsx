"use client";

import RoutineSchema from "@/components/RoutineSchema";

export default function ApparencePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: "#1a1a18" }}>
          Apparence
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "#7a7a78" }}>
          Clique sur un point du schéma pour afficher la routine associée.
        </p>
      </div>
      <RoutineSchema />
    </div>
  );
}
