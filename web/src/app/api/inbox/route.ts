import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const db = await getDb();
  const traite = req.nextUrl.searchParams.get("traite");
  const q = req.nextUrl.searchParams.get("q");
  const contexte = req.nextUrl.searchParams.get("contexte");

  let query = `
    SELECT i.*,
      COALESCE(dt.titre, dp.titre) as destination_titre
    FROM inbox i
    LEFT JOIN taches dt ON i.destination = 'tache' AND dt.id = i.destination_id
    LEFT JOIN projets dp ON i.destination = 'projet' AND dp.id = i.destination_id
    WHERE 1=1
  `;
  const args: (string | number)[] = [];

  if (traite !== null) {
    query += " AND i.traite = ?";
    args.push(traite === "true" || traite === "1" ? 1 : 0);
  }
  if (q) {
    query += " AND (i.titre LIKE ? OR i.notes LIKE ?)";
    args.push(`%${q}%`, `%${q}%`);
  }
  if (contexte) {
    query += " AND i.contexte = ?";
    args.push(contexte);
  }

  query += ` ORDER BY CASE i.priorite
    WHEN 'haute' THEN 1 WHEN 'moyenne' THEN 2 ELSE 3 END,
    i.created_at DESC`;

  const rows = await db.prepare(query).all(...args);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const db = await getDb();
  const body = await req.json();

  const result = await db
    .prepare(
      `INSERT INTO inbox (titre, type, contexte, priorite, url, notes)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      body.titre,
      body.type || "note",
      body.contexte || null,
      body.priorite || "moyenne",
      body.url || null,
      body.notes || null
    );

  const row = await db
    .prepare("SELECT * FROM inbox WHERE id = ?")
    .get(Number(result.lastInsertRowid));

  return NextResponse.json(row, { status: 201 });
}
