"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";

interface InboxItem { id: number; titre: string; type: string; created_at: string; }
interface Projet { id: number; titre: string; deadline?: string; total_taches: number; taches_faites: number; }
interface Tache { id: number; titre: string; statut: string; date_echeance?: string; projet_titre?: string; }
interface Note { id: number; titre: string; type: string; statut: string; created_at: string; }

const STEPS = [
  { title: "Vider l'Inbox", subtitle: "Get Clear — chaque capture doit devenir une action, une note ou disparaître." },
  { title: "Projets actifs", subtitle: "Get Current — où en sont tes projets et leurs échéances ?" },
  { title: "Tâches en retard", subtitle: "Get Current — rien ne doit rester bloqué sans que tu le saches." },
  { title: "Notes fleeting à traiter", subtitle: "Get Creative — transforme tes brouillons en littérature ou en idées permanentes." },
];

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isStaleFleeting(n: Note): boolean {
  if (n.type !== "fleeting" || n.statut === "traite" || n.statut === "archive") return false;
  return (Date.now() - new Date(n.created_at).getTime()) / 3_600_000 > 48;
}

export default function RevuePage() {
  const [step, setStep] = useState(0);
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([]);
  const [projets, setProjets] = useState<Projet[]>([]);
  const [taches, setTaches] = useState<Tache[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);

  const markTraite = useCallback(async (id: number) => {
    await fetch(`/api/inbox/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ traite: 1 }),
    });
    setInboxItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  useEffect(() => {
    fetch("/api/inbox?traite=0").then((r) => r.json()).then(setInboxItems);
    fetch("/api/projets").then((r) => r.json()).then(setProjets);
    fetch("/api/taches").then((r) => r.json()).then(setTaches);
    fetch("/api/notes?type=fleeting").then((r) => r.json()).then(setNotes);
  }, []);

  const overdueTaches = taches.filter((t) => t.statut !== "termine" && t.date_echeance && t.date_echeance < todayStr());
  const staleNotes = notes.filter(isStaleFleeting);
  const sortedProjets = [...projets].sort((a, b) => (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999"));

  const done = step >= STEPS.length;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">Revue guidée</h1>
        <p className="text-zinc-500 text-sm mt-0.5">
          {done ? "Revue terminée" : `Étape ${step + 1}/${STEPS.length} — ${STEPS[step].title}`}
        </p>
      </div>

      <div className="progress-track h-1.5">
        <div className="progress-fill" style={{ width: `${(Math.min(step, STEPS.length) / STEPS.length) * 100}%` }} />
      </div>

      {done ? (
        <div className="card text-center py-12 space-y-3">
          <CheckCircle2 className="mx-auto text-emerald-400" size={32} />
          <p className="text-zinc-200 font-medium">Revue terminée — beau travail !</p>
          <Link href="/" className="btn-primary inline-flex items-center gap-2 mt-2">Retour au Dashboard</Link>
        </div>
      ) : (
        <div className="card space-y-4">
          <p className="text-sm text-zinc-500">{STEPS[step].subtitle}</p>

          {step === 0 && (
            inboxItems.length === 0 ? (
              <p className="text-sm text-zinc-500 py-4 text-center">Inbox vide ✓</p>
            ) : (
              <ul className="space-y-2">
                {inboxItems.map((i) => (
                  <li key={i.id} className="card-sm flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-zinc-200 truncate">{i.titre}</p>
                      <span className="badge-gray text-[10px]">{i.type}</span>
                    </div>
                    <button onClick={() => markTraite(i.id)} className="btn-ghost text-xs py-1 px-2 shrink-0">Traité</button>
                  </li>
                ))}
              </ul>
            )
          )}

          {step === 1 && (
            sortedProjets.length === 0 ? (
              <p className="text-sm text-zinc-500 py-4 text-center">Aucun projet actif</p>
            ) : (
              <ul className="space-y-2">
                {sortedProjets.map((p) => {
                  const pct = p.total_taches ? Math.round((p.taches_faites / p.total_taches) * 100) : 0;
                  return (
                    <li key={p.id} className="card-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-200 truncate">{p.titre}</span>
                        <span className="text-xs text-zinc-500 shrink-0">{p.deadline ?? "sans deadline"}</span>
                      </div>
                      <div className="progress-track h-1.5 mt-2"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
                    </li>
                  );
                })}
              </ul>
            )
          )}

          {step === 2 && (
            overdueTaches.length === 0 ? (
              <p className="text-sm text-zinc-500 py-4 text-center">Aucune tâche en retard ✓</p>
            ) : (
              <ul className="space-y-2">
                {overdueTaches.map((t) => (
                  <li key={t.id} className="card-sm">
                    <p className="text-sm text-zinc-200 truncate">{t.titre}</p>
                    <p className="text-xs text-red-400 mt-0.5">échéance {t.date_echeance}{t.projet_titre ? ` · ${t.projet_titre}` : ""}</p>
                  </li>
                ))}
              </ul>
            )
          )}

          {step === 3 && (
            staleNotes.length === 0 ? (
              <p className="text-sm text-zinc-500 py-4 text-center">Aucune note fleeting en attente depuis plus de 48h ✓</p>
            ) : (
              <ul className="space-y-2">
                {staleNotes.map((n) => (
                  <li key={n.id} className="card-sm">
                    <p className="text-sm text-zinc-200 truncate">{n.titre}</p>
                    <span className="badge-yellow text-[10px]">fleeting depuis &gt;48h</span>
                  </li>
                ))}
              </ul>
            )
          )}

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="btn-ghost flex items-center gap-1.5 disabled:opacity-30"
            >
              <ArrowLeft size={13} /> Précédent
            </button>
            <Link href={step === 0 ? "/inbox" : step === 1 ? "/projets" : step === 2 ? "/taches" : "/notes"} className="text-xs text-zinc-500 hover:text-violet-400">
              Ouvrir la page complète →
            </Link>
            <button onClick={() => setStep((s) => s + 1)} className="btn-primary flex items-center gap-1.5">
              {step === STEPS.length - 1 ? "Terminer" : "Suivant"} <ArrowRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
