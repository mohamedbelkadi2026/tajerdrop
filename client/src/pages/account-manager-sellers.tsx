import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Search, TrendingDown, Users } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const NAVY = "#0F172A";
const GOLD = "#FF6B35";

/**
 * Portefeuille du responsable de comptes.
 *
 * Un interlocuteur reduit a un numero de telephone ne suit rien : il attend
 * qu'on l'appelle, et n'entend parler d'un seller que le jour ou celui-ci
 * s'enerve ou part. Cet ecran inverse la charge — il designe les comptes qui
 * vont mal avant que le seller ne le signale.
 *
 * Les alertes sont choisies pour appeler une action precise, pas pour decrire
 * une situation. Un indicateur qu'on ne peut pas traiter n'est qu'un chiffre
 * de plus a ignorer, et un tableau plein de chiffres ignores ne se regarde
 * bientot plus du tout.
 */

type Row = {
  sellerStoreId: number;
  sellerName: string;
  city: string | null;
  phone: string | null;
  leads: number; confirmed: number; delivered: number;
  confirmationRate: number; deliveryRate: number;
  earned: number; remaining: number;
  daysSinceOrder: number | null;
  alerts: string[];
};

/** Teinte d'un taux : le verdict avant la lecture du nombre. */
function rateTone(rate: number) {
  if (rate >= 70) return "#047857";
  if (rate >= 40) return "#b45309";
  return "#c0392f";
}

function waLink(phone: string | null) {
  if (!phone) return null;
  return `https://wa.me/${String(phone).replace(/\D/g, "").replace(/^0/, "212")}`;
}

export default function AccountManagerSellers() {
  const [search, setSearch] = useState("");
  const [onlyAlerts, setOnlyAlerts] = useState(false);

  const { data, isLoading, isError } = useQuery<Row[]>({
    queryKey: ["/api/account-manager/sellers"],
  });

  const rows = useMemo(() => {
    const list = data || [];
    const q = search.trim().toLowerCase();
    return list
      .filter(r => !onlyAlerts || r.alerts.length > 0)
      .filter(r => !q || r.sellerName.toLowerCase().includes(q) || (r.city || "").toLowerCase().includes(q));
  }, [data, search, onlyAlerts]);

  const totals = useMemo(() => {
    const list = data || [];
    return {
      sellers: list.length,
      withAlerts: list.filter(r => r.alerts.length > 0).length,
      // Ce qui reste du, tous comptes confondus : c'est l'engagement de
      // l'operateur envers le portefeuille, et il se lit d'un coup.
      owed: list.reduce((s, r) => s + Math.max(0, r.remaining), 0),
      dormant: list.filter(r => r.daysSinceOrder === null || r.daysSinceOrder >= 14).length,
    };
  }, [data]);

  if (isLoading) {
    return <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>;
  }
  if (isError) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">
      Impossible de charger votre portefeuille.
    </div>;
  }

  if (!data?.length) {
    return (
      <div className="rounded-2xl border border-dashed p-12 text-center" style={{ borderColor: `${GOLD}66`, background: "#fffaf0" }}>
        <Users className="mx-auto mb-3 h-9 w-9" style={{ color: GOLD }} />
        <h3 className="font-semibold" style={{ color: NAVY }}>Aucun seller ne vous est attribué</h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
          L'attribution se fait depuis le centre de contrôle, onglet Sellers.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold" style={{ color: NAVY }}>Mes sellers</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Les comptes dont vous êtes l'interlocuteur. Les plus en difficulté d'abord.
        </p>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Sellers suivis", value: String(totals.sellers), tone: NAVY },
          { label: "À rappeler", value: String(totals.withAlerts), tone: totals.withAlerts ? "#c0392f" : NAVY },
          { label: "Sans vente (14 j+)", value: String(totals.dormant), tone: totals.dormant ? "#b45309" : NAVY },
          { label: "Reste à verser", value: formatCurrency(totals.owed), tone: NAVY },
        ].map(c => (
          <div key={c.label} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-500">{c.label}</p>
            <p className="mt-1 text-2xl font-extrabold" style={{ color: c.tone }}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-56">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Nom ou ville…"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 ps-10 pe-4 text-sm outline-none focus:border-slate-400"
          />
        </div>
        <button
          onClick={() => setOnlyAlerts(v => !v)}
          className="rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors"
          style={onlyAlerts
            ? { background: NAVY, color: "#fff", borderColor: NAVY }
            : { color: "#64748b", borderColor: "#e2e8f0", background: "#fff" }}
        >
          À rappeler uniquement
        </button>
      </div>

      <div className="space-y-3">
        {rows.map(r => {
          const wa = waLink(r.phone);
          return (
            <div key={r.sellerStoreId} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold" style={{ color: NAVY }}>{r.sellerName}</p>
                  <p className="text-xs text-slate-400">
                    {r.city || "Ville non précisée"}
                    {r.daysSinceOrder !== null && ` · dernière commande il y a ${r.daysSinceOrder} j`}
                  </p>
                </div>
                <div className="flex gap-2">
                  {wa && (
                    <a href={wa} target="_blank" rel="noreferrer"
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
                      style={{ background: "#25D366" }}>
                      WhatsApp
                    </a>
                  )}
                  {r.phone && (
                    <a href={`tel:${r.phone}`}
                      className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                      Appeler
                    </a>
                  )}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
                {[
                  { l: "Leads (30 j)", v: String(r.leads), c: NAVY },
                  { l: "Confirmation", v: `${r.confirmationRate} %`, c: rateTone(r.confirmationRate) },
                  { l: "Livraison", v: `${r.deliveryRate} %`, c: rateTone(r.deliveryRate) },
                  { l: "Gagné", v: formatCurrency(r.earned), c: NAVY },
                  { l: "Reste à verser", v: formatCurrency(r.remaining), c: r.remaining > 0 ? GOLD : NAVY },
                ].map(m => (
                  <div key={m.l}>
                    <p className="text-[11px] text-slate-400">{m.l}</p>
                    <p className="text-sm font-bold" style={{ color: m.c }}>{m.v}</p>
                  </div>
                ))}
              </div>

              {r.alerts.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {r.alerts.map(a => (
                    <span key={a}
                      className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-800">
                      {a.startsWith("Aucune") ? <TrendingDown className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                      {a}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {rows.length === 0 && (
          <p className="rounded-xl border border-dashed p-10 text-center text-sm text-slate-500">
            Aucun seller ne correspond.
          </p>
        )}
      </div>
    </div>
  );
}
