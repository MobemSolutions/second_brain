import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const body = await req.json();

  const allowed = ["service", "categorie", "prix", "frequence", "date_renouvellement", "auto_renouvellement", "valeur_percue", "actif", "notes"];
  const fields = Object.keys(body).filter((k) => allowed.includes(k));
  if (!fields.length) return NextResponse.json({ error: "nothing to update" }, { status: 400 });

  const set = fields.map((f) => `${f} = ?`).join(", ");
  db.prepare(`UPDATE abonnements SET ${set} WHERE id = ?`).run(...fields.map((f) => body[f]), id);

  const row = db.prepare("SELECT * FROM abonnements WHERE id = ?").get(id);
  return NextResponse.json(row);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  db.prepare("DELETE FROM abonnements WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
