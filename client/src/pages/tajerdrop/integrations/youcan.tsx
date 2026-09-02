import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link2, Loader2, RefreshCw, Store, Trash2, Copy, Check, AlertTriangle } from "lucide-react";
import { PageHead, useJson, Loading, ErrorState, GOLD, NAVY } from "../shared";

type YouCanStore = {
  id: number;
  connected: boolean;
  connectionName: string | null;
  ordersCount: number;
  createdAt: string | null;
  webhookUrl: string | null;
};

type YouCanStatus = {
  configured: boolean;
  connected: boolean;
  stores: YouCanStore[];
};

/**
 * Page YouCan de l'espace seller.
 *
 * Le backend expose déjà tout le nécessaire (OAuth, statut multi-boutiques,
 * déconnexion par boutique) ; cette page se contente de le rendre utilisable
 * sans passer par l'espace SaaS, auquel les sellers n'ont pas accès.
 */
export default function YouCanIntegration() {
  const qc = useQueryClient();
  const [copied, setCopied] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const { data, isLoading, isError, refetch } = useJson<YouCanStatus>(
    "/api/integrations/youcan/status",
  );

  if (isLoading) return <Loading />;
  if (isError) return <ErrorState retry={() => refetch()} />;

  const stores = data?.stores ?? [];

  // YOUCAN_CLIENT_ID absent cote serveur : /oauth/start renvoie vers une page
  // de l'espace SaaS, inaccessible au seller, qui se retrouvait ramene au
  // tableau de bord sans message. On l'annonce plutot que de proposer un
  // bouton qui ne peut pas aboutir.
  if (data && data.configured === false && stores.length === 0) {
    return (
      <div>
        <PageHead title="YouCan" text="Reliez vos boutiques YouCan a votre espace." />
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <h3 className="font-semibold text-amber-900">Connexion YouCan pas encore ouverte</h3>
              <p className="mt-1 text-sm text-amber-800">
                L'acces YouCan n'est pas encore active sur la plateforme. Contactez
                votre responsable de compte pour qu'il l'ouvre. En attendant, vous
                pouvez importer vos commandes par fichier.
              </p>
              <a
                href="/tajerdrop/import"
                className="mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white"
                style={{ background: NAVY }}
              >
                Importer un fichier
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  async function connect() {
    setBusy(true);
    // L'OAuth se fait par redirection pleine page : YouCan renvoie ensuite sur
    // /tajerdrop/integrations/youcan?youcan=connected.
    window.location.href = "/api/integrations/youcan/oauth/start";
  }

  async function disconnect(integrationId: number) {
    if (!confirm("Déconnecter cette boutique ? Les commandes déjà importées sont conservées.")) return;
    setBusy(true);
    try {
      await fetch("/api/integrations/youcan/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ integrationId }),
      });
      await qc.invalidateQueries({ queryKey: ["/api/integrations/youcan/status"] });
    } finally {
      setBusy(false);
    }
  }

  function copyWebhook(store: YouCanStore) {
    if (!store.webhookUrl) return;
    navigator.clipboard.writeText(store.webhookUrl);
    setCopied(store.id);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div>
      <PageHead
        title="YouCan"
        text="Reliez vos boutiques YouCan pour que les commandes arrivent ici automatiquement."
      />

      {stores.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center" style={{ borderColor: `${GOLD}66`, background: "#fffaf0" }}>
          <Store className="mx-auto mb-3 h-9 w-9" style={{ color: GOLD }} />
          <h3 className="font-semibold" style={{ color: NAVY }}>Aucune boutique connectée</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            Connectez votre boutique YouCan. Chaque nouvelle commande y sera récupérée
            sans que vous ayez à la saisir.
          </p>
          <button
            onClick={connect}
            disabled={busy}
            className="mt-6 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: NAVY }}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
            Connecter une boutique
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {stores.map((s) => (
            <div key={s.id} className="rounded-2xl border bg-white p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-lg font-semibold" style={{ color: NAVY }}>
                      {s.connectionName || `Boutique #${s.id}`}
                    </h2>
                    <span
                      className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                      style={
                        s.connected
                          ? { background: "#dceee8", color: "#2f806d" }
                          : { background: "#fee2e2", color: "#b91c1c" }
                      }
                    >
                      {s.connected ? "Connectée" : "Déconnectée"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {s.ordersCount} commande{s.ordersCount === 1 ? "" : "s"} importée
                    {s.ordersCount === 1 ? "" : "s"}
                    {s.createdAt && ` · depuis le ${new Date(s.createdAt).toLocaleDateString("fr-FR")}`}
                  </p>
                </div>

                <button
                  onClick={() => disconnect(s.id)}
                  disabled={busy}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                  Déconnecter
                </button>
              </div>

              {s.webhookUrl && (
                <div className="mt-4 rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-medium text-slate-500">Adresse de réception des commandes</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <code className="min-w-0 flex-1 truncate rounded bg-white px-2 py-1.5 text-xs text-slate-700">
                      {s.webhookUrl}
                    </code>
                    <button
                      onClick={() => copyWebhook(s)}
                      className="shrink-0 rounded-lg border p-2 hover:bg-white"
                      title="Copier"
                    >
                      {copied === s.id
                        ? <Check className="h-4 w-4 text-emerald-600" />
                        : <Copy className="h-4 w-4 text-slate-500" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          <div className="flex flex-wrap gap-3">
            <button
              onClick={connect}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: NAVY }}
            >
              <Link2 className="h-4 w-4" />
              Connecter une autre boutique
            </button>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              Actualiser
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
