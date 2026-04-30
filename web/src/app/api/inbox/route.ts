import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const db = getDb();
  const traite = req.nextUrl.searchParams.get("traite");

  const rows =
    traite !== null
      ? db
          .prepare(
            "SELECT * FROM inbox WHERE traite = ? ORDER BY created_at DESC"
          )
          .all(traite === "true" || traite === "1" ? 1 : 0)
      : db
          .prepare("SELECT * FROM inbox ORDER BY created_at DESC")
          .all();

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();

  const result = db
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

  const row = db
    .prepare("SELECT * FROM inbox WHERE id = ?")
    .get(Number(result.lastInsertRowid));

  return NextResponse.json(row, { status: 201 });
}
