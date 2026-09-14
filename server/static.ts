import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

export function serveStatic(app: Express) {
  // ESM-safe __dirname: resolves to the directory of the running bundle (dist/)
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const distPath = path.resolve(__dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // ── PWA: service worker — must be served before generic static middleware ──
  // Browsers require sw.js to have no long-term cache (each navigation checks
  // for a new version) and the Service-Worker-Allowed header to set scope to /.
  const swPath = path.resolve(distPath, "sw.js");
  if (fs.existsSync(swPath)) {
    app.get("/sw.js", (_req, res) => {
      res.setHeader("Content-Type", "application/javascript; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Service-Worker-Allowed", "/");
      res.sendFile(swPath);
    });
  }

  // ── PWA: manifest — explicit route so it always returns the right MIME type ─
  const manifestPath = path.resolve(distPath, "site.webmanifest");
  if (fs.existsSync(manifestPath)) {
    app.get("/site.webmanifest", (_req, res) => {
      res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache");
      res.sendFile(manifestPath);
    });
  }

  // Serve static assets (JS, CSS, images, etc.)
  app.use(express.static(distPath));

  // ── En-tete par langue ─────────────────────────────────────────────────────
  //
  // Le catch-all renvoie le meme index.html a toutes les routes. / et /fr
  // partageaient donc le meme titre, la meme description et le meme canonical,
  // alors que ce sont deux pages differentes destinees a deux recherches
  // differentes. Google n'en retenait qu'une.
  //
  // Plutot qu'un rendu serveur complet, l'en-tete est reecrit au vol : c'est la
  // partie que les moteurs lisent en premier et celle qui decide du titre
  // affiche dans les resultats.
  const indexPath = path.resolve(distPath, "index.html");
  const indexHtml = fs.readFileSync(indexPath, "utf-8");

  /**
   * Metadonnees par page publique.
   *
   * Une seule entree par URL indexable. Le defaut (accueil arabe) reste celui
   * ecrit dans index.html ; les autres sont derivees a partir de lui.
   *
   * Un JSON-LD FAQPage est attache au guide : c'est ce qui permet a Google
   * d'afficher les questions directement dans les resultats, ce qu'aucune
   * balise meta ne fait.
   */
  type PageMeta = {
    title: string;
    description: string;
    canonical: string;
    locale: string;
    lang: string;
    jsonLd?: object;
  };

  const faq = (lang: "ar" | "fr") => ({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: lang === "ar" ? "ar-MA" : "fr-MA",
    mainEntity: (lang === "ar"
      ? [
          ["واش خاصني ستوك باش نبدا الدروبشيبينغ فالمغرب؟",
           "لا. المنتجات كايكونو عند المزوّد، ونتا كتبيع. ما كتخلّصش المنتج حتى توصل الطلبية للكليان."],
          ["شحال ديال رأس المال خاصني؟",
           "ما كتحتاجش تشري ستوك. راس المال الوحيد اللي خاصك هو ديال الإشهار."],
          ["شنو كايوقع ملي الطلبية ترجع؟",
           "الطلبية اللي ما وصلاتش ما خاصكش تخلّص عليها: لا تأكيد، لا توصيل، لا تغليف، لا ثمن المنتج."],
        ]
      : [
          ["Faut-il du stock pour faire du dropshipping au Maroc ?",
           "Non. Les produits restent chez le fournisseur et vous vendez. Le produit n'est payé qu'une fois la commande livrée au client."],
          ["Quel capital faut-il pour commencer ?",
           "Aucun stock à acheter. Le seul budget nécessaire est celui de la publicité."],
          ["Que se passe-t-il en cas de retour ?",
           "Une commande non livrée ne doit rien vous coûter : ni confirmation, ni livraison, ni emballage, ni prix du produit."],
        ]
    ).map(([q, a]) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  });

  const PAGES: Record<string, PageMeta> = {
    "/fr": {
      title: "TajerDrop — Dropshipping COD au Maroc, vendez sans stock",
      description:
        "Choisissez un produit du catalogue, faites-en la publicité, et nous confirmons par centre d'appel, emballons et livrons dans toutes les villes du Maroc. Vous ne payez que sur les commandes livrées.",
      canonical: "https://tajerdrop.com/fr",
      locale: "fr_FR",
      lang: "fr",
    },
    "/dropshipping-maroc": {
      title: "الدروبشيبينغ فالمغرب: كيفاش تبدا بلا ستوك | TajerDrop",
      description:
        "دليل كامل بالدارجة: شنو هو الدروبشيبينغ، شحال خاصك ديال رأس المال، كيفاش تختار المنتج، وشنو هي الأرقام اللي كايقرّرو الربح.",
      canonical: "https://tajerdrop.com/dropshipping-maroc",
      locale: "ar_MA",
      lang: "ar",
      jsonLd: faq("ar"),
    },
    "/fr/dropshipping-maroc": {
      title: "Dropshipping au Maroc : démarrer sans stock | TajerDrop",
      description:
        "Guide complet : ce qu'est le dropshipping COD, le capital nécessaire, comment choisir un produit rentable, et les trois chiffres qui décident de votre marge.",
      canonical: "https://tajerdrop.com/fr/dropshipping-maroc",
      locale: "fr_FR",
      lang: "fr",
      jsonLd: faq("fr"),
    },
    "/tajerdrop-inscription": {
      title: "Devenir seller TajerDrop — inscription gratuite",
      description:
        "Créez votre compte vendeur TajerDrop. Accès au catalogue, confirmation par centre d'appel, livraison dans tout le Maroc. Vous ne payez que sur les commandes livrées.",
      canonical: "https://tajerdrop.com/tajerdrop-inscription",
      locale: "ar_MA",
      lang: "ar",
    },
  };

  /** Remplace le contenu d'une balise meta, en la laissant intacte si absente. */
  const setMeta = (html: string, attr: string, name: string, value: string) =>
    html.replace(
      new RegExp(`(<meta ${attr}="${name}" content=")[^"]*(")`),
      (_m, a, b) => a + value.replace(/"/g, "&quot;") + b,
    );

  const render = (meta: PageMeta) => {
    let html = indexHtml;
    html = html.replace(/<html lang="[^"]*"/, `<html lang="${meta.lang}"`);
    html = html.replace(/<title>[^<]*<\/title>/, `<title>${meta.title}</title>`);
    html = setMeta(html, "name", "description", meta.description);
    html = html.replace(
      /<link rel="canonical" href="[^"]*" \/>/,
      `<link rel="canonical" href="${meta.canonical}" />`,
    );
    html = setMeta(html, "property", "og:title", meta.title);
    html = setMeta(html, "property", "og:description", meta.description);
    html = setMeta(html, "property", "og:url", meta.canonical);
    html = setMeta(html, "property", "og:locale", meta.locale);
    html = setMeta(html, "property", "og:locale:alternate", meta.locale === "fr_FR" ? "ar_MA" : "fr_FR");
    html = setMeta(html, "name", "twitter:title", meta.title);
    html = setMeta(html, "name", "twitter:description", meta.description);
    if (meta.jsonLd) {
      html = html.replace(
        "</head>",
        `  <script type="application/ld+json">${JSON.stringify(meta.jsonLd)}</script>\n  </head>`,
      );
    }
    return html;
  };

  // Rendu une fois au demarrage : ces pages ne changent pas d'une requete a
  // l'autre, et refaire les substitutions a chaque visite serait du travail
  // repete pour un resultat identique.
  const prerendered = new Map<string, string>();
  for (const [route, meta] of Object.entries(PAGES)) prerendered.set(route, render(meta));

  // Catch-all for React Router — GET only, never intercept /api/* paths.
  // This MUST be last so all API routes registered before this take priority.
  app.get("/{*path}", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();

    // La barre finale est tolerée : /fr et /fr/ sont la meme page, et les
    // laisser diverger creerait deux URLs pour un seul contenu.
    const route = req.path.length > 1 ? req.path.replace(/\/+$/, "") : req.path;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(prerendered.get(route) ?? indexHtml);
  });
}
