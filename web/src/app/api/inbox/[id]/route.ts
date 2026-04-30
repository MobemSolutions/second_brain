import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const body = await req.json();

  const allowed = ["titre", "type", "contexte", "priorite", "url", "traite", "destination", "notes"];
  const fields = Object.keys(body).filter((k) => allowed.includes(k));
  if (!fields.length) return NextResponse.json({ error: "nothing to update" }, { status: 400 });

  const set = fields.map((f) => `${f} = ?`).join(", ");
  const values = [...fields.map((f) => body[f]), id];

  db.prepare(
    `UPDATE inbox SET ${set}, updated_at = datetime('now','localtime') WHERE id = ?`
  ).run(...values);

  const row = db.prepare("SELECT * FROM inbox WHERE id = ?").get(id);
  return NextResponse.json(row);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  db.prepare("DELETE FROM inbox WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
