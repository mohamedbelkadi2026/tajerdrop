import { useMemo, useState } from "react";
import { Calculator, Package, Search, X } from "lucide-react";
import { PageHead, Loading, ErrorState, Empty, useJson, money, NAVY, GOLD } from "./shared";

/**
 * Performance par produit, et simulateur de rentabilite.
 *
 * Le tableau dit ce qui s'est passe. Le simulateur repond a la question que le
 * seller se pose vraiment : « avec ce que j'ai depense en publicite sur ce
 * produit, est-ce que j'y gagne ? » — une donnee que la plateforme ne connait
 * pas, et que lui seul peut fournir.
 */

type ProductRow = {
  product: { id: number; name: string; sku: string | null; imageUrl: string | null } | null;
  leads: number; validLeads: number; confirmed: number; cancelled: number;
  prepared: number; inDelivery: number; delivered: number; quantity: number;
  revenue: number; serviceFees: number; productCost: number; costs: number;
  confirmationRate: number; deliveryRate: number; netProfit: number;
};

type StatsResponse = { period: { from: string; to: string }; products: ProductRow[] };

function Tile({ label, value, sub, tone = "slate" }: {
  label: string; value: string; sub?: string; tone?: "slate" | "green" | "blue" | "amber";
}) {
  const t = {
    slate: { bg: "#f8fafc", fg: NAVY,      lb: "#64748b" },
    green: { bg: "#ecfdf5", fg: "#047857", lb: "#059669" },
    blue:  { bg: "#eff6ff", fg: "#1d4ed8", lb: "#2563eb" },
    amber: { bg: "#fffbeb", fg: "#b45309", lb: "#d97706" },
  }[tone];
  return (
    <div className="rounded-xl p-3.5" style={{ background: t.bg }}>
      <p className="text-xs font-semibold" style={{ color: t.lb }}>{label}</p>
      <p className="mt-1 text-xl font-extrabold" style={{ color: t.fg }}>{value}</p>
      {sub && <p className="mt-0.5 text-xs" style={{ color: t.lb }}>{sub}</p>}
    </div>
  );
}

function Simulator({ row, period, onClose }: {
  row: ProductRow; period: { from: string; to: string }; onClose: () => void;
}) {
  // Saisie gardee en texte : un champ numerique controle empeche d'effacer le
  // dernier caractere pour retaper un montant.
  const [spendText, setSpendText] = useState("1000");
  const [applied, setApplied] = useState<number | null>(null);

  const spend = Number(String(spendText).replace(",", ".").trim());
  const validSpend = spendText.trim() !== "" && Number.isFinite(spend) && spend >= 0;

  // Les montants du serveur sont en centimes, la saisie est en dirhams.
  const adsSpend = (applied ?? 0) * 100;
  const profit = row.revenue - row.serviceFees - row.productCost - adsSpend;
  // Sans depense saisie il n'y a pas de ratio : afficher 0 % laisserait croire
  // a une campagne qui ne rapporte rien.
  const roi = adsSpend > 0 ? (profit / adsSpend) * 100 : null;

  const pct = (n: number) => (row.leads ? `${((n / row.leads) * 100).toFixed(2)} % de ${row.leads}` : "—");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-6" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-start justify-between gap-4 border-b bg-white px-5 py-4">
          <h2 className="text-lg font-bold" style={{ color: NAVY }}>Simulateur de rentabilité</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="flex items-center gap-3 rounded-xl border bg-slate-50 p-3">
            {row.product?.imageUrl
              ? <img src={row.product.imageUrl} alt="" className="h-10 w-10 rounded-lg border bg-white object-contain" />
              : <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-white">
                  <Package className="h-4 w-4 text-slate-300" />
                </div>}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold" style={{ color: NAVY }}>{row.product?.name}</p>
              <p className="text-xs text-slate-400">Période : {period.from} → {period.to}</p>
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold" style={{ color: NAVY }}>Dépenses publicitaires (DH)</label>
            <div className="mt-1.5 flex gap-2">
              <input
                value={spendText}
                onChange={(e) => setSpendText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && validSpend) setApplied(spend); }}
                inputMode="decimal"
                placeholder="1000"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400"
              />
              <button
                onClick={() => validSpend && setApplied(spend)}
                disabled={!validSpend}
                className="shrink-0 rounded-xl px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40"
                style={{ background: GOLD }}
              >
                Calculer
              </button>
            </div>
            {!validSpend && <p className="mt-1 text-xs text-red-600">Entrez un montant valide.</p>}
          </div>

          {applied === null ? (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-slate-500">
              Saisissez ce que vous avez dépensé en publicité sur ce produit pour voir
              votre bénéfice réel et le retour sur cette dépense.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2.5">
                <Tile label="Leads valides" value={String(row.validLeads)} sub={pct(row.validLeads)} tone="green" />
                <Tile label="Confirmées"    value={String(row.confirmed)}  sub={pct(row.confirmed)}  tone="blue" />
                <Tile label="Livrées"       value={String(row.delivered)}  sub={pct(row.delivered)}  tone="green" />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <Tile label="Chiffre d'affaires" value={money(row.revenue)} tone="blue" />
                <Tile label="Dépenses pub"       value={money(adsSpend)}    tone="amber" />
              </div>

              <div className="divide-y rounded-xl border">
                {[
                  { l: "Commandes livrées", v: String(row.delivered) },
                  { l: "Quantité totale",   v: String(row.quantity) },
                  { l: "Frais de service",  v: money(row.serviceFees) },
                  { l: "Coût produit",      v: money(row.productCost) },
                ].map((r) => (
                  <div key={r.l} className="flex items-center justify-between px-4 py-3 text-sm">
                    <span className="text-slate-600">{r.l}</span>
                    <span className="font-semibold" style={{ color: NAVY }}>{r.v}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl border p-3.5">
                  <p className="text-xs font-semibold text-slate-500">Bénéfice total</p>
                  <p className="mt-1 text-2xl font-extrabold"
                    style={{ color: profit >= 0 ? "#047857" : "#c0392f" }}>{money(profit)}</p>
                </div>
                <div className="rounded-xl border p-3.5">
                  <p className="text-xs font-semibold text-slate-500">Retour sur dépense pub</p>
                  <p className="mt-1 text-2xl font-extrabold"
                    style={{ color: (roi ?? 0) >= 0 ? "#047857" : "#c0392f" }}>
                    {roi === null ? "—" : `${roi.toFixed(2)} %`}
                  </p>
                </div>
              </div>

              {profit < 0 && (
                <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800">
                  À ce niveau de dépense, ce produit vous coûte plus qu'il ne rapporte sur la période.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProductStats() {
  const [search, setSearch] = useState("");
  const [sim, setSim] = useState<ProductRow | null>(null);

  const { data, isLoading, error, refetch } =
    useJson<StatsResponse>("/api/marketplace/stats/products?from=2020-01-01&to=2099-12-31");

  // La reponse est un objet { period, products } : la traiter comme un tableau
  // faisait echouer .filter et vidait la page.
  const rows = useMemo(() => {
    const list = data?.products ?? [];
    const q = search.trim().toLowerCase();
    return list
      .filter((r) => r.leads > 0)
      .filter((r) => !q
        || (r.product?.name || "").toLowerCase().includes(q)
        || (r.product?.sku || "").toLowerCase().includes(q))
      .sort((a, b) => b.netProfit - a.netProfit);
  }, [data, search]);

  if (isLoading) return <Loading />;
  if (error) return <ErrorState retry={refetch} />;

  return (
    <div>
      <PageHead title="Performance produits"
        text="Comprenez où vos ventes avancent — et où elles ralentissent." />

      <div className="mb-4 flex max-w-sm items-center gap-2 rounded-xl border bg-white px-3 py-2">
        <Search className="h-4 w-4 text-slate-400" />
        <input className="w-full text-sm outline-none" placeholder="Rechercher un produit ou un SKU"
          value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {!rows.length ? (
        <Empty title="Aucune performance à afficher"
          text="Les statistiques apparaîtront dès votre première activité." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-white">
          <table className="w-full text-sm">
            <thead className="text-xs text-white/70" style={{ background: NAVY }}>
              <tr>
                {["Produit", "Leads", "Confirmées", "Confirmation", "Livrées", "Livraison", "Bénéfice net", ""].map((h) => (
                  <th key={h} className="px-5 py-4 text-start font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.product?.id ?? i} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {r.product?.imageUrl
                        ? <img src={r.product.imageUrl} alt="" loading="lazy"
                            className="h-10 w-10 shrink-0 rounded-lg border object-contain" />
                        : <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-slate-50">
                            <Package className="h-4 w-4 text-slate-300" />
                          </div>}
                      <div className="min-w-0">
                        <p className="truncate font-semibold" style={{ color: NAVY }}>
                          {r.product?.name || "Produit"}
                        </p>
                        {r.product?.sku && <p className="text-xs text-slate-400">SKU {r.product.sku}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">{r.leads}</td>
                  <td className="px-5 py-4">{r.confirmed}</td>
                  <td className="px-5 py-4 font-semibold" style={{ color: "#047857" }}>{r.confirmationRate} %</td>
                  <td className="px-5 py-4">{r.delivered}</td>
                  <td className="px-5 py-4 font-semibold" style={{ color: "#047857" }}>{r.deliveryRate} %</td>
                  <td className="px-5 py-4 font-bold"
                    style={{ color: r.netProfit >= 0 ? "#047857" : "#c0392f" }}>{money(r.netProfit)}</td>
                  <td className="px-5 py-4 text-end">
                    <button onClick={() => setSim(r)}
                      title="Simuler la rentabilité avec mes dépenses publicitaires"
                      className="rounded-lg border p-2 transition-colors hover:bg-slate-100"
                      style={{ color: GOLD, borderColor: `${GOLD}55` }}>
                      <Calculator className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {sim && data && <Simulator row={sim} period={data.period} onClose={() => setSim(null)} />}
    </div>
  );
}
