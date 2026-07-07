"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import Sparkline from "@/components/Sparkline";

interface Finding { label: string; detail: string; }
interface Series { dates: string[]; sommeil: number[]; humeur: number[]; energie: number[]; }
interface InsightsResponse { findings: Finding[]; series: Series; sampleSize: number; }

export default function InsightsPage() {
  const [data, setData] = useState<InsightsResponse | null>(null);

  useEffect(() => {
    fetch("/api/insights").then((r) => r.json()).then(setData);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">Insights</h1>
        <p className="text-zinc-500 text-sm mt-0.5">
          Corrélations détectées automatiquement entre tes habitudes, ton sommeil et ton énergie.
        </p>
      </div>

      {!data ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="card">
            <p className="section-label mb-3">30 derniers jours</p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-zinc-500 mb-1">😴 Sommeil</p>
                <Sparkline values={data.series.sommeil} color="#2563eb" />
              </div>
              <div>
                <p className="text-xs text-zinc-500 mb-1">😊 Humeur</p>
                <Sparkline values={data.series.humeur} color="#059669" />
              </div>
              <div>
                <p className="text-xs text-zinc-500 mb-1">⚡ Énergie</p>
                <Sparkline values={data.series.energie} color="#d97706" />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {data.findings.length === 0 ? (
              <div className="card text-center py-10">
                <p className="text-zinc-500 text-sm">
                  {data.sampleSize < 10
                    ? "Pas encore assez de journées enregistrées pour détecter des corrélations fiables."
                    : "Aucune corrélation nette détectée pour l'instant."}
                </p>
              </div>
            ) : (
              data.findings.map((f) => (
                <div key={f.label} className="card-sm flex items-start gap-3">
                  <Sparkles size={15} className="text-violet-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-zinc-200 font-medium">{f.label}</p>
                    <p className="text-xs text-zinc-500 mt-1">{f.detail}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
