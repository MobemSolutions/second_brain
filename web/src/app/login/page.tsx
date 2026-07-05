"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) throw new Error();
      router.push("/");
      router.refresh();
    } catch {
      setError("Mot de passe incorrect.");
      setLoading(false);
    }
  };

  const continueAsGuest = async () => {
    setGuestLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/guest-login", { method: "POST" });
      if (!res.ok) throw new Error();
      router.push("/");
      router.refresh();
    } catch {
      setError("Échec — réessaie.");
      setGuestLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="card w-full max-w-sm space-y-4">
        <div className="text-center">
          <Image src="/logo.jpg" alt="" width={48} height={48} className="mx-auto rounded-md mb-3" />
          <h1 className="text-lg font-semibold" style={{ color: "#1a1a18" }}>Second Brain</h1>
          <p className="text-sm mt-1" style={{ color: "#9c9c9a" }}>Accès protégé</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <input
            type="password"
            autoFocus
            placeholder="Mot de passe"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-xs text-red-500 text-center">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Vérification…" : "Entrer"}
          </button>
        </form>
        <div className="flex items-center gap-3">
          <span className="flex-1 h-px" style={{ backgroundColor: "#e4e2de" }} />
          <span className="text-xs" style={{ color: "#b0aea9" }}>ou</span>
          <span className="flex-1 h-px" style={{ backgroundColor: "#e4e2de" }} />
        </div>
        <button type="button" onClick={continueAsGuest} disabled={guestLoading} className="btn-ghost w-full">
          {guestLoading ? "…" : "Continuer en tant qu'invité"}
        </button>
      </div>
    </div>
  );
}
