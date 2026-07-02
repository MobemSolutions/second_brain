import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const db = await getDb();
  const days = req.nextUrl.searchParams.get("days");

  const rows = days
    ? await db
        .prepare(`SELECT * FROM psy_seances WHERE date >= date('now', ? || ' days') ORDER BY date DESC, created_at DESC`)
        .all(`-${days}`)
    : await db.prepare("SELECT * FROM psy_seances ORDER BY date DESC, created_at DESC").all();

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const db = await getDb();
  const b = await req.json();

  const result = await db
    .prepare(
      `INSERT INTO psy_seances (date, titre, notes, pdf_path) VALUES (?, ?, ?, ?)`
    )
    .run(b.date, b.titre || null, b.notes || null, b.pdf_path || null);

  const row = await db.prepare("SELECT * FROM psy_seances WHERE id = ?").get(Number(result.lastInsertRowid));
  return NextResponse.json(row, { status: 201 });
}
