import type { Db } from "./db";

// Shared by the notes backlinks view, the liens API, and universal search —
// every cross-entity feature needs to turn a (type, id) pair into a label
// and a place to navigate to.
export const ENTITY_HREF: Record<string, string> = {
  note: "/notes",
  inbox: "/inbox",
  projet: "/projets",
  tache: "/taches",
  sport: "/sport",
  media: "/media",
  psy_observation: "/psy",
};

export async function resolveEntityTitle(db: Db, type: string, id: number): Promise<string> {
  switch (type) {
    case "note": {
      const row = await db.prepare("SELECT titre FROM notes WHERE id = ?").get(id) as { titre?: string } | undefined;
      return row?.titre ?? `Note #${id}`;
    }
    case "inbox": {
      const row = await db.prepare("SELECT titre FROM inbox WHERE id = ?").get(id) as { titre?: string } | undefined;
      return row?.titre ?? `Inbox #${id}`;
    }
    case "projet": {
      const row = await db.prepare("SELECT titre FROM projets WHERE id = ?").get(id) as { titre?: string } | undefined;
      return row?.titre ?? `Projet #${id}`;
    }
    case "tache": {
      const row = await db.prepare("SELECT titre FROM taches WHERE id = ?").get(id) as { titre?: string } | undefined;
      return row?.titre ?? `Tâche #${id}`;
    }
    case "media": {
      const row = await db.prepare("SELECT titre FROM media WHERE id = ?").get(id) as { titre?: string } | undefined;
      return row?.titre ?? `Média #${id}`;
    }
    case "sport": {
      const row = await db.prepare("SELECT discipline, date FROM sport WHERE id = ?").get(id) as
        { discipline?: string; date?: string } | undefined;
      return row ? `${row.discipline ?? "Séance"} — ${row.date ?? ""}`.trim() : `Sport #${id}`;
    }
    case "psy_observation": {
      const row = await db.prepare("SELECT date, heure FROM psy_observations WHERE id = ?").get(id) as
        { date?: string; heure?: string } | undefined;
      return row ? `Observation — ${row.date ?? ""}${row.heure ? " " + row.heure : ""}` : `Observation #${id}`;
    }
    default:
      return `${type} #${id}`;
  }
}
