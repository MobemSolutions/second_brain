#!/usr/bin/env python3
"""
Second Brain Notion — Script de création automatique
Crée toutes les bases de données, propriétés et relations via l'API Notion.

Prérequis :
    pip install -r requirements.txt

Variables d'environnement (.env) :
    NOTION_TOKEN=secret_xxx
    NOTION_PARENT_PAGE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

Usage :
    python notion_setup.py
"""

import os
import time
from typing import Optional

from notion_client import Client
from dotenv import load_dotenv

load_dotenv()

notion = Client(auth=os.environ["NOTION_TOKEN"])
PARENT_PAGE_ID = os.environ["NOTION_PARENT_PAGE_ID"]


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _rt(text: str) -> list[dict]:
    """Rich text array."""
    return [{"type": "text", "text": {"content": text}}]


def _sleep():
    """Avoid Notion API rate limits (3 req/s)."""
    time.sleep(0.4)


def create_database(parent_id: str, title: str, properties: dict, emoji: str = "") -> dict:
    full_title = f"{emoji} {title}" if emoji else title
    print(f"  + DB  : {full_title}")
    db = notion.databases.create(
        parent={"type": "page_id", "page_id": parent_id},
        title=_rt(full_title),
        icon={"type": "emoji", "emoji": emoji} if emoji else None,
        properties=properties,
    )
    _sleep()
    return db


def create_page(parent_id: str, title: str, emoji: str = "") -> dict:
    full_title = f"{emoji} {title}" if emoji else title
    print(f"  + Page: {full_title}")
    page = notion.pages.create(
        parent={"type": "page_id", "page_id": parent_id},
        properties={"title": {"title": _rt(full_title)}},
        icon={"type": "emoji", "emoji": emoji} if emoji else None,
    )
    _sleep()
    return page


def update_db(db_id: str, new_properties: dict, label: str = "") -> None:
    if label:
        print(f"  ~ REL : {label}")
    notion.databases.update(database_id=db_id, properties=new_properties)
    _sleep()


# ─────────────────────────────────────────────────────────────────────────────
# PROPERTY TYPE BUILDERS
# ─────────────────────────────────────────────────────────────────────────────

def _colors():
    return ["default", "gray", "brown", "red", "orange",
            "yellow", "green", "blue", "purple", "pink"]


def select_prop(options: list[str], colors: Optional[list[str]] = None) -> dict:
    pal = colors or _colors()
    return {
        "type": "select",
        "select": {
            "options": [
                {"name": opt, "color": pal[i % len(pal)]}
                for i, opt in enumerate(options)
            ]
        },
    }


def multi_select_prop(options: list[str]) -> dict:
    pal = ["blue", "green", "red", "orange", "purple",
           "pink", "yellow", "gray", "brown", "default"]
    return {
        "type": "multi_select",
        "multi_select": {
            "options": [
                {"name": opt, "color": pal[i % len(pal)]}
                for i, opt in enumerate(options)
            ]
        },
    }


def number_prop(fmt: str = "number") -> dict:
    return {"type": "number", "number": {"format": fmt}}


def date_prop() -> dict:
    return {"type": "date", "date": {}}


def checkbox_prop() -> dict:
    return {"type": "checkbox", "checkbox": {}}


def url_prop() -> dict:
    return {"type": "url", "url": {}}


def text_prop() -> dict:
    return {"type": "rich_text", "rich_text": {}}


def formula_prop(expression: str) -> dict:
    return {"type": "formula", "formula": {"expression": expression}}


def relation_prop(db_id: str, dual: bool = True) -> dict:
    if dual:
        return {
            "type": "relation",
            "relation": {
                "database_id": db_id,
                "type": "dual_property",
                "dual_property": {},
            },
        }
    return {
        "type": "relation",
        "relation": {
            "database_id": db_id,
            "type": "single_property",
            "single_property": {},
        },
    }


def rollup_prop(relation_name: str, rollup_property: str, function: str) -> dict:
    return {
        "type": "rollup",
        "rollup": {
            "relation_property_name": relation_name,
            "rollup_property_name": rollup_property,
            "function": function,
        },
    }


def files_prop() -> dict:
    return {"type": "files", "files": {}}


def created_time_prop() -> dict:
    return {"type": "created_time", "created_time": {}}


def last_edited_time_prop() -> dict:
    return {"type": "last_edited_time", "last_edited_time": {}}


# ─────────────────────────────────────────────────────────────────────────────
# DATABASE CREATORS
# ─────────────────────────────────────────────────────────────────────────────

def create_inbox(parent_id: str) -> dict:
    return create_database(
        parent_id=parent_id,
        title="Inbox",
        emoji="📥",
        properties={
            "Titre": {"title": {}},
            "Type": select_prop(
                ["💡 Idée", "✅ Tâche", "🔗 Lien", "📖 Référence", "📝 Note"],
                ["purple", "red", "blue", "green", "gray"],
            ),
            "Contexte": select_prop(
                ["Travail", "Sport", "Personnel", "Apprentissage", "Projet"]
            ),
            "Priorité": select_prop(
                ["🔴 Haute", "🟡 Moyenne", "🟢 Basse"],
                ["red", "yellow", "green"],
            ),
            "URL": url_prop(),
            "Traité": checkbox_prop(),
            "Destination": select_prop(
                ["Projet", "Tâche", "Note ZK", "Wiki", "Bibliothèque", "Archive"]
            ),
            "Notes": text_prop(),
            "Date de capture": created_time_prop(),
            "Alerte": formula_prop(
                'if(prop("Traité"), "✅ Traité", '
                'if(dateBetween(now(), prop("Date de capture"), "days") > 7, '
                '"⚠️ > 7 jours — À traiter !", "📥 En attente"))'
            ),
        },
    )


def create_projets(parent_id: str) -> dict:
    return create_database(
        parent_id=parent_id,
        title="Projets & Objectifs",
        emoji="🎯",
        properties={
            "Titre": {"title": {}},
            "Statut": select_prop(
                ["À faire", "En cours", "En attente", "Terminé", "Archivé"],
                ["default", "blue", "yellow", "green", "gray"],
            ),
            "Priorité": select_prop(
                ["🔴 Critique", "🟡 Important", "🟢 Normal", "⚪ Optionnel"],
                ["red", "yellow", "green", "gray"],
            ),
            "Pilier": multi_select_prop(
                ["Sport", "Culture", "Finance", "Personnel", "Pro", "Santé"]
            ),
            "Date début": date_prop(),
            "Deadline": date_prop(),
            "% Avancement": number_prop("percent"),
            "OKR Trimestre": select_prop(["Q1", "Q2", "Q3", "Q4"]),
            "Année": select_prop(["2025", "2026", "2027"]),
            "Récompense": text_prop(),
            "Notes": text_prop(),
            "Statut Deadline": formula_prop(
                'let(jours, if(empty(prop("Deadline")), 999, '
                'dateBetween(prop("Deadline"), now(), "days")), '
                'if(empty(prop("Deadline")), "📅 Sans deadline", '
                'if(jours < 0, "🔴 Dépassé " + format(abs(jours)) + "j", '
                'if(jours == 0, "🔴 AUJOURD\'HUI !", '
                'if(jours <= 7, "🔴 J-" + format(jours), '
                'if(jours <= 30, "🟡 J-" + format(jours), '
                '"🟢 J-" + format(jours)))))))'
            ),
        },
    )


def create_taches(parent_id: str, projets_id: str) -> dict:
    return create_database(
        parent_id=parent_id,
        title="Tâches",
        emoji="✅",
        properties={
            "Titre": {"title": {}},
            "Projet lié": relation_prop(projets_id, dual=True),
            "Statut": select_prop(
                ["À faire", "En cours", "Bloqué", "Terminé"],
                ["default", "blue", "red", "green"],
            ),
            "Priorité": select_prop(
                ["🔴 Haute", "🟡 Moyenne", "🟢 Basse"],
                ["red", "yellow", "green"],
            ),
            "Date": date_prop(),
            "Durée estimée (min)": number_prop(),
            "Contexte": select_prop(["@Bureau", "@Maison", "@Tel", "@Dehors"]),
            "Énergie requise": select_prop(
                ["⚡ Haute", "🔋 Moyenne", "😴 Basse"],
                ["red", "yellow", "gray"],
            ),
            "Notes": text_prop(),
            "Créé le": created_time_prop(),
        },
    )


def create_performance_sport(parent_id: str) -> dict:
    return create_database(
        parent_id=parent_id,
        title="Performance Sport",
        emoji="🏋️",
        properties={
            # ── Communes ──────────────────────────────────────────────────────
            "Titre": {"title": {}},
            "Discipline": select_prop(
                ["💪 Musculation", "🏃 Running", "🧗 Escalade", "🏔️ Alpinisme"],
                ["red", "blue", "green", "purple"],
            ),
            "Date": date_prop(),
            "Durée (min)": number_prop(),
            "RPE": number_prop(),
            "Météo": select_prop(
                ["☀️ Beau", "🌤️ Nuageux", "🌧️ Pluie", "❄️ Neige", "🌨️ Blizzard"]
            ),
            "Notes": text_prop(),
            # ── Musculation ───────────────────────────────────────────────────
            "Groupe musculaire": multi_select_prop(
                ["Dos", "Pectoraux", "Épaules", "Biceps", "Triceps",
                 "Jambes", "Abdos", "Full body"]
            ),
            "Exercice": text_prop(),
            "Séries": number_prop(),
            "Répétitions": number_prop(),
            "Charge (kg)": number_prop(),
            "Volume total": formula_prop(
                'prop("Séries") * prop("Répétitions") * prop("Charge (kg)")'
            ),
            "Ressenti": number_prop(),
            "Programme": select_prop(
                ["PPL", "5x5", "Hypertrophie", "Force", "Full Body", "Libre"]
            ),
            # ── Running ───────────────────────────────────────────────────────
            "Type course": select_prop(
                ["Endurance", "Fractionné", "Trail", "Récupération", "Compétition"]
            ),
            "Distance (km)": number_prop(),
            "Temps (min)": number_prop(),
            "Allure": formula_prop(
                'let(allure_sec, if(prop("Distance (km)") == 0, 0, '
                'prop("Temps (min)") * 60 / prop("Distance (km)")), '
                'min, floor(allure_sec / 60), '
                'sec, mod(round(allure_sec), 60), '
                'format(min) + ":" + if(sec < 10, "0", "") + format(sec) + " /km")'
            ),
            "Dénivelé (m)": number_prop(),
            "FC moyenne": number_prop(),
            "FC max": number_prop(),
            "Parcours": text_prop(),
            "Charge séance": formula_prop('prop("RPE") * prop("Temps (min)")'),
            # ── Escalade ──────────────────────────────────────────────────────
            "Site": text_prop(),
            "Voie": text_prop(),
            "Cotation": select_prop([
                "4", "4+", "5a", "5b", "5c",
                "6a", "6a+", "6b", "6b+", "6c", "6c+",
                "7a", "7a+", "7b", "7b+", "7c", "7c+",
                "8a", "8a+",
            ]),
            "Style escalade": select_prop(
                ["🪨 Bloc", "📌 Couenne", "🏔️ Grande voie", "🧊 Dry-tooling"]
            ),
            "Résultat": select_prop(
                ["🌟 Flash", "✅ Enchainement", "👀 À vue", "🔧 Travaillée", "📌 Projet"],
                ["yellow", "green", "blue", "orange", "red"],
            ),
            "Tentatives": number_prop(),
            # ── Alpinisme ─────────────────────────────────────────────────────
            "Sommet/Objectif": text_prop(),
            "Massif": select_prop([
                "Mont-Blanc", "Écrins", "Vanoise", "Chartreuse",
                "Vercors", "Jura", "Alpes Suisses", "Pyrénées", "Autre",
            ]),
            "Altitude (m)": number_prop(),
            "Cotation globale": select_prop(
                ["F", "PD-", "PD", "PD+", "AD-", "AD", "AD+",
                 "D-", "D", "D+", "TD-", "TD", "TD+", "ED"]
            ),
            "Nom voie": text_prop(),
            "Partenaires": text_prop(),
            "Conditions nivo": select_prop(
                ["1 - Faible", "2 - Limité", "3 - Marqué", "4 - Fort", "5 - Très fort"],
                ["green", "yellow", "orange", "red", "red"],
            ),
            "Matériel utilisé": multi_select_prop([
                "Crampons", "Piolet", "Corde 60m", "Sangles", "Friends",
                "Coinceurs", "Broches à glace", "Skis", "DVA",
            ]),
            "Bivouac": checkbox_prop(),
            "Rapport de course": text_prop(),
            "Photos": files_prop(),
        },
    )


def create_wiki_montagne(parent_id: str) -> dict:
    return create_database(
        parent_id=parent_id,
        title="Wiki Montagne",
        emoji="⛰️",
        properties={
            "Titre": {"title": {}},
            "Catégorie": select_prop([
                "🪢 Techniques de corde", "🚨 Secours", "❄️ Nivologie",
                "🗺️ Cartographie", "🌤️ Météo", "🎒 Matériel", "🏔️ Général",
            ]),
            "Niveau requis": select_prop(
                ["🟢 Débutant", "🟡 Intermédiaire", "🔴 Expert"],
                ["green", "yellow", "red"],
            ),
            "Contenu": text_prop(),
            "Source/Référence": text_prop(),
            "Validé": checkbox_prop(),
            "Dernière révision": date_prop(),
            "Fréquence révision (j)": number_prop(),
            "Prochaine révision": formula_prop(
                'if(empty(prop("Dernière révision")), now(), '
                'dateAdd(prop("Dernière révision"), prop("Fréquence révision (j)"), "days"))'
            ),
            "Statut révision": formula_prop(
                'if(not(prop("Validé")), "📖 En apprentissage", '
                'if(dateBetween(now(), prop("Prochaine révision"), "days") > 0, '
                '"⚠️ Révision due", "✅ À jour"))'
            ),
            "Média": url_prop(),
        },
    )


def create_bibliotheque(parent_id: str) -> dict:
    return create_database(
        parent_id=parent_id,
        title="Bibliothèque",
        emoji="📚",
        properties={
            "Titre": {"title": {}},
            "Type": select_prop([
                "📖 Livre", "🎬 Film", "📺 Série", "🎧 Podcast",
                "🎮 Jeu vidéo", "📰 Article", "🎤 Talk",
            ]),
            "Auteur/Réalisateur": text_prop(),
            "Genre": multi_select_prop([
                "SF", "Thriller", "Dév. personnel", "Sport", "Histoire",
                "Nature", "Tech", "Philo", "Montagne", "Fiction",
            ]),
            "Statut": select_prop(
                ["📋 À faire", "🔄 En cours", "✅ Terminé", "❌ Abandonné"],
                ["default", "blue", "green", "red"],
            ),
            "Note": number_prop(),
            "Date fin": date_prop(),
            "Recommandé par": text_prop(),
            "Tags thématiques": multi_select_prop([
                "Montagne", "Leadership", "Performance", "Mindset",
                "Science", "Fiction", "Santé", "Finance",
            ]),
            "Couverture": files_prop(),
            "Avis": text_prop(),
        },
    )


def create_notes_zettelkasten(parent_id: str) -> dict:
    return create_database(
        parent_id=parent_id,
        title="Notes Zettelkasten",
        emoji="🗃️",
        properties={
            "Titre": {"title": {}},
            "Type": select_prop(
                ["💭 Fleeting", "📝 Literature", "💎 Permanent"],
                ["gray", "blue", "purple"],
            ),
            "Statut": select_prop(
                ["Brouillon", "À traiter", "Traité", "Archivé"],
                ["gray", "yellow", "green", "default"],
            ),
            "Tags": multi_select_prop([
                "Montagne", "Performance", "Finance", "Personnel",
                "Pro", "Santé", "Tech", "Philo",
            ]),
            "Mots-clés": text_prop(),
            "Date création": created_time_prop(),
            "Dernière modif": last_edited_time_prop(),
        },
    )


def create_abonnements(parent_id: str) -> dict:
    return create_database(
        parent_id=parent_id,
        title="Abonnements",
        emoji="💰",
        properties={
            "Service": {"title": {}},
            "Catégorie": select_prop([
                "🎬 Streaming", "🏋️ Sport", "💻 Logiciel",
                "🏥 Santé", "📰 Info", "🎮 Gaming", "Autre",
            ]),
            "Prix": number_prop("euro"),
            "Fréquence": select_prop(
                ["Mensuel", "Trimestriel", "Annuel"],
                ["green", "yellow", "blue"],
            ),
            "Date renouvellement": date_prop(),
            "Auto-renouvellement": checkbox_prop(),
            "Valeur perçue": number_prop(),
            "Actif": checkbox_prop(),
            "Coût mensuel": formula_prop(
                'if(prop("Fréquence") == "Mensuel", prop("Prix"), '
                'if(prop("Fréquence") == "Trimestriel", prop("Prix") / 3, '
                'prop("Prix") / 12))'
            ),
            "Alerte": formula_prop(
                'let(jours, dateBetween(prop("Date renouvellement"), now(), "days"), '
                'if(not(prop("Actif")), "⚫ Inactif", '
                'if(empty(prop("Date renouvellement")), "❓ Date manquante", '
                'if(jours < 0, "🔴 Expiré", '
                'if(jours <= 7, "🔴 " + format(jours) + "j — IMMINENT", '
                'if(jours <= 30, "🟡 " + format(jours) + "j", '
                '"🟢 " + format(jours) + "j"))))))'
            ),
            "Notes": text_prop(),
        },
    )


def create_recettes(parent_id: str) -> dict:
    return create_database(
        parent_id=parent_id,
        title="Recettes",
        emoji="🍽️",
        properties={
            "Titre": {"title": {}},
            "Type repas": select_prop([
                "🌅 Petit-déj", "🍽️ Déjeuner", "🌙 Dîner", "🍎 Snack",
                "🏋️ Pré-entraînement", "🔄 Récupération",
            ]),
            "Temps prep (min)": number_prop(),
            "Portions": number_prop(),
            "Calories": number_prop(),
            "Protéines (g)": number_prop(),
            "Glucides (g)": number_prop(),
            "Lipides (g)": number_prop(),
            "Tags": multi_select_prop([
                "Vegan", "Végétarien", "Sport", "Rapide",
                "Batch cooking", "Sans gluten", "Économique",
            ]),
            "Instructions": text_prop(),
            "Note": number_prop(),
            "Photos": files_prop(),
        },
    )


def create_ingredients(parent_id: str) -> dict:
    return create_database(
        parent_id=parent_id,
        title="Ingrédients",
        emoji="🛒",
        properties={
            "Nom": {"title": {}},
            "Catégorie": select_prop([
                "Légumes", "Fruits", "Viande", "Poisson",
                "Féculents", "Laitiers", "Épices", "Conserves", "Autres",
            ]),
            "Unité": select_prop(["g", "kg", "ml", "L", "unité", "c.à.s", "c.à.c"]),
            "Quantité par recette": number_prop(),
            "En stock": checkbox_prop(),
            "À acheter": checkbox_prop(),
        },
    )


def create_planning_repas(parent_id: str) -> dict:
    return create_database(
        parent_id=parent_id,
        title="Planning Repas",
        emoji="📅",
        properties={
            "Titre": {"title": {}},
            "Semaine": date_prop(),
            "Jour": select_prop([
                "Lundi", "Mardi", "Mercredi", "Jeudi",
                "Vendredi", "Samedi", "Dimanche",
            ]),
            "Repas": select_prop(["Petit-déj", "Déjeuner", "Dîner", "Snack"]),
        },
    )


def create_habitudes_sante(parent_id: str) -> dict:
    return create_database(
        parent_id=parent_id,
        title="Habitudes & Santé",
        emoji="🧬",
        properties={
            "Date": {"title": {}},
            "Sommeil (h)": number_prop(),
            "Eau (L)": number_prop(),
            "Méditation (min)": number_prop(),
            "Lecture (min)": number_prop(),
            "Sport fait": checkbox_prop(),
            "Alcool": checkbox_prop(),
            "Écran avant dodo": checkbox_prop(),
            "Humeur": number_prop(),
            "Énergie": number_prop(),
            "Notes": text_prop(),
            "Score journalier": formula_prop(
                'let(positives, '
                'toNumber(prop("Sport fait")) + '
                'toNumber(prop("Sommeil (h)") >= 7) + '
                'toNumber(prop("Eau (L)") >= 2) + '
                'toNumber(prop("Méditation (min)") >= 10) + '
                'toNumber(prop("Lecture (min)") >= 20), '
                'negatives, '
                'toNumber(prop("Alcool")) + '
                'toNumber(prop("Écran avant dodo")), '
                'score, positives * 2 - negatives, '
                'if(score > 10, 10, if(score < 0, 0, score)))'
            ),
            "Statut journée": formula_prop(
                'let(s, prop("Score journalier"), '
                'if(s >= 8, "🌟 Excellente", '
                'if(s >= 6, "✅ Bonne", '
                'if(s >= 4, "🟡 Moyenne", "🔴 Difficile"))))'
            ),
        },
    )


# ─────────────────────────────────────────────────────────────────────────────
# CROSS-DATABASE RELATIONS
# ─────────────────────────────────────────────────────────────────────────────

def add_cross_relations(ids: dict) -> None:
    print("\n📎 Ajout des relations inter-bases...")

    # Projets ↔ Notes ZK + Bibliothèque
    update_db(ids["projets"], {
        "Notes liées": relation_prop(ids["notes_zk"]),
        "Ressources": relation_prop(ids["bibliotheque"]),
    }, "Projets ↔ Notes ZK / Bibliothèque")

    # Projets : rollup tâches (après relation dual existante)
    update_db(ids["projets"], {
        "Total tâches": rollup_prop("Tâches liées", "Titre", "count"),
    }, "Projets rollup Total tâches")

    # Notes ZK auto-relation + sources + projets
    update_db(ids["notes_zk"], {
        "Notes liées": relation_prop(ids["notes_zk"]),   # auto-relation
        "Sources liées": relation_prop(ids["bibliotheque"]),
        "Projet lié": relation_prop(ids["projets"]),
        "Alerte": formula_prop(
            'if(and(prop("Type") == "💭 Fleeting", prop("Statut") != "Traité", '
            'dateBetween(now(), prop("Date création"), "hours") > 48), '
            '"🚨 À traiter maintenant !", "")'
        ),
    }, "Notes ZK auto-relation + sources + alerte")

    # Performance Sport ↔ Wiki + Projets
    update_db(ids["sport"], {
        "Wiki lié": relation_prop(ids["wiki_montagne"]),
        "Projet lié": relation_prop(ids["projets"]),
    }, "Sport ↔ Wiki + Projets")

    # Bibliothèque ↔ Notes ZK + Projets (backlinks via duals, ajout si pas fait)
    # Note: les backlinks dual sont automatiques depuis les db sources

    # Recettes ↔ Ingrédients
    update_db(ids["recettes"], {
        "Ingrédients": relation_prop(ids["ingredients"]),
    }, "Recettes ↔ Ingrédients")

    # Planning Repas ↔ Recettes
    update_db(ids["planning_repas"], {
        "Recette liée": relation_prop(ids["recettes"]),
        "Calories": rollup_prop("Recette liée", "Calories", "sum"),
        "Protéines": rollup_prop("Recette liée", "Protéines (g)", "sum"),
    }, "Planning Repas ↔ Recettes + rollups")

    # Habitudes ↔ Sport + Planning
    update_db(ids["habitudes"], {
        "Séance liée": relation_prop(ids["sport"]),
        "Repas lié": relation_prop(ids["planning_repas"]),
    }, "Habitudes ↔ Sport + Planning")

    print("✅ Relations créées !")


# ─────────────────────────────────────────────────────────────────────────────
# SIDEBAR STRUCTURE
# ─────────────────────────────────────────────────────────────────────────────

def create_sidebar_pages(root_id: str) -> dict:
    print("\n📁 Création de la structure Sidebar...")
    sections = [
        ("📌", "Navigation Rapide"),
        ("🎯", "FAIRE — Projets & Tâches"),
        ("⚡", "PERFORMER — Sport & Montagne"),
        ("📚", "SAVOIR — Culture & Notes"),
        ("💡", "VIVRE — Lifestyle"),
        ("🗃️", "Archives"),
    ]
    pages = {}
    for emoji, name in sections:
        pages[name] = create_page(root_id, name, emoji)
    return pages


# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

def main() -> dict:
    print("🧠 Création du Second Brain Notion")
    print("=" * 60)

    # 1. Page racine
    print("\n📄 Page racine...")
    root = create_page(PARENT_PAGE_ID, "Second Brain", "🧠")
    root_id = root["id"]

    # 2. Sidebar
    create_sidebar_pages(root_id)

    # 3. Bases de données (ordre important : les relations dépendent des IDs)
    print("\n🗄️  Bases de données...")
    ids: dict[str, str] = {}

    inbox = create_inbox(root_id)
    ids["inbox"] = inbox["id"]

    projets = create_projets(root_id)
    ids["projets"] = projets["id"]

    # Tâches dépend de Projets (relation immédiate)
    taches = create_taches(root_id, projets["id"])
    ids["taches"] = taches["id"]

    sport = create_performance_sport(root_id)
    ids["sport"] = sport["id"]

    wiki = create_wiki_montagne(root_id)
    ids["wiki_montagne"] = wiki["id"]

    biblio = create_bibliotheque(root_id)
    ids["bibliotheque"] = biblio["id"]

    notes = create_notes_zettelkasten(root_id)
    ids["notes_zk"] = notes["id"]

    abos = create_abonnements(root_id)
    ids["abonnements"] = abos["id"]

    recettes = create_recettes(root_id)
    ids["recettes"] = recettes["id"]

    ingredients = create_ingredients(root_id)
    ids["ingredients"] = ingredients["id"]

    planning = create_planning_repas(root_id)
    ids["planning_repas"] = planning["id"]

    habitudes = create_habitudes_sante(root_id)
    ids["habitudes"] = habitudes["id"]

    # 4. Relations inter-bases
    add_cross_relations(ids)

    # 5. Résumé
    labels = {
        "inbox":        "📥 Inbox",
        "projets":      "🎯 Projets & Objectifs",
        "taches":       "✅ Tâches",
        "sport":        "🏋️ Performance Sport",
        "wiki_montagne":"⛰️ Wiki Montagne",
        "bibliotheque": "📚 Bibliothèque",
        "notes_zk":     "🗃️ Notes Zettelkasten",
        "abonnements":  "💰 Abonnements",
        "recettes":     "🍽️ Recettes",
        "ingredients":  "🛒 Ingrédients",
        "planning_repas":"📅 Planning Repas",
        "habitudes":    "🧬 Habitudes & Santé",
    }

    print("\n" + "=" * 60)
    print("✅ Second Brain créé avec succès !\n")
    print("📊 Bases créées :")
    for key, label in labels.items():
        print(f"   {label:30s}  {ids[key]}")

    root_url = "https://notion.so/" + root_id.replace("-", "")
    print(f"\n🔗 Page racine : {root_url}")

    print("\n⚠️  Étapes manuelles restantes dans Notion :")
    print("   1. Configurer les vues (Gallery, Kanban, Calendar) dans chaque base")
    print("   2. Créer les vues liées filtrées sur la page Dashboard")
    print("   3. Activer le rollup 'Tâches faites' (filtrer Statut = Terminé)")
    print("   4. Ajouter les couvertures et images dans la Bibliothèque")
    print("   5. Tester chaque formule en créant un premier enregistrement")

    return ids


if __name__ == "__main__":
    main()
