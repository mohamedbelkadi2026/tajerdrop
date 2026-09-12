import { useState } from "react";
import { FileText, ArrowLeft, Wallet } from "lucide-react";
import { PageHead, Loading, ErrorState, Empty, useJson, money, NAVY, GOLD } from "./shared";

type Balance = {
  earned: number; paid: number; remaining: number;
  breakdown: { revenue: number; productCost: number; serviceFees: number; deliveredCount: number };
  payouts: { id: number; amount: number; method: string; reference: string | null; note: string | null; paidAt: string }[];
};

const METHODS: Record<string, string> = {
  cash: "Espèces", bank: "Virement", wallet: "Portefeuille", other: "Autre",
};

/**
 * Solde du seller : gagne, verse, reste du.
 *
 * C'est la question posee en premier a chaque connexion — « combien on me
 * doit » — et elle n'avait pas de reponse : la page ne listait que des
 * factures de periode, qui ne disent rien des versements deja recus.
 *
 * Le reste du est mis en avant plutot que le montant gagne. Le gagne est un
 * cumul depuis le debut qui ne bouge plus vraiment ; le reste du est le seul
 * chiffre sur lequel le seller peut agir, et celui qu'il vient verifier.
 */
function BalanceCard() {
  const q = useJson<Balance>("/api/seller/balance");
  if (q.isLoading || q.error || !q.data) return null;
  const b = q.data;

  return (
    <div className="mb-6 space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold text-slate-500">Total gagné</p>
          <p className="mt-1 text-2xl font-extrabold" style={{ color: NAVY }}>{money(b.earned)}</p>
          <p className="mt-0.5 text-xs text-slate-400">
            {b.breakdown.deliveredCount} commande{b.breakdown.deliveredCount > 1 ? "s" : ""} livrée{b.breakdown.deliveredCount > 1 ? "s" : ""}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold text-slate-500">Déjà versé</p>
          <p className="mt-1 text-2xl font-extrabold text-emerald-700">{money(b.paid)}</p>
          <p className="mt-0.5 text-xs text-slate-400">
            {b.payouts.length} versement{b.payouts.length > 1 ? "s" : ""}
          </p>
        </div>
        <div className="rounded-xl border-2 p-4" style={{ borderColor: GOLD, background: `${GOLD}0d` }}>
          <p className="text-xs font-semibold" style={{ color: GOLD }}>Reste à verser</p>
          <p className="mt-1 text-2xl font-extrabold" style={{ color: GOLD }}>{money(b.remaining)}</p>
          <p className="mt-0.5 text-xs text-slate-500">Sur commandes livrées</p>
        </div>
      </div>

      {/* Le detail du calcul est montre en clair : un seller qui ne retrouve
          pas son chiffre suppose une erreur, et les trois postes suffisent a
          le refaire de tete. */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Détail du calcul</p>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between"><span className="text-slate-600">Encaissé sur les livraisons</span><b style={{ color: NAVY }}>{money(b.breakdown.revenue)}</b></div>
          <div className="flex justify-between"><span className="text-slate-600">− Coût produit</span><b className="text-slate-700">{money(b.breakdown.productCost)}</b></div>
          <div className="flex justify-between"><span className="text-slate-600">− Frais de service</span><b className="text-slate-700">{money(b.breakdown.serviceFees)}</b></div>
          <div className="flex justify-between border-t pt-1.5"><span className="font-semibold" style={{ color: NAVY }}>Total gagné</span><b style={{ color: NAVY }}>{money(b.earned)}</b></div>
        </div>
      </div>

      {b.payouts.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center gap-2 border-b p-4">
            <Wallet className="h-4 w-4" style={{ color: GOLD }} />
            <h3 className="text-sm font-bold" style={{ color: NAVY }}>Versements reçus</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-500">
              <tr>
                <th className="px-4 py-2.5 text-start font-medium">Date</th>
                <th className="px-4 py-2.5 text-start font-medium">Moyen</th>
                <th className="px-4 py-2.5 text-start font-medium">Référence</th>
                <th className="px-4 py-2.5 text-end font-medium">Montant</th>
              </tr>
            </thead>
            <tbody>
              {b.payouts.map(p => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-4 py-2.5">{p.paidAt}</td>
                  <td className="px-4 py-2.5 text-slate-600">{METHODS[p.method] || p.method}</td>
                  <td className="px-4 py-2.5 text-slate-400">{p.reference || "—"}</td>
                  {/* Un montant negatif est l'annulation d'un versement saisi
                      par erreur : il doit se lire comme tel, pas comme un
                      encaissement. */}
                  <td className="px-4 py-2.5 text-end font-semibold"
                    style={{ color: p.amount < 0 ? "#c0392f" : "#047857" }}>
                    {money(p.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
export default function Invoices() {
 const [id,setId]=useState<number|null>(null); const list=useJson<any[]>("/api/seller/invoices"); const detail=useJson<any>(`/api/seller/invoices/${id}`,{enabled:!!id});
 if(list.isLoading)return <Loading/>; if(list.error)return <ErrorState retry={list.refetch}/>;
 if(id){if(detail.isLoading)return <Loading/>; const x=detail.data; return <div><button onClick={()=>setId(null)} className="mb-5 flex items-center gap-2 text-sm text-slate-500 hover:text-[#0F172A]"><ArrowLeft className="h-4 w-4"/> Retour aux factures</button><PageHead title={`Facture #${x?.id||id}`} text={`${x?.periodFrom||""} — ${x?.periodTo||""}`}/><div className="rounded-2xl border bg-white p-6"><div className="grid gap-4 sm:grid-cols-3"><div><p className="text-xs text-slate-400">Sous-total</p><b>{money(x?.subtotal)}</b></div><div><p className="text-xs text-slate-400">Net total</p><b>{money(x?.totalNet)}</b></div><div><p className="text-xs text-slate-400">Statut</p><b className="text-[#2f806d]">{x?.paymentStatus||"En traitement"}</b></div></div><div className="mt-6 divide-y border-t">{(x?.items||[]).map((it:any,i:number)=><div className="flex justify-between py-3 text-sm" key={i}><span>{it.description||it.type} × {it.quantity}</span><b>{money(it.amount)}</b></div>)}</div></div></div>;}
 const rows=list.data||[]; return <div><PageHead title="Paiements" text="Ce que vous avez gagné, reçu, et ce qui reste à vous verser."/><BalanceCard/>{!rows.length?<Empty title="Aucune facture" text="Vos factures seront disponibles à la clôture de votre première période."/>:<div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full text-sm"><thead className="bg-[#0F172A] text-start text-xs text-white/70"><tr><th className="px-5 py-4">Période</th><th className="px-5 py-4">Net total</th><th className="px-5 py-4">Paiement</th><th/></tr></thead><tbody>{rows.map((x:any)=><tr className="border-b last:border-0" key={x.id}><td className="px-5 py-4 font-medium">{x.periodFrom} — {x.periodTo}</td><td className="px-5 py-4 font-semibold">{money(x.totalNet)}</td><td className="px-5 py-4">{x.paymentStatus||"—"}</td><td className="px-5 py-4 text-end"><button onClick={()=>setId(x.id)} className="text-xs font-semibold text-[#2f806d]">Voir le détail</button></td></tr>)}</tbody></table></div>}</div>;
}