import { DatabaseSync } from "node:sqlite";
import path from "path";
import { mkdirSync } from "fs";

let _db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (_db) return _db;

  const dbPath =
    process.env.DB_PATH ||
    path.join(process.cwd(), "data", "second_brain.db");

  try {
    mkdirSync(path.dirname(dbPath), { recursive: true });
  } catch {}

  _db = new DatabaseSync(dbPath);
  _db.exec("PRAGMA journal_mode = WAL");
  _db.exec("PRAGMA foreign_keys = ON");

  initSchema(_db);
  migrate(_db);
  return _db;
}

function migrate(db: DatabaseSync): void {
  const addCol = (table: string, col: string, type: string) => {
    try { db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`); } catch {}
  };
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS nutrition_profile (
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
    db.exec(`CREATE TABLE IF NOT EXISTS pinned_files (
      key        TEXT PRIMARY KEY,
      pdf_path   TEXT,
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    )`);
  } catch {}
  addCol("taches", "date_debut", "TEXT");
  addCol("habitudes", "nofap", "INTEGER DEFAULT 0");
  addCol("habitudes", "brossage_matin", "INTEGER DEFAULT 0");
  addCol("habitudes", "brossage_soir", "INTEGER DEFAULT 0");
  addCol("habitudes", "gratte_langue", "INTEGER DEFAULT 0");
  addCol("habitudes", "fil_dentaire", "INTEGER DEFAULT 0");
  addCol("habitudes", "creme_solaire", "INTEGER DEFAULT 0");
  addCol("habitudes", "soin_peau_soir", "INTEGER DEFAULT 0");
  addCol("habitudes", "skin_icing", "INTEGER DEFAULT 0");
  addCol("habitudes", "gouttes_cernes", "INTEGER DEFAULT 0");
  addCol("habitudes", "bonnet_satin", "INTEGER DEFAULT 0");
  addCol("habitudes", "flexibilite", "INTEGER DEFAULT 0");
  addCol("habitudes", "jawline", "INTEGER DEFAULT 0");
  addCol("habitudes", "neck_curls", "INTEGER DEFAULT 0");
  addCol("habitudes", "soin_visage_lavage", "INTEGER DEFAULT 0");
  addCol("habitudes", "soin_visage_rincage", "INTEGER DEFAULT 0");
  addCol("habitudes", "soin_visage_creme", "INTEGER DEFAULT 0");
  addCol("habitudes", "bain_bouche", "INTEGER DEFAULT 0");
  addCol("habitudes", "exfoliant", "INTEGER DEFAULT 0");
  addCol("habitudes", "epilation_sourcils", "INTEGER DEFAULT 0");
  addCol("habitudes", "rasage_corps", "INTEGER DEFAULT 0");
  addCol("habitudes", "rasage_barbe", "INTEGER DEFAULT 0");
  addCol("habitudes", "pastille_dentaire", "INTEGER DEFAULT 0");
  addCol("habitudes", "pas", "INTEGER");
  addCol("habitudes", "poids", "REAL");
  addCol("habitudes", "pompes", "INTEGER");
  addCol("sport", "pdf_path", "TEXT");
  addCol("nutrition_profile", "day_types", "TEXT");
  addCol("nutrition", "day_type", "TEXT");
  addCol("media", "description", "TEXT");
  addCol("media", "casting", "TEXT");
  addCol("projets", "description", "TEXT");
  addCol("projets", "couleur", "TEXT");
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    )`);
  } catch {}
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS psy_seances (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      date       TEXT NOT NULL,
      titre      TEXT,
      notes      TEXT,
      pdf_path   TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )`);
  } catch {}
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS psy_exercices (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      date       TEXT NOT NULL,
      titre      TEXT NOT NULL,
      contenu    TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )`);
  } catch {}
  addCol("psy_exercices", "heure", "TEXT");
  addCol("psy_exercices", "sensation", "TEXT");
  addCol("psy_exercices", "intelligence", "TEXT");
  addCol("psy_exercices", "monde", "TEXT");
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS psy_observations (
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
    db.exec(`CREATE TABLE IF NOT EXISTS planning_templates (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      nom        TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )`);
  } catch {}
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS planning_cartes (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER NOT NULL REFERENCES planning_templates(id) ON DELETE CASCADE,
      titre       TEXT NOT NULL,
      emoji       TEXT,
      couleur     TEXT,
      created_at  TEXT DEFAULT (datetime('now','localtime'))
    )`);
  } catch {}
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS planning_creneaux (
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
    db.exec(`CREATE TABLE IF NOT EXISTS courses (
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
    db.exec(`CREATE TABLE IF NOT EXISTS habit_definitions (
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
  addCol("habit_definitions", "ordre", "INTEGER DEFAULT 0");
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS habit_values (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      date     TEXT NOT NULL,
      habit_id INTEGER NOT NULL REFERENCES habit_definitions(id) ON DELETE CASCADE,
      valeur   REAL,
      UNIQUE(date, habit_id)
    )`);
  } catch {}
  migrateHabitsV2(db);
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

function migrateHabitsV2(db: DatabaseSync): void {
  const flag = db.prepare("SELECT value FROM settings WHERE key = 'habits_v2_migrated'").get() as { value: string } | undefined;
  if (flag?.value === "1") return;

  const insertDef = db.prepare(
    `INSERT OR IGNORE INTO habit_definitions (cle, label, type, section, unite, cible, target_freq, score_impact, ordre)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const cleToId = new Map<string, number>();
  const sectionCounters: Record<string, number> = {};
  for (const s of HABIT_SEED) {
    const ordre = sectionCounters[s.section] ?? 0;
    sectionCounters[s.section] = ordre + 1;
    insertDef.run(s.cle, s.label, s.type, s.section, s.unite ?? null, s.cible ?? null, s.target_freq ?? null, s.score_impact, ordre);
    const row = db.prepare("SELECT id FROM habit_definitions WHERE cle = ?").get(s.cle) as { id: number };
    cleToId.set(s.cle, row.id);
  }

  const oldRows = db.prepare("SELECT * FROM habitudes").all() as Record<string, unknown>[];
  const insertVal = db.prepare(
    `INSERT OR IGNORE INTO habit_values (date, habit_id, valeur) VALUES (?, ?, ?)`
  );
  for (const row of oldRows) {
    for (const s of HABIT_SEED) {
      const v = row[s.oldCol];
      if (v !== null && v !== undefined) {
        insertVal.run(row.date as string, cleToId.get(s.cle)!, v as number);
      }
    }
  }

  db.prepare(
    `INSERT INTO settings (key, value) VALUES ('habits_v2_migrated', '1')
     ON CONFLICT(key) DO UPDATE SET value = '1'`
  ).run();
}

function initSchema(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS inbox (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      titre      TEXT NOT NULL,
      type       TEXT DEFAULT 'note',
      contexte   TEXT,
      priorite   TEXT DEFAULT 'moyenne',
      url        TEXT,
      traite     INTEGER DEFAULT 0,
      destination TEXT,
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
