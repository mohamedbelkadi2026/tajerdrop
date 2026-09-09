import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { Loader2, RefreshCw } from "lucide-react";
import { PageHead, ErrorState, useJson, NAVY } from "./shared";

/**
 * Analytics du seller : la forme dans le temps, la ou le tableau de bord donne
 * des totaux.
 *
 * Un taux de confirmation moyen de 60 % sur un mois cache aussi bien une
 * activite reguliere qu'un effondrement sur les trois derniers jours. C'est
 * cette difference que les deux courbes rendent visible, et elle seule justifie
 * un ecran separe.
 *
 * Deux graphiques et non un : le centre d'appel et le transporteur sont deux
 * chaines successives, avec deux responsables et deux leviers. Melangees, une
 * perte de confirmation et une perte de livraison se lisent comme un seul
 * probleme.
 */

type Point = {
  bucket: string;
  validLeads: number; confirmed: number; pending: number; cancelledExpired: number;
  shipPending: number; outForDelivery: number; delivered: number;
  returned: number; refunded: number;
};

type Series = { period: { from: string; to: string }; granularity: "hour" | "day"; points: Point[] };

function iso(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const PRESETS = [
  { key: "today",  label: "Aujourd'hui" },
  { key: "7d",     label: "7 jours" },
  { key: "30d",    label: "30 jours" },
  { key: "month",  label: "Ce mois" },
] as const;

function rangeFor(preset: string) {
  const now = new Date();
  switch (preset) {
    case "today": return { from: iso(now), to: iso(now) };
    case "7d":    return { from: iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)), to: iso(now) };
    case "30d":   return { from: iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29)), to: iso(now) };
    default:      return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: iso(now) };
  }
}

/** Un graphique, ses series et leurs teintes. */
function Chart({ title, subtitle, points, granularity, series }: {
  title: string;
  subtitle: string;
  points: Point[];
  granularity: "hour" | "day";
  series: { key: keyof Point; name: string; color: string }[];
}) {
  const fmt = (b: string) =>
    granularity === "hour"
      ? b.slice(11, 16)
      : new Date(`${b}T00:00:00`).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });

  const empty = points.every(p => series.every(s => !Number(p[s.key])));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-bold" style={{ color: NAVY }}>{title}</h3>
      <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>

      {empty ? (
        <p className="py-16 text-center text-sm text-slate-400">
          Aucune activité sur cette période.
        </p>
      ) : (
        <div className="mt-4 h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 5, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="bucket" tickFormatter={fmt} minTickGap={28}
                tick={{ fontSize: 12, fill: "#94a3b8" }} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
              <YAxis allowDecimals={false} width={36}
                tick={{ fontSize: 12, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
              <Tooltip
                labelFormatter={(b: any) => granularity === "hour"
                  ? `${String(b).slice(11, 16)}`
                  : new Date(`${b}T00:00:00`).toLocaleDateString("fr-FR", {
                      weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" })}
                contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }}
              />
              <Legend verticalAlign="top" align="left" height={30} iconType="circle"
                wrapperStyle={{ fontSize: 13, paddingBottom: 10 }} />
              {series.map((s, i) => (
                <Line
                  key={s.key as string}
                  type="monotone"
                  dataKey={s.key as string}
                  name={s.name}
                  stroke={s.color}
                  // Epaisseur decroissante : ces series valent souvent zero en
                  // meme temps, et le dernier trace masquerait les precedents.
                  strokeWidth={Math.max(1.5, 3 - i * 0.35)}
                  dot={points.length <= 31 ? { r: 2.5, strokeWidth: 1, stroke: "#fff", fill: s.color } : false}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export default function Analytics() {
  const [preset, setPreset] = useState<string>("7d");
  const [productId, setProductId] = useState("");

  const range = useMemo(() => rangeFor(preset), [preset]);

  // Liste des produits acceptes, pour filtrer les courbes.
  const stock = useJson<any[]>("/api/marketplace/my-stock");
  const products = useMemo(() => {
    const seen = new Map<number, string>();
    for (const s of stock.data || []) {
      if (s.product?.id && !seen.has(s.product.id)) seen.set(s.product.id, s.product.name);
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [stock.data]);

  const qs = new URLSearchParams({ from: range.from, to: range.to });
  if (productId) qs.set("productId", productId);

  const { data, isLoading, isError, refetch, isFetching } = useQuery<Series>({
    queryKey: [`/api/marketplace/stats/timeseries?${qs.toString()}`],
    queryFn: async () => {
      const r = await fetch(`/api/marketplace/stats/timeseries?${qs.toString()}`, { credentials: "include" });
      if (!r.ok) throw new Error();
      return r.json();
    },
  });

  if (isError) return <ErrorState retry={refetch} />;

  const points = data?.points || [];
  const granularity = data?.granularity || "day";

  return (
    <div>
      <PageHead
        title="Analytics"
        text="La forme de votre activité dans le temps — pas seulement son total."
      />

      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex rounded-lg border border-slate-200 p-0.5">
          {PRESETS.map(p => (
            <button
              key={p.key}
              onClick={() => setPreset(p.key)}
              className="rounded-md px-3 py-1.5 text-xs font-semibold transition-colors"
              style={preset === p.key ? { background: NAVY, color: "#fff" } : { color: "#64748b" }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {products.length > 0 && (
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none"
          >
            <option value="">Tous les produits</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}

        <button
          onClick={() => refetch()}
          className="ms-auto rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
          title="Actualiser"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="space-y-5">
          <Chart
            title="Centre d'appel"
            subtitle="Ce que deviennent vos leads avant l'expédition"
            points={points}
            granularity={granularity}
            series={[
              { key: "validLeads",       name: "Leads valides",     color: "#14B8A6" },
              { key: "confirmed",        name: "Confirmées",        color: "#34A853" },
              { key: "pending",          name: "En attente",        color: "#F5B301" },
              { key: "cancelledExpired", name: "Annulées/expirées", color: "#EF4444" },
            ]}
          />

          <Chart
            title="Livraison"
            subtitle="Ce que deviennent vos commandes confirmées"
            points={points}
            granularity={granularity}
            series={[
              { key: "confirmed",      name: "Confirmées",      color: "#4285F4" },
              { key: "shipPending",    name: "En attente",      color: "#F5B301" },
              { key: "outForDelivery", name: "En livraison",    color: "#A855F7" },
              { key: "delivered",      name: "Livrées",         color: "#34A853" },
              { key: "returned",       name: "Retours",         color: "#7F1D1D" },
              { key: "refunded",       name: "Remboursées",     color: "#EF4444" },
            ]}
          />
        </div>
      )}
    </div>
  );
}
