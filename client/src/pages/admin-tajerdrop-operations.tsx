import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  AlertCircle, ArrowLeft, BarChart3, Check, Clock3, Loader2, Package,
  RefreshCw, Search, ShieldCheck, ShoppingBag, TrendingUp, Users, Wallet, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { cn, formatCurrency } from "@/lib/utils";

/**
 * Palette claire.
 *
 * L'ecran etait bleu nuit avec du texte blanc a 35-45 % d'opacite : sur des
 * libelles de colonnes et des montants, ce contraste ne passe pas. Un admin y
 * lit des chiffres a valider et des motifs de refus a ecrire, souvent
 * longuement — c'est un poste de travail, pas un mur d'affichage.
 *
 * BLUE remplace l'orange comme accent de structure : il porte les en-tetes,
 * les onglets et les icones. L'orange reste sur les actions engageantes
 * (generer une facture, controler les expirations), ou il signale qu'un clic
 * a des consequences.
 */
const NAVY  = "#0F172A";   // texte principal
const BLUE  = "#2563EB";   // accent de structure
const SKY   = "#DBEAFE";   // fonds teintes
const PAGE  = "#F8FAFC";   // fond de page
const GOLD  = "#FF6B35";   // actions engageantes

type OfferRequest = {
  id: number; status: string; cancelReason?: string | null; acceptedAt?: string | null; createdAt: string;
  seller: { id: number; name: string };
  product: { name: string; sku?: string; imageUrl?: string | null; productCost: number; stockLevel: string; category?: string | null };
};
type SellerSnapshot = {
  sellerStoreId: number; sellerName: string; leads: number; confirmed: number; delivered: number;
  confirmationRate: number; deliveryRate: number; deliveredRevenue: number; productsInStock: number; lastLeadAt?: string | null;
};

function unwrap<T>(data: any): T {
  return (data?.data ?? data?.items ?? data) as T;
}
function date(value?: string | null) {
  return value ? new Date(value).toLocaleDateString("fr-MA", { day: "2-digit", month: "short", year: "numeric" }) : "—";
}
function money(value?: number | null) {
  const n = Number(value ?? 0);
  return formatCurrency(Math.round(n));
}
function StatusPill({ value }: { value: string }) {
  const key = value?.toLowerCase();
  const style = key?.includes("pending") || key?.includes("draft")
    ? "border-amber-200 bg-amber-50 text-amber-800"
    : key?.includes("paid") || key?.includes("valid") || key?.includes("accept") || key?.includes("deliver")
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : key?.includes("reject") || key?.includes("cancel") || key?.includes("fail")
        ? "border-red-200 bg-red-50 text-red-800"
        : "border-slate-200 bg-slate-50 text-slate-600";
  return <span className={cn("rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wider", style)}>{value || "—"}</span>;
}
function Stat({ icon: Icon, label, value, detail }: { icon: any; label: string; value: string; detail: string }) {
  return <div className="rounded-xl border p-4" style={{ background: "#fff", borderColor: "#e2e8f0", boxShadow: "0 1px 2px rgba(15,23,42,.04)" }}>
    <div className="flex items-center justify-between"><span className="text-[11px] uppercase tracking-wider text-slate-500">{label}</span><Icon className="h-4 w-4" style={{ color: BLUE }} /></div>
    <div className="mt-2 text-2xl font-semibold" style={{ color: NAVY }}>{value}</div><div className="mt-1 text-xs text-slate-400">{detail}</div>
  </div>;
}

export default function AdminTajerDropOperations() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"offers" | "payouts" | "sellers">("offers");
  const [search, setSearch] = useState("");
  const [rejectTarget, setRejectTarget] = useState<OfferRequest | null>(null);
  const [reason, setReason] = useState("");

  const offersQ = useQuery<OfferRequest[]>({ queryKey: ["/api/admin/offer-requests"], enabled: tab === "offers" });
  const payoutsQ = useQuery<any[]>({ queryKey: ["/api/admin/tajerdrop/payouts"], enabled: tab === "payouts" });
  const sellersQ = useQuery<SellerSnapshot[]>({
    queryKey: ["/api/admin/tajerdrop/sellers"],
    enabled: tab === "sellers",
  });
  const offers = unwrap<OfferRequest[]>(offersQ.data ?? []) || [];
  const payouts = unwrap<any[]>(payoutsQ.data ?? []) || [];
  const sellers = unwrap<SellerSnapshot[]>(sellersQ.data ?? []) || [];

  const accept = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/admin/offer-requests/${id}/accept`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/offer-requests"] }); toast({ title: "Demande acceptée" }); },
    onError: (e: any) => toast({ title: "Action impossible", description: e?.message || "Une erreur est survenue.", variant: "destructive" }),
  });
  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => apiRequest("PATCH", `/api/admin/offer-requests/${id}/reject`, { reason }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/offer-requests"] }); setRejectTarget(null); setReason(""); toast({ title: "Demande refusée" }); },
    onError: (e: any) => toast({ title: "Refus impossible", description: e?.message, variant: "destructive" }),
  });
  const expire = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/offer-requests/expire-inactive"),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/offer-requests"] }); toast({ title: "Contrôle d'expiration terminé" }); },
    onError: (e: any) => toast({ title: "Contrôle impossible", description: e?.message, variant: "destructive" }),
  });

  const pendingOffers = offers.filter(o => o.status?.toLowerCase() === "pending");

  // ── Versements ────────────────────────────────────────────────────────────
  // L'operateur encaisse le client puis regle le seller quand il veut, par
  // montants libres. Il ne s'agit donc pas de « payer une facture » mais de
  // faire baisser un solde courant.
  const [payTarget, setPayTarget] = useState<SellerSnapshot | null>(null);
  const [payForm, setPayForm] = useState({ amount: "", method: "cash", reference: "", note: "", paidAt: new Date().toISOString().slice(0, 10) });

  const payBalanceQ = useQuery({
    queryKey: [`/api/admin/tajerdrop/sellers/${payTarget?.sellerStoreId}/balance`],
    enabled: !!payTarget,
  });
  const payBalance: any = unwrap(payBalanceQ.data);

  const payout = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", `/api/admin/tajerdrop/sellers/${payTarget!.sellerStoreId}/payouts`, {
        amount: Number(String(payForm.amount).replace(",", ".")),
        method: payForm.method,
        reference: payForm.reference || undefined,
        note: payForm.note || undefined,
        paidAt: payForm.paidAt,
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body?.message || "Versement impossible");
      return body;
    },
    onSuccess: (data: any) => {
      toast({ title: "Versement enregistré", description: `Reste à verser : ${money(data?.balance?.remaining)}` });
      setPayTarget(null);
      setPayForm({ amount: "", method: "cash", reference: "", note: "", paidAt: new Date().toISOString().slice(0, 10) });
      qc.invalidateQueries();
    },
    onError: (e: any) => toast({ title: "Versement refusé", description: e?.message, variant: "destructive" }),
  });
  const filteredOffers = useMemo(() => offers.filter(o => `${o.seller.name} ${o.product.name} ${o.product.sku}`.toLowerCase().includes(search.toLowerCase())), [offers, search]);
  if (!(user as any)?.isSuperAdmin) return <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: PAGE }}><div className="text-center" style={{ color: NAVY }}><AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-400" /><h1 className="text-xl font-semibold">Accès refusé</h1><Button className="mt-4" onClick={() => navigate("/")}>Retour</Button></div></div>;

  return <div className="min-h-[100dvh]" style={{ background: PAGE, color: NAVY }}>
    <header className="sticky top-0 z-30 border-b px-4 py-4 sm:px-7" style={{ background: "rgba(255,255,255,.9)", borderColor: "#e2e8f0", backdropFilter: "blur(8px)" }}>
      <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4">
        <div className="flex items-center gap-3"><button onClick={() => navigate("/super-admin")} className="text-slate-400 hover:text-slate-700"><ArrowLeft className="h-5 w-5" /></button><div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: SKY }}><ShieldCheck className="h-5 w-5" style={{ color: BLUE }} /></div><div><h1 className="font-semibold tracking-tight">TajerDrop <span style={{ color: BLUE }}>Operations</span></h1><p className="text-xs text-slate-500">Décisions commerciales et règlement financier</p></div></div>
        <div className="hidden items-center gap-2 text-xs text-slate-500 sm:flex"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Super Admin workspace</div>
      </div>
    </header>
    <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-7">
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="text-[11px] font-bold uppercase tracking-[.2em]" style={{ color: BLUE }}>TajerDrop / Admin</p><h2 className="mt-1 text-3xl font-semibold tracking-tight">Centre de contrôle</h2><p className="mt-1 max-w-xl text-sm text-slate-500">Traitez les demandes d'offre, clôturez les factures et surveillez la performance des vendeurs.</p></div><div className="flex gap-2"><Button variant="outline" className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50" onClick={() => qc.invalidateQueries()}><RefreshCw className="mr-2 h-4 w-4" /> Actualiser</Button>{tab === "offers" && <Button style={{ background: GOLD, color: "#fff" }} onClick={() => expire.mutate()} disabled={expire.isPending}><Clock3 className="mr-2 h-4 w-4" /> Contrôler les expirations</Button>}</div></div>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4"><Stat icon={ShoppingBag} label="Offres en attente" value={String(pendingOffers.length)} detail="Demandes à arbitrer" /><Stat icon={Wallet} label="Total versé" value={money(payouts.reduce((a: number, p: any) => a + Number(p.amount || 0), 0))} detail="Tous sellers confondus" /><Stat icon={Users} label="Vendeurs actifs" value={String(sellers.length)} detail="Snapshot opérationnel" /><Stat icon={TrendingUp} label="Cash livré" value={money(sellers.reduce((a, s) => a + Number(s.deliveredRevenue || 0), 0))} detail="Sur le portefeuille vendeur" /></div>
      <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl border p-1" style={{ background: "#fff", borderColor: "#e2e8f0" }}>{[["offers", "Offer Requests", pendingOffers.length, ShoppingBag], ["payouts", "Versements", payouts.length, Wallet], ["sellers", "Sellers", sellers.length, BarChart3]].map(([key, label, count, Icon]: any) => <button key={key} onClick={() => setTab(key)} className={cn("flex min-w-[150px] items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition", tab === key ? "" : "text-slate-500 hover:text-slate-800")} style={tab === key ? { background: SKY, color: BLUE } : {}}><Icon className="h-4 w-4" />{label}<span className="rounded-full bg-slate-100 px-1.5 text-[10px] text-slate-600">{count}</span></button>)}</div>
      {tab === "offers" && <section className="rounded-xl border" style={{ background: "#fff", borderColor: "#e2e8f0", boxShadow: "0 1px 2px rgba(15,23,42,.04)" }}><div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: "#e2e8f0" }}><div><h3 className="font-semibold">Demandes d'accès aux offres</h3><p className="text-xs text-slate-500">Les validations modifient immédiatement les droits du seller.</p></div><div className="relative w-full sm:w-64"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Seller, produit, SKU..." className="border-slate-200 bg-white pl-9 placeholder:text-slate-400" /></div></div><div className="overflow-x-auto">{offersQ.isLoading ? <Loading /> : offersQ.isError ? <ErrorState /> : <table className="w-full min-w-[850px] text-sm"><thead><tr className="border-b text-left text-[10px] uppercase tracking-wider text-slate-500"><th className="px-4 py-3">Produit</th><th>Seller</th><th>Économie</th><th>Demande</th><th>Statut</th><th className="pr-4 text-right">Décision</th></tr></thead><tbody>{filteredOffers.map(o => <tr key={o.id} className="border-t border-slate-100 hover:bg-slate-50"><td className="px-4 py-3"><div className="flex items-center gap-3">{o.product.imageUrl ? <img src={o.product.imageUrl} className="h-10 w-10 rounded-lg object-cover" alt="" /> : <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100"><Package className="h-4 w-4 text-slate-400" /></div>}<div><div className="font-medium">{o.product.name}</div><div className="text-xs text-slate-400">{o.product.sku || "SKU non renseigné"} · {o.product.category || "Sans catégorie"}</div></div></div></td><td><div>{o.seller.name}</div><div className="text-xs text-slate-400">#{o.seller.id}</div></td><td><div>{money(o.product.productCost)}</div><div className="text-xs text-slate-400">{o.product.stockLevel} en stock</div></td><td className="text-slate-600">{date(o.createdAt)}</td><td><StatusPill value={o.status} /></td><td className="pr-4 text-right">{o.status?.toLowerCase() === "pending" ? <div className="flex justify-end gap-2"><Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => { accept.mutate(o.id); }} disabled={accept.isPending}><Check className="mr-1 h-3.5 w-3.5" /> Accepter</Button><Button size="sm" variant="outline" className="border-red-400/30 text-red-600 hover:bg-red-400/10" onClick={() => setRejectTarget(o)}><X className="mr-1 h-3.5 w-3.5" /> Refuser</Button></div> : <span className="text-xs text-slate-400">{o.cancelReason || date(o.acceptedAt)}</span>}</td></tr>)}</tbody></table>}</div></section>}
      {tab === "payouts" && <section className="rounded-xl border" style={{ background: "#fff", borderColor: "#e2e8f0", boxShadow: "0 1px 2px rgba(15,23,42,.04)" }}>
        <div className="border-b p-4" style={{ borderColor: "#e2e8f0" }}>
          <h3 className="font-semibold">Registre des versements</h3>
          <p className="text-xs text-slate-500">Chaque ligne est definitive. Une erreur se corrige par un versement negatif.</p>
        </div>
        <div className="overflow-x-auto">{payoutsQ.isLoading ? <Loading /> : payoutsQ.isError ? <ErrorState /> : payouts.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">Aucun versement enregistre. Ouvrez l'onglet Sellers pour en saisir un.</p> : <table className="w-full min-w-[760px] text-sm"><thead><tr className="border-b text-left text-[10px] uppercase tracking-wider text-slate-500"><th className="px-4 py-3">Date</th><th>Seller</th><th>Moyen</th><th>Reference</th><th className="pr-4 text-right">Montant</th></tr></thead><tbody>{payouts.map((p: any) => <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50"><td className="px-4 py-3">{date(p.paidAt)}</td><td className="font-medium">{p.sellerName}<div className="text-xs text-slate-400">Store #{p.sellerStoreId}</div></td><td className="text-slate-600">{({ cash: "Especes", bank: "Virement", wallet: "Portefeuille", other: "Autre" } as any)[p.method] || p.method}</td><td className="text-xs text-slate-400">{p.reference || "\u2014"}</td><td className="pr-4 text-right font-semibold" style={{ color: Number(p.amount) < 0 ? "#c0392f" : "#047857" }}>{money(p.amount)}</td></tr>)}</tbody></table>}</div>
      </section>}
      {tab === "sellers" && <section className="rounded-xl border" style={{ background: "#fff", borderColor: "#e2e8f0", boxShadow: "0 1px 2px rgba(15,23,42,.04)" }}><div className="border-b p-4" style={{ borderColor: "#e2e8f0" }}><h3 className="font-semibold">Performance vendeur</h3><p className="text-xs text-slate-500">Vue consolidée des indicateurs qui guident l'allocation d'offres.</p></div><div className="overflow-x-auto">{sellersQ.isLoading ? <Loading /> : sellersQ.isError ? <ErrorState /> : <table className="w-full min-w-[950px] text-sm"><thead><tr className="border-b text-left text-[10px] uppercase tracking-wider text-slate-500"><th className="px-4 py-3">Seller</th><th>Leads</th><th>Confirmés</th><th>Livrés</th><th>Taux confirmation</th><th>Taux livraison</th><th>CA livré</th><th>Stock</th><th>Dernier lead</th><th className="pr-4 text-right">Règlement</th></tr></thead><tbody>{sellers.map(s => <tr key={s.sellerStoreId} className="border-t border-slate-100 hover:bg-slate-50"><td className="px-4 py-3 font-medium">{s.sellerName}<div className="text-xs text-slate-400">Store #{s.sellerStoreId}</div></td><td>{s.leads}</td><td>{s.confirmed}</td><td>{s.delivered}</td><td><span className="font-semibold text-emerald-700">{Number(s.confirmationRate || 0).toFixed(1)}%</span></td><td><span className="font-semibold" style={{ color: BLUE }}>{Number(s.deliveryRate || 0).toFixed(1)}%</span></td><td className="font-semibold">{money(s.deliveredRevenue)}</td><td><span className={s.productsInStock > 0 ? "text-emerald-700" : "text-red-600"}>{s.productsInStock}</span></td><td className="text-xs text-slate-400">{date(s.lastLeadAt)}</td><td className="pr-4 text-right"><Button size="sm" style={{ background: GOLD, color: "#fff" }} onClick={() => setPayTarget(s)}><Wallet className="mr-1 h-3.5 w-3.5" /> Verser</Button></td></tr>)}</tbody></table>}</div></section>}
    </main>
    <Dialog open={!!rejectTarget} onOpenChange={v => !v && setRejectTarget(null)}><DialogContent><DialogHeader><DialogTitle>Refuser la demande d'offre</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">Expliquez la décision pour garder une trace opérationnelle.</p><Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Motif du refus..." rows={4} /><DialogFooter><Button variant="outline" onClick={() => setRejectTarget(null)}>Annuler</Button><Button variant="destructive" disabled={!reason.trim() || reject.isPending} onClick={() => rejectTarget && reject.mutate({ id: rejectTarget.id, reason: reason.trim() })}>{reject.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirmer le refus</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={!!payTarget} onOpenChange={v => !v && setPayTarget(null)}>
      <DialogContent>
        <DialogHeader><DialogTitle>Verser à {payTarget?.sellerName}</DialogTitle></DialogHeader>

        {payBalanceQ.isLoading ? <Loading /> : (
          <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-3 text-center text-sm">
            <div><div className="text-xs text-slate-500">Gagné</div><div className="font-semibold">{money(payBalance?.earned)}</div></div>
            <div><div className="text-xs text-slate-500">Déjà versé</div><div className="font-semibold text-emerald-700">{money(payBalance?.paid)}</div></div>
            <div><div className="text-xs text-slate-500">Reste</div><div className="font-bold" style={{ color: GOLD }}>{money(payBalance?.remaining)}</div></div>
          </div>
        )}

        <div className="space-y-3">
          <label className="block text-sm font-medium">Montant (DH)
            <div className="mt-1 flex gap-2">
              <Input value={payForm.amount} inputMode="decimal" placeholder="1000"
                onChange={e => setPayForm({ ...payForm, amount: e.target.value })} />
              {/* Raccourci « tout verser » : c'est le cas le plus courant, et
                  retaper un montant a la virgule pres est la premiere source
                  d'erreur de saisie. */}
              <Button variant="outline" className="shrink-0 border-slate-200"
                disabled={!payBalance?.remaining}
                onClick={() => setPayForm({ ...payForm, amount: ((payBalance?.remaining || 0) / 100).toFixed(2) })}>
                Tout
              </Button>
            </div>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium">Moyen
              <select value={payForm.method} onChange={e => setPayForm({ ...payForm, method: e.target.value })}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="cash">Espèces</option>
                <option value="bank">Virement</option>
                <option value="wallet">Portefeuille</option>
                <option value="other">Autre</option>
              </select>
            </label>
            <label className="block text-sm font-medium">Date du règlement
              <Input type="date" value={payForm.paidAt}
                onChange={e => setPayForm({ ...payForm, paidAt: e.target.value })} />
            </label>
          </div>

          <label className="block text-sm font-medium">Référence
            <Input value={payForm.reference} placeholder="N° de virement, reçu…"
              onChange={e => setPayForm({ ...payForm, reference: e.target.value })} />
          </label>
          <label className="block text-sm font-medium">Note
            <Textarea rows={2} value={payForm.note}
              onChange={e => setPayForm({ ...payForm, note: e.target.value })} />
          </label>

          <p className="text-xs text-slate-400">
            Un versement est définitif. Une erreur se corrige par un versement
            négatif, qui conserve la trace des deux écritures.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setPayTarget(null)}>Annuler</Button>
          <Button style={{ background: GOLD, color: "#fff" }}
            disabled={!Number(String(payForm.amount).replace(",", ".")) || payout.isPending}
            onClick={() => payout.mutate()}>
            {payout.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enregistrer le versement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}

function Loading() { return <div className="space-y-3 p-6"><div className="h-4 w-1/3 animate-pulse rounded bg-slate-100" /><div className="h-10 animate-pulse rounded bg-slate-100" /><div className="h-10 animate-pulse rounded bg-slate-100" /></div>; }
function ErrorState() { return <div className="flex items-center gap-3 p-8 text-sm text-red-600"><AlertCircle className="h-5 w-5" /> Impossible de charger ces données. Utilisez Actualiser pour réessayer.</div>; }