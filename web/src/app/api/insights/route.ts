import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { pearson, meanBySplit } from "@/lib/correlate";

export const dynamic = "force-dynamic";

interface HabitRow {
  date: string;
  sommeil: number | null;
  eau: number | null;
  meditation: number | null;
  lecture: number | null;
  sport_fait: number | null;
  alcool: number | null;
  ecran_dodo: number | null;
  humeur: number | null;
  energie: number | null;
}

interface Finding { label: string; detail: string; weight: number; }

function nextDay(d: string): string {
  const dt = new Date(d + "T00:00:00");
  dt.setDate(dt.getDate() + 1);
  return dt.toISOString().slice(0, 10);
}

// Deliberately numeric-only (habitudes/sport/nutrition) — never touches
// psy_observations, whose free-text fields are encrypted and shouldn't be
// pulled into a general-purpose analytics endpoint.
export async function GET() {
  const db = await getDb();
  const rows = (await db
    .prepare(
      "SELECT date, sommeil, eau, meditation, lecture, sport_fait, alcool, ecran_dodo, humeur, energie FROM habitudes ORDER BY date"
    )
    .all()) as unknown as HabitRow[];

  const byDate = new Map(rows.map((r) => [r.date, r]));
  const findings: Finding[] = [];

  function addPearsonFinding(
    labelA: string, aFn: (r: HabitRow) => number | null,
    labelB: string, bFn: (r: HabitRow) => number | null
  ) {
    const xs: number[] = [];
    const ys: number[] = [];
    for (const r of rows) {
      const a = aFn(r), b = bFn(r);
      if (a != null && b != null) { xs.push(a); ys.push(b); }
    }
    if (xs.length < 10) return;
    const r = pearson(xs, ys);
    if (r == null || Math.abs(r) < 0.3) return;
    const sens = r > 0 ? "évoluent ensemble" : "évoluent en sens inverse";
    findings.push({
      label: `${labelA} ↔ ${labelB}`,
      detail: `Sur les ${xs.length} derniers jours avec des données, ${labelA} et ${labelB} ${sens} (r = ${r.toFixed(2)}).`,
      weight: Math.abs(r),
    });
  }

  addPearsonFinding("Sommeil", (r) => r.sommeil, "Humeur", (r) => r.humeur);
  addPearsonFinding("Sport", (r) => r.sport_fait, "Énergie", (r) => r.energie);
  addPearsonFinding("Méditation", (r) => r.meditation, "Humeur", (r) => r.humeur);
  addPearsonFinding("Écran avant dodo", (r) => r.ecran_dodo, "Sommeil", (r) => r.sommeil);

  const flags: number[] = [];
  const nextSleep: number[] = [];
  for (const r of rows) {
    if (r.alcool == null) continue;
    const nd = byDate.get(nextDay(r.date));
    if (nd?.sommeil != null) { flags.push(r.alcool); nextSleep.push(nd.sommeil); }
  }
  if (flags.length >= 10) {
    const { whenTrue, whenFalse } = meanBySplit(flags, nextSleep);
    if (whenTrue != null && whenFalse != null) {
      const diff = whenFalse - whenTrue;
      if (Math.abs(diff) >= 0.3) {
        findings.push({
          label: "Alcool → sommeil du lendemain",
          detail: `Les jours où tu bois de l'alcool, ton sommeil du lendemain est en moyenne ${
            diff > 0 ? `${diff.toFixed(1)}h plus court` : `${Math.abs(diff).toFixed(1)}h plus long`
          } (comparé sur ${flags.length} jours).`,
          weight: Math.min(1, Math.abs(diff) / 3),
        });
      }
    }
  }

  findings.sort((a, b) => b.weight - a.weight);

  const recent = rows.slice(-30);
  const series = {
    dates: recent.map((r) => r.date),
    sommeil: recent.map((r) => r.sommeil ?? 0),
    humeur: recent.map((r) => r.humeur ?? 0),
    energie: recent.map((r) => r.energie ?? 0),
  };

  return NextResponse.json({
    findings: findings.slice(0, 5).map(({ label, detail }) => ({ label, detail })),
    series,
    sampleSize: rows.length,
  });
}
