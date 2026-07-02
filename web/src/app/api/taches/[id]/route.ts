import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = await getDb();
  const { id } = await params;
  const body = await req.json();

  const allowed = ["titre", "projet_id", "statut", "priorite", "date_debut", "date_echeance", "duree_estimee", "contexte", "energie", "notes"];
  const fields = Object.keys(body).filter((k) => allowed.includes(k));
  if (!fields.length) return NextResponse.json({ error: "nothing to update" }, { status: 400 });

  const set = fields.map((f) => `${f} = ?`).join(", ");
  await db.prepare(`UPDATE taches SET ${set} WHERE id = ?`).run(...fields.map((f) => body[f]), id);

  const row = await db.prepare("SELECT * FROM taches WHERE id = ?").get(id);
  return NextResponse.json(row);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = await getDb();
  const { id } = await params;
  await db.prepare("DELETE FROM taches WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
