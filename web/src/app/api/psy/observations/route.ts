import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { encryptText, decryptText } from "@/lib/crypto";

export const dynamic = "force-dynamic";

function withDecrypted(row: Record<string, unknown>) {
  return {
    ...row,
    contexte: decryptText(row.contexte as string | null),
    emotions: decryptText(row.emotions as string | null),
    pensees: decryptText(row.pensees as string | null),
    comportements: decryptText(row.comportements as string | null),
    comportements_entourage: decryptText(row.comportements_entourage as string | null),
  };
}

export async function GET(req: NextRequest) {
  const db = await getDb();
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");

  let query = "SELECT * FROM psy_observations WHERE 1=1";
  const args: string[] = [];

  if (from) { query += " AND date >= ?"; args.push(from); }
  if (to)   { query += " AND date <= ?"; args.push(to); }

  query += " ORDER BY date DESC, heure DESC, created_at DESC";

  const rows = await db.prepare(query).all(...args);
  return NextResponse.json(rows.map(withDecrypted));
}

export async function POST(req: NextRequest) {
  const db = await getDb();
  const b = await req.json();

  const result = await db
    .prepare(
      `INSERT INTO psy_observations
        (date, heure, contexte, emotions, pensees, comportements, comportements_entourage)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      b.date,
      b.heure || null,
      encryptText(b.contexte || null),
      encryptText(b.emotions || null),
      encryptText(b.pensees || null),
      encryptText(b.comportements || null),
      encryptText(b.comportements_entourage || null)
    );

  const row = await db.prepare("SELECT * FROM psy_observations WHERE id = ?").get(Number(result.lastInsertRowid));
  return NextResponse.json(row ? withDecrypted(row) : row, { status: 201 });
}
