import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = getDb();
  const today = new Date().toISOString().split("T")[0];

  const tasks_today = db
    .prepare(
      `SELECT t.*, p.titre as projet_titre
       FROM taches t
       LEFT JOIN projets p ON p.id = t.projet_id
       WHERE t.date_echeance = ? AND t.statut != 'termine'
       ORDER BY CASE t.priorite
         WHEN 'haute' THEN 1 WHEN 'moyenne' THEN 2 ELSE 3 END`
    )
    .all(today);

  const active_projects = db
    .prepare(
      `SELECT p.*,
         COUNT(t.id) as total_taches,
         SUM(CASE WHEN t.statut = 'termine' THEN 1 ELSE 0 END) as taches_faites
       FROM projets p
       LEFT JOIN taches t ON t.projet_id = p.id
       WHERE p.statut = 'en_cours'
       GROUP BY p.id
       ORDER BY p.deadline ASC NULLS LAST
       LIMIT 5`
    )
    .all();

  const habit_today = db
    .prepare("SELECT * FROM habitudes WHERE date = ?")
    .get(today) as Record<string, unknown> | undefined;

  let habit_score = 0;
  if (habit_today) {
    const h = habit_today;
    const pos =
      (h.sport_fait ? 1 : 0) +
      ((h.sommeil as number) >= 7 ? 1 : 0) +
      ((h.eau as number) >= 2 ? 1 : 0) +
      ((h.meditation as number) >= 10 ? 1 : 0) +
      ((h.lecture as number) >= 20 ? 1 : 0);
    const neg = (h.alcool ? 1 : 0) + (h.ecran_dodo ? 1 : 0);
    habit_score = Math.max(0, Math.min(10, pos * 2 - neg));
  }

  const monthly_cost = (
    db
      .prepare(
        `SELECT COALESCE(SUM(
          CASE frequence
            WHEN 'mensuel' THEN prix
            WHEN 'trimestriel' THEN prix / 3.0
            ELSE prix / 12.0
          END
        ), 0) as total
         FROM abonnements WHERE actif = 1`
      )
      .get() as { total: number }
  ).total;

  const sub_alerts = db
    .prepare(
      `SELECT *,
         CAST((julianday(date_renouvellement) - julianday('now')) AS INTEGER) as jours_restants
       FROM abonnements
       WHERE actif = 1
         AND date_renouvellement IS NOT NULL
         AND CAST((julianday(date_renouvellement) - julianday('now')) AS INTEGER) <= 14
       ORDER BY date_renouvellement ASC`
    )
    .all();

  const recent_sport = db
    .prepare(
      `SELECT * FROM sport ORDER BY date DESC, created_at DESC LIMIT 5`
    )
    .all();

  const inbox_count = (
    db
      .prepare("SELECT COUNT(*) as n FROM inbox WHERE traite = 0")
      .get() as { n: number }
  ).n;

  return NextResponse.json({
    tasks_today,
    active_projects,
    habit_today,
    habit_score,
    monthly_cost,
    sub_alerts,
    recent_sport,
    inbox_count,
  });
}
