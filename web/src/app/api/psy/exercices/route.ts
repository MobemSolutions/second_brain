import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { encryptText, decryptText } from "@/lib/crypto";

export const dynamic = "force-dynamic";

function withDecrypted(row: Record<string, unknown>) {
  return {
    ...row,
    contenu: decryptText(row.contenu as string | null),
    sensation: decryptText(row.sensation as string | null),
    intelligence: decryptText(row.intelligence as string | null),
    monde: decryptText(row.monde as string | null),
  };
}

export async function GET(req: NextRequest) {
  const db = await getDb();
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");

  let query = "SELECT * FROM psy_exercices WHERE 1=1";
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
      `INSERT INTO psy_exercices (date, titre, heure, sensation, intelligence, monde)
       VALUES (?, '', ?, ?, ?, ?)`
    )
    .run(
      b.date,
      b.heure || null,
      encryptText(b.sensation || null),
      encryptText(b.intelligence || null),
      encryptText(b.monde || null)
    );

  const row = await db.prepare("SELECT * FROM psy_exercices WHERE id = ?").get(Number(result.lastInsertRowid));
  return NextResponse.json(row ? withDecrypted(row) : row, { status: 201 });
}
