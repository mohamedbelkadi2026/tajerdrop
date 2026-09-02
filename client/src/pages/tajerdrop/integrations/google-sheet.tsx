import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FileSpreadsheet, Link2, Loader2, RefreshCw, Trash2, ExternalLink } from "lucide-react";
import { PageHead, useJson, Loading, ErrorState, GOLD, NAVY } from "../shared";

type SheetsStatus = {
  connected: boolean;
  oauthConnected: boolean;
  sheetUrl: string | null;
  spreadsheetName: string | null;
  lastSyncAt: string | null;
  tabs: string[];
};

/**
 * Page Google Sheets de l'espace seller.
 *
 * Deux états distincts côté backend : `oauthConnected` (le compte Google est
 * autorisé) et `connected` (une feuille est effectivement sélectionnée). On les
 * présente comme deux étapes, sinon un seller autorisé mais sans feuille voit
 * « connecté » alors que rien n'est synchronisé.
 */
export default function GoogleSheetIntegration() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const { data, isLoading, isError, refetch } = useJson<SheetsStatus>(
    "/api/integrations/google-sheets/status",
  );

  if (isLoading) return <Loading />;
  if (isError) return <ErrorState retry={() => refetch()} />;

  const s = data;
  const authorized = !!s?.oauthConnected;
  const linked = !!s?.connected;

  function authorize() {
    setBusy(true);
    window.location.href = "/api/integrations/google-sheets/oauth/start";
  }

  async function syncNow() {
    setBusy(true);
    try {
      await fetch("/api/integrations/google-sheets/sync-now", {
        method: "POST",
        credentials: "include",
      });
      await qc.invalidateQueries({ queryKey: ["/api/integrations/google-sheets/status"] });
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    if (!confirm("Déconnecter Google Sheets ? Les commandes déjà importées sont conservées.")) return;
    setBusy(true);
    try {
      await fetch("/api/integrations/google-sheets/disconnect", {
        method: "POST",
        credentials: "include",
      });
      await qc.invalidateQueries({ queryKey: ["/api/integrations/google-sheets/status"] });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHead
        title="Google Sheets"
        text="Vos commandes saisies dans une feuille de calcul remontent ici automatiquement."
      />

      {!authorized ? (
        <div className="rounded-2xl border border-dashed p-10 text-center" style={{ borderColor: `${GOLD}66`, background: "#fffaf0" }}>
          <FileSpreadsheet className="mx-auto mb-3 h-9 w-9" style={{ color: GOLD }} />
          <h3 className="font-semibold" style={{ color: NAVY }}>Compte Google non autorisé</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            Autorisez l'accès à votre Google Drive, puis choisissez la feuille
            qui contient vos commandes.
          </p>
          <button
            onClick={authorize}
            disabled={busy}
            className="mt-6 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: NAVY }}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
            Autoriser Google
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-lg font-semibold" style={{ color: NAVY }}>
                    {s?.spreadsheetName || "Aucune feuille sélectionnée"}
                  </h2>
                  <span
                    className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                    style={
                      linked
                        ? { background: "#dceee8", color: "#2f806d" }
                        : { background: "#fef3c7", color: "#92400e" }
                    }
                  >
                    {linked ? "Synchronisation active" : "À configurer"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {linked
                    ? s?.lastSyncAt
                      ? `Dernière synchronisation le ${new Date(s.lastSyncAt).toLocaleString("fr-FR")}`
                      : "En attente de la première synchronisation"
                    : "Votre compte Google est autorisé. Il reste à choisir la feuille à suivre."}
                </p>
                {!!s?.tabs?.length && (
                  <p className="mt-2 text-xs text-slate-400">
                    Onglets suivis : {s.tabs.join(", ")}
                  </p>
                )}
              </div>

              {s?.sheetUrl && (
                <a
                  href={s.sheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Ouvrir la feuille
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {linked && (
              <button
                onClick={syncNow}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: NAVY }}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Synchroniser maintenant
              </button>
            )}
            <button
              onClick={authorize}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            >
              <FileSpreadsheet className="h-4 w-4" />
              {linked ? "Changer de feuille" : "Choisir une feuille"}
            </button>
            <button
              onClick={disconnect}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" />
              Déconnecter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
