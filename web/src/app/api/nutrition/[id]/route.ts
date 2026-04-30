import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const body = await req.json();

  const allowed = ["calories", "proteines", "glucides", "lipides", "notes", "pdf_path"];
  const fields = Object.keys(body).filter((k) => allowed.includes(k));
  if (!fields.length) return NextResponse.json({ error: "nothing to update" }, { status: 400 });

  const set = fields.map((f) => `${f} = ?`).join(", ");
  db.prepare(`UPDATE nutrition SET ${set} WHERE id = ?`).run(...fields.map((f) => body[f]), id);

  return NextResponse.json(db.prepare("SELECT * FROM nutrition WHERE id = ?").get(id));
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  db.prepare("DELETE FROM nutrition WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
