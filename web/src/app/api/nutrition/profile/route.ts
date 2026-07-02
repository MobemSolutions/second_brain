import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = await getDb();
  const row = await db.prepare("SELECT * FROM nutrition_profile WHERE id = 1").get();
  return NextResponse.json(row || null);
}

export async function POST(req: NextRequest) {
  const db = await getDb();
  const body = await req.json() as {
    poids?: number; taille?: number; age?: number; sexe?: string;
    masse_grasse?: number; activite?: string; objectif?: string; deficit?: number;
    cible_calories?: number; cible_proteines?: number; cible_glucides?: number; cible_lipides?: number;
    day_types?: string;
  };

  await db.prepare(`
    INSERT INTO nutrition_profile
      (id, poids, taille, age, sexe, masse_grasse, activite, objectif, deficit,
       cible_calories, cible_proteines, cible_glucides, cible_lipides, day_types)
    VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      poids = excluded.poids, taille = excluded.taille, age = excluded.age,
      sexe = excluded.sexe, masse_grasse = excluded.masse_grasse,
      activite = excluded.activite, objectif = excluded.objectif,
      deficit = excluded.deficit, cible_calories = excluded.cible_calories,
      cible_proteines = excluded.cible_proteines,
      cible_glucides = excluded.cible_glucides,
      cible_lipides = excluded.cible_lipides,
      day_types = excluded.day_types
  `).run(
    body.poids ?? null, body.taille ?? null, body.age ?? null,
    body.sexe ?? "homme", body.masse_grasse ?? null,
    body.activite ?? "modere", body.objectif ?? "seche", body.deficit ?? -400,
    body.cible_calories ?? null, body.cible_proteines ?? null,
    body.cible_glucides ?? null, body.cible_lipides ?? null,
    body.day_types ?? null
  );

  return NextResponse.json(await db.prepare("SELECT * FROM nutrition_profile WHERE id = 1").get());
}
