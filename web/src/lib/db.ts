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
  addCol("sport", "pdf_path", "TEXT");
  addCol("nutrition_profile", "day_types", "TEXT");
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
