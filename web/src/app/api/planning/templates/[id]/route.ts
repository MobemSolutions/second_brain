import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = await getDb();
  const { id } = await params;
  const body = await req.json();

  if (typeof body.nom !== "string" || !body.nom.trim()) {
    return NextResponse.json({ error: "nom requis" }, { status: 400 });
  }

  await db.prepare("UPDATE planning_templates SET nom = ? WHERE id = ?").run(body.nom, id);
  return NextResponse.json(await db.prepare("SELECT * FROM planning_templates WHERE id = ?").get(id));
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = await getDb();
  const { id } = await params;
  await db.prepare("DELETE FROM planning_templates WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
