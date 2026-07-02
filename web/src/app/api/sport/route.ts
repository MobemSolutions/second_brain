import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const db = await getDb();
  const discipline = req.nextUrl.searchParams.get("discipline");
  const limit = req.nextUrl.searchParams.get("limit") || "20";

  const query = discipline
    ? "SELECT * FROM sport WHERE discipline = ? ORDER BY date DESC, created_at DESC LIMIT ?"
    : "SELECT * FROM sport ORDER BY date DESC, created_at DESC LIMIT ?";

  const args = discipline ? [discipline, parseInt(limit)] : [parseInt(limit)];
  return NextResponse.json(await db.prepare(query).all(...args));
}

export async function POST(req: NextRequest) {
  const db = await getDb();
  const b = await req.json();

  const result = await db
    .prepare(
      `INSERT INTO sport
         (discipline, date, duree, rpe, meteo, notes,
          groupe_musculaire, exercice, series, repetitions, charge, programme,
          type_course, distance, temps_min, denivele, fc_moyenne,
          site, voie, cotation, style_escalade, resultat,
          sommet, massif, altitude, cotation_globale, partenaires, bivouac, rapport)
       VALUES
         (?,?,?,?,?,?, ?,?,?,?,?,?, ?,?,?,?,?, ?,?,?,?,?, ?,?,?,?,?,?,?)`
    )
    .run(
      b.discipline, b.date, b.duree || null, b.rpe || null, b.meteo || null, b.notes || null,
      b.groupe_musculaire || null, b.exercice || null, b.series || null, b.repetitions || null, b.charge || null, b.programme || null,
      b.type_course || null, b.distance || null, b.temps_min || null, b.denivele || null, b.fc_moyenne || null,
      b.site || null, b.voie || null, b.cotation || null, b.style_escalade || null, b.resultat || null,
      b.sommet || null, b.massif || null, b.altitude || null, b.cotation_globale || null, b.partenaires || null,
      b.bivouac ? 1 : 0, b.rapport || null
    );

  const row = await db.prepare("SELECT * FROM sport WHERE id = ?").get(Number(result.lastInsertRowid));
  return NextResponse.json(row, { status: 201 });
}
