"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, FileText } from "lucide-react";
import PdfModal from "@/components/PdfModal";

interface Session {
  id: number;
  discipline: string;
  date: string;
  duree?: number;
  rpe?: number;
  notes?: string;
  groupe_musculaire?: string;
  exercice?: string;
  series?: number;
  repetitions?: number;
  charge?: number;
  type_course?: string;
  distance?: number;
  temps_min?: number;
  cotation?: string;
  resultat?: string;
  site?: string;
  sommet?: string;
  massif?: string;
  altitude?: number;
  cotation_globale?: string;
  pdf_path?: string;
}

type Disc = "musculation" | "running" | "escalade" | "alpinisme";

const TABS: { id: Disc; label: string; icon: string }[] = [
  { id: "musculation", label: "Musculation", icon: "💪" },
  { id: "running", label: "Running", icon: "🏃" },
  { id: "escalade", label: "Escalade", icon: "🧗" },
  { id: "alpinisme", label: "Alpinisme", icon: "🏔️" },
];

const GROUPES = ["Dos", "Pectoraux", "Épaules", "Biceps", "Triceps", "Jambes", "Abdos", "Full body"];
const COTATIONS = ["4", "4+", "5a", "5b", "5c", "6a", "6a+", "6b", "6b+", "6c", "6c+", "7a", "7a+", "7b", "7b+", "7c", "7c+", "8a"];
const COTATIONS_ALPI = ["F", "PD-", "PD", "PD+", "AD-", "AD", "AD+", "D-", "D", "D+", "TD-", "TD", "TD+", "ED"];
const RESULTATS = ["🌟 Flash", "✅ Enchainement", "👀 À vue", "🔧 Travaillée", "📌 Projet"];
const METEO = ["☀️ Beau", "🌤️ Nuageux", "🌧️ Pluie", "❄️ Neige"];

function pace(dist: number, timeMin: number): string {
  if (!dist || !timeMin) return "—";
  const secPerKm = (timeMin * 60) / dist;
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")} /km`;
}

function volume(series?: number, reps?: number, charge?: number): number | null {
  if (!series || !reps || !charge) return null;
  return series * reps * charge;
}

export default function SportPage() {
  const [tab, setTab] = useState<Disc>("musculation");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [planPdf, setPlanPdf] = useState<string | null>(null);
  const [pdfViewer, setPdfViewer] = useState<{ url: string; name: string } | null>(null);
  const [form, setForm] = useState<Record<string, string | number>>({
    date: new Date().toISOString().split("T")[0],
    duree: "", rpe: "", meteo: "", notes: "",
    groupe_musculaire: "", exercice: "", series: "", repetitions: "", charge: "", programme: "",
    type_course: "", distance: "", temps_min: "",
    site: "", voie: "", cotation: "", style_escalade: "Bloc", resultat: "",
    sommet: "", massif: "", altitude: "", cotation_globale: "", partenaires: "",
  });

  const f = (k: string, v: string | number) => setForm((p) => ({ ...p, [k]: v }));

  const load = useCallback(() => {
    fetch(`/api/sport?discipline=${tab}&limit=15`)
      .then((r) => r.json())
      .then(setSessions);
  }, [tab]);

  const loadPlan = useCallback(async () => {
    const r = await fetch(`/api/pinned?key=sport_${tab}`);
    const data = await r.json() as { pdf_path: string | null };
    setPlanPdf(data.pdf_path);
  }, [tab]);

  useEffect(() => { load(); loadPlan(); }, [load, loadPlan]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body: Record<string, unknown> = { discipline: tab };
    for (const [k, v] of Object.entries(form)) {
      if (v !== "" && v !== null) body[k] = v;
    }
    await fetch("/api/sport", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setShowForm(false);
    load();
  };

  const uploadPlan = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    const up = await fetch("/api/upload", { method: "POST", body: fd });
    if (!up.ok) return;
    const { filename } = await up.json() as { filename: string };
    await fetch("/api/pinned", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: `sport_${tab}`, pdf_path: filename }),
    });
    setPlanPdf(filename);
  };

  const del = async (id: number) => {
    await fetch(`/api/sport/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-100">Sport</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <Plus size={15} /> Nouvelle séance
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900 rounded-xl p-1 border border-zinc-800 w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setShowForm(false); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Plan PDF */}
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-zinc-800 bg-zinc-900/60">
        <FileText size={13} className="text-zinc-600 shrink-0" />
        {planPdf ? (
          <>
            <button
              onClick={() => setPdfViewer({ url: `/api/files/${planPdf}`, name: planPdf.replace(/^\d+-/, "") })}
              className="flex-1 text-sm text-zinc-300 hover:text-violet-300 transition-colors truncate text-left"
            >
              {planPdf.replace(/^\d+-/, "")}
            </button>
            <label className="text-xs text-zinc-600 hover:text-zinc-300 cursor-pointer transition-colors shrink-0">
              Remplacer
              <input type="file" accept="application/pdf" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPlan(f); e.target.value = ""; }} />
            </label>
          </>
        ) : (
          <>
            <span className="flex-1 text-sm text-zinc-600">Aucun plan — programme {TABS.find((t) => t.id === tab)?.label}</span>
            <label className="btn-ghost text-xs py-1 cursor-pointer shrink-0">
              + Ajouter PDF
              <input type="file" accept="application/pdf" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPlan(f); e.target.value = ""; }} />
            </label>
          </>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={submit} className="card space-y-4 border-violet-500/30">
          <h2 className="text-sm font-semibold text-zinc-200">
            {TABS.find((t) => t.id === tab)?.icon} Nouvelle séance — {TABS.find((t) => t.id === tab)?.label}
          </h2>

          {/* Common fields */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Date</label>
              <input type="date" className="input" value={form.date as string}
                onChange={(e) => f("date", e.target.value)} required />
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Durée (min)</label>
              <input type="number" className="input" placeholder="60" value={form.duree as string}
                onChange={(e) => f("duree", e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">RPE (1-10)</label>
              <input type="number" min="1" max="10" className="input" placeholder="7" value={form.rpe as string}
                onChange={(e) => f("rpe", e.target.value)} />
            </div>
          </div>

          {/* Musculation */}
          {tab === "musculation" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Groupe musculaire</label>
                <select className="select" value={form.groupe_musculaire as string}
                  onChange={(e) => f("groupe_musculaire", e.target.value)}>
                  <option value="">—</option>
                  {GROUPES.map((g) => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Exercice principal</label>
                <input className="input" placeholder="Squat, Bench…" value={form.exercice as string}
                  onChange={(e) => f("exercice", e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Séries</label>
                <input type="number" className="input" placeholder="5" value={form.series as string}
                  onChange={(e) => f("series", e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Répétitions</label>
                <input type="number" className="input" placeholder="5" value={form.repetitions as string}
                  onChange={(e) => f("repetitions", e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Charge (kg)</label>
                <input type="number" step="0.5" className="input" placeholder="80" value={form.charge as string}
                  onChange={(e) => f("charge", e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Programme</label>
                <select className="select" value={form.programme as string}
                  onChange={(e) => f("programme", e.target.value)}>
                  <option value="">—</option>
                  {["PPL", "5x5", "Hypertrophie", "Force", "Full Body", "Libre"].map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Running */}
          {tab === "running" && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Type</label>
                <select className="select" value={form.type_course as string}
                  onChange={(e) => f("type_course", e.target.value)}>
                  <option value="">—</option>
                  {["Endurance", "Fractionné", "Trail", "Récupération", "Compétition"].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Distance (km)</label>
                <input type="number" step="0.1" className="input" placeholder="10" value={form.distance as string}
                  onChange={(e) => f("distance", e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Temps (min)</label>
                <input type="number" step="0.5" className="input" placeholder="50" value={form.temps_min as string}
                  onChange={(e) => f("temps_min", e.target.value)} />
              </div>
            </div>
          )}

          {/* Escalade */}
          {tab === "escalade" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Site</label>
                <input className="input" placeholder="Nom du site" value={form.site as string}
                  onChange={(e) => f("site", e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Style</label>
                <select className="select" value={form.style_escalade as string}
                  onChange={(e) => f("style_escalade", e.target.value)}>
                  {["Bloc", "Couenne", "Grande voie"].map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Cotation principale</label>
                <select className="select" value={form.cotation as string}
                  onChange={(e) => f("cotation", e.target.value)}>
                  <option value="">—</option>
                  {COTATIONS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Résultat</label>
                <select className="select" value={form.resultat as string}
                  onChange={(e) => f("resultat", e.target.value)}>
                  <option value="">—</option>
                  {RESULTATS.map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Alpinisme */}
          {tab === "alpinisme" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Sommet / Objectif</label>
                <input className="input" placeholder="Mont Blanc, Aiguille…" value={form.sommet as string}
                  onChange={(e) => f("sommet", e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Massif</label>
                <select className="select" value={form.massif as string}
                  onChange={(e) => f("massif", e.target.value)}>
                  <option value="">—</option>
                  {["Mont-Blanc", "Écrins", "Vanoise", "Chartreuse", "Vercors", "Jura", "Pyrénées", "Autre"].map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Altitude (m)</label>
                <input type="number" className="input" placeholder="4808" value={form.altitude as string}
                  onChange={(e) => f("altitude", e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Cotation</label>
                <select className="select" value={form.cotation_globale as string}
                  onChange={(e) => f("cotation_globale", e.target.value)}>
                  <option value="">—</option>
                  {COTATIONS_ALPI.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs text-zinc-500 mb-1 block">Partenaires</label>
                <input className="input" placeholder="Noms des cordistes" value={form.partenaires as string}
                  onChange={(e) => f("partenaires", e.target.value)} />
              </div>
            </div>
          )}

          {/* Météo + Notes */}
          <div className="grid grid-cols-2 gap-3">
            <select className="select" value={form.meteo as string} onChange={(e) => f("meteo", e.target.value)}>
              <option value="">Météo…</option>
              {METEO.map((m) => <option key={m}>{m}</option>)}
            </select>
            <input className="input" placeholder="Notes libres" value={form.notes as string}
              onChange={(e) => f("notes", e.target.value)} />
          </div>

          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">Annuler</button>
            <button type="submit" className="btn-primary">Enregistrer</button>
          </div>
        </form>
      )}

      {/* Sessions list */}
      {sessions.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">{TABS.find((t) => t.id === tab)?.icon}</p>
          <p className="text-zinc-500 text-sm">Aucune séance enregistrée</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="section-label">Historique</p>
          {sessions.map((s) => (
            <div key={s.id} className="card-sm flex items-start gap-4 group hover:border-zinc-700 transition-colors">
              <div className="shrink-0 text-center">
                <p className="text-xs text-zinc-500">
                  {new Date(s.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                </p>
                {s.duree && <p className="text-xs text-zinc-600 mt-0.5">{s.duree}min</p>}
              </div>

              <div className="flex-1 min-w-0">
                {tab === "musculation" && (
                  <>
                    <p className="text-sm text-zinc-200">
                      {s.groupe_musculaire || "—"}
                      {s.exercice && <span className="text-zinc-500"> · {s.exercice}</span>}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {s.series && s.repetitions && s.charge
                        ? `${s.series}×${s.repetitions} @ ${s.charge}kg · Vol: ${volume(s.series, s.repetitions, s.charge)?.toFixed(0)}kg`
                        : "—"}
                    </p>
                  </>
                )}
                {tab === "running" && (
                  <>
                    <p className="text-sm text-zinc-200">
                      {s.type_course || "Course"} · {s.distance ? `${s.distance} km` : "—"}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Allure : {s.distance && s.temps_min ? pace(s.distance, s.temps_min) : "—"}
                    </p>
                  </>
                )}
                {tab === "escalade" && (
                  <>
                    <p className="text-sm text-zinc-200">
                      {s.site || "—"}
                      {s.cotation && <span className="ml-2 badge-violet">{s.cotation}</span>}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">{s.resultat || ""}</p>
                  </>
                )}
                {tab === "alpinisme" && (
                  <>
                    <p className="text-sm text-zinc-200">
                      {s.sommet || "—"}
                      {s.altitude && <span className="text-zinc-500"> · {s.altitude}m</span>}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {s.massif && `${s.massif} · `}
                      {s.cotation_globale || ""}
                    </p>
                  </>
                )}
                {s.notes && <p className="text-xs text-zinc-600 mt-1 italic">{s.notes}</p>}
              </div>

              {s.rpe && (
                <div className="shrink-0 text-center">
                  <p className="text-xs text-zinc-600">RPE</p>
                  <p className={`text-sm font-bold ${s.rpe >= 8 ? "text-red-400" : s.rpe >= 6 ? "text-amber-400" : "text-emerald-400"}`}>
                    {s.rpe}
                  </p>
                </div>
              )}

              <button onClick={() => del(s.id)}
                className="shrink-0 text-zinc-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
      {pdfViewer && (
        <PdfModal
          url={pdfViewer.url}
          filename={pdfViewer.name}
          onClose={() => setPdfViewer(null)}
        />
      )}
    </div>
  );
}
