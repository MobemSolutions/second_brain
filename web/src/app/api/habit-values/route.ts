import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const db = await getDb();
  const date = req.nextUrl.searchParams.get("date");
  const days = req.nextUrl.searchParams.get("days");

  if (date) {
    const rows = await db
      .prepare("SELECT habit_id, valeur FROM habit_values WHERE date = ?")
      .all(date);
    return NextResponse.json(rows);
  }

  if (days) {
    const rows = await db
      .prepare(
        `SELECT date, habit_id, valeur FROM habit_values
         WHERE date >= date('now', ? || ' days')
         ORDER BY date ASC`
      )
      .all(`-${days}`);
    return NextResponse.json(rows);
  }

  return NextResponse.json([]);
}

export async function POST(req: NextRequest) {
  const db = await getDb();
  const b = await req.json() as { date: string; values: { habit_id: number; valeur: number | null }[] };

  const upsert = db.prepare(
    `INSERT INTO habit_values (date, habit_id, valeur) VALUES (?, ?, ?)
     ON CONFLICT(date, habit_id) DO UPDATE SET valeur = excluded.valeur`
  );
  for (const v of b.values) {
    await upsert.run(b.date, v.habit_id, v.valeur);
  }

  return NextResponse.json({ ok: true });
}
