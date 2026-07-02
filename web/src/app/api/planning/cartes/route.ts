import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const db = getDb();
  const templateId = req.nextUrl.searchParams.get("template_id");
  if (!templateId) return NextResponse.json([]);

  const rows = db
    .prepare("SELECT * FROM planning_cartes WHERE template_id = ? ORDER BY created_at ASC")
    .all(templateId);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const b = await req.json();

  const result = db
    .prepare("INSERT INTO planning_cartes (template_id, titre, emoji, couleur) VALUES (?, ?, ?, ?)")
    .run(b.template_id, b.titre, b.emoji || null, b.couleur || null);

  const row = db.prepare("SELECT * FROM planning_cartes WHERE id = ?").get(Number(result.lastInsertRowid));
  return NextResponse.json(row, { status: 201 });
}
