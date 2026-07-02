import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

function slugify(label: string): string {
  return label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "habitude";
}

export async function GET() {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM habit_definitions WHERE actif = 1 ORDER BY section, ordre, id")
    .all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const b = await req.json();

  let cle = slugify(b.label);
  const existing = db.prepare("SELECT id FROM habit_definitions WHERE cle = ?").get(cle);
  if (existing) cle = `${cle}_${Date.now()}`;

  const maxOrdre = db
    .prepare("SELECT COALESCE(MAX(ordre), -1) AS m FROM habit_definitions WHERE section = ?")
    .get(b.section) as { m: number };

  const result = db
    .prepare(
      `INSERT INTO habit_definitions (cle, label, emoji, type, section, unite, cible, target_freq, score_impact, ordre)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      cle,
      b.label,
      b.emoji || null,
      b.type,
      b.section,
      b.unite || null,
      b.cible ?? null,
      b.target_freq || null,
      b.score_impact || "aucun",
      maxOrdre.m + 1
    );

  const row = db.prepare("SELECT * FROM habit_definitions WHERE id = ?").get(Number(result.lastInsertRowid));
  return NextResponse.json(row, { status: 201 });
}
