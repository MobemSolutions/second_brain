import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const db = await getDb();
  const date = req.nextUrl.searchParams.get("date");
  const days = parseInt(req.nextUrl.searchParams.get("days") || "30");

  if (date) {
    const row = await db.prepare("SELECT * FROM habitudes WHERE date = ?").get(date);
    return NextResponse.json(row || null);
  }

  const rows = await db
    .prepare(
      `SELECT * FROM habitudes
       WHERE date >= date('now', ? || ' days')
       ORDER BY date ASC`
    )
    .all(`-${days}`);

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const db = await getDb();
  const body = await req.json();

  const existing = await db
    .prepare("SELECT id FROM habitudes WHERE date = ?")
    .get(body.date) as { id: number } | undefined;

  if (existing) {
    const allowed = [
      "sommeil", "eau", "meditation", "lecture", "pas", "poids", "pompes",
      "sport_fait", "alcool", "ecran_dodo", "nofap",
      "brossage_matin", "brossage_soir", "gratte_langue", "fil_dentaire", "creme_solaire", "soin_peau_soir",
      "skin_icing", "gouttes_cernes", "bonnet_satin", "flexibilite", "jawline", "neck_curls",
      "soin_visage_lavage", "soin_visage_rincage", "soin_visage_creme", "bain_bouche", "exfoliant",
      "epilation_sourcils", "rasage_corps", "rasage_barbe", "pastille_dentaire",
      "humeur", "energie", "notes",
    ];
    const fields = Object.keys(body).filter((k) => allowed.includes(k));
    if (fields.length) {
      const set = fields.map((f) => `${f} = ?`).join(", ");
      await db.prepare(`UPDATE habitudes SET ${set} WHERE date = ?`).run(
        ...fields.map((f) => body[f]),
        body.date
      );
    }
    return NextResponse.json(await db.prepare("SELECT * FROM habitudes WHERE date = ?").get(body.date));
  }

  const result = await db
    .prepare(
      `INSERT INTO habitudes (
         date, sommeil, eau, meditation, lecture, pas, poids, pompes,
         sport_fait, alcool, ecran_dodo, nofap,
         brossage_matin, brossage_soir, gratte_langue, fil_dentaire, creme_solaire, soin_peau_soir,
         skin_icing, gouttes_cernes, bonnet_satin, flexibilite, jawline, neck_curls,
         soin_visage_lavage, soin_visage_rincage, soin_visage_creme, bain_bouche, exfoliant,
         epilation_sourcils, rasage_corps, rasage_barbe, pastille_dentaire,
         humeur, energie, notes
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      body.date,
      body.sommeil ?? null, body.eau ?? null, body.meditation ?? null, body.lecture ?? 0,
      body.pas ?? null, body.poids ?? null, body.pompes ?? null,
      body.sport_fait ?? 0, body.alcool ?? 0, body.ecran_dodo ?? 0, body.nofap ?? 0,
      body.brossage_matin ?? 0, body.brossage_soir ?? 0, body.gratte_langue ?? 0,
      body.fil_dentaire ?? 0, body.creme_solaire ?? 0, body.soin_peau_soir ?? 0,
      body.skin_icing ?? 0, body.gouttes_cernes ?? 0, body.bonnet_satin ?? 0,
      body.flexibilite ?? 0, body.jawline ?? 0, body.neck_curls ?? 0,
      body.soin_visage_lavage ?? 0, body.soin_visage_rincage ?? 0, body.soin_visage_creme ?? 0,
      body.bain_bouche ?? 0, body.exfoliant ?? 0,
      body.epilation_sourcils ?? 0, body.rasage_corps ?? 0, body.rasage_barbe ?? 0, body.pastille_dentaire ?? 0,
      body.humeur ?? null, body.energie ?? null, body.notes || null
    );

  const row = await db.prepare("SELECT * FROM habitudes WHERE id = ?").get(Number(result.lastInsertRowid));
  return NextResponse.json(row, { status: 201 });
}
