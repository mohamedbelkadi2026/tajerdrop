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

  const FR = {
    title: "TajerDrop — Dropshipping COD au Maroc, vendez sans stock",
    description:
      "Choisissez un produit du catalogue, faites-en la publicité, et nous confirmons par centre d'appel, emballons et livrons dans toutes les villes du Maroc. Vous ne payez que sur les commandes livrées.",
    canonical: "https://tajerdrop.com/fr",
    locale: "fr_FR",
    lang: "fr",
  };

  /** Remplace le contenu d'une balise meta, en la laissant intacte si absente. */
  const setMeta = (html: string, attr: string, name: string, value: string) =>
    html.replace(
      new RegExp(`(<meta ${attr}="${name}" content=")[^"]*(")`),
      (_m, a, b) => a + value.replace(/"/g, "&quot;") + b,
    );

  const frenchHtml = (() => {
    let html = indexHtml;
    html = html.replace(/<html lang="[^"]*"/, `<html lang="${FR.lang}"`);
    html = html.replace(/<title>[^<]*<\/title>/, `<title>${FR.title}</title>`);
    html = setMeta(html, "name", "description", FR.description);
    html = html.replace(
      /<link rel="canonical" href="[^"]*" \/>/,
      `<link rel="canonical" href="${FR.canonical}" />`,
    );
    html = setMeta(html, "property", "og:title", FR.title);
    html = setMeta(html, "property", "og:description", FR.description);
    html = setMeta(html, "property", "og:url", FR.canonical);
    html = setMeta(html, "property", "og:locale", FR.locale);
    html = setMeta(html, "property", "og:locale:alternate", "ar_MA");
    html = setMeta(html, "name", "twitter:title", FR.title);
    html = setMeta(html, "name", "twitter:description", FR.description);
    return html;
  })();

  // Catch-all for React Router — GET only, never intercept /api/* paths.
  // This MUST be last so all API routes registered before this take priority.
  app.get("/{*path}", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();

    const isFrench = req.path === "/fr" || req.path === "/fr/";
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(isFrench ? frenchHtml : indexHtml);
  });
}
