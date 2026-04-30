import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT *,
         CASE frequence
           WHEN 'mensuel' THEN prix
           WHEN 'trimestriel' THEN prix / 3.0
           ELSE prix / 12.0
         END as cout_mensuel,
         CAST((julianday(date_renouvellement) - julianday('now')) AS INTEGER) as jours_restants
       FROM abonnements
       ORDER BY actif DESC, date_renouvellement ASC NULLS LAST`
    )
    .all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();

  const result = db
    .prepare(
      `INSERT INTO abonnements (service, categorie, prix, frequence, date_renouvellement, auto_renouvellement, valeur_percue, actif, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      body.service,
      body.categorie || null,
      body.prix || 0,
      body.frequence || "mensuel",
      body.date_renouvellement || null,
      body.auto_renouvellement ? 1 : 0,
      body.valeur_percue || null,
      body.actif !== false ? 1 : 0,
      body.notes || null
    );

  const row = db.prepare("SELECT * FROM abonnements WHERE id = ?").get(Number(result.lastInsertRowid));
  return NextResponse.json(row, { status: 201 });
}
