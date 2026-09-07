import type { Product } from "@shared/schema";

/**
 * Pousser un produit du catalogue vers la boutique YouCan d'un seller.
 *
 * POST https://api.youcan.shop/products — scope `edit-products`.
 * Champs obligatoires cotes YouCan : name, price, has_variants.
 */

/** Base publique du serveur, pour transformer les chemins d'images en URLs. */
export function publicBaseUrl(): string {
  const raw =
    process.env.APP_PUBLIC_URL ||
    process.env.PUBLIC_URL ||
    (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : "");
  return raw.replace(/\/+$/, "");
}

/**
 * Les images sont stockees en chemin relatif (`/uploads/products/x.jpg`) et
 * servies par express.static sans authentification. YouCan les telecharge
 * depuis ses propres serveurs : il lui faut donc une URL absolue, et elle doit
 * rester publique. Un chemin relatif partirait tel quel et l'image serait
 * silencieusement absente du produit cree.
 */
export function toAbsoluteImageUrl(url: string | null | undefined, base: string): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (!base) return null;
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
}

export interface YouCanProductPayload {
  name: string;
  description?: string;
  visibility: boolean;
  has_variants: false;
  sku?: string;
  price: number;
  inventory?: number;
  track_inventory: boolean;
  images?: { name: string; order: number; type: number }[];
}

export interface BuildResult {
  payload: YouCanProductPayload;
  /** Non-blocking notes worth showing the seller (e.g. images dropped). */
  warnings: string[];
}

export function buildYouCanProductPayload(product: Product, base: string): BuildResult {
  const warnings: string[] = [];

  // Nos montants sont en centimes, l'API YouCan attend un float en dirhams.
  // Envoyer 14900 creerait un produit a 14 900 DH au lieu de 149 DH.
  const price = (product.sellingPrice ?? 0) / 100;

  const rawImages = [
    product.imageUrl,
    ...((product.images as string[] | null) ?? []),
  ].filter(Boolean) as string[];

  const seen = new Set<string>();
  const images: { name: string; order: number; type: number }[] = [];
  let dropped = 0;
  for (const raw of rawImages) {
    const abs = toAbsoluteImageUrl(raw, base);
    if (!abs) { dropped++; continue; }
    if (seen.has(abs)) continue;
    seen.add(abs);
    images.push({ name: abs, order: images.length + 1, type: 1 });
  }
  if (dropped > 0) {
    warnings.push(
      `${dropped} image(s) ignorée(s) : URL publique introuvable (APP_PUBLIC_URL non défini ?)`,
    );
  }
  if (images.length === 0) {
    warnings.push("Produit poussé sans image.");
  }

  const payload: YouCanProductPayload = {
    name: product.name,
    visibility: true,
    has_variants: false,
    // Le SKU est le pivot : le webhook de commande matche dessus au retour.
    // Sans lui, la commande reviendrait sans productId et resterait chez le
    // seller au lieu de partir chez l'operateur.
    sku: product.sku || undefined,
    price,
    // Le stock est detenu par l'operateur et partage entre TOUS les sellers qui
    // revendent ce produit. Laisser YouCan decrementer un stock par boutique
    // donnerait un chiffre faux dans les deux sens : blocage de ventes alors
    // que le stock existe, ou survente si plusieurs boutiques partent du meme
    // total. Le stock reste donc pilote par la plateforme.
    track_inventory: false,
  };

  if (product.description) payload.description = product.description;
  if (images.length) payload.images = images;

  // cost_price est volontairement absent : il exposerait la marge de
  // l'operateur dans l'admin YouCan du seller.

  return { payload, warnings };
}

export interface PushOutcome {
  ok: boolean;
  status: number;
  youcanProductId?: string;
  slug?: string;
  publicUrl?: string;
  /** Message court, deja lisible par un seller. */
  error?: string;
  raw?: unknown;
}

export async function pushProductToYouCan(
  accessToken: string,
  payload: YouCanProductPayload,
): Promise<PushOutcome> {
  let resp: Response;
  try {
    resp = await fetch("https://api.youcan.shop/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (err: any) {
    return { ok: false, status: 0, error: `YouCan injoignable : ${err?.message || "erreur réseau"}` };
  }

  const text = await resp.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { /* non-JSON error page */ }

  if (!resp.ok) {
    // 422 renvoie un objet errors {champ: [messages]} — on le remonte tel quel,
    // c'est la seule information qui dit quel champ a ete refuse.
    const detail =
      (body?.errors && Object.entries(body.errors)
        .map(([f, m]: any) => `${f}: ${Array.isArray(m) ? m.join(", ") : m}`)
        .join(" | ")) ||
      body?.message ||
      text.slice(0, 300);
    return { ok: false, status: resp.status, error: detail || `HTTP ${resp.status}`, raw: body ?? text };
  }

  const created = body?.data ?? body;
  const id = created?.id;
  if (!id) {
    return { ok: false, status: resp.status, error: "YouCan a répondu sans identifiant de produit", raw: body };
  }

  return {
    ok: true,
    status: resp.status,
    youcanProductId: String(id),
    slug: created?.slug ?? undefined,
    publicUrl: created?.public_url ?? undefined,
    raw: body,
  };
}
