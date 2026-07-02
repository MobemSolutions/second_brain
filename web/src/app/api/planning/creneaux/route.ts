import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const db = await getDb();
  const templateId = req.nextUrl.searchParams.get("template_id");
  if (!templateId) return NextResponse.json([]);

  const rows = await db
    .prepare("SELECT * FROM planning_creneaux WHERE template_id = ? ORDER BY jour ASC, heure_debut ASC")
    .all(templateId);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const db = await getDb();
  const b = await req.json();

  const result = await db
    .prepare(
      `INSERT INTO planning_creneaux (template_id, carte_id, jour, heure_debut, heure_fin)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(b.template_id, b.carte_id, b.jour, b.heure_debut, b.heure_fin);

  const row = await db.prepare("SELECT * FROM planning_creneaux WHERE id = ?").get(Number(result.lastInsertRowid));
  return NextResponse.json(row, { status: 201 });
}
