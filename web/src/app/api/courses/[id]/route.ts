import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = await getDb();
  const { id } = await params;
  const body = await req.json();

  const allowed = ["titre", "categorie", "tags", "prix", "lien", "achete"];
  const fields = Object.keys(body).filter((k) => allowed.includes(k));
  if (!fields.length) return NextResponse.json({ error: "nothing to update" }, { status: 400 });

  const set = fields.map((f) => `${f} = ?`).join(", ");
  await db.prepare(`UPDATE courses SET ${set} WHERE id = ?`).run(...fields.map((f) => body[f]), id);

  return NextResponse.json(await db.prepare("SELECT * FROM courses WHERE id = ?").get(id));
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = await getDb();
  const { id } = await params;
  await db.prepare("DELETE FROM courses WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
