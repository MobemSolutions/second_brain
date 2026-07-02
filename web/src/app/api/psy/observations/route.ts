import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const db = getDb();
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");

  let query = "SELECT * FROM psy_observations WHERE 1=1";
  const args: string[] = [];

  if (from) { query += " AND date >= ?"; args.push(from); }
  if (to)   { query += " AND date <= ?"; args.push(to); }

  query += " ORDER BY date DESC, heure DESC, created_at DESC";

  return NextResponse.json(db.prepare(query).all(...args));
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const b = await req.json();

  const result = db
    .prepare(
      `INSERT INTO psy_observations
        (date, heure, contexte, emotions, pensees, comportements, comportements_entourage)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      b.date,
      b.heure || null,
      b.contexte || null,
      b.emotions || null,
      b.pensees || null,
      b.comportements || null,
      b.comportements_entourage || null
    );

  const row = db.prepare("SELECT * FROM psy_observations WHERE id = ?").get(Number(result.lastInsertRowid));
  return NextResponse.json(row, { status: 201 });
}
