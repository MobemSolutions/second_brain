import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = await getDb();
  const { id } = await params;
  const body = await req.json();

  const allowed = ["titre", "statut", "priorite", "piliers", "date_debut", "deadline", "avancement", "okr_trimestre", "annee", "notes", "description", "couleur"];
  const fields = Object.keys(body).filter((k) => allowed.includes(k));
  if (!fields.length) return NextResponse.json({ error: "nothing to update" }, { status: 400 });

  const set = fields.map((f) => `${f} = ?`).join(", ");
  const values = [...fields.map((f) => body[f]), id];

  await db.prepare(
    `UPDATE projets SET ${set}, updated_at = datetime('now','localtime') WHERE id = ?`
  ).run(...values);

  const row = await db.prepare("SELECT * FROM projets WHERE id = ?").get(id);
  return NextResponse.json(row);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = await getDb();
  const { id } = await params;
  await db.prepare("DELETE FROM projets WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
