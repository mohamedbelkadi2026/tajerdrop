import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle, CheckCircle2, FileSpreadsheet, Loader2, Upload, X,
} from "lucide-react";

const GOLD = "#c49a55";
const NAVY = "#10243d";

/** Champs acceptés par POST /api/orders/import (voir le handler serveur). */
const FIELDS = [
  { value: "", label: "— Ignorer —" },
  { value: "customerName", label: "Nom du client" },
  { value: "customerPhone", label: "Téléphone" },
  { value: "customerAddress", label: "Adresse" },
  { value: "customerCity", label: "Ville" },
  { value: "rawProductName", label: "Nom du produit" },
  { value: "sku", label: "SKU / Référence" },
  { value: "variantInfo", label: "Variante" },
  { value: "quantity", label: "Quantité" },
  { value: "totalPrice", label: "Prix total (DH)" },
  { value: "status", label: "Statut" },
  { value: "comment", label: "Commentaire" },
];

type ImportResult = {
  imported: number;
  skipped: number;
  errors: string[];
};

/**
 * Devine la correspondance d'une colonne à partir de son intitulé.
 *
 * Les fichiers viennent de YouCan, de Sheets ou d'un export manuel, en
 * français, en anglais ou en arabe translittéré ; sans pré-remplissage, le
 * seller doit trancher une dizaine de listes déroulantes à chaque import.
 * La supposition reste modifiable — elle fait gagner du temps, elle ne décide
 * pas à sa place.
 */
const HINTS: [RegExp, string][] = [
  [/nom|name|client|customer|الاسم/i, "customerName"],
  [/t[ée]l|phone|gsm|mobile|هاتف/i, "customerPhone"],
  [/adresse|address|rue|العنوان/i, "customerAddress"],
  [/ville|city|المدينة/i, "customerCity"],
  [/produit|product|article|المنتج/i, "rawProductName"],
  [/sku|r[ée]f|reference/i, "sku"],
  [/variant|taille|couleur|size|color/i, "variantInfo"],
  [/qt[ée]|quantit|quantity|العدد/i, "quantity"],
  [/prix|total|montant|amount|price|الثمن/i, "totalPrice"],
  [/statut|status|[ée]tat/i, "status"],
  [/commentaire|comment|note|remarque/i, "comment"],
];

function guessField(header: string): string {
  for (const [re, field] of HINTS) if (re.test(header)) return field;
  return "";
}

export default function TajerDropImport() {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [preview, setPreview] = useState<Record<string, any>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setFile(null); setHeaders([]); setPreview([]);
    setMapping({}); setResult(null); setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function pick(f: File) {
    setError(null); setResult(null);
    try {
      // xlsx pèse ~430 Ko : on ne le charge qu'au moment où un fichier est
      // choisi, pour ne pas l'imposer à tous les sellers dans le bundle
      // principal — beaucoup travaillent sur mobile et n'importeront jamais.
      const XLSX = await import("xlsx");
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
      if (!rows.length) {
        setError("Ce fichier ne contient aucune ligne.");
        return;
      }
      const cols = Object.keys(rows[0]);
      const guessed: Record<string, string> = {};
      const taken = new Set<string>();
      for (const c of cols) {
        const g = guessField(c);
        // Une même colonne cible ne peut pas être remplie deux fois : on garde
        // la première correspondance et on laisse les suivantes à décider.
        if (g && !taken.has(g)) { guessed[c] = g; taken.add(g); }
        else guessed[c] = "";
      }
      setFile(f);
      setHeaders(cols);
      setPreview(rows.slice(0, 3));
      setMapping(guessed);
    } catch {
      setError("Fichier illisible. Attendu : .xlsx, .xls ou .csv");
    }
  }

  const mapped = Object.values(mapping);
  const hasName = mapped.includes("customerName");
  const hasPhone = mapped.includes("customerPhone");
  // Le serveur ignore toute ligne sans nom ET sans téléphone : sans l'une des
  // deux colonnes, l'import ne produirait rien.
  const canImport = !!file && (hasName || hasPhone) && !busy;

  async function submit() {
    if (!file) return;
    setBusy(true); setError(null); setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("mapping", JSON.stringify(mapping));
      const r = await fetch("/api/orders/import", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const json = await r.json();
      if (!r.ok) {
        setError(json?.message || "L'import a échoué.");
        return;
      }
      setResult(json);
      await qc.invalidateQueries({ queryKey: ["/api/orders/all"] });
    } catch {
      setError("Connexion interrompue pendant l'envoi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: NAVY }}>Importer des commandes</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Chargez un fichier Excel ou CSV, vérifiez les colonnes, importez.
        </p>
      </div>

      {/* 1 — Fichier */}
      {!file ? (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) pick(f);
          }}
          className="cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition-colors hover:bg-white"
          style={{ borderColor: `${GOLD}66`, background: "#fffaf0" }}
        >
          <Upload className="mx-auto mb-3 h-9 w-9" style={{ color: GOLD }} />
          <h3 className="font-semibold" style={{ color: NAVY }}>Choisir un fichier</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
            Glissez-le ici ou cliquez pour parcourir. Formats acceptés : .xlsx, .xls, .csv
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) pick(f); }}
          />
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border bg-white p-4">
          <FileSpreadsheet className="h-5 w-5 shrink-0" style={{ color: GOLD }} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium" style={{ color: NAVY }}>{file.name}</p>
            <p className="text-xs text-slate-500">{headers.length} colonnes détectées</p>
          </div>
          <button onClick={reset} className="shrink-0 rounded-lg border p-2 hover:bg-slate-50" title="Retirer">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>
      )}

      {/* 2 — Correspondance des colonnes */}
      {!!headers.length && !result && (
        <div className="rounded-xl border bg-white">
          <div className="border-b px-5 py-4">
            <h2 className="font-semibold" style={{ color: NAVY }}>Correspondance des colonnes</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Nous avons pré-rempli ce que nous avons reconnu. Corrigez ce qui ne va pas.
            </p>
          </div>

          <div className="divide-y">
            {headers.map((h) => (
              <div key={h} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" style={{ color: NAVY }}>{h}</p>
                  <p className="truncate text-xs text-slate-400">
                    {preview.map((r) => String(r[h] ?? "")).filter(Boolean).slice(0, 2).join("  ·  ") || "vide"}
                  </p>
                </div>
                <select
                  value={mapping[h] ?? ""}
                  onChange={(e) => setMapping({ ...mapping, [h]: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-slate-400 sm:w-56"
                >
                  {FIELDS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4">
            {!hasName && !hasPhone ? (
              <p className="flex items-center gap-2 text-sm text-amber-700">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Associez au moins le nom du client ou son téléphone.
              </p>
            ) : (
              <p className="text-sm text-slate-500">Prêt à importer.</p>
            )}
            <button
              onClick={submit}
              disabled={!canImport}
              className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: NAVY }}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Importer
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* 3 — Résultat */}
      {result && (
        <div className="rounded-xl border bg-white p-5">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            <div>
              <h2 className="font-semibold" style={{ color: NAVY }}>
                {result.imported} commande{result.imported === 1 ? "" : "s"} importée{result.imported === 1 ? "" : "s"}
              </h2>
              {result.skipped > 0 && (
                <p className="text-sm text-slate-500">
                  {result.skipped} ligne{result.skipped === 1 ? "" : "s"} ignorée
                  {result.skipped === 1 ? "" : "s"} — ni nom ni téléphone.
                </p>
              )}
            </div>
          </div>

          {!!result.errors?.length && (
            <details className="mt-4 rounded-lg bg-amber-50 p-3">
              <summary className="cursor-pointer text-sm font-medium text-amber-800">
                {result.errors.length} ligne{result.errors.length === 1 ? "" : "s"} en erreur
              </summary>
              <ul className="mt-2 space-y-1 text-xs text-amber-700">
                {result.errors.slice(0, 20).map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </details>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href="/tajerdrop/commandes"
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white"
              style={{ background: NAVY }}
            >
              Voir mes commandes
            </a>
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Importer un autre fichier
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
