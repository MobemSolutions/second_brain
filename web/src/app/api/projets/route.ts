import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = await getDb();
  const rows = await db
    .prepare(
      `SELECT p.*,
         COUNT(t.id) as total_taches,
         SUM(CASE WHEN t.statut = 'termine' THEN 1 ELSE 0 END) as taches_faites
       FROM projets p
       LEFT JOIN taches t ON t.projet_id = p.id
       WHERE p.statut != 'archive'
       GROUP BY p.id
       ORDER BY CASE p.statut
         WHEN 'en_cours' THEN 1 WHEN 'en_attente' THEN 2 WHEN 'a_faire' THEN 3 ELSE 4 END,
         p.deadline ASC NULLS LAST`
    )
    .all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const db = await getDb();
  const body = await req.json();

  const result = await db
    .prepare(
      `INSERT INTO projets (titre, statut, priorite, piliers, date_debut, deadline, okr_trimestre, annee, notes, description, couleur)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      body.titre,
      body.statut || "a_faire",
      body.priorite || "normal",
      body.piliers || null,
      body.date_debut || null,
      body.deadline || null,
      body.okr_trimestre || null,
      body.annee || new Date().getFullYear(),
      body.notes || null,
      body.description || null,
      body.couleur || null
    );

  const row = await db
    .prepare("SELECT * FROM projets WHERE id = ?")
    .get(Number(result.lastInsertRowid));
  return NextResponse.json(row, { status: 201 });
}
