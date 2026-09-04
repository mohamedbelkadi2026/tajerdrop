import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { formatCurrency } from "@/lib/utils";
import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2, Package, ShoppingCart } from "lucide-react";

const GOLD = "#c49a55";
const NAVY = "#10243d";

type StockItem = {
  id: number;
  productId: number;
  product: {
    id: number; name: string; sku: string; imageUrl: string | null;
    sellingPrice: number; stockLevel: string; category: string | null;
  } | null;
};

/**
 * Creation manuelle d'une commande, cote seller.
 *
 * Le choix du produit est limite a « Mon stock » — les offres deja acceptees.
 * Le catalogue complet y serait trompeur : un seller ne peut pas vendre un
 * produit dont l'acces ne lui a pas ete accorde, et le serveur refuserait la
 * commande apres coup, une fois le client au telephone.
 */
export default function TajerDropNouvelleCommande() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();

  const [productId, setProductId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [price, setPrice] = useState("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const { data: stock, isLoading } = useQuery<StockItem[]>({
    queryKey: ["/api/marketplace/my-stock"],
    queryFn: async () => {
      const r = await fetch("/api/marketplace/my-stock", { credentials: "include" });
      if (!r.ok) throw new Error("Chargement impossible");
      return r.json();
    },
  });

  const items = (stock ?? []).filter(s => s.product);
  const selected = items.find(s => s.product!.id === productId)?.product ?? null;

  function pick(id: number) {
    setProductId(id);
    const p = items.find(s => s.product!.id === id)?.product;
    // Pre-remplit au prix suggere : c'est le point de depart de la marge
    // annoncee dans le catalogue, que le seller ajuste ensuite.
    if (p && !price) setPrice(String(Math.round(p.sellingPrice / 100)));
  }

  const canSubmit = !!productId && name.trim() && phone.trim() && Number(price) > 0 && !busy;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true); setError(null);
    try {
      const r = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          customerName: name.trim(),
          customerPhone: phone.trim(),
          customerCity: city.trim(),
          customerAddress: address.trim(),
          comment: comment.trim(),
          items: [{
            productId,
            quantity: Math.max(1, Number(quantity) || 1),
            price: Math.round(Number(price) * 100),
          }],
        }),
      });
      const json = await r.json();
      if (!r.ok) { setError(json?.message || "Création impossible."); return; }
      setDone(json?.orderNumber || "");
      await qc.invalidateQueries({ queryKey: ["/api/orders/all"] });
    } catch {
      setError("Connexion interrompue.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setProductId(null); setName(""); setPhone(""); setCity("");
    setAddress(""); setQuantity("1"); setPrice(""); setComment("");
    setDone(null); setError(null);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: GOLD }} />
      </div>
    );
  }

  if (done !== null) {
    return (
      <div className="rounded-2xl border bg-white p-8 text-center">
        <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-600" />
        <h2 className="text-lg font-semibold" style={{ color: NAVY }}>Commande créée</h2>
        <p className="mt-1 text-sm text-slate-500">
          {done ? `Numéro ${done}. ` : ""}Elle part en confirmation.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => navigate("/tajerdrop/commandes")}
            className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white"
            style={{ background: NAVY }}
          >
            Voir mes commandes
          </button>
          <button onClick={reset} className="rounded-lg border px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Créer une autre
          </button>
        </div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed p-12 text-center" style={{ borderColor: `${GOLD}66`, background: "#fffaf0" }}>
        <Package className="mx-auto mb-3 h-9 w-9" style={{ color: GOLD }} />
        <h3 className="font-semibold" style={{ color: NAVY }}>Aucun produit dans votre stock</h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
          Demandez l'accès à un produit du catalogue. Une fois accordé, vous
          pourrez créer des commandes dessus.
        </p>
        <button
          onClick={() => navigate("/tajerdrop/catalogue")}
          className="mt-6 rounded-lg px-5 py-2.5 text-sm font-semibold text-white"
          style={{ background: NAVY }}
        >
          Parcourir le catalogue
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/tajerdrop/commandes")} className="rounded-lg border p-2 hover:bg-slate-50">
          <ArrowLeft className="h-4 w-4 text-slate-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: NAVY }}>Nouvelle commande</h1>
          <p className="text-sm text-slate-500">Saisissez une commande reçue hors plateforme.</p>
        </div>
      </div>

      {/* Produit */}
      <div className="rounded-xl border bg-white p-5">
        <h2 className="mb-3 font-semibold" style={{ color: NAVY }}>Produit</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {items.map(({ product: p }) => {
            const active = productId === p!.id;
            return (
              <button
                key={p!.id}
                onClick={() => pick(p!.id)}
                style={active ? { borderColor: NAVY, background: "#f8fafc" } : undefined}
                className="flex items-center gap-3 rounded-lg border p-3 text-left hover:bg-slate-50"
              >
                {p!.imageUrl ? (
                  <img src={p!.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded border bg-white object-contain" />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded border bg-slate-50">
                    <Package className="h-4 w-4 text-slate-300" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="line-clamp-2 text-sm font-medium" style={{ color: NAVY }}>{p!.name}</p>
                  <p className="text-xs text-slate-400">SKU {p!.sku}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Client */}
      <div className="rounded-xl border bg-white p-5">
        <h2 className="mb-3 font-semibold" style={{ color: NAVY }}>Client</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-500">Nom *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-slate-400" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-500">Téléphone *</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-slate-400" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-500">Ville</label>
            <input value={city} onChange={(e) => setCity(e.target.value)} className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-slate-400" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-500">Adresse</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-slate-400" />
          </div>
        </div>
      </div>

      {/* Commande */}
      <div className="rounded-xl border bg-white p-5">
        <h2 className="mb-3 font-semibold" style={{ color: NAVY }}>Commande</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-500">Quantité</label>
            <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-slate-400" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-500">Prix de vente (DH) *</label>
            <input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-slate-400" />
            {selected && (
              <p className="text-xs text-slate-400">
                Prix suggéré : {formatCurrency(selected.sellingPrice)}
              </p>
            )}
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-medium text-slate-500">Commentaire</label>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-slate-400" />
          </div>
        </div>

        {Number(price) > 0 && (
          <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
            Total encaissé :{" "}
            <strong style={{ color: NAVY }}>
              {formatCurrency(Math.round(Number(price) * 100) * (Number(quantity) || 1))}
            </strong>
          </p>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <button
        onClick={submit}
        disabled={!canSubmit}
        className="inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
        style={{ background: NAVY }}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
        Créer la commande
      </button>
    </div>
  );
}
