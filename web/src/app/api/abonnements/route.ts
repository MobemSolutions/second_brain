import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const MONTHS_PER_CYCLE: Record<string, number> = {
  mensuel: 1,
  trimestriel: 3,
  annuel: 12,
};

function addMonths(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCMonth(dt.getUTCMonth() + months);
  return dt.toISOString().slice(0, 10);
}

// Rolls a past renewal date forward to the next upcoming occurrence for its
// billing cycle, so the countdown/alert keeps recurring instead of sitting
// on "Expiré" forever once the original date has passed.
function nextOccurrence(dateStr: string, frequence: string, today: string): string {
  const months = MONTHS_PER_CYCLE[frequence];
  if (!months) return dateStr;
  let next = dateStr;
  let guard = 0;
  while (next < today && guard < 1000) {
    next = addMonths(next, months);
    guard++;
  }
  return next;
}

export async function GET() {
  const db = await getDb();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
  const rows = await db.prepare("SELECT * FROM abonnements").all();

  const out: Record<string, unknown>[] = [];
  for (const row of rows as Record<string, unknown>[]) {
    let dateRenouvellement = row.date_renouvellement as string | null;
    if (row.actif && dateRenouvellement && typeof row.frequence === "string") {
      const rolled = nextOccurrence(dateRenouvellement, row.frequence, today);
      if (rolled !== dateRenouvellement) {
        await db.prepare("UPDATE abonnements SET date_renouvellement = ? WHERE id = ?").run(rolled, row.id as number);
        dateRenouvellement = rolled;
      }
    }
    const prix = Number(row.prix) || 0;
    const cout_mensuel = row.frequence === "trimestriel" ? prix / 3 : row.frequence === "annuel" ? prix / 12 : prix;
    const jours_restants = dateRenouvellement
      ? Math.round((Date.parse(dateRenouvellement) - Date.parse(today)) / 86400000)
      : null;
    out.push({ ...row, date_renouvellement: dateRenouvellement, cout_mensuel, jours_restants });
  }

  out.sort((a, b) => {
    if ((b.actif as number) !== (a.actif as number)) return (b.actif as number) - (a.actif as number);
    const da = a.date_renouvellement as string | null;
    const db_ = b.date_renouvellement as string | null;
    if (da === db_) return 0;
    if (da === null) return 1;
    if (db_ === null) return -1;
    return da < db_ ? -1 : 1;
  });

  return NextResponse.json(out);
}

export async function POST(req: NextRequest) {
  const db = await getDb();
  const body = await req.json();

  const result = await db
    .prepare(
      `INSERT INTO abonnements (service, categorie, prix, frequence, date_renouvellement, auto_renouvellement, valeur_percue, actif, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      body.service,
      body.categorie || null,
      body.prix || 0,
      body.frequence || "mensuel",
      body.date_renouvellement || null,
      body.auto_renouvellement ? 1 : 0,
      body.valeur_percue || null,
      body.actif !== false ? 1 : 0,
      body.notes || null
    );

  const row = await db.prepare("SELECT * FROM abonnements WHERE id = ?").get(Number(result.lastInsertRowid));
  return NextResponse.json(row, { status: 201 });
}
