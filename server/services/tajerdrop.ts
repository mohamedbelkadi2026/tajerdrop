/**
 * TajerDrop — single source of truth for the marketplace/seller model.
 *
 * The platform has exactly two kinds of actors:
 *
 *   • ADMIN (the operator)  — owns the stock, the call center, the carrier
 *     accounts and the money. Uses the full back-office.
 *   • SELLER (dropshipper)  — owns nothing. Picks products from the shared
 *     catalogue, sends leads, gets paid a margin. Must NEVER see carriers,
 *     carrier credentials, shipping costs configuration or another seller's
 *     data.
 *
 * Everything a seller is allowed to touch flows through this file, so the
 * isolation rules live in one place instead of being scattered across
 * routes.ts.
 */

import { db } from "../db";
import {
  stores, products, offerRequests, type Product,
} from "@shared/schema";
import { and, eq, inArray, isNull } from "drizzle-orm";

export const SELLER_STORE_TYPE = "tajerdrop_seller";

// ── Store-type cache ─────────────────────────────────────────────────────────
// isSeller() is called on nearly every carrier/shipping request, so a short
// TTL cache keeps the guard from adding a DB round-trip to every call. Store
// type changes only when an admin validates a seller, and the cache is
// invalidated explicitly at that point (see invalidateStoreCache).

const CACHE_TTL_MS = 60_000;
type CachedStore = { storeType: string | null; ownerStoreId: number | null; at: number };
const storeCache = new Map<number, CachedStore>();

export function invalidateStoreCache(storeId?: number) {
  if (storeId == null) storeCache.clear();
  else storeCache.delete(storeId);
}

async function readStore(storeId: number): Promise<CachedStore> {
  const cached = storeCache.get(storeId);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached;

  const [row] = await db
    .select({ storeType: stores.storeType })
    .from(stores)
    .where(eq(stores.id, storeId))
    .limit(1);

  const fresh: CachedStore = {
    storeType: row?.storeType ?? null,
    ownerStoreId: null,
    at: Date.now(),
  };
  storeCache.set(storeId, fresh);
  return fresh;
}

/** True when the store is a TajerDrop seller (a dropshipper, not the operator). */
export async function isSellerStore(storeId: number | null | undefined): Promise<boolean> {
  if (!storeId) return false;
  const store = await readStore(storeId);
  return store.storeType === SELLER_STORE_TYPE;
}

// ── Catalogue access ─────────────────────────────────────────────────────────

/**
 * Products a seller is actually cleared to sell: active marketplace products
 * for which the seller holds an ACCEPTED offer request. This is the seller's
 * "Mon Stock" — and the only pool their orders may draw from.
 */
export async function getAcceptedCatalogueProducts(sellerStoreId: number): Promise<Product[]> {
  const accepted = await db
    .select({ productId: offerRequests.productId })
    .from(offerRequests)
    .where(and(
      eq(offerRequests.sellerStoreId, sellerStoreId),
      eq(offerRequests.status, "accepted"),
    ));

  const ids = Array.from(new Set(accepted.map(r => r.productId))).filter(Boolean);
  if (!ids.length) return [];

  return await db
    .select()
    .from(products)
    .where(and(
      inArray(products.id, ids),
      eq(products.isMarketplaceProduct, true),
      eq(products.marketplaceActive, true),
      isNull(products.archivedAt),
    ));
}

/**
 * The product pool an incoming order for this store may be matched against.
 *
 * For an admin store this is simply its own catalogue — identical to the old
 * storage.getProductsByStore() behaviour, so nothing changes for the operator.
 *
 * For a SELLER store it is the accepted marketplace catalogue. This is what
 * makes "seller connects his own Shopify/YouCan store" work: a seller owns no
 * products, so without this the webhook would resolve every incoming line item
 * to productId = null — no stock movement, no cost, no product stats.
 */
export async function getOrderMatchingProducts(storeId: number): Promise<Product[]> {
  const own = (await db.select().from(products).where(eq(products.storeId, storeId)))
    .filter(p => !p.archivedAt);

  if (!(await isSellerStore(storeId))) return own;

  const catalogue = await getAcceptedCatalogueProducts(storeId);
  // A seller normally has no own products, but merging keeps the behaviour
  // safe for hybrid accounts and never hides something they already had.
  const seen = new Set(own.map(p => p.id));
  return [...own, ...catalogue.filter(p => !seen.has(p.id))];
}

/**
 * Guard for order creation: every marketplace product in the order must have
 * been approved for this seller. Returns the ids that were NOT approved.
 */
export async function findUnauthorizedProductIds(
  sellerStoreId: number,
  productIds: number[],
): Promise<number[]> {
  const ids = Array.from(new Set(productIds.filter(Boolean)));
  if (!ids.length) return [];

  const allowed = new Set((await getAcceptedCatalogueProducts(sellerStoreId)).map(p => p.id));
  const own = await db
    .select({ id: products.id })
    .from(products)
    .where(and(inArray(products.id, ids), eq(products.storeId, sellerStoreId)));
  own.forEach(p => allowed.add(p.id));

  return ids.filter(id => !allowed.has(id));
}

/**
 * The admin store that physically owns the stock behind these products — i.e.
 * the store whose call center must confirm the lead and whose carrier account
 * must ship it. Returns null when the order contains no marketplace product.
 */
export async function resolveOwnerStoreId(productIds: number[]): Promise<number | null> {
  const ids = Array.from(new Set(productIds.filter(Boolean)));
  if (!ids.length) return null;

  const rows = await db
    .select({
      storeId: products.storeId,
      isMarketplace: products.isMarketplaceProduct,
      ownerStoreId: products.marketplaceOwnerStoreId,
    })
    .from(products)
    .where(inArray(products.id, ids));

  for (const row of rows) {
    if (!row.isMarketplace) continue;
    // marketplaceOwnerStoreId is the explicit owner; products.storeId is the
    // fallback for rows created before that column existed.
    const owner = row.ownerStoreId ?? row.storeId;
    if (owner) return owner;
  }
  return null;
}

// ── Express guards ───────────────────────────────────────────────────────────

/**
 * Hard block: sellers must never reach carrier accounts, shipping dispatch or
 * any other operator-only endpoint. The seller UI already never links to these
 * screens, but the API is what actually protects carrier API keys from a
 * hand-crafted request.
 */
export function blockSeller(req: any, res: any, next: any) {
  if (!req.isAuthenticated?.()) return res.status(401).json({ message: "Non authentifié" });
  if (req.user?.isSuperAdmin) return next();

  isSellerStore(req.user?.storeId)
    .then(seller => {
      if (seller) {
        return res.status(403).json({
          message: "La livraison est gérée par la plateforme. Cette section n'est pas accessible depuis un compte Seller.",
        });
      }
      next();
    })
    .catch(() => res.status(500).json({ message: "Erreur serveur" }));
}
