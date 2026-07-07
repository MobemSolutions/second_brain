import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ENTITY_HREF, resolveEntityTitle } from "@/lib/entities";

export const dynamic = "force-dynamic";

interface LienRow {
  id: number;
  source_type: string;
  source_id: number;
  target_type: string;
  target_id: number;
}

export async function GET(req: NextRequest) {
  const db = await getDb();
  const type = req.nextUrl.searchParams.get("type");
  const idParam = req.nextUrl.searchParams.get("id");
  if (!type || !idParam) return NextResponse.json([]);
  const id = Number(idParam);

  const rows = (await db
    .prepare(`SELECT * FROM liens WHERE (source_type = ? AND source_id = ?) OR (target_type = ? AND target_id = ?)`)
    .all(type, id, type, id)) as unknown as LienRow[];

  const results = await Promise.all(
    rows.map(async (r) => {
      const isSource = r.source_type === type && r.source_id === id;
      const otherType = isSource ? r.target_type : r.source_type;
      const otherId = isSource ? r.target_id : r.source_id;
      const titre = await resolveEntityTitle(db, otherType, otherId);
      return { id: r.id, type: otherType, entity_id: otherId, titre, href: ENTITY_HREF[otherType] ?? "/" };
    })
  );

  return NextResponse.json(results);
}

export async function POST(req: NextRequest) {
  const db = await getDb();
  const b = await req.json();
  if (!b.source_type || !b.source_id || !b.target_type || !b.target_id) {
    return NextResponse.json({ error: "source_type, source_id, target_type, target_id requis" }, { status: 400 });
  }

  await db
    .prepare(`INSERT OR IGNORE INTO liens (source_type, source_id, target_type, target_id) VALUES (?, ?, ?, ?)`)
    .run(b.source_type, b.source_id, b.target_type, b.target_id);

  const row = await db
    .prepare(`SELECT * FROM liens WHERE source_type = ? AND source_id = ? AND target_type = ? AND target_id = ?`)
    .get(b.source_type, b.source_id, b.target_type, b.target_id);

  return NextResponse.json(row, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const db = await getDb();
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });
  await db.prepare("DELETE FROM liens WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
