import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = await getDb();
  return NextResponse.json(await db.prepare("SELECT * FROM planning_templates ORDER BY created_at ASC").all());
}

export async function POST(req: NextRequest) {
  const db = await getDb();
  const b = await req.json();

  const result = await db.prepare("INSERT INTO planning_templates (nom) VALUES (?)").run(b.nom);
  const row = await db.prepare("SELECT * FROM planning_templates WHERE id = ?").get(Number(result.lastInsertRowid));
  return NextResponse.json(row, { status: 201 });
}
