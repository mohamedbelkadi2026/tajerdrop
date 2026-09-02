import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Check, Copy, Loader2, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { PageHead, useJson, Loading, ErrorState, GOLD, NAVY } from "../shared";

type ShopifyIntegration = {
  id: number;
  connectionName: string | null;
  webhookKey: string;
  ordersCount: number | null;
  isActive: number | null;
  storeName?: string;
};

/**
 * Page Shopify de l'espace seller.
 *
 * Shopify ne passe pas par OAuth ici : on crée une connexion, le serveur émet
 * une clé, et la boutique pousse ses commandes vers l'URL qui la contient. La
 * page couvre donc création, affichage de l'URL et suppression.
 */
export default function ShopifyIntegration() {
  const qc = useQueryClient();
  const { user } = useAuth() as any;
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  const { data, isLoading, isError, refetch } = useJson<ShopifyIntegration[]>("/api/integrations/shopify");

  if (isLoading) return <Loading />;
  if (isError) return <ErrorState retry={() => refetch()} />;

  const list = Array.isArray(data) ? data : [];
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const urlFor = (i: ShopifyIntegration) => `${origin}/api/webhooks/shopify/order/${i.webhookKey}`;

  async function create() {
    const label = name.trim();
    if (!label) return;
    if (!user?.storeId) {
      setError("Votre boutique n'est pas encore initialisée. Réessayez dans un instant.");
      return;
    }
    setBusy(true); setError(null);
    try {
      const r = await fetch("/api/integrations/shopify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ storeId: user.storeId, connectionName: label }),
      });
      const json = await r.json();
      if (!r.ok) { setError(json?.message || "Création impossible."); return; }
      setName("");
      await qc.invalidateQueries({ queryKey: ["/api/integrations/shopify"] });
    } catch {
      setError("Connexion interrompue.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("Supprimer cette connexion ? Les commandes déjà reçues sont conservées.")) return;
    setBusy(true);
    try {
      await fetch(`/api/integrations/shopify/${id}`, { method: "DELETE", credentials: "include" });
      await qc.invalidateQueries({ queryKey: ["/api/integrations/shopify"] });
    } finally {
      setBusy(false);
    }
  }

  function copy(i: ShopifyIntegration) {
    navigator.clipboard.writeText(urlFor(i));
    setCopied(i.id);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div>
      <PageHead
        title="Shopify"
        text="Votre boutique Shopify envoie ses commandes ici, en direct."
      />

      {/* Connexions existantes */}
      {list.length > 0 && (
        <div className="mb-4 space-y-4">
          {list.map((i) => (
            <div key={i.id} className="rounded-2xl border bg-white p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-lg font-semibold" style={{ color: NAVY }}>
                      {i.connectionName || `Connexion #${i.id}`}
                    </h2>
                    <span
                      className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                      style={
                        (i.ordersCount ?? 0) > 0
                          ? { background: "#dceee8", color: "#2f806d" }
                          : { background: "#fef3c7", color: "#92400e" }
                      }
                    >
                      {(i.ordersCount ?? 0) > 0 ? "Commandes reçues" : "En attente"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {i.ordersCount ?? 0} commande{(i.ordersCount ?? 0) === 1 ? "" : "s"} reçue
                    {(i.ordersCount ?? 0) === 1 ? "" : "s"}
                  </p>
                </div>
                <button
                  onClick={() => remove(i.id)}
                  disabled={busy}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                  Supprimer
                </button>
              </div>

              <div className="mt-4 rounded-xl bg-slate-50 p-3">
                <p className="text-xs font-medium text-slate-500">Adresse à coller dans Shopify</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded bg-white px-2 py-1.5 text-xs text-slate-700">
                    {urlFor(i)}
                  </code>
                  <button onClick={() => copy(i)} className="shrink-0 rounded-lg border p-2 hover:bg-white" title="Copier">
                    {copied === i.id
                      ? <Check className="h-4 w-4 text-emerald-600" />
                      : <Copy className="h-4 w-4 text-slate-500" />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Nouvelle connexion */}
      <div className="rounded-2xl border bg-white p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-xl p-3" style={{ background: "#fff4dc" }}>
            <ShoppingBag className="h-6 w-6" style={{ color: GOLD }} />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: NAVY }}>
              {list.length ? "Ajouter une boutique" : "Connecter votre boutique"}
            </h2>
            <p className="text-sm text-slate-500">Donnez-lui un nom pour la reconnaître.</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
            placeholder="Ma boutique Shopify"
            className="min-w-0 flex-1 rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-slate-400"
          />
          <button
            onClick={create}
            disabled={busy || !name.trim()}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: NAVY }}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Créer
          </button>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>

      {/* Marche à suivre */}
      <div className="mt-4 rounded-2xl border bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold" style={{ color: NAVY }}>Où coller l'adresse</h2>
        <ol className="mt-4 space-y-3 text-sm text-slate-600">
          {[
            <>Dans Shopify, ouvrez <strong>Paramètres → Notifications → Webhooks</strong>.</>,
            <>Cliquez sur <strong>Créer un webhook</strong>.</>,
            <>Choisissez l'événement <strong>Création de commande</strong>, au format <strong>JSON</strong>.</>,
            <>Collez l'adresse ci-dessus dans l'URL, puis enregistrez.</>,
          ].map((step, n) => (
            <li key={n} className="flex gap-3">
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ background: NAVY }}
              >
                {n + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <p className="mt-5 rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
          Passez une commande test : elle doit apparaître dans « Mes commandes »
          en quelques secondes.
        </p>
      </div>
    </div>
  );
}
