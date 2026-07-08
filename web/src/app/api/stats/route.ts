import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { calcHabitScore, type HabitDefLike } from "@/lib/habitScore";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = await getDb();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());

  const tasks_today = await db
    .prepare(
      `SELECT t.*, p.titre as projet_titre
       FROM taches t
       LEFT JOIN projets p ON p.id = t.projet_id
       WHERE t.date_echeance = ? AND t.statut != 'termine'
       ORDER BY CASE t.priorite
         WHEN 'haute' THEN 1 WHEN 'moyenne' THEN 2 ELSE 3 END`
    )
    .all(today);

  const active_projects = await db
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

  const habit_defs = await db
    .prepare("SELECT * FROM habit_definitions WHERE actif = 1 ORDER BY section, ordre, id")
    .all() as unknown as HabitDefLike[];
  const habit_values_today = await db
    .prepare("SELECT habit_id, valeur FROM habit_values WHERE date = ?")
    .all(today) as { habit_id: number; valeur: number | null }[];
  const valuesByHabit = Object.fromEntries(habit_values_today.map((v) => [v.habit_id, v.valeur]));
  const habit_score = calcHabitScore(habit_defs, valuesByHabit);

  const monthly_cost = (
    await db
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

  const last_head = await db
    .prepare("SELECT discipline, date FROM sport ORDER BY date DESC, created_at DESC LIMIT 1")
    .get() as { discipline: string; date: string } | undefined;
  const last_session = last_head
    ? {
        discipline: last_head.discipline,
        date: last_head.date,
        exercises: await db
          .prepare(
            `SELECT * FROM sport WHERE date = ? AND discipline = ? ORDER BY created_at ASC`
          )
          .all(last_head.date, last_head.discipline),
      }
    : null;

  const todayDow = new Date(today + "T00:00:00Z").getUTCDay(); // 0=Sun..6=Sat
  const mondayOffset = todayDow === 0 ? 6 : todayDow - 1;
  const monday = new Date(today + "T00:00:00Z");
  monday.setUTCDate(monday.getUTCDate() - mondayOffset);
  const weekStart = monday.toISOString().slice(0, 10);

  const sport_week_count = (
    await db
      .prepare(`SELECT COUNT(DISTINCT date) as n FROM sport WHERE date >= ?`)
      .get(weekStart) as { n: number }
  ).n;

  const inbox_count = (
    await db
      .prepare("SELECT COUNT(*) as n FROM inbox WHERE traite = 0")
      .get() as { n: number }
  ).n;

  return NextResponse.json({
    tasks_today,
    active_projects,
    habit_score,
    monthly_cost,
    last_session,
    sport_week_count,
    inbox_count,
  });
}
