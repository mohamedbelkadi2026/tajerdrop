import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Loader2, Package, ShoppingCart, ChevronRight,
  TrendingUp, Search, ArrowRight, SlidersHorizontal, PlayCircle,
  Info, FileText, Image as ImageIcon,
} from "lucide-react";
import { STOCK_LEVELS } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

const GOLD = "#C5A059";
const NAVY = "#0f1e38";

interface Variant {
  id: number; name: string; sku: string; stock: number;
  costPrice: number; sellingPrice: number; imageUrl: string | null;
}
interface MarketplaceProduct {
  id: number; name: string; description: string | null; imageUrl: string | null;
  images: string[]; videoUrl?: string | null; category: string | null;
  suggestedPrice: number; productCost: number; deliveryFee: number; packagingFee: number;
  sku?: string | null;
  confirmationFee?: number;
  stockLevel?: 'high' | 'limited' | 'low' | 'out';
  availableStock?: number; hasVariants: boolean; variants: Variant[];
}

function MarginBadge({ margin }: { margin: number }) {
  const color = margin >= 40 ? "#16a34a" : margin >= 20 ? "#ca8a04" : "#dc2626";
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ background: color + "18", color }}>
      <TrendingUp className="w-3 h-3" />
      {margin}% marge
    </span>
  );
}

/**
 * Etiquette de disponibilite. Le backend n'envoie plus le stock exact — une
 * donnee interne — mais un niveau, seul element utile a la decision du seller :
 * lancer une campagne ou non.
 */
const STOCK_LABELS: Record<string, { label: string; cls: string }> = {
  high:    { label: "En stock",        cls: "bg-emerald-50 text-emerald-700" },
  limited: { label: "Stock limité",    cls: "bg-amber-50 text-amber-700" },
  low:     { label: "Bientôt épuisé",  cls: "bg-orange-50 text-orange-700" },
  out:     { label: "Rupture",         cls: "bg-red-50 text-red-700" },
};

function StockBadge({ level }: { level?: string }) {
  const s = STOCK_LABELS[level || "high"] || STOCK_LABELS.high;
  return <span className={`inline-block rounded-md px-2 py-1 text-xs font-medium ${s.cls}`}>{s.label}</span>;
}

function ProductCard({ p, onSelect, requested, onRequest }: { p: MarketplaceProduct; onSelect: () => void; requested?: boolean; onRequest: () => void }) {
  // L'appel de confirmation est facture au seller au meme titre que la
  // livraison et l'emballage : l'omettre surevaluait sa marge de 10 DH.
  const totalCost = p.productCost + p.deliveryFee + p.packagingFee + (p.confirmationFee ?? 0);
  const margin = p.suggestedPrice > 0
    ? Math.round(((p.suggestedPrice - totalCost) / p.suggestedPrice) * 100)
    : 0;

  return (
    <Card className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
      onClick={onSelect}>
      {/* object-contain sur fond blanc : les visuels du catalogue sont des
          creations marketing avec titres et pictogrammes en bord d'image, que
          le recadrage amputait. */}
      <div className="aspect-square bg-white relative overflow-hidden border-b">
        {p.imageUrl ? (
          <img src={p.imageUrl} alt={p.name}
            loading="lazy" decoding="async"
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-10 h-10 text-muted-foreground/30" />
          </div>
        )}
        {p.stockLevel && (
          <div className="absolute bottom-2 left-2 z-10">
            <StockBadge level={p.stockLevel} />
          </div>
        )}
        {p.category && (
          <span className="absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full bg-black/50 text-white backdrop-blur-sm">
            {p.category}
          </span>
        )}

        {p.stockLevel === 'out' && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-white text-sm font-semibold">Rupture de stock</span>
          </div>
        )}
      </div>

      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm leading-tight">{p.name}</h3>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
        </div>

        {margin > 0 && <MarginBadge margin={margin} />}

        {/* La carte sert a parcourir : seul le prix suggere y figure. Le detail
            des frais — produit, livraison, emballage, confirmation — appartient
            a la fiche, ou le seller decide. Repete sur chaque vignette, il
            allongeait la grille sans aider a comparer. */}
        <div className="flex items-baseline justify-between pt-1">
          <span className="text-sm text-muted-foreground">Prix suggéré</span>
          <span className="text-lg font-bold" style={{ color: GOLD }}>
            {formatCurrency(p.suggestedPrice)}
          </span>
        </div>

        <Button
          className="w-full text-white"
          size="sm"
          style={{ background: NAVY }}
          disabled={p.stockLevel === 'out'}
           onClick={(e) => { e.stopPropagation(); requested ? onSelect() : onRequest(); }}
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
           {requested ? "Voir le produit" : "Demander l'accès"}
        </Button>
      </CardContent>
    </Card>
  );
}


/**
 * Simulateur de rentabilite.
 *
 * Le point qui fait ou defait le calcul : les frais de confirmation sont dus
 * sur CHAQUE lead passe au centre d'appel, confirme ou non. La livraison et
 * l'emballage ne s'appliquent qu'aux commandes reellement expediees, et le
 * produit n'est consomme que sur les livraisons. Un simulateur qui ne
 * facturerait les frais que sur les ventes livrees annoncerait une marge tres
 * superieure a la realite — c'est l'erreur qui ruine les sellers debutants.
 *
 * Les retours ne sont pas gratuits non plus : une commande expediee puis
 * refusee a coute sa livraison et son emballage. Ils sont donc comptes.
 */

/**
 * Visuels de la fiche : image principale, visuels supplementaires, video.
 *
 * Les vignettes ne s'affichent qu'a partir de deux visuels — une seule
 * vignette sous une seule image n'apporte rien. object-contain sur fond blanc
 * partout : les visuels du catalogue sont des creations marketing dont le
 * texte touche les bords, qu'un recadrage amputerait.
 */

/**
 * Onglets de la fiche. La description des produits du catalogue fait souvent
 * dix lignes en arabe : posee en clair sous le titre, elle repoussait le prix
 * et le simulateur hors de l'ecran. Les visuels et la video n'apparaissent que
 * s'il y en a — un onglet vide se lit comme un bug.
 */
function ProductTabs({ p }: { p: MarketplaceProduct }) {
  const extra = (p.images || []).filter(Boolean);
  const tabs = [
    { key: "info", label: "Infos", icon: Info },
    ...(p.description ? [{ key: "desc", label: "Description", icon: FileText }] : []),
    ...(extra.length ? [{ key: "img", label: `Visuels (${extra.length})`, icon: ImageIcon }] : []),
    ...(p.videoUrl ? [{ key: "vid", label: "Vidéo", icon: PlayCircle }] : []),
  ];
  const [tab, setTab] = useState("info");

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap gap-1 border-b p-1">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={tab === key ? { background: NAVY, color: "white" } : undefined}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${
              tab === key ? "" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {tab === "info" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
              <p className="text-xs font-medium text-slate-500">Référence produit</p>
              <p className="mt-0.5 font-semibold" style={{ color: NAVY }}>{p.sku || "—"}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
              <p className="text-xs font-medium text-slate-500">Catégorie</p>
              <p className="mt-0.5 font-semibold" style={{ color: NAVY }}>{p.category || "—"}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
              <p className="text-xs font-medium text-slate-500">Pays</p>
              <p className="mt-0.5 font-semibold" style={{ color: NAVY }}>Maroc</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
              <p className="text-xs font-medium text-slate-500">Coût produit</p>
              <p className="mt-0.5 font-semibold" style={{ color: NAVY }}>{formatCurrency(p.productCost)}</p>
            </div>
          </div>
        )}

        {tab === "desc" && (
          <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {p.description}
          </p>
        )}

        {tab === "img" && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {extra.map((url, i) => (
              <a key={url + i} href={url} target="_blank" rel="noreferrer"
                className="aspect-square overflow-hidden rounded-lg border bg-white">
                <img src={url} alt="" loading="lazy" className="h-full w-full object-contain" />
              </a>
            ))}
          </div>
        )}

        {tab === "vid" && (
          <a href={p.videoUrl!} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium" style={{ color: GOLD }}>
            <PlayCircle className="h-4 w-4" />
            Ouvrir la vidéo de démonstration
          </a>
        )}
      </div>
    </div>
  );
}

function ProductMedia({ p }: { p: MarketplaceProduct }) {
  const shots = [p.imageUrl, ...(p.images || [])].filter(Boolean) as string[];
  const [active, setActive] = useState(0);
  const [showVideo, setShowVideo] = useState(false);

  // Les liens YouTube « watch » ne s'affichent pas en iframe : il faut la
  // forme /embed/. Tout autre lien est propose en ouverture externe plutot
  // que dans un lecteur qui resterait noir.
  const yt = (p.videoUrl || "").match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/);
  const embed = yt ? `https://www.youtube.com/embed/${yt[1]}` : null;

  return (
    <div className="space-y-3">
      <div className="aspect-square rounded-xl overflow-hidden bg-white border border-slate-200 shadow-sm">
        {showVideo && embed ? (
          <iframe src={embed} title={p.name} allowFullScreen className="w-full h-full" />
        ) : shots.length ? (
          <img src={shots[active]} alt={p.name} decoding="async" className="w-full h-full object-contain" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-12 h-12 text-muted-foreground/30" />
          </div>
        )}
      </div>

      {(shots.length > 1 || p.videoUrl) && (
        <div className="flex flex-wrap gap-2">
          {shots.length > 1 && shots.map((url, i) => (
            <button
              key={url + i}
              onClick={() => { setActive(i); setShowVideo(false); }}
              style={!showVideo && active === i ? { borderColor: NAVY, borderWidth: 2 } : undefined}
              className="h-16 w-16 overflow-hidden rounded-lg border bg-white"
            >
              <img src={url} alt="" loading="lazy" className="h-full w-full object-contain" />
            </button>
          ))}

          {p.videoUrl && (embed ? (
            <button
              onClick={() => setShowVideo(true)}
              style={showVideo ? { borderColor: NAVY, borderWidth: 2 } : undefined}
              className="flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-lg border bg-slate-50 text-xs text-slate-500"
            >
              <PlayCircle className="h-5 w-5" />
              Vidéo
            </button>
          ) : (
            <a
              href={p.videoUrl}
              target="_blank"
              rel="noreferrer"
              className="flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-lg border bg-slate-50 text-xs text-slate-500 hover:bg-slate-100"
            >
              <PlayCircle className="h-5 w-5" />
              Vidéo
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfitSimulator({ p, sellingPrice }: { p: MarketplaceProduct; sellingPrice: number }) {
  const [leads, setLeads] = useState("100");
  const [adCost, setAdCost] = useState("15");
  const [confirmRate, setConfirmRate] = useState("60");
  const [deliverRate, setDeliverRate] = useState("70");

  const n = Math.max(0, Number(leads) || 0);
  const ad = Math.max(0, Number(adCost) || 0) * 100;      // DH -> centimes
  const cr = Math.min(100, Math.max(0, Number(confirmRate) || 0)) / 100;
  const dr = Math.min(100, Math.max(0, Number(deliverRate) || 0)) / 100;
  const price = sellingPrice;

  const confirmed = Math.round(n * cr);
  const delivered = Math.round(confirmed * dr);
  const returned = confirmed - delivered;

  const revenue = delivered * price;
  const adSpend = n * ad;
  const confirmCost = n * (p.confirmationFee ?? 0);          // tous les leads
  const shipCost = confirmed * (p.deliveryFee + p.packagingFee); // tout ce qui part
  const goodsCost = delivered * p.productCost;                // seulement le vendu

  const profit = revenue - adSpend - confirmCost - shipCost - goodsCost;
  const perDelivered = delivered > 0 ? Math.round(profit / delivered) : 0;

  const Field = ({ label, value, set, suffix }: any) => (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="relative mt-1">
        <Input type="number" min={0} value={value} onChange={(e: any) => set(e.target.value)} />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
      <div>
        <h3 className="text-base font-bold" style={{ color: NAVY }}>Simulateur de rentabilité</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Estimez votre bénéfice avant de lancer une campagne.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Leads" value={leads} set={setLeads} />
        <Field label="Coût par lead" value={adCost} set={setAdCost} suffix="DH" />
        <Field label="Taux de confirmation" value={confirmRate} set={setConfirmRate} suffix="%" />
        <Field label="Taux de livraison" value={deliverRate} set={setDeliverRate} suffix="%" />
      </div>

      {price > 0 && n > 0 && (
        <div className="space-y-1.5 border-t pt-3 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>{confirmed} confirmées · {delivered} livrées</span>
            <span>{returned} retour{returned !== 1 ? "s" : ""}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Encaissé</span>
            <span className="font-medium">{formatCurrency(revenue)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Publicité ({n} leads)</span><span>− {formatCurrency(adSpend)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Confirmation ({n} leads)</span><span>− {formatCurrency(confirmCost)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Livraison + emballage ({confirmed})</span><span>− {formatCurrency(shipCost)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Produit ({delivered})</span><span>− {formatCurrency(goodsCost)}</span>
          </div>

          <div
            className="mt-2 rounded-lg p-3"
            style={{ background: profit > 0 ? "#16a34a18" : "#dc262618" }}
          >
            <div className="flex justify-between font-semibold">
              <span>Bénéfice net</span>
              <span style={{ color: profit > 0 ? "#16a34a" : "#dc2626" }}>
                {formatCurrency(profit)}
              </span>
            </div>
            {delivered > 0 && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatCurrency(perDelivered)} par commande livrée
              </p>
            )}
          </div>

          <p className="pt-1 text-xs text-muted-foreground">
            Les frais de confirmation sont dus sur tous les leads. Livraison et
            emballage sont dus sur toute commande expédiée, y compris celles
            qui reviennent.
          </p>
        </div>
      )}
    </div>
  );
}

function ProductDetail({ p, onBack }: { p: MarketplaceProduct; onBack: () => void }) {
  const [, navigate] = useLocation();
  const [sellingPrice, setSellingPrice] = useState(String(Math.round(p.suggestedPrice / 100)));
  // L'appel de confirmation est facture au seller au meme titre que la
  // livraison et l'emballage : l'omettre surevaluait sa marge de 10 DH.
  const totalCost = p.productCost + p.deliveryFee + p.packagingFee + (p.confirmationFee ?? 0);
  const priceVal  = Number(sellingPrice) * 100;
  const margin    = priceVal > totalCost ? priceVal - totalCost : 0;
  const marginPct = priceVal > 0 ? Math.round((margin / priceVal) * 100) : 0;

  return (
    // Pleine largeur : la fiche est l'ecran ou le seller decide, elle n'a pas
    // a etre bridee comme une colonne de lecture.
    <div className="space-y-5">
      <button onClick={onBack} className="text-sm flex items-center gap-1 text-muted-foreground hover:text-foreground">
        ← Retour au catalogue
      </button>

      {/* Bandeau : visuel a gauche, identite et chiffres a droite. Le visuel
          garde une colonne fixe et compacte ; tout le reste de la largeur va
          a l'information, qui en a besoin. */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <ProductMedia p={p} />
        </div>

        <div className="space-y-4 lg:col-span-8">
          <div>
            {p.category && <Badge variant="secondary" className="mb-2">{p.category}</Badge>}
            <h2 className="text-2xl font-bold leading-tight">{p.name}</h2>
            {p.sku && <p className="mt-1 text-sm text-muted-foreground">SKU {p.sku}</p>}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500">Prix suggéré</p>
              <p className="mt-1 text-2xl font-bold" style={{ color: GOLD }}>
                {formatCurrency(p.suggestedPrice)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500">Disponibilité</p>
              <div className="mt-2"><StockBadge level={p.stockLevel} /></div>
            </div>
          </div>

          <Button
            className="w-full sm:w-auto text-white font-semibold"
            style={{ background: GOLD }}
            disabled={p.stockLevel === 'out'}
            onClick={() => navigate(`/orders/new?productId=${p.id}`)}
          >
            <ArrowRight className="w-4 h-4 mr-2" />
            Créer une commande
          </Button>

          {p.stockLevel === 'out' && (
            <p className="text-xs text-red-500">Produit en rupture de stock</p>
          )}

          {/* La description est longue et souvent en arabe : sous un onglet,
              elle n'ecrase plus les chiffres qui decident. */}
          <ProductTabs p={p} />
        </div>
      </div>

      {/* Calculateur et simulateur : pleine largeur, sous le bandeau. Ils
          demandent de la place et ne servent qu'apres avoir vu le produit. */}
      <div className="grid gap-4 xl:grid-cols-2 xl:items-start">
        <div className="rounded-xl p-4 space-y-3 shadow-sm" style={{ background: "#fff", border: `1px solid #e2e8f0` }} data-card>
          <h3 className="text-base font-bold" style={{ color: NAVY }}>Calculateur de marge</h3>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Coût produit</span><span className="font-medium text-slate-700">{formatCurrency(p.productCost)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Livraison</span><span className="font-medium text-slate-700">{formatCurrency(p.deliveryFee)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Emballage</span><span className="font-medium text-slate-700">{formatCurrency(p.packagingFee)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Confirmation</span><span className="font-medium text-slate-700">{formatCurrency(p.confirmationFee ?? 0)}</span>
            </div>
            <div className="flex justify-between font-medium border-t pt-1.5">
              <span>Coût total</span><span className="font-bold" style={{ color: NAVY }}>{formatCurrency(totalCost)}</span>
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Votre prix de vente (DH)</label>
            <Input
              type="number"
              value={sellingPrice}
              onChange={(e) => setSellingPrice(e.target.value)}
              className="mt-1"
            />
          </div>

          {priceVal > 0 && (
            <div className="rounded-lg p-3" style={{ background: margin > 0 ? "#16a34a12" : "#dc262612" }}>
              <div className="flex justify-between text-sm font-semibold">
                <span>Votre marge</span>
                <span style={{ color: margin > 0 ? "#16a34a" : "#dc2626" }}>
                  {formatCurrency(margin)} ({marginPct}%)
                </span>
              </div>
            </div>
          )}
        </div>

        <ProfitSimulator p={p} sellingPrice={priceVal} />
      </div>

      {/* Variants */}
      {p.hasVariants && p.variants.length > 0 && (
        <div className="rounded-xl border p-4 space-y-2">
          <h3 className="text-sm font-semibold">Variantes disponibles</h3>
          <div className="space-y-2">
            {p.variants.map((v) => (
              <div key={v.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                <span>{v.name}</span>
                <span className={v.stock > 0 ? "text-green-600" : "text-red-500"}>
                  {v.stock > 0 ? `${v.stock} en stock` : "Épuisé"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


export default function TajerDropCatalogue() {
  const [selected, setSelected] = useState<MarketplaceProduct | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [level, setLevel] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const qc = useQueryClient();

  const { data: products = [], isLoading, error } = useQuery<MarketplaceProduct[]>({
    queryKey: ["/api/marketplace/products"],
  });
  const { data: requests = [] } = useQuery<any[]>({ queryKey: ["/api/marketplace/offer-requests"] });
  const requestMutation = useMutation({
    mutationFn: (productId: number) => apiRequest("POST", "/api/marketplace/offer-requests", { productId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/marketplace/offer-requests"] }),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: GOLD }} />
    </div>
  );

  if (error) return (
    <div className="p-6 text-center text-sm text-red-500">
      Erreur de chargement du catalogue.
    </div>
  );

  if (selected) return <ProductDetail p={selected} onBack={() => setSelected(null)} />;

  // Categories reellement presentes, pas la liste complete : proposer un
  // filtre qui ne ramene rien fait croire a une panne.
  const categories = Array.from(
    new Set(products.map(p => p.category).filter(Boolean) as string[])
  ).sort();

  const q = search.trim().toLowerCase();
  // Les prix sont saisis en dirhams, stockes en centimes.
  const min = minPrice ? Number(minPrice) * 100 : null;
  const max = maxPrice ? Number(maxPrice) * 100 : null;

  const filtered = products.filter(p => {
    if (category && p.category !== category) return false;
    if (level && p.stockLevel !== level) return false;
    if (min != null && p.suggestedPrice < min) return false;
    if (max != null && p.suggestedPrice > max) return false;
    if (!q) return true;
    return p.name.toLowerCase().includes(q)
      || (p.category || '').toLowerCase().includes(q)
      || (p.sku || '').toLowerCase().includes(q);
  });

  const activeFilters = [category, level, minPrice, maxPrice].filter(Boolean).length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: NAVY }}>Catalogue</h1>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setShowFilters(!showFilters)}
          style={activeFilters ? { background: NAVY, color: "white" } : undefined}
          className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium ${
            activeFilters ? "" : "bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filtres
          {activeFilters > 0 && (
            <span className="rounded bg-white/20 px-1.5 text-xs">{activeFilters}</span>
          )}
        </button>

        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un produit, une catégorie, un SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {showFilters && (
        <div className="grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Prix min (DH)</label>
            <Input type="number" min={0} value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="0" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Prix max (DH)</label>
            <Input type="number" min={0} value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="—" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Catégorie</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Toutes</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Disponibilité</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Toutes</option>
              {STOCK_LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>

          {activeFilters > 0 && (
            <button
              onClick={() => { setCategory(""); setLevel(""); setMinPrice(""); setMaxPrice(""); }}
              className="justify-self-start text-sm text-muted-foreground underline sm:col-span-2 lg:col-span-4"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        {filtered.length} produit{filtered.length !== 1 ? "s" : ""}
        {filtered.length !== products.length && ` sur ${products.length}`}
      </p>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-muted-foreground text-sm">
            {search || category ? "Aucun produit ne correspond." : "Aucun produit dans le catalogue pour le moment."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
           {filtered.map((p) => (
             <ProductCard key={p.id} p={p} requested={requests.some((r:any) => r.productId === p.id && r.status !== "rejected")} onRequest={() => requestMutation.mutate(p.id)} onSelect={() => setSelected(p)} />
          ))}
        </div>
      )}
    </div>
  );
}
