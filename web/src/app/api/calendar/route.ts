import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

function icsDate(dateStr: string): string {
  return dateStr.replace(/-/g, "");
}

function nextDay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().split("T")[0].replace(/-/g, "");
}

function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}

function vevent(uid: string, date: string, summary: string, desc?: string): string {
  const lines = [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTART;VALUE=DATE:${icsDate(date)}`,
    `DTEND;VALUE=DATE:${nextDay(date)}`,
    `SUMMARY:${esc(summary)}`,
  ];
  if (desc) lines.push(`DESCRIPTION:${esc(desc)}`);
  lines.push("END:VEVENT");
  return lines.join("\r\n");
}

export async function GET() {
  const db = await getDb();

  const events: string[] = [];

  // Tasks with deadlines (non-done)
  const taches = await db
    .prepare(
      `SELECT t.*, p.titre as projet_titre
       FROM taches t LEFT JOIN projets p ON p.id = t.projet_id
       WHERE t.date_echeance IS NOT NULL AND t.statut != 'termine'
       ORDER BY t.date_echeance ASC`
    )
    .all() as { id: number; titre: string; date_echeance: string; projet_titre: string | null; priorite: string }[];

  for (const t of taches) {
    const emoji = t.priorite === "haute" ? "🔴 " : t.priorite === "basse" ? "🔵 " : "";
    const summary = `${emoji}${t.titre}${t.projet_titre ? ` [${t.projet_titre}]` : ""}`;
    events.push(vevent(`task-${t.id}@secondbrain`, t.date_echeance, summary));
  }

  // Sport sessions (last 30 days)
  const DISC_ICON: Record<string, string> = {
    musculation: "💪", running: "🏃", escalade: "🧗", alpinisme: "🏔️",
  };
  const sport = await db
    .prepare(
      `SELECT * FROM sport
       WHERE date >= date('now', '-30 days')
       ORDER BY date DESC`
    )
    .all() as {
      id: number; discipline: string; date: string; duree: number | null;
      exercice: string | null; distance: number | null; sommet: string | null; site: string | null;
    }[];

  for (const s of sport) {
    const icon = DISC_ICON[s.discipline] || "🏋️";
    const detail = s.exercice || s.sommet || s.site || (s.distance ? `${s.distance}km` : "");
    const summary = `${icon} ${s.discipline}${detail ? ` — ${detail}` : ""}${s.duree ? ` (${s.duree}min)` : ""}`;
    events.push(vevent(`sport-${s.id}@secondbrain`, s.date, summary));
  }

  // Subscription renewals (next 60 days)
  const abos = await db
    .prepare(
      `SELECT * FROM abonnements
       WHERE actif = 1
         AND date_renouvellement IS NOT NULL
         AND date_renouvellement BETWEEN date('now') AND date('now', '+60 days')
       ORDER BY date_renouvellement ASC`
    )
    .all() as { id: number; service: string; date_renouvellement: string; prix: number; frequence: string }[];

  for (const a of abos) {
    const summary = `💳 Renouvellement — ${a.service} (${a.prix}€ ${a.frequence})`;
    events.push(vevent(`abo-${a.id}@secondbrain`, a.date_renouvellement, summary));
  }

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Second Brain//FR",
    "X-WR-CALNAME:Second Brain",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="second-brain.ics"',
      "Cache-Control": "no-cache",
    },
  });
}
