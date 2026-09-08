import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { formatCurrency } from "@/lib/utils";
import {
  AlertTriangle, CheckCircle2, Copy, Loader2, Package, PhoneOff,
  RotateCcw, ShoppingCart, SlidersHorizontal, Truck, XCircle,
} from "lucide-react";
import { PageHead, GOLD, NAVY } from "./shared";
import { useTranslation } from "react-i18next";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

type Metric = { count: number; amount?: number; rate?: number };

type Overview = {
  period: { from: string; to: string };
  headline: { validLeads: Metric; confirmed: Metric; delivered: Metric; deliveredRevenue: Metric };
  callCenter: {
    total: Metric; valid: Metric; confirmed: Metric; toCallBack: Metric;
    noResponse: Metric; unreachable: Metric; cancelled: Metric; expired: Metric;
  };
  shipping: { inDelivery: Metric; delivered: Metric; returned: Metric; refunded: Metric };
  duplicates?: Metric;
  netProfit?: Metric;
};

type StockItem = { productId: number; product: { id: number; name: string } | null };

/** Bornes calculees dans le fuseau local — l'API attend des dates nues. */
function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function rangeFor(preset: string): { from: string; to: string } | null {
  const now = new Date();
  switch (preset) {
    case "today":
      return { from: iso(now), to: iso(now) };
    case "month":
      return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: iso(now) };
    case "last_month": {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: iso(first), to: iso(last) };
    }
    case "all":
      return { from: "2020-01-01", to: "2099-12-31" };
    default:
      return null; // personnalise : les champs de date font foi
  }
}

// Libelles resolus au rendu : ce tableau est evalue a l'import, avant que
// la langue ne soit connue.
const PRESETS = [
  { key: "today", k: "today" },
  { key: "month", k: "month" },
  { key: "last_month", k: "lastMonth" },
  { key: "all", k: "all" },
  { key: "custom", k: "custom" },
];

/**
 * Carte pleine couleur, une teinte par statut : sur douze cartes blanches
 * identiques, reperer les annulations demandait de lire chaque libelle.
 * La couleur porte le sens — vert ce qui avance, rouge ce qui echoue,
 * ambre ce qui attend une action — le texte reste en blanc pour rester
 * lisible sur des fonds satures.
 */
const TONES: Record<string, string> = {
  navy:  "#0F172A",
  green: "#1f8a5f",
  blue:  "#64748b",
  red:   "#c0392f",
  amber: "#B7791F",
  slate: "#6b7280",
};

function Stat({
  icon: Icon, label, value, sub, tone = "slate",
}: { icon: any; label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="rounded-xl p-4 text-white" style={{ background: TONES[tone] || TONES.slate }}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold opacity-95">{label}</p>
        <Icon className="h-5 w-5 shrink-0 opacity-70" />
      </div>
      <p className="mt-3 text-4xl font-extrabold tracking-tight">{value}</p>
      {sub && <p className="mt-1 text-xs font-medium opacity-80">{sub}</p>}
    </div>
  );
}


type ProductRow = {
  product: { id: number; name: string; sku: string; imageUrl: string | null } | null;
  leads: number;
  confirmed: number;
  delivered: number;
  confirmationRate: number;
  deliveryRate: number;
  netProfit: number;
};

/**
 * Produits les plus vendus, classes par benefice net.
 *
 * Trier par nombre de commandes mettrait en tete un produit qui vend beaucoup
 * et ne rapporte rien : le seller a besoin de savoir lequel le paie, pas
 * lequel l'occupe.
 */

/**
 * Anneaux de repartition. Les cartes donnent des comptes ; l'anneau donne la
 * forme — on voit d'un coup si les pertes viennent du centre d'appel ou du
 * transporteur, ce que douze chiffres alignes ne montrent pas.
 *
 * Les segments a zero sont retires : recharts leur reserve une entree de
 * legende et un trait, ce qui encombre l'anneau sans rien apprendre.
 */
function Donut({ title, data }: { title: string; data: { name: string; value: number; color: string }[] }) {
  const { t } = useTranslation();
  const rows = data.filter((d) => d.value > 0);
  const total = rows.reduce((n, d) => n + d.value, 0);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-bold" style={{ color: NAVY }}>{title}</h3>

      {total === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">
          Aucune commande sur cette période.
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <div className="relative h-44 w-44 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={rows}
                  dataKey="value"
                  innerRadius="62%"
                  outerRadius="100%"
                  paddingAngle={2}
                  stroke="none"
                >
                  {rows.map((d) => <Cell key={d.name} fill={d.color} />)}
                </Pie>
                <Tooltip
                  formatter={(v: any, n: any) => [`${v} (${Math.round((v / total) * 100)}%)`, n]}
                  contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xs text-slate-400">{t("seller.dashboard.total_")}</span>
              <span className="text-2xl font-extrabold" style={{ color: NAVY }}>{total}</span>
            </div>
          </div>

          <ul className="min-w-0 flex-1 space-y-1.5">
            {rows.map((d) => (
              <li key={d.name} className="flex items-center gap-2 text-sm">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
                <span className="min-w-0 flex-1 truncate text-slate-600">{d.name}</span>
                <span className="font-semibold" style={{ color: NAVY }}>{d.value}</span>
                <span className="w-10 text-end text-xs text-slate-400">
                  {Math.round((d.value / total) * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function TopProducts({ qs }: { qs: string }) {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery<{ products: ProductRow[] }>({
    queryKey: [`/api/marketplace/stats/products?${qs}`],
    queryFn: async () => {
      const r = await fetch(`/api/marketplace/stats/products?${qs}`, { credentials: "include" });
      if (!r.ok) throw new Error();
      return r.json();
    },
  });

  const rows = (data?.products || [])
    .filter((r) => r.product && r.leads > 0)
    .sort((a, b) => b.netProfit - a.netProfit);

  if (isLoading || !rows.length) return null;

  return (
    <div>
      <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">
        Produits les plus rentables
      </h2>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-xs font-semibold text-slate-500">
                <th className="px-4 py-3 text-start">{t("seller.dashboard.colProduct")}</th>
                <th className="px-4 py-3 text-end">{t("seller.dashboard.colOrders")}</th>
                <th className="px-4 py-3 text-end">{t("seller.dashboard.secConfirm")}</th>
                <th className="px-4 py-3 text-end">{t("seller.dashboard.secDelivery")}</th>
                <th className="px-4 py-3 text-end">{t("seller.dashboard.colProfit")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.product!.id} className="border-b last:border-0 hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {r.product!.imageUrl ? (
                        <img src={r.product!.imageUrl} alt="" loading="lazy"
                          className="h-11 w-11 shrink-0 rounded-lg border bg-white object-contain" />
                      ) : (
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border bg-slate-50">
                          <Package className="h-4 w-4 text-slate-300" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="line-clamp-2 font-semibold" style={{ color: NAVY }}>{r.product!.name}</p>
                        <p className="text-xs text-slate-400">SKU {r.product!.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-end font-semibold" style={{ color: NAVY }}>{r.leads}</td>
                  <td className="px-4 py-3 text-end">
                    <span className="font-semibold text-slate-700">{r.confirmationRate}%</span>
                    <span className="ms-1 text-xs text-slate-400">({r.confirmed})</span>
                  </td>
                  <td className="px-4 py-3 text-end">
                    <span className="font-semibold text-slate-700">{r.deliveryRate}%</span>
                    <span className="ms-1 text-xs text-slate-400">({r.delivered})</span>
                  </td>
                  <td className="px-4 py-3 text-end font-bold"
                    style={{ color: r.netProfit >= 0 ? "#1f8a5f" : "#c0392f" }}>
                    {formatCurrency(r.netProfit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function TajerDropDashboard() {
  const { t } = useTranslation();
  const [preset, setPreset] = useState("month");
  const [customFrom, setCustomFrom] = useState(iso(new Date()));
  const [customTo, setCustomTo] = useState(iso(new Date()));
  const [productId, setProductId] = useState("");

  const range = rangeFor(preset) ?? { from: customFrom, to: customTo };

  const { data: stock } = useQuery<StockItem[]>({
    queryKey: ["/api/marketplace/my-stock"],
    queryFn: async () => {
      const r = await fetch("/api/marketplace/my-stock", { credentials: "include" });
      if (!r.ok) throw new Error();
      return r.json();
    },
  });

  // Seuls les produits dont l'acces a ete accorde : filtrer sur un produit non
  // valide ne pourrait ramener aucune commande.
  const products = useMemo(() => {
    const seen = new Map<number, string>();
    for (const s of stock ?? []) if (s.product) seen.set(s.product.id, s.product.name);
    return Array.from(seen, ([id, name]) => ({ id, name }));
  }, [stock]);

  const qs = new URLSearchParams({ from: range.from, to: range.to });
  if (productId) qs.set("productId", productId);

  const { data, isLoading, isError, refetch } = useQuery<Overview>({
    queryKey: [`/api/marketplace/stats/overview?${qs.toString()}`],
    queryFn: async () => {
      const r = await fetch(`/api/marketplace/stats/overview?${qs.toString()}`, { credentials: "include" });
      if (!r.ok) throw new Error();
      return r.json();
    },
  });

  const cc = data?.callCenter;
  const sh = data?.shipping;
  const pct = (m?: Metric) => (m?.rate != null ? t("seller.dashboard.ofOrders", { n: m.rate }) : undefined);

  return (
    <div>
      <PageHead title={t("seller.dashboard.title")} text={t("seller.dashboard.sub")} />

      {/* Filtres */}
      <div className="mb-5 rounded-xl border bg-white p-4">
        <div className="mb-3 flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4" style={{ color: GOLD }} />
          <span className="text-xs font-semibold tracking-wide text-slate-500">{t("seller.dashboard.filters")}</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {products.length > 0 && (
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              style={productId ? { borderColor: NAVY, color: NAVY } : undefined}
              className="h-10 rounded-lg border bg-white px-3 text-sm font-medium text-slate-600"
            >
              <option value="">{t("seller.dashboard.allProducts")}</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}

          <select
            value={preset}
            onChange={(e) => setPreset(e.target.value)}
            style={preset !== "month" ? { borderColor: NAVY, color: NAVY } : undefined}
            className="h-10 rounded-lg border bg-white px-3 text-sm font-medium text-slate-600"
          >
            {PRESETS.map((p) => <option key={p.key} value={p.key}>{t(`seller.dashboard.${p.k}`)}</option>)}
          </select>

          {preset === "custom" && (
            <>
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
                className="h-10 rounded-lg border px-3 text-sm" />
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
                className="h-10 rounded-lg border px-3 text-sm" />
            </>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: GOLD }} />
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-800">
          <p className="font-semibold">{t("seller.dashboard.loadError")}</p>
          <button onClick={() => refetch()} className="mt-2 text-sm underline">{t("seller.dashboard.retry")}</button>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">{t("seller.dashboard.secOverview")}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat icon={ShoppingCart} label={t("seller.dashboard.total")} tone="navy" value={String(cc?.total.count ?? 0)} />
              <Stat icon={CheckCircle2} label={t("seller.dashboard.validLeads")} tone="blue"
                value={String(cc?.valid.count ?? 0)} sub={pct(cc?.valid)} />
              <Stat icon={CheckCircle2} label={t("seller.dashboard.confirmed")} tone="green"
                value={String(cc?.confirmed.count ?? 0)} sub={pct(cc?.confirmed)} />
              <Stat icon={Package} label={t("seller.dashboard.netProfit")}
                tone={(data?.netProfit?.amount ?? 0) >= 0 ? "green" : "red"}
                value={formatCurrency(data?.netProfit?.amount ?? 0)}
                sub={t("seller.dashboard.netProfitSub")} />
            </div>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">{t("seller.dashboard.secConfirm")}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat icon={PhoneOff} label={t("seller.dashboard.noResponse")} tone="amber"
                value={String(cc?.noResponse.count ?? 0)} sub={pct(cc?.noResponse)} />
              <Stat icon={PhoneOff} label={t("seller.dashboard.unreachable")} tone="slate"
                value={String(cc?.unreachable.count ?? 0)} sub={pct(cc?.unreachable)} />
              <Stat icon={XCircle} label={t("seller.dashboard.cancelled")} tone="red"
                value={String(cc?.cancelled.count ?? 0)} sub={pct(cc?.cancelled)} />
              <Stat icon={Copy} label={t("seller.dashboard.duplicates")} tone="amber"
                value={String(data?.duplicates?.count ?? 0)}
                sub={t("seller.dashboard.duplicatesSub")} />
            </div>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">{t("seller.dashboard.secDelivery")}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat icon={Truck} label={t("seller.dashboard.inDelivery")} tone="blue"
                value={String(sh?.inDelivery.count ?? 0)} sub={pct(sh?.inDelivery)} />
              <Stat icon={RotateCcw} label={t("seller.dashboard.returns")} tone="red"
                value={String(sh?.returned.count ?? 0)} sub={pct(sh?.returned)} />
              <Stat icon={Truck} label={t("seller.dashboard.delivered")} tone="green"
                value={String(sh?.delivered.count ?? 0)} sub={pct(sh?.delivered)} />
              <Stat icon={AlertTriangle} label={t("seller.dashboard.refunded")} tone="amber"
                value={String(sh?.refunded.count ?? 0)} sub={pct(sh?.refunded)} />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Donut
              title={t("seller.dashboard.donutConfirm")}
              data={[
                { name: t("seller.dashboard.confirmed"),       value: cc?.confirmed.count ?? 0,  color: "#1f8a5f" },
                { name: t("seller.dashboard.toCallBack"),       value: cc?.toCallBack.count ?? 0, color: "#B7791F" },
                { name: t("seller.dashboard.noResponse"),   value: cc?.noResponse.count ?? 0, color: "#D69E2E" },
                { name: t("seller.dashboard.unreachable"),     value: cc?.unreachable.count ?? 0, color: "#6b7280" },
                { name: t("seller.dashboard.cancelled"),         value: cc?.cancelled.count ?? 0,  color: "#c0392f" },
                { name: t("seller.dashboard.expired"),         value: cc?.expired.count ?? 0,    color: "#8b2f27" },
              ]}
            />
            <Donut
              title={t("seller.dashboard.donutDelivery")}
              data={[
                { name: t("seller.dashboard.delivered"),             value: sh?.delivered.count ?? 0,  color: "#1f8a5f" },
                { name: t("seller.dashboard.inDelivery"), value: sh?.inDelivery.count ?? 0, color: "#64748b" },
                { name: t("seller.dashboard.returns"),             value: sh?.returned.count ?? 0,   color: "#8b2f27" },
                { name: t("seller.dashboard.refunded"),         value: sh?.refunded.count ?? 0,   color: "#B7791F" },
              ]}
            />
          </div>

          <TopProducts qs={qs.toString()} />

          <div className="flex flex-wrap gap-3">
            <Link href="/tajerdrop/catalogue"
              className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white"
              style={{ background: NAVY }}>
              Parcourir le catalogue
            </Link>
            <Link href="/tajerdrop/commandes"
              className="rounded-lg border px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Mes commandes
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
