import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

type Target = "tache" | "projet" | "fait" | "archive";

const PRIORITE_PROJET: Record<string, string> = {
  haute: "important",
  moyenne: "normal",
  basse: "optionnel",
};

interface Overrides {
  titre?: string;
  contexte?: string;
  priorite?: string;
  notes?: string;
  projet_id?: number;
  date_echeance?: string;
}

interface InboxRow {
  id: number;
  titre: string;
  contexte: string | null;
  priorite: string;
  url: string | null;
  notes: string | null;
  traite: number;
  destination: string | null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = await getDb();
  const { id } = await params;
  const body = await req.json() as { target: Target; overrides?: Overrides };
  const target = body.target;
  const overrides = body.overrides ?? {};

  if (!["tache", "projet", "fait", "archive"].includes(target)) {
    return NextResponse.json({ error: "invalid target" }, { status: 400 });
  }

  const item = await db.prepare("SELECT * FROM inbox WHERE id = ?").get(id) as unknown as InboxRow | undefined;
  if (!item) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Idempotency guard: already converted, return the existing linked entity instead of duplicating
  if (item.traite && item.destination && item.destination !== "fait" && item.destination !== "archive") {
    const table = item.destination === "tache" ? "taches" : "projets";
    const existing = await db.prepare(`SELECT * FROM ${table} WHERE inbox_id = ?`).get(id);
    return NextResponse.json({ inbox: item, created: existing ?? null });
  }

  const titre = overrides.titre ?? item.titre;
  const contexte = overrides.contexte ?? item.contexte;
  const priorite = overrides.priorite ?? item.priorite;
  let notes = overrides.notes ?? item.notes ?? "";
  if (item.url) notes = notes ? `${notes}\nSource: ${item.url}` : `Source: ${item.url}`;

  let created: Record<string, unknown> | undefined;

  if (target === "tache") {
    const result = await db
      .prepare(
        `INSERT INTO taches (titre, projet_id, statut, priorite, contexte, notes, date_echeance, inbox_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        titre,
        overrides.projet_id || null,
        "a_faire",
        priorite,
        contexte || null,
        notes || null,
        overrides.date_echeance || null,
        item.id
      );
    created = await db.prepare("SELECT * FROM taches WHERE id = ?").get(Number(result.lastInsertRowid));
  } else if (target === "projet") {
    const result = await db
      .prepare(
        `INSERT INTO projets (titre, statut, priorite, notes, annee, inbox_id)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        titre,
        "a_faire",
        PRIORITE_PROJET[priorite] ?? "normal",
        notes || null,
        new Date().getFullYear(),
        item.id
      );
    created = await db.prepare("SELECT * FROM projets WHERE id = ?").get(Number(result.lastInsertRowid));
  }

  const destinationId = created ? Number(created.id) : null;
  await db
    .prepare(
      `UPDATE inbox SET traite = 1, destination = ?, destination_id = ?, updated_at = datetime('now','localtime') WHERE id = ?`
    )
    .run(target, destinationId, id);

  const updatedInbox = await db.prepare("SELECT * FROM inbox WHERE id = ?").get(id);
  return NextResponse.json({ inbox: updatedInbox, created: created ?? null });
}
