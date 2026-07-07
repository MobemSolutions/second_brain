import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { upsertEmbedding } from "@/lib/embeddings";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const db = await getDb();
  const type = req.nextUrl.searchParams.get("type");
  const statut = req.nextUrl.searchParams.get("statut");

  let query = "SELECT * FROM notes WHERE 1=1";
  const args: string[] = [];

  if (type)   { query += " AND type = ?"; args.push(type); }
  if (statut) { query += " AND statut = ?"; args.push(statut); }

  query += " ORDER BY updated_at DESC";

  return NextResponse.json(await db.prepare(query).all(...args));
}

export async function POST(req: NextRequest) {
  const db = await getDb();
  const body = await req.json();

  const result = await db
    .prepare(
      `INSERT INTO notes (titre, type, statut, tags, contenu, inbox_id)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      body.titre,
      body.type || "fleeting",
      body.statut || "brouillon",
      body.tags || null,
      body.contenu || null,
      body.inbox_id || null
    );

  const id = Number(result.lastInsertRowid);
  await upsertEmbedding(db, "note", id, `${body.titre}\n${body.contenu ?? ""}`);

  const row = await db.prepare("SELECT * FROM notes WHERE id = ?").get(id);
  return NextResponse.json(row, { status: 201 });
}
