import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const db = getDb();
  const projet_id = req.nextUrl.searchParams.get("projet_id");
  const date = req.nextUrl.searchParams.get("date");

  let query = `SELECT t.*, p.titre as projet_titre
               FROM taches t LEFT JOIN projets p ON p.id = t.projet_id
               WHERE 1=1`;
  const args: unknown[] = [];

  if (projet_id) { query += " AND t.projet_id = ?"; args.push(projet_id); }
  if (date)      { query += " AND t.date_echeance = ?"; args.push(date); }

  query += ` ORDER BY CASE t.statut WHEN 'en_cours' THEN 1 WHEN 'a_faire' THEN 2 ELSE 3 END,
             CASE t.priorite WHEN 'haute' THEN 1 WHEN 'moyenne' THEN 2 ELSE 3 END`;

  return NextResponse.json(db.prepare(query).all(...args));
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();

  const result = db
    .prepare(
      `INSERT INTO taches (titre, projet_id, statut, priorite, date_debut, date_echeance, duree_estimee, contexte, energie, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      body.titre,
      body.projet_id || null,
      body.statut || "a_faire",
      body.priorite || "moyenne",
      body.date_debut || null,
      body.date_echeance || null,
      body.duree_estimee || null,
      body.contexte || null,
      body.energie || null,
      body.notes || null
    );

  const row = db
    .prepare("SELECT * FROM taches WHERE id = ?")
    .get(Number(result.lastInsertRowid));
  return NextResponse.json(row, { status: 201 });
}
