import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { formatCurrency } from "@/lib/utils";
import {
  AlertTriangle, CheckCircle2, Copy, Loader2, Package, PhoneOff,
  RotateCcw, ShoppingCart, SlidersHorizontal, Truck, XCircle,
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

/**
 * Carte pleine couleur, une teinte par statut : sur douze cartes blanches
 * identiques, reperer les annulations demandait de lire chaque libelle.
 * La couleur porte le sens — vert ce qui avance, rouge ce qui echoue,
 * ambre ce qui attend une action — le texte reste en blanc pour rester
 * lisible sur des fonds satures.
 */
const TONES: Record<string, string> = {
  navy:  "#1e2a5a",
  green: "#1f8a5f",
  blue:  "#5b7092",
  red:   "#c0392f",
  amber: "#c07a1e",
  slate: "#6b7280",
};

function Stat({
  icon: Icon, label, value, sub, tone = "slate",
}: { icon: any; label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="rounded-xl p-4 text-white" style={{ background: TONES[tone] || TONES.slate }}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium opacity-90">{label}</p>
        <Icon className="h-5 w-5 shrink-0 opacity-70" />
      </div>
      <p className="mt-3 text-3xl font-bold">{value}</p>
      {sub && <p className="mt-1 text-xs opacity-75">{sub}</p>}
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
      <div className="mb-5 rounded-xl border bg-white p-4">
        <div className="mb-3 flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4" style={{ color: GOLD }} />
          <span className="text-xs font-semibold tracking-wide text-slate-500">FILTRES</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {products.length > 0 && (
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              style={productId ? { borderColor: NAVY, color: NAVY } : undefined}
              className="h-10 rounded-lg border bg-white px-3 text-sm font-medium text-slate-600"
            >
              <option value="">Tous mes produits</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}

          <select
            value={preset}
            onChange={(e) => setPreset(e.target.value)}
            style={preset !== "month" ? { borderColor: NAVY, color: NAVY } : undefined}
            className="h-10 rounded-lg border bg-white px-3 text-sm font-medium text-slate-600"
          >
            {PRESETS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
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
          <p className="font-semibold">Les statistiques ne se chargent pas</p>
          <button onClick={() => refetch()} className="mt-2 text-sm underline">Réessayer</button>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <h2 className="mb-2 text-sm font-semibold text-slate-500">Vue d'ensemble</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat icon={ShoppingCart} label="Total commandes" tone="navy" value={String(cc?.total.count ?? 0)} />
              <Stat icon={CheckCircle2} label="Confirmées" tone="green"
                value={String(cc?.confirmed.count ?? 0)} sub={pct(cc?.confirmed)} />
              <Stat icon={Truck} label="Livrées" tone="green"
                value={String(sh?.delivered.count ?? 0)} sub={pct(sh?.delivered)} />
              <Stat icon={Package} label="Chiffre livré" tone="navy"
                value={formatCurrency(data?.headline.deliveredRevenue.amount ?? 0)} />
            </div>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold text-slate-500">Confirmation</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat icon={PhoneOff} label="Pas de réponse" tone="amber"
                value={String(cc?.noResponse.count ?? 0)} sub={pct(cc?.noResponse)} />
              <Stat icon={PhoneOff} label="Injoignables" tone="slate"
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
              <Stat icon={AlertTriangle} label="Remboursées" tone="amber"
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
