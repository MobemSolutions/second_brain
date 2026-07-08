export interface HabitDefLike {
  id: number;
  type: "checkbox" | "metric";
  cible: number | null;
  score_impact: "positif" | "negatif" | "aucun";
}

export function isHabitDone(def: HabitDefLike, value: number | null | undefined): boolean {
  return def.type === "metric"
    ? (def.cible != null ? (value ?? 0) >= def.cible : (value ?? 0) > 0)
    : !!value;
}

// How many positive habits it takes to fill the bar — scales with the total
// so adding more habits doesn't make a perfect day trivially easy.
export function calcHabitScore(
  defs: HabitDefLike[],
  values: Record<number, number | null | undefined>
): number {
  let pos = 0, neg = 0;
  for (const d of defs) {
    if (d.score_impact === "aucun") continue;
    if (!isHabitDone(d, values[d.id])) continue;
    if (d.score_impact === "positif") pos++;
    else neg++;
  }
  const positifTotal = defs.filter((d) => d.score_impact === "positif").length;
  const target = Math.max(20, Math.round(positifTotal * 0.5));
  return Math.max(0, Math.min(10, Math.round((pos / target) * 10 - neg)));
}
