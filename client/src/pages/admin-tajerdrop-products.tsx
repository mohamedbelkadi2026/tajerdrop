import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";
import { MARKETPLACE_CATEGORIES } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useForm, useFieldArray } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Package, Plus, Pencil, Trash2, ArrowLeft, Loader2,
  Image as ImageIcon, Tag, Truck, Box, DollarSign, Layers, Eye, EyeOff,
} from "lucide-react";

const NAVY = "#0f1e38";
const GOLD = "#C5A059";

interface MarketplaceProduct {
  id: number;
  name: string;
  description: string | null;
  imageUrl: string | null;
  settings: any;
  marketplaceCategory: string | null;
  costPrice: number;
  sellingPrice: number;
  marketplaceDeliveryFee: number | null;
  marketplacePackagingFee: number | null;
  marketplaceActive: boolean;
  stock: number;
  hasVariants: number;
}

interface ProductFormValues {
  name: string;
  description: string;
  imageUrl: string;
  category: string;
  sku: string;
  costPrice: string;
  sellingPrice: string;
  deliveryFee: string;
  packagingFee: string;
  confirmationFee: string;
  stock: string;
  active: boolean;
}

const DEFAULT_DELIVERY     = 3500;
const DEFAULT_PACKAGING    = 600;
const DEFAULT_CONFIRMATION = 1000;

function ProductForm({
  initial, onSave, onCancel, saving,
}: {
  initial?: MarketplaceProduct | null;
  onSave: (data: any) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<ProductFormValues>({
    defaultValues: {
      name:        initial?.name        || "",
      description: initial?.description || "",
      imageUrl:    initial?.imageUrl    || "",
      category:    initial?.marketplaceCategory || "",
      sku:         initial?.sku || "",
      costPrice:   initial ? String(initial.costPrice / 100) : "",
      sellingPrice:initial ? String(initial.sellingPrice / 100) : "",
      deliveryFee: initial?.marketplaceDeliveryFee  != null
        ? String(initial.marketplaceDeliveryFee / 100) : "35",
      packagingFee: initial?.marketplacePackagingFee != null
        ? String(initial.marketplacePackagingFee / 100) : "6",
      confirmationFee: (initial as any)?.marketplaceConfirmationFee != null
        ? String((initial as any).marketplaceConfirmationFee / 100) : "10",
      stock:  initial ? String(initial.stock) : "0",
      active: initial?.marketplaceActive !== false,
    },
  });

  const submit = (data: ProductFormValues) => {
    onSave({
      name:        data.name.trim(),
      description: data.description.trim() || null,
      imageUrl:    data.imageUrl.trim()    || null,
      category:    data.category.trim()    || null,
      sku:         data.sku.trim()         || null,
      costPrice:    Math.round(Number(data.costPrice)    * 100),
      sellingPrice: Math.round(Number(data.sellingPrice) * 100),
      deliveryFee:  Math.round(Number(data.deliveryFee)  * 100),
      packagingFee: Math.round(Number(data.packagingFee) * 100),
      confirmationFee: Math.round(Number(data.confirmationFee) * 100),
      stock: Number(data.stock),
      active: data.active,
    });
  };

  const imageUrl = watch("imageUrl");
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function uploadImage(file: File) {
    setUploading(true); setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const r = await fetch("/api/upload/product-image", {
        method: "POST", credentials: "include", body: fd,
      });
      const json = await r.json();
      if (!r.ok) { setUploadError(json?.message || "Envoi impossible."); return; }
      setValue("imageUrl", json.url, { shouldDirty: true });
    } catch {
      setUploadError("Connexion interrompue pendant l'envoi.");
    } finally {
      setUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  }
  const cost     = Number(watch("costPrice"))     || 0;
  const sell     = Number(watch("sellingPrice"))  || 0;
  const delivery = Number(watch("deliveryFee"))   || 0;
  const packaging= Number(watch("packagingFee"))  || 0;
  const confirm  = Number(watch("confirmationFee")) || 0;
  // L'appel de confirmation entre dans le cout : l'omettre affichait au seller
  // une marge plus large que la reelle, de 10 DH par commande.
  const totalCost = (cost + delivery + packaging + confirm) * 100;
  const margin    = sell > 0
    ? Math.round(((sell - cost - delivery - packaging - confirm) / sell) * 100)
    : 0;

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      {/* Image preview */}
      {imageUrl && (
        <div className="w-full h-40 rounded-lg overflow-hidden bg-muted">
          <img src={imageUrl} alt="Aperçu" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Nom du produit *</Label>
          <Input {...register("name", { required: true })} placeholder="Nom du produit" />
        </div>

        <div className="sm:col-span-2 space-y-1.5">
          <Label>Description</Label>
          <Textarea {...register("description")} placeholder="Description pour les sellers..." rows={2} />
        </div>

        <div className="sm:col-span-2 space-y-1.5">
          <Label>Image du produit</Label>
          {/* Champ de fichier plutot que champ d'URL : une URL externe casse le
              jour ou la source la retire, et le seller se retrouve avec une
              fiche sans visuel. Le fichier televerse est servi depuis le volume
              de l'application. La valeur reste stockee dans imageUrl, le champ
              cache ci-dessous, pour ne rien changer au reste de la chaine. */}
          <input type="hidden" {...register("imageUrl")} />

          {imageUrl ? (
            <div className="flex items-start gap-4">
              <img
                src={imageUrl}
                alt=""
                className="h-28 w-28 rounded-lg border object-cover"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0.3"; }}
              />
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Cette image est celle que verront les sellers.
                </p>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => imageInputRef.current?.click()} disabled={uploading}>
                    {uploading ? "Envoi..." : "Remplacer"}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setValue("imageUrl", "")}>
                    Retirer
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div
              onClick={() => imageInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) uploadImage(f); }}
              className="cursor-pointer rounded-lg border-2 border-dashed p-8 text-center hover:bg-muted/40"
            >
              <p className="text-sm font-medium">
                {uploading ? "Envoi en cours..." : "Cliquez ou glissez une image ici"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                JPG, PNG ou WebP — 10 Mo maximum. Préférez un visuel carré d'au
                moins 1000 px : il est affiché en grand dans la fiche seller.
              </p>
            </div>
          )}

          {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}

          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); }}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Catégorie</Label>
          {/* Liste fermee : en champ libre, « Gadget » et « Gadgets » creaient
              deux categories, et le filtre du seller n'en ramenait qu'une. */}
          <select
            {...register("category")}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">— Choisir —</option>
            {MARKETPLACE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label>SKU / Référence</Label>
          <Input {...register("sku")} placeholder="ex: TD-BEAU-001" />
          <p className="text-xs text-muted-foreground">
            Sert au seller pour retrouver le produit dans ses commandes.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>Stock disponible</Label>
          <Input type="number" {...register("stock")} min={0} />
          <p className="text-xs text-muted-foreground">
            Le seller ne voit qu'un niveau — élevé, limité, faible — pas ce chiffre.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>Coût produit (DH)</Label>
          <Input type="number" {...register("costPrice")} min={0} step="0.01" placeholder="0" />
        </div>

        <div className="space-y-1.5">
          <Label>Prix de vente suggéré (DH)</Label>
          <Input type="number" {...register("sellingPrice")} min={0} step="0.01" placeholder="0" />
        </div>

        <div className="space-y-1.5">
          <Label>Frais livraison Seller (DH)</Label>
          <Input type="number" {...register("deliveryFee")} min={0} step="0.01" placeholder="35" />
        </div>

        <div className="space-y-1.5">
          <Label>Frais emballage Seller (DH)</Label>
          <Input type="number" {...register("packagingFee")} min={0} step="0.01" placeholder="6" />
        </div>

        <div className="space-y-1.5">
          <Label>Frais confirmation Seller (DH)</Label>
          <Input type="number" {...register("confirmationFee")} min={0} step="0.01" placeholder="10" />
          <p className="text-xs text-muted-foreground">Appel du centre de confirmation.</p>
        </div>
      </div>

      {/* Margin preview */}
      {sell > 0 && (
        <div className="rounded-lg p-3 text-sm" style={{ background: NAVY + "08", border: `1px solid ${NAVY}15` }}>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Coût total Seller</span>
            <span className="font-medium">{(cost + delivery + packaging + confirm).toFixed(2)} DH</span>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-muted-foreground">Marge Seller (suggérée)</span>
            <span className={`font-semibold ${margin >= 0 ? "text-green-600" : "text-red-500"}`}>
              {margin}%
            </span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <input type="checkbox" id="active" {...register("active")} className="w-4 h-4" />
        <Label htmlFor="active">Produit actif (visible dans le catalogue Seller)</Label>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
        <Button type="submit" disabled={saving} style={{ background: GOLD, color: "white" }}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          {initial ? "Mettre à jour" : "Créer le produit"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function AdminTajerDropProducts() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<MarketplaceProduct | null>(null);

  // Guard: super-admin only
  if (!(user as any)?.isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: NAVY }}>
        <div className="text-center text-white">
          <p className="text-xl font-bold mb-2">Accès refusé</p>
          <Button onClick={() => navigate("/")} variant="outline">Retour</Button>
        </div>
      </div>
    );
  }

  const { data: products = [], isLoading } = useQuery<MarketplaceProduct[]>({
    queryKey: ["/api/admin/marketplace/products"],
  });

  const createMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/admin/marketplace/products", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/marketplace/products"] });
      qc.invalidateQueries({ queryKey: ["/api/marketplace/products"] });
      setDialogOpen(false);
      toast({ title: "Produit créé" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest("PUT", `/api/admin/marketplace/products/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/marketplace/products"] });
      qc.invalidateQueries({ queryKey: ["/api/marketplace/products"] });
      setDialogOpen(false);
      setEditTarget(null);
      toast({ title: "Produit mis à jour" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/marketplace/products/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/marketplace/products"] });
      qc.invalidateQueries({ queryKey: ["/api/marketplace/products"] });
      toast({ title: "Produit archivé" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => { setEditTarget(null); setDialogOpen(true); };
  const openEdit = (p: MarketplaceProduct) => { setEditTarget(p); setDialogOpen(true); };
  const handleDelete = (id: number) => {
    if (confirm("Archiver ce produit ? Il ne sera plus visible dans le catalogue Seller.")) {
      deleteMut.mutate(id);
    }
  };

  const handleSave = (data: any) => {
    if (editTarget) updateMut.mutate({ id: editTarget.id, data });
    else createMut.mutate(data);
  };

  const saving = createMut.isPending || updateMut.isPending;

  return (
    <div className="min-h-screen" style={{ background: NAVY }}>
      {/* Header */}
      <div className="sticky top-0 z-20 border-b px-6 py-4 flex items-center justify-between"
        style={{ background: NAVY, borderColor: `${GOLD}25` }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/super-admin")}
            className="text-white/60 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Package className="w-5 h-5" style={{ color: GOLD }} />
              Catalogue Marketplace
            </h1>
            <p className="text-xs mt-0.5" style={{ color: `${GOLD}80` }}>
              Gestion des produits du catalogue TajerDrop
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate("/admin/tajerdrop/operations")}
            className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
          >
            Gérer les opérations
          </Button>
          <Button onClick={openCreate} style={{ background: GOLD, color: NAVY }}
            className="font-semibold">
            <Plus className="w-4 h-4 mr-2" /> Ajouter un produit
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: GOLD }} />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-30" style={{ color: GOLD }} />
            <p className="text-white/60">Aucun produit dans le catalogue.</p>
            <Button onClick={openCreate} className="mt-4" style={{ background: GOLD, color: NAVY }}>
              Ajouter le premier produit
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map((p) => {
              const totalCostDH = (p.costPrice + (p.marketplaceDeliveryFee ?? 3500) + (p.marketplacePackagingFee ?? 600)) / 100;
              const marginPct = p.sellingPrice > 0
                ? Math.round(((p.sellingPrice - p.costPrice - (p.marketplaceDeliveryFee ?? 3500) - (p.marketplacePackagingFee ?? 600)) / p.sellingPrice) * 100)
                : 0;
              return (
                <div key={p.id} className="rounded-xl overflow-hidden border"
                  style={{ background: "#ffffff0d", borderColor: `${GOLD}20` }}>
                  {/* Image */}
                  <div className="h-36 bg-white/5 relative">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-8 h-8 opacity-20" style={{ color: GOLD }} />
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex items-center gap-1">
                      {p.marketplaceActive === false ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/80 text-white flex items-center gap-1">
                          <EyeOff className="w-3 h-3" /> Masqué
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/80 text-white flex items-center gap-1">
                          <Eye className="w-3 h-3" /> Visible
                        </span>
                      )}
                    </div>
                    {p.marketplaceCategory && (
                      <div className="absolute bottom-2 left-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-black/50 text-white backdrop-blur-sm">
                          {p.marketplaceCategory}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-sm text-white leading-tight">{p.name}</h3>
                      <span className="text-xs shrink-0" style={{ color: GOLD }}>#{p.id}</span>
                    </div>

                    <div className="text-xs space-y-1" style={{ color: "rgba(255,255,255,0.55)" }}>
                      <div className="flex justify-between">
                        <span>Coût produit</span>
                        <span className="text-white">{(p.costPrice / 100).toFixed(0)} DH</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Prix suggéré</span>
                        <span style={{ color: GOLD }}>{(p.sellingPrice / 100).toFixed(0)} DH</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Marge Seller</span>
                        <span className={marginPct >= 20 ? "text-green-400" : "text-amber-400"}>
                          {marginPct}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Stock</span>
                        <span className={p.stock > 0 ? "text-green-400" : "text-red-400"}>
                          {p.stock} unité{p.stock !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" variant="outline"
                        className="flex-1 border-white/20 text-white hover:bg-white/10 hover:text-white"
                        onClick={() => openEdit(p)}>
                        <Pencil className="w-3.5 h-3.5 mr-1" /> Modifier
                      </Button>
                      <Button size="sm" variant="ghost"
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                        onClick={() => handleDelete(p.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditTarget(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? "Modifier le produit" : "Ajouter un produit au catalogue"}
            </DialogTitle>
          </DialogHeader>
          <ProductForm
            initial={editTarget}
            onSave={handleSave}
            onCancel={() => { setDialogOpen(false); setEditTarget(null); }}
            saving={saving}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
