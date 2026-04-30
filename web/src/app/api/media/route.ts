import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const db = getDb();
  const type = req.nextUrl.searchParams.get("type");
  const statut = req.nextUrl.searchParams.get("statut");

  let query = "SELECT * FROM media WHERE 1=1";
  const args: unknown[] = [];

  if (type) { query += " AND type = ?"; args.push(type); }
  if (statut) { query += " AND statut = ?"; args.push(statut); }

  query += " ORDER BY created_at DESC";
  return NextResponse.json(db.prepare(query).all(...args));
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();

  const result = db
    .prepare(
      `INSERT INTO media (titre, type, statut, note, date_fin, genre, createur, plateforme, avis, description, casting)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      body.titre,
      body.type,
      body.statut || "a_voir",
      body.note || null,
      body.date_fin || null,
      body.genre || null,
      body.createur || null,
      body.plateforme || null,
      body.avis || null,
      body.description || null,
      body.casting || null
    );

  const row = db.prepare("SELECT * FROM media WHERE id = ?").get(Number(result.lastInsertRowid));
  return NextResponse.json(row, { status: 201 });
}
