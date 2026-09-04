import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Download, Loader2, Phone, RefreshCw, Search, ShoppingCart, Truck,
  Undo2, PackageOpen, ChevronDown, Upload, Plus,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { isConfirmedCumulative, isDeliveredStatus } from "@shared/order-status-sets";

const GOLD = "#c49a55";
const NAVY = "#10243d";

type OrderItem = {
  id: number;
  quantity: number;
  price: number;
  variantInfo?: string | null;
  product?: { id: number; name: string; sku: string; imageUrl?: string | null } | null;
};

type Order = {
  id: number;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string | null;
  customerCity?: string | null;
  status: string;
  totalPrice: number;
  comment?: string | null;
  trackNumber?: string | null;
  carrierName?: string | null;
  shippingProvider?: string | null;
  source?: string | null;
  createdAt?: string | null;
  items: OrderItem[];
};

/**
 * Trois phases, derivees du champ `status` unique.
 *
 * L'application ne stocke pas d'etat call-center et d'etat livraison separes :
 * une commande a un seul statut qui avance. On le projette ici sur les deux
 * colonnes, en reutilisant les helpers de shared/order-status-sets — les
 * reimplementer ferait diverger ces chiffres de ceux du tableau de bord, ce
 * que ce fichier partage existe precisement pour eviter.
 */
const RETURN_RE = /retour|refus|returned|refused/i;
const SHIPPED_RE = /exp[ée]di|ramass|transit|livr|delivered|cours de livraison|tentative/i;

function phaseOf(o: Order): "call" | "shipping" | "returned" {
  if (RETURN_RE.test(o.status)) return "returned";
  if (SHIPPED_RE.test(o.status) || o.trackNumber) return "shipping";
  return "call";
}

function callState(o: Order): { label: string; tone: string } {
  const s = o.status || "";
  if (/annul|cancel/i.test(s)) return { label: s, tone: "bad" };
  if (/pas de r[ée]ponse|injoignable|boite vocale/i.test(s)) return { label: s, tone: "warn" };
  if (/nouveau/i.test(s)) return { label: "Nouveau", tone: "idle" };
  if (/rappel/i.test(s)) return { label: "A rappeler", tone: "warn" };
  if (isConfirmedCumulative(s)) return { label: "Confirmee", tone: "ok" };
  return { label: s || "—", tone: "idle" };
}

function shipState(o: Order): { label: string; tone: string } | null {
  const s = o.status || "";
  if (isDeliveredStatus(s)) return { label: "Livree", tone: "ok" };
  if (RETURN_RE.test(s)) return { label: s, tone: "bad" };
  if (/tentative/i.test(s)) return { label: s, tone: "warn" };
  if (SHIPPED_RE.test(s)) return { label: s, tone: "warn" };
  if (o.trackNumber) return { label: "Expediee", tone: "warn" };
  return null;
}

const TONES: Record<string, string> = {
  ok: "bg-emerald-50 text-emerald-700",
  bad: "bg-red-50 text-red-700",
  warn: "bg-amber-50 text-amber-700",
  idle: "bg-slate-100 text-slate-600",
};

function Pill({ label, tone }: { label: string; tone: string }) {
  return <span className={`inline-block rounded-md px-2 py-1 text-xs font-medium ${TONES[tone]}`}>{label}</span>;
}

function dt(v?: string | null) {
  if (!v) return null;
  const d = new Date(v);
  return `${d.toLocaleDateString("fr-FR")} ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
}

const TABS = [
  { key: "call", label: "En confirmation", icon: Phone },
  { key: "shipping", label: "Expedition", icon: Truck },
  { key: "returned", label: "Retours", icon: Undo2 },
] as const;

export default function TajerDropCommandes() {
  const [tab, setTab] = useState<"call" | "shipping" | "returned">("call");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<number | null>(null);

  const { data, isLoading, isError, refetch, isFetching } = useQuery<{ orders: Order[]; total: number }>({
    queryKey: ["/api/orders/all", { limit: 200 }],
    queryFn: async () => {
      const r = await fetch("/api/orders/all?limit=200", { credentials: "include" });
      if (!r.ok) throw new Error("Chargement impossible");
      return r.json();
    },
  });

  const orders = data?.orders ?? [];

  const counts = useMemo(() => {
    const c = { call: 0, shipping: 0, returned: 0 };
    for (const o of orders) c[phaseOf(o)]++;
    return c;
  }, [orders]);

  const rows = useMemo(() => {
    const inTab = orders.filter((o) => phaseOf(o) === tab);
    const q = search.trim().toLowerCase();
    if (!q) return inTab;
    return inTab.filter((o) =>
      o.customerName?.toLowerCase().includes(q) ||
      o.orderNumber?.toLowerCase().includes(q) ||
      o.customerPhone?.includes(q) ||
      o.customerCity?.toLowerCase().includes(q) ||
      o.trackNumber?.toLowerCase().includes(q) ||
      o.items?.some((i) => i.product?.name?.toLowerCase().includes(q) || i.product?.sku?.toLowerCase().includes(q))
    );
  }, [orders, tab, search]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: GOLD }} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-800">
        <p className="font-semibold">Les commandes ne se chargent pas</p>
        <button onClick={() => refetch()} className="mt-3 text-sm underline">Reessayer</button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: NAVY }}>Mes commandes</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {orders.length} commande{orders.length === 1 ? "" : "s"} au total
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/tajerdrop/nouvelle-commande"
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white"
            style={{ background: NAVY }}
          >
            <Plus className="h-4 w-4" />
            Nouvelle commande
          </a>
          <a href="/tajerdrop/import" className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            <Upload className="h-4 w-4" />
            Importer
          </a>
          <a href="/api/orders/export" className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            <Download className="h-4 w-4" />
            Exporter
          </a>
          <button onClick={() => refetch()} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Actualiser</span>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={active ? { background: NAVY, color: "white" } : undefined}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${active ? "" : "bg-white text-slate-600 hover:bg-slate-50"}`}
            >
              <Icon className="h-4 w-4" />
              {label}
              <span className={`rounded px-1.5 text-xs ${active ? "bg-white/20" : "bg-slate-100"}`}>{counts[key]}</span>
            </button>
          );
        })}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Client, telephone, produit, SKU, suivi..."
          className="w-full rounded-lg border py-2.5 pl-9 pr-3 text-sm outline-none focus:border-slate-400"
        />
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center" style={{ borderColor: `${GOLD}66`, background: "#fffaf0" }}>
          <PackageOpen className="mx-auto mb-3 h-9 w-9" style={{ color: GOLD }} />
          <h3 className="font-semibold" style={{ color: NAVY }}>
            {search ? "Aucune commande ne correspond" : "Rien dans cette phase"}
          </h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            {search
              ? "Essayez un autre nom, numero ou SKU."
              : tab === "call"
                ? "Les nouvelles commandes apparaitront ici en attendant leur confirmation."
                : tab === "shipping"
                  ? "Les commandes confirmees passeront ici une fois expediees."
                  : "Aucun retour a traiter."}
          </p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border bg-white lg:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50/80 text-xs text-slate-500">
                    <th className="px-4 py-3 text-left font-medium">Produit</th>
                    <th className="px-4 py-3 text-left font-medium">Confirmation</th>
                    <th className="px-4 py-3 text-left font-medium">Livraison</th>
                    <th className="px-4 py-3 text-left font-medium">Suivi</th>
                    <th className="px-4 py-3 text-left font-medium">Destinataire</th>
                    <th className="px-4 py-3 text-left font-medium">Adresse</th>
                    <th className="px-4 py-3 text-right font-medium">Montant</th>
                    <th className="px-4 py-3 text-left font-medium">Commentaire</th>
                    <th className="px-4 py-3 text-left font-medium">Creee le</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((o) => {
                    const cs = callState(o);
                    const ss = shipState(o);
                    const first = o.items?.[0];
                    return (
                      <tr key={o.id} className="border-b align-top last:border-0 hover:bg-slate-50/50">
                        <td className="max-w-[320px] px-4 py-3">
                          <div className="flex gap-3">
                            {first?.product?.imageUrl ? (
                              <img src={first.product.imageUrl} alt="" className="h-11 w-11 shrink-0 rounded-lg border object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                            ) : (
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border bg-slate-50">
                                <ShoppingCart className="h-4 w-4 text-slate-300" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="line-clamp-2 font-medium" style={{ color: NAVY }}>
                                {first?.product?.name || o.orderNumber}
                              </p>
                              {first?.product?.sku && <p className="mt-0.5 text-xs text-slate-400">SKU {first.product.sku}</p>}
                              <p className="text-xs text-slate-400">
                                Qte {o.items?.reduce((n, i) => n + (i.quantity || 0), 0) || 1}
                                {o.items?.length > 1 && ` · ${o.items.length} articles`}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3"><Pill label={cs.label} tone={cs.tone} /></td>
                        <td className="px-4 py-3">{ss ? <Pill label={ss.label} tone={ss.tone} /> : <span className="text-slate-300">—</span>}</td>
                        <td className="px-4 py-3">
                          {o.trackNumber ? (
                            <div>
                              <p className="font-mono text-xs" style={{ color: NAVY }}>{o.trackNumber}</p>
                              {(o.carrierName || o.shippingProvider) && <p className="text-xs text-slate-400">{o.carrierName || o.shippingProvider}</p>}
                            </div>
                          ) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium" style={{ color: NAVY }}>{o.customerName}</p>
                          <a href={`tel:${o.customerPhone}`} className="text-xs" style={{ color: GOLD }}>{o.customerPhone}</a>
                        </td>
                        <td className="max-w-[200px] px-4 py-3">
                          {o.customerCity && <p className="font-medium uppercase" style={{ color: NAVY }}>{o.customerCity}</p>}
                          {o.customerAddress && <p className="line-clamp-2 text-xs text-slate-500">{o.customerAddress}</p>}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold" style={{ color: NAVY }}>
                          {formatCurrency(o.totalPrice || 0)}
                        </td>
                        <td className="max-w-[180px] px-4 py-3">
                          {o.comment ? <p className="line-clamp-3 text-xs text-slate-600">{o.comment}</p> : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{dt(o.createdAt) || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-3 lg:hidden">
            {rows.map((o) => {
              const cs = callState(o);
              const ss = shipState(o);
              const first = o.items?.[0];
              const expanded = open === o.id;
              return (
                <div key={o.id} className="rounded-xl border bg-white">
                  <button onClick={() => setOpen(expanded ? null : o.id)} className="flex w-full items-start gap-3 p-4 text-left">
                    {first?.product?.imageUrl ? (
                      <img src={first.product.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg border object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border bg-slate-50">
                        <ShoppingCart className="h-4 w-4 text-slate-300" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-medium" style={{ color: NAVY }}>
                        {first?.product?.name || o.orderNumber}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">{o.customerName} · {o.customerCity || "—"}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <Pill label={cs.label} tone={cs.tone} />
                        {ss && <Pill label={ss.label} tone={ss.tone} />}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold" style={{ color: NAVY }}>{formatCurrency(o.totalPrice || 0)}</p>
                      <ChevronDown className={`ml-auto mt-1 h-4 w-4 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`} />
                    </div>
                  </button>

                  {expanded && (
                    <dl className="space-y-2.5 border-t px-4 py-3 text-sm">
                      <div className="flex justify-between gap-4">
                        <dt className="text-slate-500">Telephone</dt>
                        <dd><a href={`tel:${o.customerPhone}`} style={{ color: GOLD }}>{o.customerPhone}</a></dd>
                      </div>
                      {o.customerAddress && (
                        <div className="flex justify-between gap-4">
                          <dt className="shrink-0 text-slate-500">Adresse</dt>
                          <dd className="text-right text-slate-700">{o.customerAddress}</dd>
                        </div>
                      )}
                      {first?.product?.sku && (
                        <div className="flex justify-between gap-4">
                          <dt className="text-slate-500">SKU</dt>
                          <dd className="text-slate-700">{first.product.sku}</dd>
                        </div>
                      )}
                      <div className="flex justify-between gap-4">
                        <dt className="text-slate-500">Quantite</dt>
                        <dd className="text-slate-700">{o.items?.reduce((n, i) => n + (i.quantity || 0), 0) || 1}</dd>
                      </div>
                      {o.trackNumber && (
                        <div className="flex justify-between gap-4">
                          <dt className="text-slate-500">Suivi</dt>
                          <dd className="font-mono text-xs text-slate-700">
                            {o.trackNumber}
                            {(o.carrierName || o.shippingProvider) && <span className="ml-1 font-sans text-slate-400">· {o.carrierName || o.shippingProvider}</span>}
                          </dd>
                        </div>
                      )}
                      {o.comment && (
                        <div className="flex justify-between gap-4">
                          <dt className="shrink-0 text-slate-500">Commentaire</dt>
                          <dd className="text-right text-slate-700">{o.comment}</dd>
                        </div>
                      )}
                      <div className="flex justify-between gap-4">
                        <dt className="text-slate-500">Creee le</dt>
                        <dd className="text-slate-700">{dt(o.createdAt) || "—"}</dd>
                      </div>
                    </dl>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
