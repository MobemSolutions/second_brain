import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const db = getDb();
  const date = req.nextUrl.searchParams.get("date");
  const days = parseInt(req.nextUrl.searchParams.get("days") || "14");

  if (date) {
    const row = db.prepare("SELECT * FROM nutrition WHERE date = ?").get(date);
    return NextResponse.json(row || null);
  }

  const rows = db
    .prepare(`SELECT * FROM nutrition WHERE date >= date('now', ? || ' days') ORDER BY date DESC`)
    .all(`-${days}`);

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();

  const existing = db
    .prepare("SELECT id FROM nutrition WHERE date = ?")
    .get(body.date) as { id: number } | undefined;

  if (existing) {
    const allowed = ["calories", "proteines", "glucides", "lipides", "notes", "pdf_path"];
    const fields = Object.keys(body).filter((k) => allowed.includes(k));
    if (fields.length) {
      const set = fields.map((f) => `${f} = ?`).join(", ");
      db.prepare(`UPDATE nutrition SET ${set} WHERE date = ?`).run(
        ...fields.map((f) => body[f]),
        body.date
      );
    }
    return NextResponse.json(db.prepare("SELECT * FROM nutrition WHERE date = ?").get(body.date));
  }

  const result = db
    .prepare(
      `INSERT INTO nutrition (date, calories, proteines, glucides, lipides, notes, pdf_path)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      body.date,
      body.calories ?? null,
      body.proteines ?? null,
      body.glucides ?? null,
      body.lipides ?? null,
      body.notes || null,
      body.pdf_path || null
    );

  const row = db.prepare("SELECT * FROM nutrition WHERE id = ?").get(Number(result.lastInsertRowid));
  return NextResponse.json(row, { status: 201 });
}
