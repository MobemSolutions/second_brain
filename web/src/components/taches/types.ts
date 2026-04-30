export interface Tache {
  id: number;
  titre: string;
  projet_id: number | null;
  projet_titre?: string;
  statut: string;
  priorite: string;
  date_debut: string | null;
  date_echeance: string | null;
  contexte: string | null;
  notes: string | null;
}

export interface Projet {
  id: number;
  titre: string;
}

export interface SharedViewProps {
  taches: Tache[];
  projets: Projet[];
  onDelete: (id: number) => Promise<void>;
  onMove: (id: number, statut: string) => Promise<void>;
  onAdd: () => void;
}

export const PRIO_BORDER: Record<string, string> = {
  haute: "#ef4444", moyenne: "#f59e0b", basse: "#9ca3af", normal: "#9ca3af",
};
export const PRIO_DOT: Record<string, string> = {
  haute: "#ef4444", moyenne: "#f59e0b", basse: "#9ca3af", normal: "#9ca3af",
};
export const PRIO_LABEL: Record<string, string> = {
  haute: "Haute", moyenne: "Moyenne", basse: "Basse", normal: "Normal",
};

export const today = () => new Date().toISOString().split("T")[0];

export function isOverdue(t: Tache) {
  return t.date_echeance && t.date_echeance < today() && t.statut !== "termine";
}
