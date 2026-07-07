// Pure statistics helpers for the quantified-self insights endpoint — no I/O,
// no DB access, so they're trivially testable and reusable outside Next.js.

export function pearson(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < 2 || n !== ys.length) return null;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX, dy = ys[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  if (denX === 0 || denY === 0) return null;
  return num / Math.sqrt(denX * denY);
}

// Splits `values` by a same-index 0/1 `flags` series and averages each half —
// used for lag-1 "day after" effects (e.g. alcohol today vs sleep tomorrow)
// where a binary predictor makes a mean comparison more readable than r.
export function meanBySplit(flags: number[], values: number[]): { whenTrue: number | null; whenFalse: number | null } {
  const trueVals = values.filter((_, i) => flags[i] === 1);
  const falseVals = values.filter((_, i) => flags[i] === 0);
  const avg = (a: number[]) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);
  return { whenTrue: avg(trueVals), whenFalse: avg(falseVals) };
}
