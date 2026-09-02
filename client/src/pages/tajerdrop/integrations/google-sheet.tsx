import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import {
  AlertTriangle, ArrowLeft, CheckCircle2, ExternalLink, FileSpreadsheet,
  Loader2, RefreshCw, Trash2,
} from "lucide-react";
import { PageHead, useJson, Loading, ErrorState, GOLD, NAVY } from "../shared";

type SheetsStatus = {
  connected: boolean;
  sheetUrl?: string | null;
  spreadsheetName?: string | null;
  lastSyncAt?: string | null;
};

/**
 * Google Sheets, espace seller.
 *
 * Reprend le parcours qui fonctionne cote TajerGrow : coller l'URL d'une
 * feuille partagee en lecture, previsualiser, confirmer la correspondance des
 * colonnes. Volontairement PAS le flux OAuth (/oauth/start + /select) : il
 * exige GOOGLE_OAUTH_CLIENT_ID et GOOGLE_OAUTH_CLIENT_SECRET cote serveur, qui
 * ne sont pas toujours configures — le bouton semblait alors fonctionner sans
 * jamais aboutir. Le parcours par URL ne depend d'aucune variable
 * d'environnement.
 */

/** Champs cibles, dans l'ordre d'affichage. Doit rester aligne sur ColMapping serveur. */
const FIELDS: { key: string; label: string; required?: boolean }[] = [
  { key: "name", label: "Nom du client", required: true },
  { key: "phone", label: "Telephone", required: true },
  { key: "city", label: "Ville" },
  { key: "address", label: "Adresse" },
  { key: "product", label: "Produit" },
  { key: "price", label: "Prix" },
  { key: "quantity", label: "Quantite" },
  { key: "note", label: "Note" },
  { key: "productId", label: "SKU / Reference" },
  { key: "utmSource", label: "Source (UTM)" },
  { key: "utmCampaign", label: "Campagne (UTM)" },
];

type Mapping = Record<string, number | null>;

const EMPTY: Mapping = Object.fromEntries(FIELDS.map((f) => [f.key, null]));

/**
 * Devine chaque colonne d'apres ses VALEURS, pas son intitule : les feuilles
 * des sellers ont souvent des en-tetes absents ou fantaisistes. Meme heuristique
 * que la page TajerGrow, pour que les deux espaces detectent a l'identique.
 */
function autoDetect(rows: string[][], columnCount: number): Mapping {
  const r: Mapping = { ...EMPTY };
  if (!rows?.length) return r;
  for (let col = 0; col < columnCount; col++) {
    const values = rows.map((x) => (x?.[col] || "").toString().trim()).filter(Boolean);
    if (!values.length) continue;
    const allText = values.join(" ").toLowerCase();

    if (r.phone === null && values.every((v) => /^[+\d\s\-()]{8,20}$/.test(v) && v.replace(/\D/g, "").length >= 8)) {
      r.phone = col; continue;
    }
    if (r.price === null && values.every((v) => /^\d+([.,]\d+)?$/.test(v.replace(/\s/g, "")))) {
      const nums = values.map((v) => parseFloat(v.replace(",", ".")));
      if (nums.every((n) => n >= 10 && n <= 100000)) { r.price = col; continue; }
    }
    if (r.quantity === null && values.every((v) => /^\d{1,2}$/.test(v))) {
      const nums = values.map((v) => parseInt(v, 10));
      if (nums.every((n) => n >= 1 && n <= 99)) { r.quantity = col; continue; }
    }
    if (r.name === null && values.every((v) => /^[\p{L}\s.''-]{2,50}$/u.test(v) && !/^\d/.test(v))) {
      r.name = col; continue;
    }
    if (r.city === null && values.every((v) => /^[\p{L}\s]{2,30}$/u.test(v) && v.split(/\s+/).length <= 3)) {
      r.city = col; continue;
    }
    if (r.address === null && values.every((v) => v.length > 8 && /\d/.test(v) && /\p{L}/u.test(v))) {
      r.address = col; continue;
    }
    if (r.utmSource === null && allText.match(/facebook|instagram|google|tiktok|youtube|organic|direct/)) {
      r.utmSource = col; continue;
    }
    if (r.productId === null && values.every((v) => /^[a-f0-9-]{20,}$/i.test(v))) {
      r.productId = col; continue;
    }
  }
  return r;
}

function colLetter(i: number) {
  let s = "", n = i;
  do { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1; } while (n >= 0);
  return s;
}

export default function GoogleSheetIntegration() {
  const qc = useQueryClient();
  const { user } = useAuth() as any;

  const [step, setStep] = useState<"url" | "mapping">("url");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sample, setSample] = useState<string[][]>([]);
  const [columnCount, setColumnCount] = useState(0);
  const [mapping, setMapping] = useState<Mapping>(EMPTY);

  const { data, isLoading, isError, refetch } = useJson<SheetsStatus>(
    "/api/integrations/google-sheets/status",
  );

  if (isLoading) return <Loading />;
  if (isError) return <ErrorState retry={() => refetch()} />;

  const linked = !!data?.connected;

  async function preview() {
    if (!url.trim()) return;
    setBusy(true); setError(null);
    try {
      const r = await fetch("/api/integrations/google-sheets/preview-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ url: url.trim() }),
      });
      const json = await r.json();
      if (!r.ok) { setError(json?.error || "Lecture impossible."); return; }
      const rows: string[][] = json.sampleRows || (json.sampleRow ? [json.sampleRow] : []);
      const cols = json.columnCount || rows[0]?.length || 0;
      setSample(rows);
      setColumnCount(cols);
      setMapping(autoDetect(rows, cols));
      setStep("mapping");
    } catch {
      setError("Connexion interrompue.");
    } finally {
      setBusy(false);
    }
  }

  async function connect() {
    setBusy(true); setError(null);
    try {
      const clean: Record<string, number> = {};
      for (const [k, v] of Object.entries(mapping)) if (v !== null) clean[k] = v;
      const r = await fetch("/api/integrations/google-sheets/connect-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ url: url.trim(), magasinId: user?.storeId, columnMapping: clean }),
      });
      const json = await r.json();
      if (!r.ok) { setError(json?.error || "Connexion impossible."); return; }
      setStep("url"); setUrl(""); setSample([]);
      await qc.invalidateQueries({ queryKey: ["/api/integrations/google-sheets/status"] });
    } catch {
      setError("Connexion interrompue.");
    } finally {
      setBusy(false);
    }
  }

  async function syncNow() {
    setBusy(true);
    try {
      await fetch("/api/integrations/google-sheets/sync-now", { method: "POST", credentials: "include" });
      await qc.invalidateQueries({ queryKey: ["/api/integrations/google-sheets/status"] });
    } finally { setBusy(false); }
  }

  async function disconnect() {
    if (!confirm("Deconnecter Google Sheets ? Les commandes deja importees sont conservees.")) return;
    setBusy(true);
    try {
      await fetch("/api/integrations/google-sheets/disconnect", { method: "POST", credentials: "include" });
      await qc.invalidateQueries({ queryKey: ["/api/integrations/google-sheets/status"] });
    } finally { setBusy(false); }
  }

  const canConnect = mapping.name !== null || mapping.phone !== null;

  return (
    <div>
      <PageHead
        title="Google Sheets"
        text="Vos commandes saisies dans une feuille remontent ici automatiquement."
      />

      {/* Etat courant */}
      {linked && step === "url" && (
        <div className="mb-4 rounded-2xl border bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-lg font-semibold" style={{ color: NAVY }}>
                  {data?.spreadsheetName || "Feuille connectee"}
                </h2>
                <span className="rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ background: "#dceee8", color: "#2f806d" }}>
                  Synchronisation active
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {data?.lastSyncAt
                  ? `Derniere synchronisation le ${new Date(data.lastSyncAt).toLocaleString("fr-FR")}`
                  : "En attente de la premiere synchronisation (sous 30 secondes)"}
              </p>
            </div>
            {data?.sheetUrl && (
              <a href={data.sheetUrl} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                Ouvrir <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button onClick={syncNow} disabled={busy} className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60" style={{ background: NAVY }}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Synchroniser maintenant
            </button>
            <button onClick={disconnect} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60">
              <Trash2 className="h-4 w-4" />
              Deconnecter
            </button>
          </div>
        </div>
      )}

      {/* Etape 1 — URL */}
      {step === "url" && (
        <div className="rounded-2xl border bg-white p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl p-3" style={{ background: "#fff4dc" }}>
              <FileSpreadsheet className="h-6 w-6" style={{ color: GOLD }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold" style={{ color: NAVY }}>
                {linked ? "Changer de feuille" : "Connecter une feuille"}
              </h2>
              <p className="text-sm text-slate-500">Collez le lien de votre Google Sheet.</p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && preview()}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="min-w-0 flex-1 rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-slate-400"
            />
            <button onClick={preview} disabled={busy || !url.trim()} className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" style={{ background: NAVY }}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Lire la feuille
            </button>
          </div>

          {error && (
            <p className="mt-3 flex items-start gap-2 text-sm text-red-600">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          )}

          <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-medium" style={{ color: NAVY }}>Avant de coller le lien</p>
            <p className="mt-1">
              Dans votre feuille, ouvrez <strong>Partager</strong> et passez l'acces a
              {" "}<strong>Tout le monde avec le lien</strong> en <strong>Lecteur</strong>.
              Sans cela, nous ne pouvons pas la lire.
            </p>
          </div>
        </div>
      )}

      {/* Etape 2 — Correspondance */}
      {step === "mapping" && (
        <div className="rounded-2xl border bg-white">
          <div className="flex items-center gap-3 border-b px-5 py-4">
            <button onClick={() => { setStep("url"); setError(null); }} className="rounded-lg border p-2 hover:bg-slate-50">
              <ArrowLeft className="h-4 w-4 text-slate-500" />
            </button>
            <div>
              <h2 className="font-semibold" style={{ color: NAVY }}>Correspondance des colonnes</h2>
              <p className="text-sm text-slate-500">
                {columnCount} colonnes lues. Verifiez ce que nous avons reconnu.
              </p>
            </div>
          </div>

          <div className="divide-y">
            {FIELDS.map((f) => (
              <div key={f.key} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium" style={{ color: NAVY }}>
                    {f.label}
                    {f.required && <span className="ml-1 text-xs text-slate-400">(l'un des deux)</span>}
                  </p>
                  {mapping[f.key] !== null && (
                    <p className="truncate text-xs text-slate-400">
                      {sample.map((r) => r?.[mapping[f.key] as number] || "").filter(Boolean).slice(0, 2).join("  ·  ") || "vide"}
                    </p>
                  )}
                </div>
                <select
                  value={mapping[f.key] === null ? "" : String(mapping[f.key])}
                  onChange={(e) => setMapping({ ...mapping, [f.key]: e.target.value === "" ? null : Number(e.target.value) })}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-slate-400 sm:w-52"
                >
                  <option value="">— Aucune —</option>
                  {Array.from({ length: columnCount }, (_, i) => (
                    <option key={i} value={i}>
                      Colonne {colLetter(i)}
                      {sample[0]?.[i] ? ` — ${String(sample[0][i]).slice(0, 22)}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4">
            {!canConnect ? (
              <p className="flex items-center gap-2 text-sm text-amber-700">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Associez au moins le nom ou le telephone.
              </p>
            ) : (
              <p className="text-sm text-slate-500">La premiere synchronisation demarre sous 30 secondes.</p>
            )}
            <button onClick={connect} disabled={busy || !canConnect} className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50" style={{ background: NAVY }}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Connecter
            </button>
          </div>

          {error && <p className="px-5 pb-4 text-sm text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
