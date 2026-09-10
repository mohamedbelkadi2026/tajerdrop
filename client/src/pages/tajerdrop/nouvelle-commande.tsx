import { useMemo, useRef, useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { formatCurrency } from "@/lib/utils";
import {
  AlertTriangle, ArrowLeft, CheckCircle2, ChevronDown, Loader2,
  Package, Plus, ShoppingCart, Trash2,
} from "lucide-react";

const GOLD = "#FF6B35";
const NAVY = "#0F172A";

type StockProduct = {
  id: number; name: string; sku: string; imageUrl: string | null;
  sellingPrice: number; stockLevel: string; category: string | null;
};
type StockItem = { id: number; productId: number; product: StockProduct | null };

/** Une ligne de commande. */
type Line = { key: number; productId: number | null; quantity: string; price: string };

/**
 * Creation manuelle d'une commande, cote seller.
 *
 * Le choix du produit est limite a « Mon stock » — les offres deja acceptees.
 * Le catalogue complet y serait trompeur : un seller ne peut pas vendre un
 * produit dont l'acces ne lui a pas ete accorde, et le serveur refuserait la
 * commande apres coup, une fois le client au telephone.
 *
 * Plusieurs produits par commande : un meme client qui prend deux articles
 * fait un seul colis, donc un seul appel de confirmation et une seule
 * livraison. Le forcer en deux commandes lui facturait deux fois ces frais.
 */

/**
 * Selecteur de produit avec vignette.
 *
 * Un <select> natif ne montre que du texte, et ces produits portent des noms
 * arabes longs et proches les uns des autres. L'image est ce qui permet de
 * reconnaitre le bon article d'un coup d'oeil pendant un appel.
 */
function ProductPicker({ items, value, onChange, disabledIds }: {
  items: StockProduct[];
  value: number | null;
  onChange: (id: number) => void;
  disabledIds: number[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = items.find(p => p.id === value) || null;

  // Fermeture au clic exterieur : sans cela, deux listes ouvertes en meme
  // temps se recouvrent et on ne sait plus laquelle on modifie.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center gap-2.5 rounded-lg border bg-white p-2 text-start transition-colors hover:bg-slate-50"
        style={selected ? { borderColor: GOLD } : undefined}
      >
        {selected?.imageUrl ? (
          <img src={selected.imageUrl} alt="" className="h-9 w-9 shrink-0 rounded border bg-white object-contain" />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded border bg-slate-50">
            <Package className="h-4 w-4 text-slate-300" />
          </div>
        )}
        <span className="min-w-0 flex-1">
          {selected ? (
            <>
              <span className="block truncate text-sm font-medium" style={{ color: NAVY }}>{selected.name}</span>
              <span className="block truncate text-xs text-slate-400">SKU {selected.sku}</span>
            </>
          ) : (
            <span dir="rtl" className="block text-sm text-slate-400">اختر المنتج</span>
          )}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border bg-white shadow-lg">
          {items.map(p => {
            // Un produit deja pose sur une autre ligne reste visible mais
            // inactif : le masquer donnerait l'impression qu'il a disparu du
            // stock. Pour en commander plus, on augmente la quantite.
            const taken = disabledIds.includes(p.id) && p.id !== value;
            return (
              <button
                key={p.id}
                type="button"
                disabled={taken}
                onClick={() => { onChange(p.id); setOpen(false); }}
                className="flex w-full items-center gap-2.5 p-2 text-start hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt="" loading="lazy" className="h-9 w-9 shrink-0 rounded border bg-white object-contain" />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded border bg-slate-50">
                    <Package className="h-4 w-4 text-slate-300" />
                  </div>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium" style={{ color: NAVY }}>{p.name}</span>
                  <span className="block truncate text-xs text-slate-400">
                    SKU {p.sku} · {formatCurrency(p.sellingPrice)}
                  </span>
                </span>
                {taken && <span className="shrink-0 text-xs text-slate-400">déjà ajouté</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function TajerDropNouvelleCommande() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [comment, setComment] = useState("");
  const [lines, setLines] = useState<Line[]>([{ key: 1, productId: null, quantity: "1", price: "" }]);
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

  const products = useMemo(
    () => (stock ?? []).map(s => s.product).filter(Boolean) as StockProduct[],
    [stock],
  );

  const chosenIds = lines.map(l => l.productId).filter(Boolean) as number[];

  function setLine(key: number, patch: Partial<Line>) {
    setLines(ls => ls.map(l => (l.key === key ? { ...l, ...patch } : l)));
  }

  function pickProduct(key: number, id: number) {
    const p = products.find(x => x.id === id);
    setLines(ls => ls.map(l => l.key === key
      // Le prix suggere sert de point de depart — c'est la marge annoncee dans
      // le catalogue. Un prix deja saisi n'est pas ecrase.
      ? { ...l, productId: id, price: l.price || (p ? String(Math.round(p.sellingPrice / 100)) : "") }
      : l));
  }

  const addLine = () =>
    setLines(ls => [...ls, { key: Math.max(0, ...ls.map(l => l.key)) + 1, productId: null, quantity: "1", price: "" }]);

  const removeLine = (key: number) =>
    setLines(ls => (ls.length === 1 ? ls : ls.filter(l => l.key !== key)));

  const lineTotal = (l: Line) =>
    Math.round((Number(l.price) || 0) * 100) * Math.max(1, Number(l.quantity) || 1);

  const total = lines.reduce((s, l) => s + (l.productId ? lineTotal(l) : 0), 0);

  const filled = lines.filter(l => l.productId && Number(l.price) > 0);
  const canSubmit = filled.length > 0 && name.trim() && phone.trim() && !busy;

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
          items: filled.map(l => ({
            productId: l.productId,
            quantity: Math.max(1, Number(l.quantity) || 1),
            price: Math.round(Number(l.price) * 100),
          })),
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
    setName(""); setPhone(""); setCity(""); setAddress(""); setComment("");
    setLines([{ key: 1, productId: null, quantity: "1", price: "" }]);
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
          <button onClick={() => navigate("/tajerdrop/commandes")}
            className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white" style={{ background: NAVY }}>
            Voir mes commandes
          </button>
          <button onClick={reset} className="rounded-lg border px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Créer une autre
          </button>
        </div>
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="rounded-2xl border border-dashed p-12 text-center" style={{ borderColor: `${GOLD}66`, background: "#fffaf0" }}>
        <Package className="mx-auto mb-3 h-9 w-9" style={{ color: GOLD }} />
        <h3 className="font-semibold" style={{ color: NAVY }}>Aucun produit dans votre stock</h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
          Demandez l'accès à un produit du catalogue. Une fois accordé, vous
          pourrez créer des commandes dessus.
        </p>
        <button onClick={() => navigate("/tajerdrop/catalogue")}
          className="mt-6 rounded-lg px-5 py-2.5 text-sm font-semibold text-white" style={{ background: NAVY }}>
          Parcourir le catalogue
        </button>
      </div>
    );
  }

  const field = "w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-slate-400";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => navigate("/tajerdrop/commandes")} className="rounded-lg border p-2 hover:bg-slate-50">
          <ArrowLeft className="h-4 w-4 text-slate-500" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold" style={{ color: NAVY }}>Nouvelle commande</h1>
          <p className="text-sm text-slate-500">Saisissez une commande reçue hors plateforme.</p>
        </div>
        <button
          onClick={submit}
          disabled={!canSubmit}
          className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          style={{ background: canSubmit ? GOLD : "#94a3b8" }}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
          Créer la commande
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* ── Client ──────────────────────────────────────────────────────── */}
        <div className="rounded-xl border bg-white p-5">
          <h2 className="mb-4 font-semibold" style={{ color: NAVY }}>Client</h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-slate-600">Nom <span className="text-red-500">*</span></label>
              <input className={`${field} mt-1`} value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-slate-600">Téléphone <span className="text-red-500">*</span></label>
              <input className={`${field} mt-1`} value={phone} onChange={e => setPhone(e.target.value)} inputMode="tel" />
            </div>
            <div>
              <label className="text-sm text-slate-600">Ville</label>
              <input className={`${field} mt-1`} value={city} onChange={e => setCity(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-slate-600">Adresse</label>
              <textarea className={`${field} mt-1 min-h-[80px]`} value={address} onChange={e => setAddress(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-slate-600">Commentaire</label>
              <textarea className={`${field} mt-1 min-h-[70px]`} value={comment} onChange={e => setComment(e.target.value)} />
            </div>
          </div>
        </div>

        {/* ── Produits ────────────────────────────────────────────────────── */}
        <div className="rounded-xl border bg-white p-5">
          <h2 dir="rtl" lang="ar" className="mb-4 text-start font-semibold" style={{ color: NAVY }}>
            اختر المنتج الذي تريد إضافة طلبية له
          </h2>

          <div className="space-y-3">
            {lines.map((l, i) => (
              <div key={l.key} className="rounded-lg border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">Produit {i + 1}</span>
                  {lines.length > 1 && (
                    <button onClick={() => removeLine(l.key)}
                      className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Retirer">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <ProductPicker
                  items={products}
                  value={l.productId}
                  onChange={(id) => pickProduct(l.key, id)}
                  disabledIds={chosenIds}
                />

                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-500">Quantité</label>
                    <input className={`${field} mt-1`} value={l.quantity} inputMode="numeric"
                      onChange={e => setLine(l.key, { quantity: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Prix unitaire (DH)</label>
                    <input className={`${field} mt-1`} value={l.price} inputMode="decimal"
                      onChange={e => setLine(l.key, { price: e.target.value })} />
                  </div>
                </div>

                {l.productId && (
                  <p className="mt-2 text-end text-sm">
                    <span className="text-slate-500">Total ligne : </span>
                    <strong style={{ color: NAVY }}>{formatCurrency(lineTotal(l))}</strong>
                  </p>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={addLine}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed py-2.5 text-sm font-semibold transition-colors hover:bg-slate-50"
            style={{ borderColor: `${GOLD}66`, color: GOLD }}
          >
            <Plus className="h-4 w-4" /> Ajouter un produit
          </button>

          <div className="mt-4 rounded-lg bg-slate-50 p-3 text-end">
            <span className="text-sm text-slate-500">Total encaissé : </span>
            <strong className="text-lg" style={{ color: NAVY }}>{formatCurrency(total)}</strong>
          </div>

          {/* Le serveur refuse une commande melangeant deux fournisseurs : elle
              ne peut etre ni confirmee ni livree en un seul colis. Le dire ici
              evite de le decouvrir apres avoir tout saisi. */}
          <p className="mt-2 text-xs text-slate-400">
            Tous les produits d'une commande doivent venir du même fournisseur.
          </p>
        </div>
      </div>
    </div>
  );
}
