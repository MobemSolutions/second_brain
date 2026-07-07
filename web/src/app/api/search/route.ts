import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ENTITY_HREF } from "@/lib/entities";
import { findSimilarByText } from "@/lib/embeddings";

export const dynamic = "force-dynamic";

interface Hit {
  type: string;
  id: number;
  titre: string;
  href: string;
  snippet?: string;
}

// Deliberately excludes psy_* — Psy TCC content never surfaces in universal
// search, matching how it's already hidden from guests in the sidebar/middleware.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json([]);

  const db = await getDb();
  const like = `%${q}%`;
  const hits: Hit[] = [];

  const inboxRows = (await db.prepare("SELECT id, titre FROM inbox WHERE titre LIKE ? LIMIT 10").all(like)) as unknown as
    { id: number; titre: string }[];
  for (const r of inboxRows) hits.push({ type: "inbox", id: r.id, titre: r.titre, href: ENTITY_HREF.inbox });

  const projetRows = (await db.prepare("SELECT id, titre FROM projets WHERE titre LIKE ? LIMIT 10").all(like)) as unknown as
    { id: number; titre: string }[];
  for (const r of projetRows) hits.push({ type: "projet", id: r.id, titre: r.titre, href: ENTITY_HREF.projet });

  const tacheRows = (await db.prepare("SELECT id, titre FROM taches WHERE titre LIKE ? LIMIT 10").all(like)) as unknown as
    { id: number; titre: string }[];
  for (const r of tacheRows) hits.push({ type: "tache", id: r.id, titre: r.titre, href: ENTITY_HREF.tache });

  const noteRows = (await db
    .prepare("SELECT id, titre, contenu FROM notes WHERE titre LIKE ? OR contenu LIKE ? LIMIT 10")
    .all(like, like)) as unknown as { id: number; titre: string; contenu: string | null }[];
  for (const r of noteRows) {
    hits.push({ type: "note", id: r.id, titre: r.titre, href: ENTITY_HREF.note, snippet: r.contenu?.slice(0, 80) });
  }

  const mediaRows = (await db.prepare("SELECT id, titre FROM media WHERE titre LIKE ? LIMIT 10").all(like)) as unknown as
    { id: number; titre: string }[];
  for (const r of mediaRows) hits.push({ type: "media", id: r.id, titre: r.titre, href: ENTITY_HREF.media });

  const sportRows = (await db
    .prepare("SELECT id, discipline, date FROM sport WHERE discipline LIKE ? OR notes LIKE ? LIMIT 10")
    .all(like, like)) as unknown as { id: number; discipline: string; date: string }[];
  for (const r of sportRows) {
    hits.push({ type: "sport", id: r.id, titre: `${r.discipline} — ${r.date}`, href: ENTITY_HREF.sport });
  }

  // Semantic layer: catches notes the LIKE pass missed (different wording,
  // same idea) — best-effort, never blocks the keyword results if it fails.
  try {
    const alreadyHit = new Set(hits.filter((h) => h.type === "note").map((h) => h.id));
    const semantic = await findSimilarByText(db, "note", q, 5);
    for (const s of semantic) {
      if (alreadyHit.has(s.entity_id) || s.score < 0.5) continue;
      const note = (await db.prepare("SELECT id, titre, contenu FROM notes WHERE id = ?").get(s.entity_id)) as
        { id: number; titre: string; contenu: string | null } | undefined;
      if (note) hits.push({ type: "note", id: note.id, titre: note.titre, href: ENTITY_HREF.note, snippet: note.contenu?.slice(0, 80) });
    }
  } catch (err) {
    console.error("semantic search layer failed:", err);
  }

  return NextResponse.json(hits.slice(0, 30));
}
