# 🧠 Second Brain Notion — Guide d'Implémentation Complet

> Documentation pour un profil actif, sportif (montagne + musculation) et apprenant en continu.  
> Compatible Notion API 2022-06-28 | Formules Notion 2.0 | Généré le 2026-04-29

---

## 📋 Table des Matières

1. [Structure Sidebar](#structure-sidebar)
2. [🏠 Pilier 1 — Dashboard Central](#pilier-1--dashboard-central)
3. [📥 Pilier 2 — Inbox](#pilier-2--inbox)
4. [🎯 Pilier 3 — Projets & Objectifs](#pilier-3--projets--objectifs-okr)
5. [🏋️ Pilier 4 — Performance & Sport](#pilier-4--performance--sport)
6. [⛰️ Pilier 5 — Wiki Montagne](#pilier-5--wiki-dautonomie-montagne)
7. [📚 Pilier 6 — Culture & Savoir](#pilier-6--culture--savoir)
8. [💰 Pilier 7 — Lifestyle & Finances](#pilier-7--lifestyle--finances)
9. [🧬 Pilier 8 — Habitudes & Santé](#pilier-8--habitudes--santé)
10. [🗃️ Pilier 9 — Archives](#pilier-9--archives)
11. [Relations Inter-Bases](#relations-inter-bases)
12. [Formules Obligatoires](#formules-obligatoires)
13. [Quick Start — 5 Premières Étapes](#quick-start--5-premières-étapes)

---

## Structure Sidebar

```
🧠 SECOND BRAIN
│
├── 📌 NAVIGATION RAPIDE
│   ├── 🏠 Dashboard
│   ├── 📥 Inbox  ← capture rapide
│   └── 📅 Agenda du jour (vue liée Tâches)
│
├── 🎯 FAIRE
│   ├── 🎯 Projets & OKR
│   │   ├── 📊 Kanban actif
│   │   ├── 🗓️ Calendrier deadlines
│   │   └── 📈 OKR annuels (vue Galerie / trimestre)
│   └── ✅ Tâches
│
├── ⚡ PERFORMER
│   ├── 🏋️ Performance & Sport
│   │   ├── 💪 Musculation (vue filtrée)
│   │   ├── 🏃 Running (vue filtrée)
│   │   ├── 🧗 Escalade (vue filtrée)
│   │   └── 🏔️ Alpinisme (vue Calendrier)
│   └── ⛰️ Wiki Montagne
│       ├── 🪢 Techniques de corde
│       ├── 🚨 Secours
│       ├── ❄️ Nivologie
│       ├── 🗺️ Cartographie & Navigation
│       ├── 🌤️ Météo Montagne
│       └── 🎒 Matériel
│
├── 📚 SAVOIR
│   ├── 📚 Bibliothèque
│   │   ├── 📖 Livres
│   │   ├── 🎬 Films & Séries
│   │   ├── 🎧 Podcasts
│   │   └── 🎮 Jeux & Articles
│   └── 🗃️ Notes Zettelkasten
│       ├── 💭 Fleeting (à traiter)
│       ├── 📝 Literature (résumés)
│       └── 💎 Permanent (idées)
│
├── 💡 VIVRE
│   ├── 💰 Abonnements
│   ├── 🍽️ Recettes & Repas
│   └── 🧬 Habitudes & Santé
│
└── 🗃️ ARCHIVES
    ├── 📁 Projets terminés
    ├── 📝 Notes inactives
    └── 🔗 Références dépassées
```

---

## Pilier 1 — 🏠 Dashboard Central

### Concept
Page maîtresse **sans base propre** — agrège des vues liées filtrées de toutes les bases. C'est votre cockpit quotidien, ouvert dès le matin.

### Structure de la page (blocs dans l'ordre)

```
╔══════════════════════════════════════════════╗
║  🏠 Dashboard — [Date du jour auto]          ║
╠══════════════╦═══════════════════════════════╣
║  ✅ TO-DO    ║  🎯 PROJETS ACTIFS            ║
║  du Jour     ║  (Kanban simplifié)           ║
╠══════════════╬═══════════════════════════════╣
║  🏋️ SPORT   ║  📚 LECTURE EN COURS          ║
║  à venir     ║                               ║
╠══════════════╩═══════════════════════════════╣
║  💰 ABONNEMENTS À RENOUVELER (alertes 🔴)   ║
╚══════════════════════════════════════════════╝
```

### Configuration de chaque bloc

| Bloc | Type | Base source | Filtre | Tri |
|---|---|---|---|---|
| To-Do du Jour | Vue liée Liste | Tâches | Date = Aujourd'hui & Statut ≠ Terminé | Priorité DESC |
| Projets Actifs | Vue liée Board | Projets | Statut = En cours | % Avancement DESC |
| Sport à venir | Vue liée Table | Performance Sport | Date ≥ Today | Date ASC, limite 5 |
| Lecture en cours | Vue liée Galerie | Bibliothèque | Statut = En cours | Date ajout DESC |
| Abonnements urgents | Vue liée Liste | Abonnements | Alerte = 🔴 & Actif = true | Date renouvellement ASC |

### Formule — Indicateur de Progression (%)

```notion
// Base : Projets & Objectifs | Propriété : "Score progression"
let(
  total, prop("Total tâches"),
  faites, prop("Tâches faites"),
  pct, if(total == 0, 0, round(faites / total * 100)),
  barres, floor(pct / 10),
  format(pct) + "% [" +
    slice("██████████", 0, barres) +
    slice("░░░░░░░░░░", 0, 10 - barres) +
  "]"
)
```

### Formule — Compte à Rebours Deadline Coloré

```notion
// Base : Projets & Objectifs | Propriété : "Statut Deadline"
let(
  jours, if(
    empty(prop("Deadline")),
    999,
    dateBetween(prop("Deadline"), now(), "days")
  ),
  if(empty(prop("Deadline")), "📅 Sans deadline",
  if(jours < 0,  "🔴 Dépassé de " + format(abs(jours)) + "j",
  if(jours == 0, "🔴 AUJOURD'HUI !",
  if(jours <= 7, "🔴 J-" + format(jours),
  if(jours <= 30,"🟡 J-" + format(jours),
                 "🟢 J-" + format(jours))))))
)
```

---

## Pilier 2 — 📥 Inbox

### Concept
Boîte de réception universelle. **Tout** capture ici en 5 secondes, sans réfléchir. Le tri se fait lors de la revue hebdomadaire (dimanche soir, 30 min).

### Vue principale : Liste simple (triée par Date de capture ASC)

### Propriétés

| Propriété | Type Notion | Valeurs / Description |
|---|---|---|
| Titre | Title | Description brève de la capture |
| Type | Select | 💡 Idée / ✅ Tâche / 🔗 Lien / 📖 Référence / 📝 Note |
| Contexte | Select | Travail / Sport / Personnel / Apprentissage / Projet |
| Priorité | Select | 🔴 Haute / 🟡 Moyenne / 🟢 Basse |
| URL | URL | Lien si applicable |
| Traité | Checkbox | Coché = trié et archivé |
| Destination | Select | Projet / Tâche / Note ZK / Wiki / Bibliothèque / Archive |
| Notes | Text | Contexte supplémentaire |
| Date de capture | Created time | Automatique |
| Alerte | Formula | Indicateur d'ancienneté |

### Formule — Alerte Ancienneté

```notion
// Propriété : "Alerte"
if(
  prop("Traité"),
  "✅ Traité",
  if(
    dateBetween(now(), prop("Date de capture"), "days") > 7,
    "⚠️ > 7 jours — À traiter !",
    "📥 En attente"
  )
)
```

### Relations
*(L'Inbox est la source de capture — pas de relations directes. Les éléments sont copiés/déplacés vers les bases cibles lors du tri.)*

### Workflow GTD Hebdomadaire

1. **Ouvrir** la vue `Traité = false`, triée par Date ASC
2. **Pour chaque item** :
   - Actionnable immédiatement (< 2 min) → Faire & cocher Traité
   - Projet ou tâche → Créer dans Projets/Tâches, cocher Traité
   - Connaissance → Créer Note Fleeting dans Zettelkasten, cocher Traité
   - Média à consommer → Ajouter à Bibliothèque (Statut = À faire), cocher Traité
   - Finance/abo → Ajouter à Abonnements, cocher Traité
   - Inutile → Supprimer
3. **Objectif** : 0 item non traité de plus de 7 jours

### Vues disponibles

| Vue | Filtre | Usage |
|---|---|---|
| Capture rapide | Traité = false | Vue de travail quotidienne |
| À traiter d'urgence | Traité = false & Alerte = ⚠️ | Alertes Dashboard |
| Historique | Traité = true | Archivé |

---

## Pilier 3 — 🎯 Projets & Objectifs (OKR)

### Architecture
**2 bases liées** :
- `Projets & Objectifs` — base maîtresse
- `Tâches` — base liée (relation bidirectionnelle)

---

### Base : Projets & Objectifs

#### Vue principale : Kanban
**Colonnes** : `À faire` → `En cours` → `En attente` → `Terminé` → `Archivé`

#### Propriétés

| Propriété | Type Notion | Valeurs / Description |
|---|---|---|
| Titre | Title | Nom du projet ou objectif |
| Statut | Select | À faire / En cours / En attente / Terminé / Archivé |
| Priorité | Select | 🔴 Critique / 🟡 Important / 🟢 Normal / ⚪ Optionnel |
| Pilier | Multi-select | Sport / Culture / Finance / Personnel / Pro / Santé |
| Date début | Date | Date de démarrage |
| Deadline | Date | Échéance cible |
| % Avancement | Number (%) | Mis à jour manuellement ou via rollup |
| Tâches liées | Relation | → Base Tâches (dual) |
| Total tâches | Rollup | COUNT sur Tâches liées |
| Tâches faites | Rollup | COUNT sur Tâches liées où Statut = Terminé |
| Score progression | Formula | Barre de progression calculée |
| Statut Deadline | Formula | Compte à rebours coloré |
| Notes liées | Relation | → Base Notes Zettelkasten (dual) |
| Ressources | Relation | → Base Bibliothèque (dual) |
| OKR Trimestre | Select | Q1 / Q2 / Q3 / Q4 |
| Année | Select | 2025 / 2026 / 2027 |
| Récompense | Text | Motivation personnelle associée |
| Notes | Text | Description et contexte |

#### Formule — Barre de Progression

```notion
// Propriété : "Score progression"
let(
  total, prop("Total tâches"),
  faites, prop("Tâches faites"),
  pct, if(total == 0, 0, round(faites / total * 100)),
  barres, floor(pct / 10),
  format(pct) + "% [" +
    slice("██████████", 0, barres) +
    slice("░░░░░░░░░░", 0, 10 - barres) +
  "]"
)
```

#### Formule — Statut Deadline

```notion
// Propriété : "Statut Deadline"
let(
  jours, if(empty(prop("Deadline")), 999, dateBetween(prop("Deadline"), now(), "days")),
  if(empty(prop("Deadline")),  "📅 Sans deadline",
  if(jours < 0,                "🔴 Dépassé " + format(abs(jours)) + "j",
  if(jours == 0,               "🔴 AUJOURD'HUI !",
  if(jours <= 7,               "🔴 J-" + format(jours),
  if(jours <= 30,              "🟡 J-" + format(jours),
                               "🟢 J-" + format(jours))))))
)
```

#### Vues disponibles

| Vue | Type | Filtre | Groupement |
|---|---|---|---|
| Kanban principal | Board | Statut ≠ Archivé | Par Statut |
| OKR par trimestre | Gallery | (aucun) | Par OKR Trimestre |
| Calendrier deadlines | Calendar | — | Par Deadline |
| Projets actifs | List | Statut = En cours | — |
| Vue Archive | Table | Statut = Archivé | — |

---

### Base : Tâches

#### Propriétés

| Propriété | Type Notion | Valeurs / Description |
|---|---|---|
| Titre | Title | Description de la tâche |
| Projet lié | Relation | → Base Projets & Objectifs (dual) |
| Statut | Select | À faire / En cours / Bloqué / Terminé |
| Priorité | Select | 🔴 Haute / 🟡 Moyenne / 🟢 Basse |
| Date | Date | Échéance ou date prévue |
| Durée estimée (min) | Number | Durée estimée en minutes |
| Contexte | Select | @Bureau / @Maison / @Tel / @Dehors |
| Énergie requise | Select | ⚡ Haute / 🔋 Moyenne / 😴 Basse |
| Notes | Text | Détails supplémentaires |
| Créé le | Created time | Automatique |

#### Workflow OKR Annuel

1. **Janvier** — Définir 3-5 Objectifs annuels dans Projets (Année = 2026, OKR = Q1/Q4)
2. **Chaque trimestre** — Créer 2-4 projets courts liés aux OKR annuels
3. **Chaque semaine (revue hebdo 30 min)** — Vérifier avancement, créer tâches de la semaine
4. **Chaque jour** — Travailler depuis vue Tâches filtrée `Date = Aujourd'hui`
5. **Fin de trimestre** — Archiver les projets terminés, évaluer les OKR

---

## Pilier 4 — 🏋️ Performance & Sport

### Architecture : UNE seule base maîtresse

La base `Performance Sport` contient **toutes les disciplines** grâce au champ `Discipline`. Les vues filtrées créent l'illusion de bases séparées et permettent des propriétés communes (Date, Durée, RPE, Météo).

### Propriétés Communes (toutes disciplines)

| Propriété | Type Notion | Valeurs / Description |
|---|---|---|
| Titre | Title | Auto-généré ou nom de séance |
| Discipline | Select | 💪 Musculation / 🏃 Running / 🧗 Escalade / 🏔️ Alpinisme |
| Date | Date | Date de la séance |
| Durée (min) | Number | Durée totale |
| RPE | Number | Ressenti global 1-10 |
| Météo | Select | ☀️ Beau / 🌤️ Nuageux / 🌧️ Pluie / ❄️ Neige / 🌨️ Blizzard |
| Notes | Text | Commentaire libre |
| Wiki lié | Relation | → Base Wiki Montagne (dual) |
| Projet lié | Relation | → Base Projets & Objectifs (dual) |

---

### Vue : 💪 Musculation

**Filtre** : `Discipline = 💪 Musculation`

#### Propriétés Spécifiques

| Propriété | Type Notion | Valeurs / Description |
|---|---|---|
| Groupe musculaire | Multi-select | Dos / Pectoraux / Épaules / Biceps / Triceps / Jambes / Abdos / Full body |
| Exercice | Select | Squat / Deadlift / Bench / OHP / Row / Pull-up / RDL / Hip Thrust / etc. |
| Séries | Number | Nombre de séries effectuées |
| Répétitions | Number | Reps par série (ou fourchette basse) |
| Charge (kg) | Number | Poids utilisé |
| Volume total | Formula | Séries × Reps × Charge |
| Ressenti | Number | Qualité de séance 1-5 |
| Programme | Select | PPL / 5x5 / Hypertrophie / Force / Full Body / Libre |

#### Formule — Volume Total

```notion
// Propriété : "Volume total"
prop("Séries") * prop("Répétitions") * prop("Charge (kg)")
```

#### Formule — Titre Auto-Généré

```notion
// Propriété : "Titre" (à saisir manuellement ou via template)
// Exemple de contenu template :
// "2026-04-29 — Musculation — Dos"
format(prop("Date")) + " — " + prop("Discipline") + " — " + prop("Groupe musculaire")
```

#### Vues Musculation

| Vue | Filtre | Groupement | Usage |
|---|---|---|---|
| Séances | Discipline = Musculation | Par Groupe musculaire | Vue de travail |
| Progression exercice | Discipline = Musculation | Par Exercice | Évolution des charges |
| Volume hebdo | Discipline = Musculation | Par semaine (Date) | Charge d'entraînement |

---

### Vue : 🏃 Running

**Filtre** : `Discipline = 🏃 Running`

#### Propriétés Spécifiques

| Propriété | Type Notion | Valeurs / Description |
|---|---|---|
| Type course | Select | Endurance / Fractionné / Trail / Récupération / Compétition |
| Distance (km) | Number | Distance parcourue |
| Temps (min) | Number | Durée en minutes (décimales OK ex: 65.5) |
| Allure | Formula | Pace calculé en min:ss /km |
| Dénivelé (m) | Number | D+ cumulé |
| FC moyenne | Number | Fréquence cardiaque moyenne |
| FC max | Number | Fréquence cardiaque maximale |
| Chaussures | Select | (vos modèles) |
| Parcours | Text | Nom ou description du parcours |
| Charge séance | Formula | RPE × Durée (score de charge) |

#### Formule — Allure (min:ss /km)

```notion
// Propriété : "Allure"
let(
  allure_sec, if(
    prop("Distance (km)") == 0,
    0,
    prop("Temps (min)") * 60 / prop("Distance (km)")
  ),
  min, floor(allure_sec / 60),
  sec, mod(round(allure_sec), 60),
  format(min) + ":" + if(sec < 10, "0", "") + format(sec) + " /km"
)
```

#### Formule — Charge Séance (TRIMP simplifié)

```notion
// Propriété : "Charge séance"
prop("RPE") * prop("Temps (min)")
```

---

### Vue : 🧗 Escalade

**Filtre** : `Discipline = 🧗 Escalade`

#### Propriétés Spécifiques

| Propriété | Type Notion | Valeurs / Description |
|---|---|---|
| Site | Select | (vos sites + Saisie libre) |
| Voie | Text | Nom de la voie |
| Cotation | Select | 4 / 4+ / 5a / 5b / 5c / 6a / 6a+ / 6b / 6b+ / 6c / 6c+ / 7a / 7a+ / 7b / 7b+ / 7c / 7c+ / 8a / 8a+ |
| Style | Select | 🪨 Bloc / 📌 Couenne / 🏔️ Grande voie / 🧊 Dry-tooling |
| Résultat | Select | 🌟 Flash / ✅ Enchainement / 👀 À vue / 🔧 Travaillée / 📌 Projet |
| Tentatives | Number | Nombre d'essais sur cette voie |
| Partenaires | Text | Noms des grimpeurs |
| Commentaire | Text | Analyse technique (clé, beta) |

#### Vue Galerie — Progression par Cotation
- **Type** : Gallery
- **Groupement** : Par Cotation
- **Filtre** : Discipline = 🧗 Escalade
- **Utilité** : voir d'un coup les cotations flashées / travaillées / projets

---

### Vue : 🏔️ Alpinisme

**Filtre** : `Discipline = 🏔️ Alpinisme`

#### Propriétés Spécifiques

| Propriété | Type Notion | Valeurs / Description |
|---|---|---|
| Sommet/Objectif | Text | Nom du sommet ou objectif |
| Massif | Select | Mont-Blanc / Écrins / Vanoise / Chartreuse / Vercors / Jura / Alpes Suisses / Pyrénées / Autre |
| Altitude (m) | Number | Altitude du sommet |
| Dénivelé (m) | Number | D+ cumulé |
| Cotation globale | Select | F / PD- / PD / PD+ / AD- / AD / AD+ / D- / D / D+ / TD- / TD / TD+ / ED |
| Voie | Text | Nom de la voie |
| Partenaires | Text | Noms des cordistes |
| Conditions nivo | Select | 1 - Faible / 2 - Limité / 3 - Marqué / 4 - Fort / 5 - Très fort |
| Type de neige | Multi-select | Poudre / Regel / Firn / Avalancheux / Mixte / Rocher |
| Matériel utilisé | Multi-select | Crampons / Piolet / Corde 60m / Sangles / Friends / Coinceurs / Broches à glace / Skis / DVA |
| Bivouac | Checkbox | Nuit en montagne |
| Rapport de course | Text | Compte-rendu détaillé (rich text) |
| Photos | Files | Galerie photos de la sortie |

#### Vue Calendrier Alpinisme
- **Type** : Calendar par Date
- **Filtre** : Discipline = 🏔️ Alpinisme
- Planifier les sorties futures + historique visuel

---

## Pilier 5 — ⛰️ Wiki d'Autonomie Montagne

### Concept
Base de connaissances techniques avec révision espacée légère (style Anki). Chaque fiche = une technique ou connaissance à maîtriser et réviser périodiquement.

### Vue principale : Table avec filtres par catégorie

### Propriétés

| Propriété | Type Notion | Valeurs / Description |
|---|---|---|
| Titre | Title | Nom de la technique / connaissance |
| Catégorie | Select | 🪢 Techniques de corde / 🚨 Secours / ❄️ Nivologie / 🗺️ Cartographie / 🌤️ Météo / 🎒 Matériel / 🏔️ Général |
| Niveau requis | Select | 🟢 Débutant / 🟡 Intermédiaire / 🔴 Expert |
| Contenu | Text | Corps de la fiche (rich text avec schémas, listes) |
| Source/Référence | Text | Livre, formation, lien URL |
| Validé | Checkbox | Compétence maîtrisée en conditions réelles |
| Dernière révision | Date | Date de la dernière révision active |
| Fréquence révision (j) | Number | Jours entre révisions (défaut : 30) |
| Prochaine révision | Formula | Date calculée automatiquement |
| Statut révision | Formula | Indicateur coloré |
| Média | URL | Lien vidéo tutoriel ou schéma externe |
| Séance liée | Relation | → Base Performance Sport (dual) |

### Formule — Prochaine Révision

```notion
// Propriété : "Prochaine révision"
if(
  empty(prop("Dernière révision")),
  now(),
  dateAdd(prop("Dernière révision"), prop("Fréquence révision (j)"), "days")
)
```

### Formule — Statut Révision

```notion
// Propriété : "Statut révision"
if(
  not(prop("Validé")),
  "📖 En apprentissage",
  if(
    dateBetween(now(), prop("Prochaine révision"), "days") > 0,
    "⚠️ Révision due",
    "✅ À jour"
  )
)
```

### Catégories et exemples de fiches

#### 🪢 Techniques de corde
- Nœuds : cabestan, huit, prusik, Machard, plat, demi-cabestan, mule
- Systèmes d'assurage : Grigri, tube, plaquette, autobloquants
- Rappel : installation, descente en simultané, récupération des brins
- Mouflage : Z simple (×2), C (×3), multiplicateur ×5
- Réchappes : remontée sur corde, extraction crevasse, auto-secours falaise

#### 🚨 Secours en montagne
- Protocole ABCDE en milieu isolé
- Avalanche : DVA (recherche, sondage, pelletage), protocole de survie
- Évacuation : brancardage improvisé, hélitreuillage (comportement)
- Traumatismes : fracture, hypothermie, MAM, œdème pulmonaire

#### ❄️ Nivologie
- Types de grains et métamorphoses (destructive, constructive, fonte)
- Lecture profil stratigraphique (couche fragile, pont de neige)
- Indices de risque EAPS 1-5 : seuils et comportements associés
- Red flags sur le terrain (whumf, fissures, corniche)
- Interprétation bulletin météo-nivo Météo-France / MeteoSwiss

#### 🗺️ Cartographie & Navigation
- Lecture carte IGN 1:25 000 (courbes, symboles, altimétrie)
- Boussole : relèvement, cheminement sur azimut, triangulation
- GPS : waypoints, traces GPX, altimètre barométrique, calage
- Navigation en conditions dégradées (brouillard, nuit)

#### 🌤️ Météo Montagne
- Lecture bulletin Météo-France montagne
- Phénomènes locaux : foehn, brouillard de convection, orages de chaleur
- Nuages précurseurs (cirrus, lenticulaire, cumulo-nimbus)
- Grille décision go/no-go (vent, visibilité, précipitations)

#### 🎒 Matériel
- Entretien : corde (lavage, stockage), baudrier (coutures), casque
- Durées de vie réglementaires (corde dynamique : 10 ans max)
- Vérification pré-départ (check-list SARPE)
- Fiche technique par équipement (poids, CE, limite d'utilisation)

### Vues Wiki Montagne

| Vue | Type | Filtre | Usage |
|---|---|---|---|
| À réviser | List | Statut = ⚠️ Révision due | Révision quotidienne (5 min) |
| Par catégorie | Gallery | (aucun) | Navigation générale |
| Expert uniquement | Table | Niveau = 🔴 Expert | Fiches avancées |
| Non maîtrisé | List | Validé = false | Suivi de progression |
| Toutes les fiches | Table | (aucun) | Vue complète |

### Workflow de Révision

1. **Quotidien (5 min)** : Vue "À réviser" → lire la fiche → mettre à jour "Dernière révision"
2. **Après une sortie** : Lier les techniques utilisées à la séance Alpinisme dans la base Sport
3. **Après une formation** : Créer nouvelles fiches, cocher Validé si maîtrisé
4. **Mensuel** : Parcourir les fiches "Non maîtrisé" pour mesurer la progression
5. **Semestriel** : Auditer les fiches non révisées depuis > 6 mois

---

## Pilier 6 — 📚 Culture & Savoir

### 6.1 — Bibliothèque Multimédia

#### Vue principale : Galerie (avec couverture en image de couverture)

#### Propriétés

| Propriété | Type Notion | Valeurs / Description |
|---|---|---|
| Titre | Title | Titre de l'œuvre |
| Type | Select | 📖 Livre / 🎬 Film / 📺 Série / 🎧 Podcast / 🎮 Jeu vidéo / 📰 Article / 🎤 Talk |
| Auteur/Réalisateur | Text | Créateur principal |
| Genre | Multi-select | SF / Thriller / Dév. personnel / Sport / Histoire / Nature / Tech / Philo / Montagne |
| Statut | Select | 📋 À faire / 🔄 En cours / ✅ Terminé / ❌ Abandonné |
| Note | Number | /10 |
| Date fin | Date | Date de fin de lecture/visionnage |
| Recommandé par | Text | Source de la découverte |
| Tags thématiques | Multi-select | Montagne / Leadership / Performance / Mindset / Science / Fiction / Santé / Finance |
| Couverture | Files | Image de couverture |
| Avis | Text | Critique personnelle (rich text) |
| Notes liées | Relation | → Base Notes Zettelkasten (dual) |
| Projet lié | Relation | → Base Projets & Objectifs (dual) |

#### Vues Bibliothèque

| Vue | Type | Filtre | Groupement |
|---|---|---|---|
| Galerie principale | Gallery | (aucun) | Par Type |
| En cours | List | Statut = En cours | — |
| File d'attente | Board | Statut = À faire | Par Type |
| Terminés cette année | Table | Terminé & Date fin = année courante | Par mois |
| Mieux notés | Gallery | Note ≥ 8 | — |
| Montagne & Sport | Gallery | Tag = Montagne ou Sport | — |

---

### 6.2 — Système Zettelkasten — Notes Permanentes

#### Concept des 3 niveaux

| Type | Description | Durée de vie | Objectif |
|---|---|---|---|
| 💭 Fleeting | Brouillons rapides, idées brutes | 48h max | Capturer sans jugement |
| 📝 Literature | Résumés de sources (livres, articles, talks) | Long terme | Extraire les idées clés |
| 💎 Permanent | Idées reformulées en vos propres mots | Permanent | Construire votre savoir |

#### Propriétés

| Propriété | Type Notion | Valeurs / Description |
|---|---|---|
| Titre | Title | Phrase complète pour Permanent ("X permet Y car Z") |
| Type | Select | 💭 Fleeting / 📝 Literature / 💎 Permanent |
| Statut | Select | Brouillon / À traiter / Traité / Archivé |
| Tags | Multi-select | Montagne / Performance / Finance / Personnel / Pro / Santé / Tech / Philo |
| Sources liées | Relation | → Base Bibliothèque (dual) |
| Notes liées | Relation | → Base Notes Zettelkasten (auto-relation dual) |
| Projet lié | Relation | → Base Projets & Objectifs (dual) |
| Mots-clés | Text | Termes de recherche |
| Date création | Created time | Automatique |
| Dernière modif | Last edited time | Automatique |
| Alerte | Formula | Fleeting non traité > 48h |

#### Formule — Alerte Fleeting Non Traité

```notion
// Propriété : "Alerte"
if(
  and(
    prop("Type") == "💭 Fleeting",
    prop("Statut") != "Traité",
    dateBetween(now(), prop("Date création"), "hours") > 48
  ),
  "🚨 À traiter maintenant !",
  ""
)
```

#### Workflow Zettelkasten Complet

1. **Capture** : Toute idée → Note Fleeting (depuis l'Inbox ou directement)
2. **Traitement (dans les 48h)** :
   - Résumé d'une source → Literature Note liée à la Bibliothèque
   - Idée personnelle → Permanent Note (reformuler avec vos mots)
   - Inutile → Supprimer
3. **Connexion** : Chaque Permanent Note liée à ≥ 1 autre note (la magie du réseau)
4. **Revue mensuelle** : Parcourir les Permanent Notes pour trouver de nouvelles connexions et idées de projets

#### Vues Zettelkasten

| Vue | Type | Filtre | Usage |
|---|---|---|---|
| Fleeting à traiter | List | Type = Fleeting & Statut ≠ Traité | Urgences quotidiennes |
| Notes permanentes | Gallery | Type = Permanent | Navigation du réseau |
| Par tag | Board | (aucun) | Groupé par Tags |
| Sources (Literature) | Table | Type = Literature | Vue bibliographique |
| Réseau complet | List | Type = Permanent | Exploration des connexions |

---

## Pilier 7 — 💰 Lifestyle & Finances

### 7.1 — Tracker Abonnements

#### Vue principale : Table

#### Propriétés

| Propriété | Type Notion | Valeurs / Description |
|---|---|---|
| Service | Title | Nom du service |
| Catégorie | Select | 🎬 Streaming / 🏋️ Sport / 💻 Logiciel / 🏥 Santé / 📰 Info / 🎮 Gaming / Autre |
| Prix | Number (€) | Montant facturé |
| Fréquence | Select | Mensuel / Trimestriel / Annuel |
| Date renouvellement | Date | Prochaine date de prélèvement |
| Auto-renouvellement | Checkbox | Se renouvelle automatiquement |
| Valeur perçue | Number | Note d'utilité personnelle 1-5 |
| Actif | Checkbox | Abonnement en cours |
| Coût mensuel | Formula | Normalisé en mensuel |
| Alerte | Formula | Statut de renouvellement coloré |
| Notes | Text | Identifiants, conseils d'annulation, alternatives |

#### Formule — Coût Mensuel Normalisé

```notion
// Propriété : "Coût mensuel"
if(
  prop("Fréquence") == "Mensuel",
  prop("Prix"),
  if(
    prop("Fréquence") == "Trimestriel",
    prop("Prix") / 3,
    prop("Prix") / 12
  )
)
```

#### Formule — Alerte Renouvellement

```notion
// Propriété : "Alerte"
let(
  jours, dateBetween(prop("Date renouvellement"), now(), "days"),
  if(not(prop("Actif")),                     "⚫ Inactif",
  if(empty(prop("Date renouvellement")),      "❓ Date manquante",
  if(jours < 0,                              "🔴 Expiré",
  if(jours <= 7,   "🔴 " + format(jours) + "j — IMMINENT",
  if(jours <= 30,  "🟡 " + format(jours) + "j",
                   "🟢 " + format(jours) + "j")))))
)
```

#### Vues Abonnements

| Vue | Type | Filtre | Agrégation |
|---|---|---|---|
| Dashboard actifs | Table | Actif = true | Sum(Coût mensuel) → total mensuel |
| Alertes urgentes | List | Alerte contient 🔴 | — |
| Faible valeur | Table | Valeur perçue ≤ 2 & Actif = true | Candidats à supprimer |
| Par catégorie | Board | Actif = true | Groupé par Catégorie |
| Historique | Table | Actif = false | Abonnements résiliés |

---

### 7.2 — Gestion Recettes & Repas

#### Base : Recettes

| Propriété | Type Notion | Valeurs / Description |
|---|---|---|
| Titre | Title | Nom de la recette |
| Type repas | Select | 🌅 Petit-déj / 🍽️ Déjeuner / 🌙 Dîner / 🍎 Snack / 🏋️ Pré-entraînement / 🔄 Récupération |
| Temps prep (min) | Number | Temps de préparation en minutes |
| Portions | Number | Nombre de portions |
| Calories | Number | Kcal par portion |
| Protéines (g) | Number | Par portion |
| Glucides (g) | Number | Par portion |
| Lipides (g) | Number | Par portion |
| Tags | Multi-select | Vegan / Végétarien / Sport / Rapide / Batch cooking / Sans gluten / Économique |
| Ingrédients | Relation | → Base Ingrédients (dual) |
| Instructions | Text | Étapes de préparation |
| Note | Number | /5 |
| Photos | Files | Photos du plat |

#### Base : Ingrédients

| Propriété | Type Notion | Valeurs / Description |
|---|---|---|
| Nom | Title | Nom de l'ingrédient |
| Catégorie | Select | Légumes / Fruits / Viande / Poisson / Féculents / Laitiers / Épices / Conserves / Autres |
| Unité | Select | g / kg / ml / L / unité / c.à.s / c.à.c |
| Quantité par recette | Number | Quantité par portion de base |
| En stock | Checkbox | Disponible à la maison |
| À acheter | Checkbox | À ajouter à la liste de courses |
| Recettes liées | Relation | → Base Recettes (backlink dual) |

#### Base : Planning Repas

| Propriété | Type Notion | Valeurs / Description |
|---|---|---|
| Titre | Title | Auto : "Lundi Déjeuner — Poulet/Riz" |
| Semaine | Date | Lundi de la semaine concernée |
| Jour | Select | Lundi / Mardi / Mercredi / Jeudi / Vendredi / Samedi / Dimanche |
| Repas | Select | Petit-déj / Déjeuner / Dîner / Snack |
| Recette liée | Relation | → Base Recettes (dual) |
| Calories rollup | Rollup | Calories depuis Recette liée |
| Protéines rollup | Rollup | Protéines depuis Recette liée |

#### Workflow Liste de Courses Automatique

1. Planifier les repas de la semaine dans Planning Repas
2. Ouvrir la base Ingrédients
3. Filtrer : `Recettes liées ∈ [recettes de la semaine]` + `En stock = false`
4. Cette vue = votre liste de courses
5. Cocher `En stock` après achat, décocher `À acheter`

---

## Pilier 8 — 🧬 Habitudes & Santé

### Vue principale : Table (une ligne = un jour)

### Propriétés

| Propriété | Type Notion | Valeurs / Description |
|---|---|---|
| Date | Title | Format YYYY-MM-DD pour tri chronologique |
| Sommeil (h) | Number | Heures dormies |
| Eau (L) | Number | Litres bus dans la journée |
| Méditation (min) | Number | Minutes de méditation |
| Lecture (min) | Number | Minutes de lecture active |
| Sport fait | Checkbox | Séance réalisée |
| Alcool | Checkbox | Consommation alcool (négatif) |
| Écran avant dodo | Checkbox | Écran dans l'heure avant le coucher (négatif) |
| Humeur | Number | 1 (😞) à 5 (😄) |
| Énergie | Number | 1 (😴) à 5 (⚡) |
| Notes | Text | Journal de la journée (optionnel) |
| Score journalier | Formula | Score calculé 0-10 |
| Statut journée | Formula | Appréciation colorée |
| Séance liée | Relation | → Base Performance Sport (dual) |
| Repas lié | Relation | → Base Planning Repas (dual) |

### Formule — Score Journalier

```notion
// Propriété : "Score journalier" (0 à 10)
let(
  positives,
    toNumber(prop("Sport fait")) +
    toNumber(prop("Sommeil (h)") >= 7) +
    toNumber(prop("Eau (L)") >= 2) +
    toNumber(prop("Méditation (min)") >= 10) +
    toNumber(prop("Lecture (min)") >= 20),
  negatives,
    toNumber(prop("Alcool")) +
    toNumber(prop("Écran avant dodo")),
  score, positives * 2 - negatives,
  if(score > 10, 10, if(score < 0, 0, score))
)
```

### Formule — Statut Journée

```notion
// Propriété : "Statut journée"
let(
  s, prop("Score journalier"),
  if(s >= 8, "🌟 Excellente journée",
  if(s >= 6, "✅ Bonne journée",
  if(s >= 4, "🟡 Journée moyenne",
             "🔴 Journée difficile")))
)
```

### Vues Habitudes & Santé

| Vue | Type | Filtre | Usage |
|---|---|---|---|
| Journal quotidien | Calendar | (aucun) | Saisie et visualisation |
| Semaine courante | Table | Date = cette semaine | Analyse des patterns |
| Tendances 30 jours | Table | Date ≥ today - 30j | Vue mensuelle |
| Jours excellents | List | Score ≥ 8 | Identifier les patterns gagnants |

### Workflow Quotidien

1. **Matin (2 min)** : Créer l'entrée du jour, renseigner le Sommeil de la nuit
2. **Dans la journée** : Renseigner Eau, Méditation au fil de l'eau
3. **Soir (5 min)** : Remplir Sport, Lecture, Alcool, Écran, Humeur, Énergie
4. **Hebdo** : Analyser la vue Semaine — identifier les habitudes qui font chuter le score
5. **Mensuel** : Comparer moyennes Humeur/Énergie/Score avec les mois précédents

---

## Pilier 9 — 🗃️ Archives

### Concept
Page simple sans base propre. Accueille des vues liées filtrées sur les éléments archivés de chaque base.

### Structure

```
🗃️ Archives
│
├── 📁 Projets terminés
│   └── Vue liée : Projets & Objectifs | Filtre : Statut = Archivé
│
├── 📝 Notes inactives
│   └── Vue liée : Notes Zettelkasten | Filtre : Statut = Archivé
│
├── 📚 Médias abandonnés
│   └── Vue liée : Bibliothèque | Filtre : Statut = Abandonné
│
└── 🔗 Wiki non révisé (> 1 an)
    └── Vue liée : Wiki Montagne | Filtre : Dernière révision < today - 365j
```

### Règles d'Archivage

| Déclencheur | Action | Fréquence de vérification |
|---|---|---|
| Projet Statut = Terminé depuis > 3 mois | Passer à Archivé | Revue mensuelle |
| Note Fleeting non traitée > 7 jours | Archiver ou supprimer | Revue hebdo |
| Abonnement Actif = false | Reste visible en Archive dans Abonnements | Continu |
| Fiche Wiki non révisée depuis > 1 an | Valider ou archiver | Revue semestrielle |
| Média Statut = Abandonné | Déjà visible dans Archives | Continu |

---

## Relations Inter-Bases

### Tableau Complet

| Base Source | Propriété Relation | Base Cible | Type | Description |
|---|---|---|---|---|
| Tâches | Projet lié | Projets & Objectifs | Dual | Tâches appartiennent à un projet |
| Projets & Objectifs | Tâches liées | Tâches | Dual (backlink) | Toutes les tâches du projet |
| Projets & Objectifs | Notes liées | Notes Zettelkasten | Dual | Documentation de projet |
| Projets & Objectifs | Ressources | Bibliothèque | Dual | Sources liées au projet |
| Notes Zettelkasten | Sources liées | Bibliothèque | Dual | Source de la note |
| Notes Zettelkasten | Notes liées | Notes Zettelkasten | Dual (auto) | Réseau Zettelkasten |
| Notes Zettelkasten | Projet lié | Projets & Objectifs | Dual | Contexte d'utilisation |
| Performance Sport | Wiki lié | Wiki Montagne | Dual | Techniques utilisées en séance |
| Performance Sport | Projet lié | Projets & Objectifs | Dual | Objectif sportif associé |
| Wiki Montagne | Séances liées | Performance Sport | Dual (backlink) | Séances où la technique a été pratiquée |
| Bibliothèque | Notes liées | Notes Zettelkasten | Dual (backlink) | Notes prises sur l'œuvre |
| Bibliothèque | Projet lié | Projets & Objectifs | Dual (backlink) | Lecture dans un contexte de projet |
| Recettes | Ingrédients | Ingrédients | Dual | Composition de la recette |
| Planning Repas | Recette liée | Recettes | Dual | Recette du repas planifié |
| Habitudes & Santé | Séance liée | Performance Sport | Dual | Séance de sport du jour |
| Habitudes & Santé | Repas lié | Planning Repas | Dual | Repas du jour |
| Inbox | — | — | — | Source de capture, pas de relation directe |

### Schéma des Relations Clés

```
📥 Inbox
    │ (traitement)
    ▼
🎯 Projets ◄──────────────────── ✅ Tâches
    │  ▲                              ▲
    │  └──── 🗃️ Notes ZK ◄──── 📚 Bibliothèque
    │
    ▼
🏋️ Performance Sport ◄─────────► ⛰️ Wiki Montagne
    ▲
    │
🧬 Habitudes ◄──────────────────── 🍽️ Planning Repas ◄── 🍲 Recettes ◄── 🛒 Ingrédients
```

---

## Formules Obligatoires

### 1. Barre de Progression Objectifs (%)
> *Base : Projets & Objectifs | Propriété : "Score progression"*

```notion
let(
  total, prop("Total tâches"),
  faites, prop("Tâches faites"),
  pct, if(total == 0, 0, round(faites / total * 100)),
  barres, floor(pct / 10),
  format(pct) + "% [" +
    slice("██████████", 0, barres) +
    slice("░░░░░░░░░░", 0, 10 - barres) +
  "]"
)
```

### 2. Compte à Rebours Deadline Coloré
> *Base : Projets & Objectifs | Propriété : "Statut Deadline"*

```notion
let(
  jours, if(empty(prop("Deadline")), 999, dateBetween(prop("Deadline"), now(), "days")),
  if(empty(prop("Deadline")),  "📅 Sans deadline",
  if(jours < 0,               "🔴 Dépassé " + format(abs(jours)) + "j",
  if(jours == 0,              "🔴 AUJOURD'HUI !",
  if(jours <= 7,              "🔴 J-" + format(jours),
  if(jours <= 30,             "🟡 J-" + format(jours),
                              "🟢 J-" + format(jours))))))
)
```

### 3. Alerte Renouvellement Abonnement
> *Base : Abonnements | Propriété : "Alerte"*

```notion
let(
  jours, dateBetween(prop("Date renouvellement"), now(), "days"),
  if(not(prop("Actif")),                  "⚫ Inactif",
  if(empty(prop("Date renouvellement")), "❓ Date manquante",
  if(jours < 0,                          "🔴 Expiré",
  if(jours <= 7,  "🔴 " + format(jours) + "j — IMMINENT",
  if(jours <= 30, "🟡 " + format(jours) + "j",
                  "🟢 " + format(jours) + "j")))))
)
```

### 4. Volume Entraînement Musculation
> *Base : Performance Sport | Propriété : "Volume total"*

```notion
prop("Séries") * prop("Répétitions") * prop("Charge (kg)")
```

### 5. Score Journalier d'Habitudes
> *Base : Habitudes & Santé | Propriété : "Score journalier"*

```notion
let(
  positives,
    toNumber(prop("Sport fait")) +
    toNumber(prop("Sommeil (h)") >= 7) +
    toNumber(prop("Eau (L)") >= 2) +
    toNumber(prop("Méditation (min)") >= 10) +
    toNumber(prop("Lecture (min)") >= 20),
  negatives,
    toNumber(prop("Alcool")) +
    toNumber(prop("Écran avant dodo")),
  score, positives * 2 - negatives,
  if(score > 10, 10, if(score < 0, 0, score))
)
```

### 6. Statut Révision Wiki Montagne
> *Base : Wiki Montagne | Propriété : "Statut révision"*

```notion
if(
  not(prop("Validé")),
  "📖 En apprentissage",
  if(
    dateBetween(now(), prop("Prochaine révision"), "days") > 0,
    "⚠️ Révision due",
    "✅ À jour"
  )
)
```

### 7. Coût Mensuel Normalisé
> *Base : Abonnements | Propriété : "Coût mensuel"*

```notion
if(
  prop("Fréquence") == "Mensuel",    prop("Prix"),
  if(
    prop("Fréquence") == "Trimestriel", prop("Prix") / 3,
                                        prop("Prix") / 12
  )
)
```

### 8. Allure Running (min:ss /km)
> *Base : Performance Sport | Propriété : "Allure"*

```notion
let(
  allure_sec, if(
    prop("Distance (km)") == 0,
    0,
    prop("Temps (min)") * 60 / prop("Distance (km)")
  ),
  min, floor(allure_sec / 60),
  sec, mod(round(allure_sec), 60),
  format(min) + ":" + if(sec < 10, "0", "") + format(sec) + " /km"
)
```

---

## Quick Start — 5 Premières Étapes

### Règle d'Or
> Un Second Brain utilisé à 60% vaut infiniment mieux qu'un système parfait jamais ouvert. Commencez par l'Inbox et le Dashboard — le reste viendra naturellement.

---

### Étape 1 — Créer la structure Sidebar (Jour 1 — 30 min)

1. Créer une page racine `🧠 Second Brain` dans votre Notion
2. Créer les 5 sections en sous-pages avec leurs emojis (voir Sidebar)
3. Créer la page `🗃️ Archives`
4. **Alternative rapide** : Lancer le script Python `notion_setup.py` qui crée tout automatiquement

---

### Étape 2 — Déployer les bases prioritaires (Jours 1-2 — 2h)

Créer dans cet ordre (les relations dépendent de l'ordre) :

1. `📥 Inbox` — la plus simple, aucune dépendance
2. `🎯 Projets & Objectifs` — base centrale
3. `✅ Tâches` — avec relation vers Projets
4. `🏋️ Performance Sport` — base maîtresse sport (toutes disciplines)

---

### Étape 3 — Saisir vos premiers contenus (Jours 2-3 — 1h)

1. **Inbox** : Vider votre tête — saisir 10-20 captures en suspens
2. **Projets** : Créer vos 3-5 projets actifs du moment avec Deadline
3. **Tâches** : Créer 5-10 tâches liées à ces projets avec une date
4. **Sport** : Saisir votre dernière séance de sport (tester les formules)

---

### Étape 4 — Configurer le Dashboard (Jour 3 — 1h)

1. Créer la page `🏠 Dashboard`
2. Ajouter des vues liées filtrées depuis chaque base créée (Tâches, Projets, Sport, Bibliothèque)
3. Configurer la mise en page en 2 colonnes avec `/columns`
4. Test : le Dashboard doit refléter votre réalité du moment

---

### Étape 5 — Déployer les bases secondaires (Semaines 1-2)

Dans l'ordre de vos besoins personnels :

| Base | Quand la créer | Priorité |
|---|---|---|
| `⛰️ Wiki Montagne` | Si vous préparez une sortie | Haute si alpiniste |
| `📚 Bibliothèque` | Si vous lisez en ce moment | Haute |
| `💰 Abonnements` | Pour un audit financier rapide | Haute (ROI immédiat) |
| `🧬 Habitudes` | Quand les autres bases sont stables | Moyenne |
| `🗃️ Notes ZK` | Quand vous avez pris l'habitude d'utiliser les bases | Longue durée |
| `🍽️ Recettes & Repas` | Si vous faites du meal prep | Optionnelle |

---

### Checklist de démarrage

- [ ] Page racine `🧠 Second Brain` créée
- [ ] Structure Sidebar en place
- [ ] Base `📥 Inbox` créée et testée (saisir 3 captures)
- [ ] Base `🎯 Projets & Objectifs` créée avec 1 projet réel
- [ ] Base `✅ Tâches` créée et liée aux Projets
- [ ] Base `🏋️ Performance Sport` créée avec 1 séance saisie
- [ ] Dashboard configuré avec au moins 3 vues liées
- [ ] Première revue hebdomadaire Inbox réalisée
- [ ] Habitude quotidienne d'ouverture du Dashboard instaurée

---

*Généré le 2026-04-29 | Version 1.0 | Compatible Notion API 2022-06-28*
