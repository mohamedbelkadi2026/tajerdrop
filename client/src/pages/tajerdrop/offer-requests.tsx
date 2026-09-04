import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, Search, SlidersHorizontal, X } from "lucide-react";
import { PageHead, Loading, ErrorState, Empty, useJson, GOLD, NAVY } from "./shared";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";

type OfferRequest = {
  id: number;
  productId: number;
  status: string;
  cancelReason: string | null;
  createdAt: string | null;
  product: {
    id: number; name: string; sku: string; imageUrl: string | null;
    sellingPrice: number; stockLevel: string; category: string | null;
  } | null;
};

/** Libelles et teintes des statuts renvoyes par le serveur. */
const STATUS: Record<string, { label: string; cls: string }> = {
  accepted:                { label: "Acceptée",  cls: "bg-emerald-50 text-emerald-700" },
  pending:                 { label: "En attente", cls: "bg-amber-50 text-amber-700" },
  rejected:                { label: "Refusée",   cls: "bg-red-50 text-red-700" },
  cancelled:               { label: "Annulée",   cls: "bg-slate-100 text-slate-600" },
  automatically_cancelled: { label: "Annulée automatiquement", cls: "bg-slate-100 text-slate-600" },
};

const STOCK: Record<string, { label: string; cls: string }> = {
  high:    { label: "Stock élevé",   cls: "bg-emerald-50 text-emerald-700" },
  limited: { label: "Stock limité",  cls: "bg-amber-50 text-amber-700" },
  low:     { label: "Bientôt épuisé", cls: "bg-orange-50 text-orange-700" },
  out:     { label: "Rupture",       cls: "bg-red-50 text-red-700" },
};

function dt(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  return `${d.toLocaleDateString("fr-FR")} ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
}

export default function OfferRequests() {
  const qc = useQueryClient();
  const q = useJson<OfferRequest[]>("/api/marketplace/offer-requests");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const cancel = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/marketplace/offer-requests/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/marketplace/offer-requests"] }),
  });

  const rows = q.data || [];

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return rows.filter(r => {
      if (status && r.status !== status) return false;
      if (!s) return true;
      return (r.product?.name || "").toLowerCase().includes(s)
        || (r.product?.sku || "").toLowerCase().includes(s);
    });
  }, [rows, search, status]);

  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorState retry={q.refetch} />;

  return (
    <div>
      <PageHead title="Mes demandes" text="Suivez les accès demandés aux produits du catalogue." />

      {!rows.length ? (
        <Empty
          title="Aucune demande"
          text="Votre historique de demandes apparaîtra ici."
          href="/tajerdrop/catalogue"
          action="Parcourir le catalogue"
        />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              style={status ? { background: NAVY, color: "white" } : undefined}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium ${
                status ? "" : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filtres
            </button>
            <div className="relative min-w-0 flex-1 sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Produit ou SKU..."
                className="w-full rounded-lg border py-2.5 pl-9 pr-3 text-sm outline-none focus:border-slate-400"
              />
            </div>
          </div>

          {showFilters && (
            <div className="rounded-xl border bg-white p-4">
              <label className="text-xs font-medium text-slate-500">Statut</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="mt-1.5 h-10 w-full rounded-md border px-3 text-sm sm:w-64"
              >
                <option value="">Tous</option>
                {Object.entries(STATUS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          )}

          <p className="text-sm text-slate-500">
            {filtered.length} demande{filtered.length !== 1 ? "s" : ""}
            {filtered.length !== rows.length && ` sur ${rows.length}`}
          </p>

          {/* Desktop */}
          <div className="hidden overflow-hidden rounded-xl border bg-white lg:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50/80 text-xs text-slate-500">
                    <th className="px-4 py-3 text-left font-medium">Produit</th>
                    <th className="px-4 py-3 text-left font-medium">Stock</th>
                    <th className="px-4 py-3 text-right font-medium">Prix suggéré</th>
                    <th className="px-4 py-3 text-left font-medium">Statut</th>
                    <th className="px-4 py-3 text-left font-medium">Motif</th>
                    <th className="px-4 py-3 text-left font-medium">Demandée le</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const st = STATUS[r.status] || { label: r.status, cls: "bg-slate-100 text-slate-600" };
                    const sk = STOCK[r.product?.stockLevel || "high"] || STOCK.high;
                    return (
                      <tr key={r.id} className="border-b align-top last:border-0 hover:bg-slate-50/50">
                        <td className="max-w-[380px] px-4 py-3">
                          <div className="flex gap-3">
                            {r.product?.imageUrl ? (
                              <img src={r.product.imageUrl} alt="" loading="lazy"
                                className="h-11 w-11 shrink-0 rounded-lg border bg-white object-contain" />
                            ) : (
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border bg-slate-50">
                                <Package className="h-4 w-4 text-slate-300" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="line-clamp-2 font-medium" style={{ color: NAVY }}>
                                {r.product?.name || `Produit #${r.productId}`}
                              </p>
                              {r.product?.sku && <p className="text-xs text-slate-400">SKU {r.product.sku}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block rounded-md px-2 py-1 text-xs font-medium ${sk.cls}`}>{sk.label}</span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold" style={{ color: NAVY }}>
                          {r.product ? formatCurrency(r.product.sellingPrice) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block rounded-md px-2 py-1 text-xs font-medium ${st.cls}`}>{st.label}</span>
                        </td>
                        <td className="max-w-[240px] px-4 py-3">
                          {r.cancelReason
                            ? <p className="line-clamp-3 text-xs text-slate-600">{r.cancelReason}</p>
                            : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{dt(r.createdAt)}</td>
                        <td className="px-4 py-3 text-right">
                          {r.status === "pending" && (
                            <button
                              onClick={() => cancel.mutate(r.id)}
                              disabled={cancel.isPending}
                              title="Annuler la demande"
                              className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile */}
          <div className="space-y-3 lg:hidden">
            {filtered.map((r) => {
              const st = STATUS[r.status] || { label: r.status, cls: "bg-slate-100 text-slate-600" };
              const sk = STOCK[r.product?.stockLevel || "high"] || STOCK.high;
              return (
                <div key={r.id} className="rounded-xl border bg-white p-4">
                  <div className="flex gap-3">
                    {r.product?.imageUrl ? (
                      <img src={r.product.imageUrl} alt="" loading="lazy"
                        className="h-12 w-12 shrink-0 rounded-lg border bg-white object-contain" />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border bg-slate-50">
                        <Package className="h-4 w-4 text-slate-300" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-medium" style={{ color: NAVY }}>
                        {r.product?.name || `Produit #${r.productId}`}
                      </p>
                      {r.product?.sku && <p className="text-xs text-slate-400">SKU {r.product.sku}</p>}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className={`rounded-md px-2 py-1 text-xs font-medium ${st.cls}`}>{st.label}</span>
                        <span className={`rounded-md px-2 py-1 text-xs font-medium ${sk.cls}`}>{sk.label}</span>
                      </div>
                    </div>
                    {r.status === "pending" && (
                      <button
                        onClick={() => cancel.mutate(r.id)}
                        disabled={cancel.isPending}
                        className="shrink-0 self-start rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <dl className="mt-3 space-y-1.5 border-t pt-3 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Prix suggéré</dt>
                      <dd className="font-semibold" style={{ color: NAVY }}>
                        {r.product ? formatCurrency(r.product.sellingPrice) : "—"}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Demandée le</dt>
                      <dd className="text-slate-700">{dt(r.createdAt)}</dd>
                    </div>
                    {r.cancelReason && (
                      <div className="flex justify-between gap-4">
                        <dt className="shrink-0 text-slate-500">Motif</dt>
                        <dd className="text-right text-slate-700">{r.cancelReason}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
