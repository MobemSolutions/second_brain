import { createClient, type Client, type InArgs, type InValue } from "@libsql/client";

export interface Stmt {
  get(...args: InValue[]): Promise<Record<string, unknown> | undefined>;
  all(...args: InValue[]): Promise<Record<string, unknown>[]>;
  run(...args: InValue[]): Promise<{ lastInsertRowid: number; changes: number }>;
}

export interface Db {
  prepare(sql: string): Stmt;
  exec(sql: string): Promise<void>;
}

let _client: Client | null = null;
let _ready: Promise<void> | null = null;

function rowToObject(row: Record<string, unknown>): Record<string, unknown> {
  return { ...row };
}

function wrap(client: Client): Db {
  return {
    prepare(sql: string): Stmt {
      return {
        async get(...args: InValue[]) {
          const r = await client.execute({ sql, args: args as InArgs });
          return r.rows[0] ? rowToObject(r.rows[0] as unknown as Record<string, unknown>) : undefined;
        },
        async all(...args: InValue[]) {
          const r = await client.execute({ sql, args: args as InArgs });
          return r.rows.map((row) => rowToObject(row as unknown as Record<string, unknown>));
        },
        async run(...args: InValue[]) {
          const r = await client.execute({ sql, args: args as InArgs });
          return { lastInsertRowid: Number(r.lastInsertRowid ?? 0), changes: r.rowsAffected };
        },
      };
    },
    async exec(sql: string) {
      await client.executeMultiple(sql);
    },
  };
}

export async function getDb(): Promise<Db> {
  if (!_client) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    if (!url) throw new Error("TURSO_DATABASE_URL is not set");
    _client = createClient({ url, authToken });
    _ready = bootstrap(_client);
  }
  await _ready;
  return wrap(_client);
}

async function bootstrap(client: Client): Promise<void> {
  await client.execute("PRAGMA foreign_keys = ON");
  await initSchema(client);
  await migrate(client);
}

async function addCol(client: Client, table: string, col: string, type: string): Promise<void> {
  try { await client.execute(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`); } catch {}
}

async function migrate(client: Client): Promise<void> {
  try {
    await client.execute(`CREATE TABLE IF NOT EXISTS nutrition_profile (
      id              INTEGER PRIMARY KEY CHECK (id = 1),
      poids           REAL,
      taille          INTEGER,
      age             INTEGER,
      sexe            TEXT DEFAULT 'homme',
      masse_grasse    REAL,
      activite        TEXT DEFAULT 'modere',
      objectif        TEXT DEFAULT 'seche',
      deficit         INTEGER DEFAULT -400,
      cible_calories  INTEGER,
      cible_proteines INTEGER,
      cible_glucides  INTEGER,
      cible_lipides   INTEGER
    )`);
  } catch {}
  // pinned_files table (created here if not exists via initSchema, but migrate adds it if DB predates it)
  try {
    await client.execute(`CREATE TABLE IF NOT EXISTS pinned_files (
      key        TEXT PRIMARY KEY,
      pdf_path   TEXT,
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    )`);
  } catch {}
  await addCol(client, "taches", "date_debut", "TEXT");
  await addCol(client, "habitudes", "nofap", "INTEGER DEFAULT 0");
  await addCol(client, "habitudes", "brossage_matin", "INTEGER DEFAULT 0");
  await addCol(client, "habitudes", "brossage_soir", "INTEGER DEFAULT 0");
  await addCol(client, "habitudes", "gratte_langue", "INTEGER DEFAULT 0");
  await addCol(client, "habitudes", "fil_dentaire", "INTEGER DEFAULT 0");
  await addCol(client, "habitudes", "creme_solaire", "INTEGER DEFAULT 0");
  await addCol(client, "habitudes", "soin_peau_soir", "INTEGER DEFAULT 0");
  await addCol(client, "habitudes", "skin_icing", "INTEGER DEFAULT 0");
  await addCol(client, "habitudes", "gouttes_cernes", "INTEGER DEFAULT 0");
  await addCol(client, "habitudes", "bonnet_satin", "INTEGER DEFAULT 0");
  await addCol(client, "habitudes", "flexibilite", "INTEGER DEFAULT 0");
  await addCol(client, "habitudes", "jawline", "INTEGER DEFAULT 0");
  await addCol(client, "habitudes", "neck_curls", "INTEGER DEFAULT 0");
  await addCol(client, "habitudes", "soin_visage_lavage", "INTEGER DEFAULT 0");
  await addCol(client, "habitudes", "soin_visage_rincage", "INTEGER DEFAULT 0");
  await addCol(client, "habitudes", "soin_visage_creme", "INTEGER DEFAULT 0");
  await addCol(client, "habitudes", "bain_bouche", "INTEGER DEFAULT 0");
  await addCol(client, "habitudes", "exfoliant", "INTEGER DEFAULT 0");
  await addCol(client, "habitudes", "epilation_sourcils", "INTEGER DEFAULT 0");
  await addCol(client, "habitudes", "rasage_corps", "INTEGER DEFAULT 0");
  await addCol(client, "habitudes", "rasage_barbe", "INTEGER DEFAULT 0");
  await addCol(client, "habitudes", "pastille_dentaire", "INTEGER DEFAULT 0");
  await addCol(client, "habitudes", "pas", "INTEGER");
  await addCol(client, "habitudes", "poids", "REAL");
  await addCol(client, "habitudes", "pompes", "INTEGER");
  await addCol(client, "sport", "pdf_path", "TEXT");
  await addCol(client, "nutrition_profile", "day_types", "TEXT");
  await addCol(client, "nutrition", "day_type", "TEXT");
  await addCol(client, "media", "description", "TEXT");
  await addCol(client, "media", "casting", "TEXT");
  await addCol(client, "projets", "description", "TEXT");
  await addCol(client, "projets", "couleur", "TEXT");
  try {
    await client.execute(`CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    )`);
  } catch {}
  try {
    await client.execute(`CREATE TABLE IF NOT EXISTS psy_seances (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      date       TEXT NOT NULL,
      titre      TEXT,
      notes      TEXT,
      pdf_path   TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )`);
  } catch {}
  try {
    await client.execute(`CREATE TABLE IF NOT EXISTS psy_exercices (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      date       TEXT NOT NULL,
      titre      TEXT NOT NULL,
      contenu    TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )`);
  } catch {}
  await addCol(client, "psy_exercices", "heure", "TEXT");
  await addCol(client, "psy_exercices", "sensation", "TEXT");
  await addCol(client, "psy_exercices", "intelligence", "TEXT");
  await addCol(client, "psy_exercices", "monde", "TEXT");
  try {
    await client.execute(`CREATE TABLE IF NOT EXISTS psy_observations (
      id                       INTEGER PRIMARY KEY AUTOINCREMENT,
      date                     TEXT NOT NULL,
      heure                    TEXT,
      contexte                 TEXT,
      emotions                 TEXT,
      pensees                  TEXT,
      comportements            TEXT,
      comportements_entourage  TEXT,
      created_at               TEXT DEFAULT (datetime('now','localtime'))
    )`);
  } catch {}
  try {
    await client.execute(`CREATE TABLE IF NOT EXISTS planning_templates (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      nom        TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )`);
  } catch {}
  try {
    await client.execute(`CREATE TABLE IF NOT EXISTS planning_cartes (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER NOT NULL REFERENCES planning_templates(id) ON DELETE CASCADE,
      titre       TEXT NOT NULL,
      emoji       TEXT,
      couleur     TEXT,
      created_at  TEXT DEFAULT (datetime('now','localtime'))
    )`);
  } catch {}
  try {
    await client.execute(`CREATE TABLE IF NOT EXISTS planning_creneaux (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id  INTEGER NOT NULL REFERENCES planning_templates(id) ON DELETE CASCADE,
      carte_id     INTEGER NOT NULL REFERENCES planning_cartes(id) ON DELETE CASCADE,
      jour         INTEGER NOT NULL,
      heure_debut  TEXT NOT NULL,
      heure_fin    TEXT NOT NULL,
      created_at   TEXT DEFAULT (datetime('now','localtime'))
    )`);
  } catch {}
  try {
    await client.execute(`CREATE TABLE IF NOT EXISTS courses (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      titre      TEXT NOT NULL,
      categorie  TEXT,
      tags       TEXT,
      prix       REAL,
      lien       TEXT,
      achete     INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )`);
  } catch {}
  try {
    await client.execute(`CREATE TABLE IF NOT EXISTS habit_definitions (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      cle          TEXT NOT NULL UNIQUE,
      label        TEXT NOT NULL,
      emoji        TEXT,
      type         TEXT NOT NULL,
      section      TEXT NOT NULL,
      unite        TEXT,
      cible        REAL,
      target_freq  TEXT,
      score_impact TEXT NOT NULL DEFAULT 'aucun',
      actif        INTEGER DEFAULT 1,
      created_at   TEXT DEFAULT (datetime('now','localtime'))
    )`);
  } catch {}
  await addCol(client, "habit_definitions", "ordre", "INTEGER DEFAULT 0");
  try {
    await client.execute(`CREATE TABLE IF NOT EXISTS habit_values (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      date     TEXT NOT NULL,
      habit_id INTEGER NOT NULL REFERENCES habit_definitions(id) ON DELETE CASCADE,
      valeur   REAL,
      UNIQUE(date, habit_id)
    )`);
  } catch {}
  await addCol(client, "inbox", "destination_id", "INTEGER");
  await addCol(client, "taches", "inbox_id", "INTEGER REFERENCES inbox(id) ON DELETE SET NULL");
  await addCol(client, "projets", "inbox_id", "INTEGER REFERENCES inbox(id) ON DELETE SET NULL");
  await migrateHabitsV2(client);
}

interface HabitSeed {
  cle: string; label: string; type: "checkbox" | "metric";
  section: "metriques" | "general" | "matin" | "soir" | "ponctuel";
  unite?: string; cible?: number; target_freq?: string;
  score_impact: "positif" | "negatif" | "aucun";
  oldCol: string;
}

const HABIT_SEED: HabitSeed[] = [
  { cle: "sommeil", label: "😴 Sommeil", type: "metric", section: "metriques", unite: "heures", cible: 7, score_impact: "positif", oldCol: "sommeil" },
  { cle: "eau", label: "💧 Eau", type: "metric", section: "metriques", unite: "litres", cible: 4, score_impact: "positif", oldCol: "eau" },
  { cle: "pas", label: "🚶 Pas", type: "metric", section: "metriques", unite: "pas", cible: 10000, score_impact: "aucun", oldCol: "pas" },
  { cle: "poids", label: "⚖️ Poids", type: "metric", section: "metriques", unite: "kg", score_impact: "aucun", oldCol: "poids" },
  { cle: "pompes", label: "💪 Pompes", type: "metric", section: "metriques", unite: "répétitions", cible: 150, score_impact: "aucun", oldCol: "pompes" },

  { cle: "sport_fait", label: "🏋️ Sport fait", type: "checkbox", section: "general", score_impact: "positif", oldCol: "sport_fait" },
  { cle: "nofap", label: "🔒 Nofap", type: "checkbox", section: "general", score_impact: "positif", oldCol: "nofap" },
  { cle: "alcool", label: "🍷 Alcool", type: "checkbox", section: "general", score_impact: "negatif", oldCol: "alcool" },
  { cle: "ecran_dodo", label: "📱 Écran avant dodo", type: "checkbox", section: "general", score_impact: "negatif", oldCol: "ecran_dodo" },

  { cle: "brossage_matin", label: "🪥 Brossage matin", type: "checkbox", section: "matin", score_impact: "aucun", oldCol: "brossage_matin" },
  { cle: "gratte_langue", label: "👅 Gratte-langue", type: "checkbox", section: "matin", score_impact: "aucun", oldCol: "gratte_langue" },
  { cle: "creme_solaire", label: "☀️ Crème solaire", type: "checkbox", section: "matin", score_impact: "aucun", oldCol: "creme_solaire" },
  { cle: "skin_icing", label: "🧊 Skin icing", type: "checkbox", section: "matin", score_impact: "aucun", oldCol: "skin_icing" },
  { cle: "gouttes_cernes", label: "💧 Gouttes cernes", type: "checkbox", section: "matin", score_impact: "aucun", oldCol: "gouttes_cernes" },
  { cle: "bonnet_satin", label: "🎀 Bonnet satin", type: "checkbox", section: "matin", score_impact: "aucun", oldCol: "bonnet_satin" },
  { cle: "flexibilite", label: "🤸 Flexibilité", type: "checkbox", section: "matin", score_impact: "aucun", oldCol: "flexibilite" },
  { cle: "jawline", label: "🦴 Exercices jawline", type: "checkbox", section: "matin", score_impact: "aucun", oldCol: "jawline" },

  { cle: "brossage_soir", label: "🌙 Brossage soir", type: "checkbox", section: "soir", score_impact: "aucun", oldCol: "brossage_soir" },
  { cle: "fil_dentaire", label: "🦷 Fil dentaire", type: "checkbox", section: "soir", score_impact: "aucun", oldCol: "fil_dentaire" },
  { cle: "soin_visage_lavage", label: "🧼 Lavage visage", type: "checkbox", section: "soir", score_impact: "aucun", oldCol: "soin_visage_lavage" },
  { cle: "soin_visage_rincage", label: "🚿 Rinçage visage", type: "checkbox", section: "soir", score_impact: "aucun", oldCol: "soin_visage_rincage" },
  { cle: "soin_visage_creme", label: "🧴 Crème visage", type: "checkbox", section: "soir", score_impact: "aucun", oldCol: "soin_visage_creme" },
  { cle: "neck_curls", label: "💆 Neck curls", type: "checkbox", section: "soir", score_impact: "aucun", oldCol: "neck_curls" },
  { cle: "lecture", label: "📚 Lecture", type: "checkbox", section: "soir", score_impact: "positif", oldCol: "lecture" },

  { cle: "bain_bouche", label: "🦷 Bain de bouche", type: "checkbox", section: "ponctuel", target_freq: "1-2x/jour", score_impact: "aucun", oldCol: "bain_bouche" },
  { cle: "exfoliant", label: "✨ Exfoliant visage", type: "checkbox", section: "ponctuel", target_freq: "2-3x/semaine", score_impact: "aucun", oldCol: "exfoliant" },
  { cle: "epilation_sourcils", label: "👁️ Épilation sourcils", type: "checkbox", section: "ponctuel", score_impact: "aucun", oldCol: "epilation_sourcils" },
  { cle: "rasage_corps", label: "🪒 Rasage corps", type: "checkbox", section: "ponctuel", score_impact: "aucun", oldCol: "rasage_corps" },
  { cle: "rasage_barbe", label: "🪒 Rasage barbe", type: "checkbox", section: "ponctuel", score_impact: "aucun", oldCol: "rasage_barbe" },
  { cle: "pastille_dentaire", label: "🔴 Pastille révélatrice", type: "checkbox", section: "ponctuel", target_freq: "1-2x/semaine", score_impact: "aucun", oldCol: "pastille_dentaire" },
];

async function migrateHabitsV2(client: Client): Promise<void> {
  const flagRes = await client.execute("SELECT value FROM settings WHERE key = 'habits_v2_migrated'");
  const flag = flagRes.rows[0] as unknown as { value: string } | undefined;
  if (flag?.value === "1") return;

  const cleToId = new Map<string, number>();
  const sectionCounters: Record<string, number> = {};
  for (const s of HABIT_SEED) {
    const ordre = sectionCounters[s.section] ?? 0;
    sectionCounters[s.section] = ordre + 1;
    await client.execute({
      sql: `INSERT OR IGNORE INTO habit_definitions (cle, label, type, section, unite, cible, target_freq, score_impact, ordre)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [s.cle, s.label, s.type, s.section, s.unite ?? null, s.cible ?? null, s.target_freq ?? null, s.score_impact, ordre],
    });
    const row = (await client.execute({ sql: "SELECT id FROM habit_definitions WHERE cle = ?", args: [s.cle] })).rows[0] as unknown as { id: number };
    cleToId.set(s.cle, row.id);
  }

  const oldRows = (await client.execute("SELECT * FROM habitudes")).rows as unknown as Record<string, unknown>[];
  for (const row of oldRows) {
    for (const s of HABIT_SEED) {
      const v = row[s.oldCol];
      if (v !== null && v !== undefined) {
        await client.execute({
          sql: "INSERT OR IGNORE INTO habit_values (date, habit_id, valeur) VALUES (?, ?, ?)",
          args: [row.date as string, cleToId.get(s.cle)!, v as number],
        });
      }
    }
  }

  await client.execute(
    `INSERT INTO settings (key, value) VALUES ('habits_v2_migrated', '1')
     ON CONFLICT(key) DO UPDATE SET value = '1'`
  );
}

async function initSchema(client: Client): Promise<void> {
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS inbox (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      titre      TEXT NOT NULL,
      type       TEXT DEFAULT 'note',
      contexte   TEXT,
      priorite   TEXT DEFAULT 'moyenne',
      url        TEXT,
      traite     INTEGER DEFAULT 0,
      destination TEXT,
      destination_id INTEGER,
      notes      TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS projets (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      titre          TEXT NOT NULL,
      statut         TEXT DEFAULT 'a_faire',
      priorite       TEXT DEFAULT 'normal',
      piliers        TEXT,
      date_debut     TEXT,
      deadline       TEXT,
      avancement     INTEGER DEFAULT 0,
      okr_trimestre  TEXT,
      annee          INTEGER,
      notes          TEXT,
      inbox_id       INTEGER REFERENCES inbox(id) ON DELETE SET NULL,
      created_at     TEXT DEFAULT (datetime('now','localtime')),
      updated_at     TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS taches (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      titre          TEXT NOT NULL,
      projet_id      INTEGER REFERENCES projets(id) ON DELETE SET NULL,
      statut         TEXT DEFAULT 'a_faire',
      priorite       TEXT DEFAULT 'moyenne',
      date_echeance  TEXT,
      duree_estimee  INTEGER,
      contexte       TEXT,
      energie        TEXT,
      notes          TEXT,
      inbox_id       INTEGER REFERENCES inbox(id) ON DELETE SET NULL,
      created_at     TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS sport (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      discipline       TEXT NOT NULL,
      date             TEXT NOT NULL,
      duree            INTEGER,
      rpe              INTEGER,
      meteo            TEXT,
      notes            TEXT,
      groupe_musculaire TEXT,
      exercice         TEXT,
      series           INTEGER,
      repetitions      INTEGER,
      charge           REAL,
      programme        TEXT,
      type_course      TEXT,
      distance         REAL,
      temps_min        REAL,
      denivele         INTEGER,
      fc_moyenne       INTEGER,
      site             TEXT,
      voie             TEXT,
      cotation         TEXT,
      style_escalade   TEXT,
      resultat         TEXT,
      sommet           TEXT,
      massif           TEXT,
      altitude         INTEGER,
      cotation_globale TEXT,
      partenaires      TEXT,
      bivouac          INTEGER DEFAULT 0,
      rapport          TEXT,
      pdf_path         TEXT,
      created_at       TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS habitudes (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      date       TEXT NOT NULL UNIQUE,
      sommeil    REAL,
      eau        REAL,
      meditation INTEGER,
      lecture    INTEGER,
      sport_fait INTEGER DEFAULT 0,
      alcool     INTEGER DEFAULT 0,
      ecran_dodo INTEGER DEFAULT 0,
      nofap      INTEGER DEFAULT 0,
      humeur     INTEGER,
      energie    INTEGER,
      notes      TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS abonnements (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      service             TEXT NOT NULL,
      categorie           TEXT,
      prix                REAL,
      frequence           TEXT DEFAULT 'mensuel',
      date_renouvellement TEXT,
      auto_renouvellement INTEGER DEFAULT 1,
      valeur_percue       INTEGER,
      actif               INTEGER DEFAULT 1,
      notes               TEXT,
      created_at          TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS media (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      titre      TEXT NOT NULL,
      type       TEXT NOT NULL,
      statut     TEXT DEFAULT 'a_voir',
      note       INTEGER,
      date_fin   TEXT,
      genre      TEXT,
      createur   TEXT,
      plateforme TEXT,
      avis       TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS nutrition (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      date       TEXT NOT NULL UNIQUE,
      calories   INTEGER,
      proteines  REAL,
      glucides   REAL,
      lipides    REAL,
      notes      TEXT,
      pdf_path   TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
  `);
}
