import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { formatCurrency } from "@/lib/utils";
import {
  AlertTriangle, CheckCircle2, Copy, Loader2, Package, PhoneOff,
  RotateCcw, ShoppingCart, Truck, XCircle,
} from "lucide-react";
import { PageHead, GOLD, NAVY } from "./shared";

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

const PRESETS = [
  { key: "today",      label: "Aujourd'hui" },
  { key: "month",      label: "Ce mois" },
  { key: "last_month", label: "Mois dernier" },
  { key: "all",        label: "Tout" },
  { key: "custom",     label: "Personnalisé" },
];

function Stat({
  icon: Icon, label, value, sub, tone = "slate",
}: { icon: any; label: string; value: string; sub?: string; tone?: string }) {
  const tones: Record<string, string> = {
    slate: "bg-slate-50 text-slate-500",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
    blue: "bg-blue-50 text-blue-600",
  };
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="flex items-center gap-2.5">
        <span className={`rounded-lg p-2 ${tones[tone]}`}><Icon className="h-4 w-4" /></span>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
      <p className="mt-3 text-2xl font-bold" style={{ color: NAVY }}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

export default function TajerDropDashboard() {
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
  const pct = (m?: Metric) => (m?.rate != null ? `${m.rate}% des commandes` : undefined);

  return (
    <div>
      <PageHead title="Tableau de bord" text="Vue globale de votre activité TajerDrop." />

      {/* Filtres */}
      <div className="mb-5 space-y-3">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPreset(p.key)}
              style={preset === p.key ? { background: NAVY, color: "white" } : undefined}
              className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                preset === p.key ? "" : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          {preset === "custom" && (
            <>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500">Du</label>
                <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
                  className="block h-10 rounded-md border px-3 text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500">Au</label>
                <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
                  className="block h-10 rounded-md border px-3 text-sm" />
              </div>
            </>
          )}

          {products.length > 0 && (
            <div className="min-w-0 flex-1 space-y-1 sm:max-w-xs">
              <label className="text-xs font-medium text-slate-500">Produit</label>
              <select value={productId} onChange={(e) => setProductId(e.target.value)}
                className="block h-10 w-full rounded-md border px-3 text-sm">
                <option value="">Tous mes produits</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: GOLD }} />
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-800">
          <p className="font-semibold">Les statistiques ne se chargent pas</p>
          <button onClick={() => refetch()} className="mt-2 text-sm underline">Réessayer</button>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <h2 className="mb-2 text-sm font-semibold text-slate-500">Vue d'ensemble</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat icon={ShoppingCart} label="Total commandes" value={String(cc?.total.count ?? 0)} />
              <Stat icon={CheckCircle2} label="Confirmées" tone="green"
                value={String(cc?.confirmed.count ?? 0)} sub={pct(cc?.confirmed)} />
              <Stat icon={Truck} label="Livrées" tone="green"
                value={String(sh?.delivered.count ?? 0)} sub={pct(sh?.delivered)} />
              <Stat icon={Package} label="Chiffre livré" tone="blue"
                value={formatCurrency(data?.headline.deliveredRevenue.amount ?? 0)} />
            </div>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold text-slate-500">Confirmation</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat icon={PhoneOff} label="Pas de réponse" tone="amber"
                value={String(cc?.noResponse.count ?? 0)} sub={pct(cc?.noResponse)} />
              <Stat icon={PhoneOff} label="Injoignables" tone="amber"
                value={String(cc?.unreachable.count ?? 0)} sub={pct(cc?.unreachable)} />
              <Stat icon={XCircle} label="Annulées" tone="red"
                value={String(cc?.cancelled.count ?? 0)} sub={pct(cc?.cancelled)} />
              <Stat icon={Copy} label="Doublons" tone="amber"
                value={String(data?.duplicates?.count ?? 0)}
                sub="Même numéro sur plusieurs commandes" />
            </div>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold text-slate-500">Livraison</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat icon={Truck} label="En cours de livraison" tone="blue"
                value={String(sh?.inDelivery.count ?? 0)} sub={pct(sh?.inDelivery)} />
              <Stat icon={RotateCcw} label="Retours" tone="red"
                value={String(sh?.returned.count ?? 0)} sub={pct(sh?.returned)} />
              <Stat icon={AlertTriangle} label="Remboursées" tone="red"
                value={String(sh?.refunded.count ?? 0)} sub={pct(sh?.refunded)} />
              <Stat icon={CheckCircle2} label="Leads valides" tone="green"
                value={String(cc?.valid.count ?? 0)} sub={pct(cc?.valid)} />
            </div>
          </div>

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
