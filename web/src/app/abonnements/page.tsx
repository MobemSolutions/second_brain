"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, ToggleLeft, ToggleRight, AlertCircle, CheckCircle2 } from "lucide-react";

interface Abonnement {
  id: number;
  service: string;
  categorie: string | null;
  prix: number;
  frequence: string;
  date_renouvellement: string | null;
  auto_renouvellement: number;
  valeur_percue: number | null;
  actif: number;
  cout_mensuel: number;
  jours_restants: number | null;
  notes: string | null;
}

const CATS = ["", "Streaming", "Sport", "Logiciel", "Santé", "Info", "Gaming", "Autre"];
const FREQS = ["mensuel", "trimestriel", "annuel"];

const CAT_BADGE: Record<string, string> = {
  Streaming: "badge-violet", Sport: "badge-blue", Logiciel: "badge-green",
  Santé: "badge-orange", Info: "badge-yellow", Gaming: "badge-red",
};

function alertInfo(jours: number | null): { icon: string; color: string; text: string } | null {
  if (jours === null) return null;
  if (jours < 0) return { icon: "🔴", color: "text-red-400", text: "Expiré" };
  if (jours <= 7) return { icon: "🔴", color: "text-red-400", text: `dans ${jours}j` };
  if (jours <= 30) return { icon: "🟡", color: "text-amber-400", text: `dans ${jours}j` };
  return { icon: "🟢", color: "text-emerald-400", text: `dans ${jours}j` };
}

const INIT = {
  service: "", categorie: "", prix: "", frequence: "mensuel",
  date_renouvellement: "", valeur_percue: "", notes: "",
};

export default function AbonnementsPage() {
  const [abos, setAbos] = useState<Abonnement[]>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(INIT);
  const [filter, setFilter] = useState<"actifs" | "tous">("actifs");

  const load = useCallback(() => {
    fetch("/api/abonnements").then((r) => r.json()).then(setAbos);
  }, []);

  useEffect(() => { load(); }, [load]);

  const f = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.service.trim()) return;
    await fetch("/api/abonnements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        prix: parseFloat(form.prix) || 0,
        valeur_percue: form.valeur_percue ? parseInt(form.valeur_percue) : null,
        actif: true,
        auto_renouvellement: true,
      }),
    });
    setForm(INIT);
    setModal(false);
    load();
  };

  const toggle = async (abo: Abonnement) => {
    await fetch(`/api/abonnements/${abo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actif: abo.actif ? 0 : 1 }),
    });
    load();
  };

  const del = async (id: number) => {
    if (!confirm("Supprimer cet abonnement ?")) return;
    await fetch(`/api/abonnements/${id}`, { method: "DELETE" });
    load();
  };

  const displayed = filter === "actifs" ? abos.filter((a) => a.actif) : abos;
  const totalMensuel = abos.filter((a) => a.actif).reduce((s, a) => s + (a.cout_mensuel || 0), 0);
  const alerts = abos.filter((a) => a.actif && a.jours_restants !== null && a.jours_restants <= 14);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Abonnements</h1>
          <p className="text-zinc-500 text-sm mt-0.5">
            {abos.filter((a) => a.actif).length} actifs · <span className="text-zinc-300">{totalMensuel.toFixed(2)}€/mois</span>
          </p>
        </div>
        <button onClick={() => setModal(true)} className="btn-primary flex items-center gap-2">
          <Plus size={15} /> Ajouter
        </button>
      </div>

      {/* Alerts banner */}
      {alerts.length > 0 && (
        <div className="card border-amber-500/30 bg-amber-500/5">
          <div className="flex items-start gap-3">
            <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-300 mb-1">Renouvellements à venir</p>
              <div className="flex flex-wrap gap-2">
                {alerts.map((a) => {
                  const info = alertInfo(a.jours_restants);
                  return (
                    <span key={a.id} className={`text-xs ${info?.color || "text-zinc-400"}`}>
                      {a.service} ({info?.text})
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card-sm text-center">
          <p className="text-2xl font-bold text-zinc-100">{totalMensuel.toFixed(0)}€</p>
          <p className="text-xs text-zinc-500 mt-0.5">/mois</p>
        </div>
        <div className="card-sm text-center">
          <p className="text-2xl font-bold text-zinc-100">{(totalMensuel * 12).toFixed(0)}€</p>
          <p className="text-xs text-zinc-500 mt-0.5">/an</p>
        </div>
        <div className="card-sm text-center">
          <p className="text-2xl font-bold text-zinc-100">{abos.filter((a) => a.actif).length}</p>
          <p className="text-xs text-zinc-500 mt-0.5">abonnements</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-1 bg-zinc-900 rounded-lg p-1 border border-zinc-800 w-fit">
        {(["actifs", "tous"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`tab ${filter === f ? "tab-active" : "tab-inactive"}`}>
            {f === "actifs" ? "Actifs" : "Tous"}
          </button>
        ))}
      </div>

      {/* List */}
      {displayed.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-zinc-500 text-sm">Aucun abonnement</p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map((a) => {
            const info = alertInfo(a.jours_restants);
            return (
              <div
                key={a.id}
                className={`card-sm flex items-center gap-4 group hover:border-zinc-700 transition-colors ${
                  !a.actif ? "opacity-50" : ""
                }`}
              >
                {/* Alert icon */}
                <div className="shrink-0 w-6">
                  {info ? (
                    <span className="text-sm">{info.icon}</span>
                  ) : (
                    <CheckCircle2 size={14} className="text-zinc-700" />
                  )}
                </div>

                {/* Service */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className={`text-sm font-medium ${a.actif ? "text-zinc-200" : "text-zinc-500 line-through"}`}>
                      {a.service}
                    </p>
                    {a.categorie && (
                      <span className={CAT_BADGE[a.categorie] || "badge-gray"}>{a.categorie}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-xs text-zinc-500 capitalize">{a.frequence}</p>
                    {info && a.actif && (
                      <p className={`text-xs ${info.color}`}>
                        Renouvellement {info.text}
                      </p>
                    )}
                    {a.valeur_percue && (
                      <p className="text-xs text-zinc-600">Valeur : {a.valeur_percue}/5</p>
                    )}
                  </div>
                </div>

                {/* Price */}
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-zinc-100">{a.cout_mensuel?.toFixed(2)}€</p>
                  <p className="text-xs text-zinc-600">/mois</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={() => toggle(a)} className="btn-ghost p-2" title={a.actif ? "Désactiver" : "Activer"}>
                    {a.actif ? <ToggleRight size={15} className="text-emerald-400" /> : <ToggleLeft size={15} />}
                  </button>
                  <button onClick={() => del(a.id)} className="btn-danger">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-zinc-100 mb-5">Nouvel abonnement</h2>
            <form onSubmit={submit} className="space-y-3">
              <input autoFocus placeholder="Service (Netflix, Spotify…)" className="input"
                value={form.service} onChange={(e) => f("service", e.target.value)} required />
              <div className="grid grid-cols-2 gap-3">
                <select className="select" value={form.categorie} onChange={(e) => f("categorie", e.target.value)}>
                  {CATS.map((c) => <option key={c} value={c}>{c || "Catégorie…"}</option>)}
                </select>
                <select className="select" value={form.frequence} onChange={(e) => f("frequence", e.target.value)}>
                  {FREQS.map((fr) => <option key={fr}>{fr}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Prix (€)</label>
                  <input type="number" step="0.01" className="input" placeholder="9.99"
                    value={form.prix} onChange={(e) => f("prix", e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Prochain renouvellement</label>
                  <input type="date" className="input"
                    value={form.date_renouvellement} onChange={(e) => f("date_renouvellement", e.target.value)} />
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Valeur perçue (1-5)</label>
                <input type="number" min="1" max="5" className="input" placeholder="3"
                  value={form.valeur_percue} onChange={(e) => f("valeur_percue", e.target.value)} />
              </div>
              <input placeholder="Notes (identifiants, annulation…)" className="input"
                value={form.notes} onChange={(e) => f("notes", e.target.value)} />
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setModal(false)} className="btn-ghost">Annuler</button>
                <button type="submit" className="btn-primary">Ajouter</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
