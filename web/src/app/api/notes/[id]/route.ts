import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { upsertEmbedding } from "@/lib/embeddings";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = await getDb();
  const { id } = await params;
  const row = await db.prepare("SELECT * FROM notes WHERE id = ?").get(id);
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = await getDb();
  const { id } = await params;
  const body = await req.json();

  const allowed = ["titre", "type", "statut", "tags", "contenu"];
  const fields = Object.keys(body).filter((k) => allowed.includes(k));
  if (!fields.length) return NextResponse.json({ error: "nothing to update" }, { status: 400 });

  const set = fields.map((f) => `${f} = ?`).join(", ");
  const values = [...fields.map((f) => body[f]), id];

  await db.prepare(
    `UPDATE notes SET ${set}, updated_at = datetime('now','localtime') WHERE id = ?`
  ).run(...values);

  const row = await db.prepare("SELECT * FROM notes WHERE id = ?").get(id) as { titre: string; contenu: string | null };
  if (fields.includes("titre") || fields.includes("contenu")) {
    await upsertEmbedding(db, "note", Number(id), `${row.titre}\n${row.contenu ?? ""}`);
  }
  return NextResponse.json(row);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = await getDb();
  const { id } = await params;
  await db.prepare("DELETE FROM notes WHERE id = ?").run(id);
  await db.prepare("DELETE FROM liens WHERE (source_type = 'note' AND source_id = ?) OR (target_type = 'note' AND target_id = ?)").run(id, id);
  await db.prepare("DELETE FROM embeddings WHERE entity_type = 'note' AND entity_id = ?").run(id);
  return NextResponse.json({ ok: true });
}
