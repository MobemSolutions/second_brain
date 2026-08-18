// Contenu des routines "apparence" affichées dans les panneaux du schéma interactif.
// Ajouter une zone = ajouter une entrée ici (image "face" ou "body") + repositionner x/y (%).

export interface RoutineTableBlock {
  type: "table";
  heading?: string;
  headers: string[];
  rows: string[][];
  note?: string;
}

export interface RoutineListBlock {
  type: "list";
  heading?: string;
  items: string[];
}

export interface RoutineProtocolBlock {
  type: "protocol";
  heading: string;
  frequency?: string;
  sets?: string;
  reps?: string;
  duration?: string;
  details?: string[];
  warning?: string;
}

export interface RoutineTextBlock {
  type: "text";
  heading?: string;
  text: string;
}

export type RoutineBlock =
  | RoutineTableBlock
  | RoutineListBlock
  | RoutineProtocolBlock
  | RoutineTextBlock;

export interface RoutineZone {
  id: string;
  label: string;
  image: "face" | "body";
  x: number;
  y: number;
  blocks: RoutineBlock[];
  empty?: boolean;
}

export const ROUTINE_ZONES: RoutineZone[] = [
  // ─── CHEVEUX ────────────────────────────────────────────────
  {
    id: "cheveux",
    label: "Cheveux",
    image: "face",
    x: 50,
    y: 8,
    blocks: [
      {
        type: "table",
        heading: "Routine détaillée",
        headers: ["Étape", "Fréquence", "Produit"],
        rows: [
          ["Shampoing clarifiant léger", "2x / mois", "Klorane Shampoing Anti-Résidus, ou Ouai Detox Shampoo"],
          ["Shampoing doux quotidien", "2-3x / semaine", "Klorane à l'Avoine, ou Ouai Fine Shampoo (formulé cheveux fins / faible porosité)"],
          ["Après-shampoing léger", "à chaque lavage", "Kevin Murphy Angel Rinse, ou après-shampoing hydratant léger sans huile lourde"],
          ["Leave-in liquide (mouillé + serviette chaude 10 min)", "à chaque lavage", "Ouai Featherweight leave-in, ou spray aloe vera pur dilué"],
          ["Huile légère de scellage", "à chaque lavage", "Huile de jojoba ou huile de pépins de raisin (pas coco / ricin)"],
          ["Mousse / gel définition léger", "à chaque lavage, petite quantité", "Mousse got2b Boucle-la"],
          ["Soin protéiné léger", "1x / mois maximum", "Après-shampoing avec protéines diluées (pas de traitement fort type Aphogee)"],
        ],
      },
      {
        type: "list",
        heading: "Séchage & coiffage",
        items: [
          "Rincer à l'eau tiède/chaude pendant le lavage (pas froide) pour garder les cuticules ouvertes plus longtemps.",
          "Sécher avec une serviette microfibre ou un vieux t-shirt en coton (le \"plopping\"), jamais une serviette éponge classique qui crée des frisottis par friction.",
          "Diffuseur en mode air froid/tiède si utilisation d'un sèche-cheveux ; éviter la chaleur directe et le lissage.",
          "Ne pas toucher/manipuler les cheveux pendant le séchage à l'air libre pour ne pas casser la définition des boucles.",
        ],
      },
      {
        type: "list",
        heading: "Nuit",
        items: [
          "Taie d'oreiller en satin (ne glisse pas comme le bonnet — bonne alternative si le bonnet tombe pendant la nuit).",
          "Bonnet en satin en complément si possible.",
        ],
      },
      {
        type: "list",
        heading: "Coupe",
        items: [
          "Ne pas couper les cheveux bouclés mouillés — les couper à sec, mèche par mèche, pour respecter le vrai rebond de la boucle.",
          "Coupe d'entretien tous les 3 mois pour retirer les pointes fourchues sans perdre de longueur.",
        ],
      },
    ],
  },

  // ─── PEAU ───────────────────────────────────────────────────
  {
    id: "peau",
    label: "Peau",
    image: "face",
    x: 50,
    y: 24,
    blocks: [
      {
        type: "list",
        heading: "Matin",
        items: [
          "Nettoyage doux avec Sanex.",
          "Hydratant (le nouveau, riche en céramides).",
          "Crème solaire.",
        ],
      },
      {
        type: "list",
        heading: "Soir — base",
        items: ["Nettoyage doux avec Sanex."],
      },
      {
        type: "protocol",
        heading: "Soir — selon le jour",
        details: [
          "La plupart des soirs : aloe vera en fine couche (apaisant rougeurs) + hydratant.",
          "2-3x / semaine : acide salicylique à la place de l'aloe vera, sur les zones à points noirs/impuretés.",
          "1x / semaine : masque à l'argile Garnier — pas plus, pour éviter d'assécher davantage.",
        ],
      },
    ],
  },

  // ─── SOURCILS ───────────────────────────────────────────────
  {
    id: "sourcils",
    label: "Sourcils",
    image: "face",
    x: 50,
    y: 33,
    blocks: [
      {
        type: "protocol",
        heading: "Sourcils — épilation",
        frequency: "Toutes les 2-3 semaines selon la pousse",
        details: [
          "À la pince (ou cire si préféré), en ne retirant que : les poils isolés sous l'arcade (en dessous de la ligne naturelle du sourcil), et les poils entre les deux sourcils (zone glabelle).",
          "Ne pas toucher à la forme globale ni sur-épiler le dessus du sourcil — juste nettoyer les contours.",
        ],
      },
    ],
  },

  // ─── CERNES ─────────────────────────────────────────────────
  {
    id: "cernes",
    label: "Cernes",
    image: "face",
    x: 42,
    y: 43,
    blocks: [
      {
        type: "list",
        heading: "Produit",
        items: [
          "Filorga Optim-Eyes (~28-38€, tube 15ml) — combine caféine (décongestionnant) + actifs renforçant les capillaires + escine anti-poches.",
        ],
      },
      {
        type: "protocol",
        heading: "Application",
        frequency: "Matin ET soir, quotidiennement",
        details: [
          "Petite noisette (quantité minime, la peau du contour de l'œil absorbe vite).",
          "Appliquer en tapotant du bout des doigts — jamais en frottant, la peau y est trop fine.",
          "Laisser pénétrer avant maquillage/crème solaire le matin.",
        ],
      },
    ],
  },

  // ─── YEUX (hunter eyes / blanc des yeux) ─────────────────────
  {
    id: "yeux",
    label: "Yeux",
    image: "face",
    x: 62,
    y: 36,
    blocks: [
      {
        type: "text",
        heading: "Hunter eyes — de quoi il s'agit",
        text: "Regard \"hunter eyes\" = canthal tilt positif (coin externe de l'œil plus haut que le coin interne), œil relativement horizontal, paupière basse plus tendue, et impression d'œil enfoncé sous l'arcade sourcilière (ombre/profondeur). L'arcade sourcilière et la forme de l'orbite osseuse ne sont pas modifiables sans chirurgie (canthoplastie) — mewing et posture n'y changent rien. Les leviers réalistes sans chirurgie : entraînement musculaire de la paupière, perte de graisse faciale, et gestion du gonflement.",
      },
      {
        type: "protocol",
        heading: "Entraînement orbicularis oculi (muscle de la paupière)",
        frequency: "Quotidien",
        sets: "2-3 séries",
        reps: "10-15 répétitions",
        details: [
          "Plisser légèrement les yeux en gardant la paupière supérieure immobile — l'effort vient de la paupière inférieure uniquement.",
          "Ne pas plisser/froisser le front en même temps (sinon c'est le frontal qui travaille, pas l'orbiculaire).",
          "Tenir la contraction 5 secondes, relâcher.",
          "Objectif : paupière inférieure plus tonique/haute, canthal tilt visuellement 2-3° plus positif, réduction de l'aspect gonflé/fatigué.",
        ],
        warning: "Effet réel mais modeste et progressif — ne remplace pas la structure osseuse. Le déficit calorique (cf. zone Jawline) aide aussi à affiner la zone des yeux en réduisant la graisse faciale générale.",
      },
      {
        type: "protocol",
        heading: "Blanc des yeux — gouttes vasoconstrictrices",
        frequency: "Usage ponctuel uniquement (avant une sortie, une photo, un événement) — pas un usage quotidien",
        duration: "Effet en quelques minutes, dure plusieurs heures",
        details: [
          "Produit : Lumify (ou Innoxa / Visine en France comme équivalent), disponible en pharmacie.",
          "Usage : 1-2 gouttes.",
          "Max 3-4 jours d'affilée — pas plus.",
        ],
        warning: "Au-delà de 3-4 jours d'usage consécutif, risque d'effet rebond : les yeux redeviennent rouges, parfois pires qu'avant, une fois le produit arrêté.",
      },
    ],
  },

  // ─── MASSÉTER ───────────────────────────────────────────────
  {
    id: "masseter",
    label: "Masséter",
    image: "face",
    x: 70,
    y: 48,
    blocks: [
      {
        type: "protocol",
        heading: "Mousse à mâcher (mastic gum / bloc)",
        frequency: "5 jours d'affilée, 2 jours de repos (le muscle grossit pendant la récup, pas pendant l'effort)",
        duration: "15-20 min / jour maximum, réparties en sessions de 10-15 min",
        details: [
          "Mâcher des deux côtés de façon égale, en alternant gauche/droite.",
          "Progression sur 4-8 semaines : résistance légère (~semaines 1-2) → moyenne (~semaines 3-4) → dure (~semaines 5-8).",
          "Variante jaw trainer silicone : 3 séries de 20 répétitions, fermeture complète tenue 2 secondes en contraction max.",
        ],
        warning: "Arrêter immédiatement en cas de douleur à l'articulation temporo-mandibulaire (ATM).",
      },
    ],
  },

  // ─── JAWLINE ────────────────────────────────────────────────
  {
    id: "jawline",
    label: "Jawline",
    image: "face",
    x: 67,
    y: 53,
    blocks: [
      {
        type: "list",
        heading: "Rétention d'eau — sodium",
        items: [
          "Limiter les aliments transformés / sel ajouté ; viser plutôt 1500-2000 mg/jour de sodium que le plafond standard de 2300 mg pour réduire la rétention d'eau visible sous la mâchoire.",
        ],
      },
      {
        type: "table",
        heading: "Rétention d'eau — potassium (cible 4000-4800 mg/j)",
        headers: ["Aliment", "Portion", "Potassium"],
        rows: [
          ["Pistaches", "100 g", "~1020 mg"],
          ["Haricots blancs cuits", "1 tasse (~180 g)", "~1004 mg"],
          ["Avocat", "1 fruit moyen", "~975 mg"],
          ["Abricots secs", "100 g", "~1000-1200 mg"],
          ["Amandes", "100 g", "~730 mg"],
          ["Lentilles cuites", "1 tasse", "~731 mg"],
          ["Noisettes / noix de cajou", "100 g", "~660-680 mg"],
          ["Pastèque", "2 tasses", "~592 mg"],
          ["Patate douce", "1 portion moyenne", "~541 mg"],
          ["Épinards cuits", "1 tasse", "~540 mg"],
          ["Tomates cuites", "1 tasse", "~427 mg"],
          ["Banane", "1 fruit moyen", "~422 mg"],
        ],
        note: "Répartir sur la journée plutôt qu'en une seule prise. Bien s'hydrater par ailleurs : une hydratation insuffisante pousse le corps à retenir l'eau en compensation.",
      },
      {
        type: "text",
        heading: "Déficit calorique",
        text: "Léger déficit (~300-500 kcal/j sous maintenance) pour réduire la couche de graisse sous-mandibulaire et révéler la définition osseuse/musculaire. Voir le calculateur nutrition (Katch-McArdle) pour fixer la cible précise.",
      },
      {
        type: "protocol",
        heading: "Chin tucks",
        frequency: "1x / jour",
        sets: "3 séries",
        reps: "10-15 répétitions",
        details: [
          "Tirer le menton droit en arrière (comme un double menton volontaire), sans incliner la tête vers le bas.",
          "Tenir 3-5 secondes, relâcher.",
          "Renforce les fléchisseurs profonds du cou, corrige la posture tête-avancée et travaille indirectement la zone sous-mandibulaire.",
        ],
      },
      {
        type: "list",
        heading: "Posture — langue et mâchoire",
        items: [
          "Langue au repos contre le palais (juste derrière les dents du haut, pas collée aux dents).",
          "Dents légèrement écartées au repos (pas serrées), lèvres closes.",
          "Respiration nasale plutôt que buccale au quotidien.",
        ],
      },
    ],
  },

  // ─── RASAGE ─────────────────────────────────────────────────
  {
    id: "rasage",
    label: "Rasage",
    image: "face",
    x: 50,
    y: 65,
    blocks: [
      {
        type: "list",
        heading: "Outils & technique",
        items: [
          "Tondeuse/shaver électrique pour dégrossir, puis one blade pour la finition — réduit le risque de poils incarnés vs les rasoirs multi-lames qui coupent sous la peau.",
          "Peau propre et légèrement humide avant de raser, jamais à froid/peau sèche.",
          "Juste après : rincer à l'eau tiède, produit apaisant (aloe vera) si besoin.",
        ],
      },
      {
        type: "protocol",
        heading: "Soin ciblé anti-poils incarnés",
        frequency: "Quelques heures après le rasage, une fois la peau calmée",
        details: [
          "Acide salicylique en faible dose (0,5-2%) en soin ciblé — exfolie en douceur à l'intérieur du follicule, réduit vraiment les poils incarnés et les boutons, contrairement à l'aloe vera qui reste seulement apaisant.",
          "Alternative tout-en-un : lotion après-rasage combinant allantoïne + acide salicylique (gammes pharmacie type La Roche-Posay Homme, ou Bulldog Skincare \"Sensitive\").",
          "Autres pistes ciblées poils incarnés : Tend Skin, sérums à l'acide salicylique type Topicals High Roller, ou soin exfoliant acide salicylique + glycolique (ex. NIVEA Derma Skin Clear).",
          "Usage quotidien pendant au moins 14 jours pour des résultats visibles (action progressive sur la structure du follicule).",
        ],
        warning: "Ne pas cumuler acide salicylique et autres exfoliants forts (rétinoïdes, AHA) le même jour, risque d'irritation.",
      },
    ],
  },

  // ─── COU ────────────────────────────────────────────────────
  {
    id: "cou",
    label: "Cou",
    image: "face",
    x: 50,
    y: 78,
    blocks: [
      {
        type: "protocol",
        heading: "Harnais chargé",
        frequency: "2-3x / semaine (pas tous les jours, le cou a aussi besoin de récup)",
        details: [
          "Flexion avant : assis ou debout légèrement penché en avant, poids suspendu devant, laisser la tête descendre menton vers poitrine puis remonter. 3-4 séries de 10-15 reps.",
          "Extension arrière : position inverse, poids suspendu derrière la tête. 3-4 séries de 10-15 reps.",
          "Flexion latérale : poids sur le côté, incliner la tête latéralement. 2-4 séries de 8-15 reps de chaque côté.",
          "Progression : +1 répétition/série chaque semaine, ou +1 kg environ toutes les 2-3 semaines.",
        ],
      },
      {
        type: "list",
        heading: "Posture — tête et cou",
        items: [
          "Oreilles alignées avec les épaules (vue de profil) — pas la tête portée en avant.",
          "Chin tucks réguliers pour renforcer cette position, surtout si tu passes beaucoup de temps sur écran/téléphone.",
          "Éviter de regarder le téléphone tête baissée trop longtemps (\"text neck\") — remonter le téléphone à hauteur des yeux plutôt que de baisser la tête.",
        ],
      },
      {
        type: "list",
        heading: "Posture — en dormant",
        items: [
          "Éviter de dormir sur le ventre (force le cou en rotation prolongée).",
          "Oreiller qui maintient la tête alignée avec la colonne, ni trop haut ni trop plat.",
        ],
      },
    ],
  },

  // ─── DENTS & SOURIRE ──────────────────────────────────────────
  {
    id: "dents",
    label: "Dents & sourire",
    image: "face",
    x: 42,
    y: 56,
    blocks: [
      {
        type: "protocol",
        heading: "Nettoyage interdentaire",
        frequency: "1x / jour, idéalement le soir, avant le brossage",
        details: [
          "Fil dentaire dans les espaces serrés, brossette interdentaire dans les autres — les brossettes sont en général plus efficaces pour déloger la plaque et stimuler les gencives.",
          "Le faire avant le brossage plutôt qu'après : le fluor du dentifrice pénètre ensuite mieux entre les dents et le long des gencives.",
        ],
      },
      {
        type: "protocol",
        heading: "Brossage",
        frequency: "2x / jour, matin et soir",
        duration: "2 minutes",
        details: [
          "Brosse à dent électrique, sans appuyer fort — laisser la brosse faire le travail.",
        ],
      },
      {
        type: "protocol",
        heading: "Gratte-langue",
        frequency: "Quotidien, le matin avant le brossage",
        details: [
          "Retire le film bactérien à la surface de la langue — réduit nettement la mauvaise haleine, un geste souvent oublié alors qu'il est très visible/perceptible pour les autres.",
        ],
      },
      {
        type: "protocol",
        heading: "Bain de bouche",
        frequency: "Quotidien, à distance du brossage (ex. après le déjeuner plutôt que juste après le brossage)",
        details: [
          "Verser la dose recommandée, rincer 30 secondes.",
          "Ne pas se rincer à l'eau juste après pour laisser l'effet agir.",
        ],
        warning: "Éviter de l'utiliser juste après le brossage : ça rince le fluor concentré du dentifrice avant qu'il ait fini d'agir.",
      },
      {
        type: "protocol",
        heading: "Comprimés révélateurs de plaque",
        frequency: "1x / semaine",
        details: [
          "À croquer après le brossage habituel — colore en rose/rouge les zones encore couvertes de plaque.",
          "Sert à repérer et corriger les zones mal brossées (technique, angle de brosse), pas à remplacer le brossage.",
        ],
      },
    ],
  },

  // ─── LÈVRES ─────────────────────────────────────────────────
  {
    id: "levres",
    label: "Lèvres",
    image: "face",
    x: 58,
    y: 56,
    blocks: [
      {
        type: "protocol",
        heading: "Exfoliation",
        frequency: "1-2x / semaine",
        details: ["Gommage doux (type miel + sucre) pour retirer les peaux mortes et optimiser l'absorption du baume ensuite."],
      },
      {
        type: "list",
        heading: "Baume — à privilégier",
        items: ["Beurre de karité, cire d'abeille, huile de ricin — nourrissent sans assécher."],
      },
      {
        type: "list",
        heading: "Baume — à éviter",
        items: [
          "Camphre, menthol, eucalyptus : sensation de fraîcheur immédiate mais irritants sur des lèvres déjà fragilisées, effet rebond qui pousse à réappliquer encore plus souvent.",
          "Lanoline, octinoxate, oxybenzone : peuvent aggraver l'irritation.",
        ],
      },
      {
        type: "text",
        text: "Application au coucher + réapplication dans la journée si besoin.",
      },
    ],
  },

  // ─── NEZ & OREILLES ─────────────────────────────────────────
  {
    id: "nez-oreilles",
    label: "Nez & oreilles",
    image: "face",
    x: 50,
    y: 47,
    blocks: [
      {
        type: "protocol",
        heading: "Tondeuse nez/oreilles",
        frequency: "Nez toutes les 2-4 semaines, oreilles toutes les 4-6 semaines (selon la pousse)",
        details: [
          "Toujours à sec — les poils mouillés s'agglutinent et sont plus durs à couper proprement.",
          "Ne pas tout retirer : garder un peu de poils de nez, ils filtrent naturellement l'air.",
          "Nettoyer la tête de la tondeuse à l'eau tiède + antiseptique après usage.",
        ],
      },
    ],
  },

  // ─── POSTURE (corps) ────────────────────────────────────────
  {
    id: "posture",
    label: "Posture",
    image: "body",
    x: 50,
    y: 28,
    blocks: [
      {
        type: "list",
        heading: "Debout",
        items: [
          "Pieds écartés largeur du bassin, poids réparti également sur les deux pieds.",
          "Genoux légèrement déverrouillés (pas bloqués en extension).",
          "Bassin neutre (ni trop cambré, ni trop rentré).",
          "Épaules basses et relâchées, tirées légèrement en arrière (pas en avant/enroulées).",
          "Menton parallèle au sol, ni relevé ni rentré à l'excès.",
        ],
      },
      {
        type: "list",
        heading: "Assis",
        items: [
          "Dos droit, appuyé au dossier, bas du dos soutenu (creux lombaire naturel préservé).",
          "Pieds à plat au sol, genoux à 90°.",
          "Écran à hauteur des yeux (évite de pencher la tête vers l'avant/le bas).",
          "Épaules relâchées, coudes proches du corps à 90° si tu tapes au clavier.",
        ],
      },
      {
        type: "text",
        text: "Posture de la tête/cou (chin tucks, alignement oreilles-épaules) → voir la zone Cou. Posture langue/mâchoire → voir la zone Jawline.",
      },
    ],
  },

  // ─── CORPS (peau) ───────────────────────────────────────────
  {
    id: "corps",
    label: "Corps",
    image: "body",
    x: 50,
    y: 38,
    blocks: [
      {
        type: "list",
        heading: "Douche",
        items: [
          "Nettoyant doux, eau tiède plutôt que très chaude (l'eau trop chaude assèche la peau).",
          "Hydratant corps appliqué juste après, sur peau encore humide, pour aider à retenir l'eau.",
        ],
      },
      {
        type: "protocol",
        heading: "Exfoliation corps",
        frequency: "1-2x / semaine",
        details: ["Gant de crin ou gommage doux — insister sur le dos si zone à imperfections."],
      },
      {
        type: "text",
        heading: "Dos / torse à imperfections",
        text: "Si acné corporelle : nettoyant ciblé à l'acide salicylique ou au peroxyde de benzoyle en soin local, sur la zone concernée.",
      },
    ],
  },

  // ─── ONGLES & MAINS ─────────────────────────────────────────
  {
    id: "ongles",
    label: "Ongles & mains",
    image: "body",
    x: 24,
    y: 49,
    blocks: [
      {
        type: "protocol",
        heading: "Coupe des ongles",
        frequency: "1x / semaine",
        details: [
          "Mains : forme légèrement arrondie.",
          "Pieds : coupe droite, pour éviter les ongles incarnés.",
        ],
      },
      {
        type: "list",
        heading: "Cuticules & mains",
        items: [
          "Repousser les cuticules doucement après la douche (peau ramollie) — ne pas couper à vif.",
          "Crème mains si mains sèches, surtout après des lavages fréquents.",
        ],
      },
    ],
  },

  // ─── PARFUM ─────────────────────────────────────────────────
  {
    id: "parfum",
    label: "Parfum",
    image: "body",
    x: 73,
    y: 43,
    blocks: [
      {
        type: "list",
        heading: "Zones d'application",
        items: [
          "Points de pulsation : intérieur des poignets, intérieur des coudes, derrière les oreilles, nuque, sous le nombril — ces zones sont plus chaudes et diffusent mieux le parfum.",
          "2-3 zones cibles plutôt que partout.",
        ],
      },
      {
        type: "protocol",
        heading: "Technique",
        details: [
          "Vaporiser à 15-20 cm de la peau.",
          "2-4 vaporisations au total.",
          "Appliquer sur peau propre et hydratée (après douche/hydratant) pour une meilleure tenue.",
        ],
        warning: "Ne jamais frotter les poignets l'un contre l'autre après application — la friction casse les molécules olfactives et fait partir le parfum plus vite.",
      },
    ],
  },
];

export const FACE_ZONES = ROUTINE_ZONES.filter((z) => z.image === "face");
export const BODY_ZONES = ROUTINE_ZONES.filter((z) => z.image === "body");
