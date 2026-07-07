import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { findSimilar } from "@/lib/embeddings";
import { resolveEntityTitle } from "@/lib/entities";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = await getDb();
  const { id } = await params;
  const noteId = Number(id);

  const existingLinks = (await db
    .prepare(
      `SELECT target_id AS other_id FROM liens WHERE source_type = 'note' AND source_id = ? AND target_type = 'note'
       UNION
       SELECT source_id AS other_id FROM liens WHERE target_type = 'note' AND target_id = ? AND source_type = 'note'`
    )
    .all(noteId, noteId)) as unknown as { other_id: number }[];
  const linkedIds = new Set(existingLinks.map((r) => r.other_id));
  linkedIds.add(noteId);

  const similar = await findSimilar(db, "note", noteId, 10);
  const candidates = similar.filter((s) => s.entity_type === "note" && !linkedIds.has(s.entity_id) && s.score >= 0.5);

  const results = await Promise.all(
    candidates.slice(0, 5).map(async (c) => ({
      id: c.entity_id,
      titre: await resolveEntityTitle(db, "note", c.entity_id),
      score: c.score,
    }))
  );

  return NextResponse.json(results);
}
