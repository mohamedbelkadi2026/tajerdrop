import { useMemo, useState } from "react";
import { Package, PlayCircle, Search, X } from "lucide-react";
import { useJson, Loading, ErrorState, PageHead, GOLD, NAVY } from "./tajerdrop/shared";

/**
 * Catalogue en lecture seule, pour les agents de confirmation.
 *
 * Un agent appelle des clients pour des produits qu'il n'a pas choisis. Avant
 * cet ecran il confirmait un nom de produit sans jamais l'avoir vu : il ne
 * pouvait ni verifier que le client parlait bien du meme article, ni repondre
 * a une question sur la couleur, la taille ou le contenu du colis.
 *
 * Aucune action ici, volontairement. L'agent ne demande pas l'acces a un
 * produit et ne le vend pas : il a besoin de le reconnaitre, pas de le gerer.
 *
 * Aucun prix non plus. Chaque seller fixe le sien, donc le prix du catalogue
 * ne serait presque jamais celui de la commande a l'ecran — et un agent qui
 * annonce le mauvais montant au telephone fait annuler la vente. Le montant
 * qui fait foi est celui affiche sous la commande.
 */

type CatalogueProduct = {
  id: number;
  name: string;
  description: string | null;
  descriptionDarija: string | null;
  imageUrl: string | null;
  images: string[];
  category: string | null;
  sku: string | null;
  videoUrl: string | null;
  stockLevel: string;
  hasVariants: boolean;
  variants: { id: number; name: string; sku: string | null; imageUrl: string | null }[];
};

const STOCK: Record<string, { label: string; cls: string }> = {
  high:    { label: "Stock élevé",    cls: "bg-emerald-600 text-white" },
  limited: { label: "Stock limité",   cls: "bg-amber-600 text-white" },
  low:     { label: "Bientôt épuisé", cls: "bg-orange-600 text-white" },
  out:     { label: "Rupture",        cls: "bg-red-600 text-white" },
};

export default function AgentCatalogue() {
  const q = useJson<CatalogueProduct[]>("/api/agent/catalogue");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [open, setOpen] = useState<CatalogueProduct | null>(null);

  const rows = q.data || [];

  const categories = useMemo(
    () => Array.from(new Set(rows.map(r => r.category).filter(Boolean))) as string[],
    [rows],
  );

  // La recherche couvre aussi les SKU et les libelles de variantes : au
  // telephone, le client decrit une couleur ou lit une reference, rarement le
  // nom exact de la fiche.
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return rows.filter(r => {
      if (category && r.category !== category) return false;
      if (!s) return true;
      return (r.name || "").toLowerCase().includes(s)
        || (r.sku || "").toLowerCase().includes(s)
        || (r.category || "").toLowerCase().includes(s)
        || r.variants.some(v =>
             (v.name || "").toLowerCase().includes(s) || (v.sku || "").toLowerCase().includes(s));
    });
  }, [rows, search, category]);

  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorState retry={q.refetch} />;

  return (
    <div>
      <PageHead
        eyebrow="TAJERDROP · CONFIRMATION"
        title="Catalogue"
        text="Tous les produits que vous pouvez avoir à confirmer. Le prix à annoncer est celui affiché sous la commande."
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nom, SKU, variante, catégorie…"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 ps-10 pe-4 text-sm outline-none focus:border-slate-400"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-slate-400"
        >
          <option value="">Toutes les catégories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <p className="mb-4 text-sm text-slate-500">
        {filtered.length} produit{filtered.length > 1 ? "s" : ""}
        {filtered.length !== rows.length ? ` sur ${rows.length}` : ""}
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Package className="mx-auto mb-3 h-9 w-9 text-slate-300" />
          <p className="font-semibold" style={{ color: NAVY }}>Aucun produit ne correspond</p>
          <p className="mt-1 text-sm text-slate-500">Essayez un autre nom ou une autre référence.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => {
            const sk = STOCK[p.stockLevel] || STOCK.high;
            return (
              <button
                key={p.id}
                onClick={() => setOpen(p)}
                className="group h-full overflow-hidden rounded-2xl border border-slate-200 bg-white text-start transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="flex h-40 items-center justify-center border-b bg-slate-50">
                  {p.imageUrl
                    ? <img src={p.imageUrl} alt="" loading="lazy" className="h-full w-full object-contain p-3" />
                    : <Package className="h-8 w-8 text-slate-300" />}
                </div>
                <div className="p-4">
                  <p className="line-clamp-2 text-sm font-semibold" style={{ color: NAVY }}>{p.name}</p>
                  {p.sku && <p className="mt-1 text-xs text-slate-400">SKU {p.sku}</p>}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${sk.cls}`}>{sk.label}</span>
                    {p.videoUrl && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                        <PlayCircle className="h-3 w-3" /> Vidéo
                      </span>
                    )}
                    {p.hasVariants && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                        {p.variants.length} variante{p.variants.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Fiche detaillee — ce que l'agent lit pendant l'appel. */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6"
          onClick={() => setOpen(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 flex items-start justify-between gap-4 border-b bg-white px-5 py-4">
              <div>
                <h2 className="text-lg font-bold" style={{ color: NAVY }}>{open.name}</h2>
                {open.sku && <p className="mt-0.5 text-xs text-slate-400">SKU {open.sku}</p>}
              </div>
              <button onClick={() => setOpen(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5">
              {(open.images?.length || open.imageUrl) && (
                <div className="mb-5 flex gap-3 overflow-x-auto">
                  {[open.imageUrl, ...(open.images || [])].filter(Boolean).map((src, i) => (
                    <img key={i} src={src as string} alt="" loading="lazy"
                      className="h-40 w-40 shrink-0 rounded-xl border bg-slate-50 object-contain p-2" />
                  ))}
                </div>
              )}

              {open.category && (
                <span className="inline-block rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {open.category}
                </span>
              )}

              {/* Le lien s'ouvre dans un onglet plutot que dans un lecteur
                  integre : les videos viennent de sources variees (YouTube,
                  Drive, fichier direct) qu'aucun lecteur unique n'accepte
                  toutes, et une iframe muette pendant un appel est pire que
                  pas de video du tout. */}
              {open.videoUrl && (
                <a
                  href={open.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
                  style={{ background: GOLD }}
                >
                  <PlayCircle className="h-4 w-4" /> Voir la vidéo du produit
                </a>
              )}

              {/* La darija d'abord : c'est la langue de l'appel. */}
              {open.descriptionDarija && (
                <div className="mt-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">À dire au client</p>
                  <p dir="rtl" lang="ar" className="mt-1.5 whitespace-pre-line rounded-xl bg-slate-50 p-4 leading-relaxed text-slate-700">
                    {open.descriptionDarija}
                  </p>
                </div>
              )}

              {open.description && (
                <div className="mt-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Description</p>
                  <div
                    className="mt-1.5 leading-relaxed text-slate-600 [&_img]:max-w-full"
                    dangerouslySetInnerHTML={{ __html: open.description }}
                  />
                </div>
              )}

              {open.hasVariants && open.variants.length > 0 && (
                <div className="mt-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Variantes</p>
                  <div className="mt-2 divide-y rounded-xl border">
                    {open.variants.map(v => (
                      <div key={v.id} className="flex items-center gap-3 p-3">
                        {v.imageUrl
                          ? <img src={v.imageUrl} alt="" loading="lazy" className="h-10 w-10 rounded-lg border object-contain" />
                          : <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-slate-50">
                              <Package className="h-4 w-4 text-slate-300" />
                            </div>}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium" style={{ color: NAVY }}>{v.name}</p>
                          {v.sku && <p className="text-xs text-slate-400">SKU {v.sku}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
