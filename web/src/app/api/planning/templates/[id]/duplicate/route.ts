import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

interface Carte {
  id: number;
  titre: string;
  emoji: string | null;
  couleur: string | null;
}

interface Creneau {
  carte_id: number;
  jour: number;
  heure_debut: string;
  heure_fin: string;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = await getDb();
  const { id } = await params;

  const source = await db.prepare("SELECT * FROM planning_templates WHERE id = ?").get(id) as { id: number; nom: string } | undefined;
  if (!source) return NextResponse.json({ error: "not found" }, { status: 404 });

  const newTemplate = await db
    .prepare("INSERT INTO planning_templates (nom) VALUES (?)")
    .run(`${source.nom} (copie)`);
  const newTemplateId = Number(newTemplate.lastInsertRowid);

  const cartes = await db.prepare("SELECT * FROM planning_cartes WHERE template_id = ?").all(id) as unknown as Carte[];
  const carteIdMap = new Map<number, number>();
  const insertCarte = db.prepare("INSERT INTO planning_cartes (template_id, titre, emoji, couleur) VALUES (?, ?, ?, ?)");
  for (const c of cartes) {
    const result = await insertCarte.run(newTemplateId, c.titre, c.emoji, c.couleur);
    carteIdMap.set(c.id, Number(result.lastInsertRowid));
  }

  const creneaux = await db.prepare("SELECT * FROM planning_creneaux WHERE template_id = ?").all(id) as unknown as (Creneau & { carte_id: number })[];
  const insertCreneau = db.prepare(
    "INSERT INTO planning_creneaux (template_id, carte_id, jour, heure_debut, heure_fin) VALUES (?, ?, ?, ?, ?)"
  );
  for (const cr of creneaux) {
    const newCarteId = carteIdMap.get(cr.carte_id);
    if (newCarteId) await insertCreneau.run(newTemplateId, newCarteId, cr.jour, cr.heure_debut, cr.heure_fin);
  }

  const row = await db.prepare("SELECT * FROM planning_templates WHERE id = ?").get(newTemplateId);
  return NextResponse.json(row, { status: 201 });
}
