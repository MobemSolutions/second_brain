import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const db = getDb();
  const date = req.nextUrl.searchParams.get("date");
  const days = parseInt(req.nextUrl.searchParams.get("days") || "30");

  if (date) {
    const row = db.prepare("SELECT * FROM habitudes WHERE date = ?").get(date);
    return NextResponse.json(row || null);
  }

  const rows = db
    .prepare(
      `SELECT * FROM habitudes
       WHERE date >= date('now', ? || ' days')
       ORDER BY date ASC`
    )
    .all(`-${days}`);

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();

  const existing = db
    .prepare("SELECT id FROM habitudes WHERE date = ?")
    .get(body.date) as { id: number } | undefined;

  if (existing) {
    const allowed = ["sommeil", "eau", "meditation", "lecture", "sport_fait", "alcool", "ecran_dodo", "nofap", "brossage_matin", "brossage_soir", "gratte_langue", "fil_dentaire", "creme_solaire", "soin_peau_soir", "humeur", "energie", "notes"];
    const fields = Object.keys(body).filter((k) => allowed.includes(k));
    if (fields.length) {
      const set = fields.map((f) => `${f} = ?`).join(", ");
      db.prepare(`UPDATE habitudes SET ${set} WHERE date = ?`).run(
        ...fields.map((f) => body[f]),
        body.date
      );
    }
    return NextResponse.json(db.prepare("SELECT * FROM habitudes WHERE date = ?").get(body.date));
  }

  const result = db
    .prepare(
      `INSERT INTO habitudes (date, sommeil, eau, meditation, lecture, sport_fait, alcool, ecran_dodo, nofap, brossage_matin, brossage_soir, gratte_langue, fil_dentaire, creme_solaire, soin_peau_soir, humeur, energie, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      body.date,
      body.sommeil ?? null, body.eau ?? null, body.meditation ?? null,
      body.lecture ?? null, body.sport_fait ?? 0, body.alcool ?? 0,
      body.ecran_dodo ?? 0, body.nofap ?? 0,
      body.brossage_matin ?? 0, body.brossage_soir ?? 0, body.gratte_langue ?? 0,
      body.fil_dentaire ?? 0, body.creme_solaire ?? 0, body.soin_peau_soir ?? 0,
      body.humeur ?? null, body.energie ?? null, body.notes || null
    );

  const row = db.prepare("SELECT * FROM habitudes WHERE id = ?").get(Number(result.lastInsertRowid));
  return NextResponse.json(row, { status: 201 });
}
