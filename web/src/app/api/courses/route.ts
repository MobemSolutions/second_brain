import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const db = getDb();
  const categorie = req.nextUrl.searchParams.get("categorie");

  const query = categorie
    ? "SELECT * FROM courses WHERE categorie = ? ORDER BY achete ASC, created_at DESC"
    : "SELECT * FROM courses ORDER BY achete ASC, created_at DESC";
  const rows = categorie ? db.prepare(query).all(categorie) : db.prepare(query).all();

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const b = await req.json();

  const result = db
    .prepare(
      `INSERT INTO courses (titre, categorie, tags, prix, lien) VALUES (?, ?, ?, ?, ?)`
    )
    .run(b.titre, b.categorie || null, b.tags || null, b.prix ?? null, b.lien || null);

  const row = db.prepare("SELECT * FROM courses WHERE id = ?").get(Number(result.lastInsertRowid));
  return NextResponse.json(row, { status: 201 });
}
