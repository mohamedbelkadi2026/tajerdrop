-- Pousser un produit du catalogue vers la boutique YouCan d'un seller.
--
-- Une ligne par (connexion YouCan, produit). L'identite porte sur
-- l'integration et non sur le seller : le callback OAuth insere une ligne
-- storeIntegrations par boutique connectee, avec son propre webhookKey, donc
-- un seller peut avoir plusieurs boutiques YouCan et pousser le meme produit
-- sur chacune.
--
-- Cette table ne sert PAS a rattacher les commandes qui reviennent : le push
-- envoie le SKU du catalogue, et le webhook YouCan matche deja sur le SKU.
-- Elle sert a empecher qu'un meme produit soit cree deux fois sur la meme
-- boutique, et a afficher au seller ce qui est deja pousse.

CREATE TABLE IF NOT EXISTS youcan_product_pushes (
  id                SERIAL PRIMARY KEY,
  integration_id    INTEGER NOT NULL REFERENCES store_integrations(id),
  seller_store_id   INTEGER NOT NULL REFERENCES stores(id),
  product_id        INTEGER NOT NULL REFERENCES products(id),
  youcan_product_id TEXT    NOT NULL,
  youcan_slug       TEXT,
  public_url        TEXT,
  pushed_sku        TEXT,
  created_at        TIMESTAMP DEFAULT NOW()
);

-- Garde-fou du double push : c'est cette contrainte, et non un test applicatif,
-- qui empeche deux clics simultanes de creer deux produits sur la boutique.
CREATE UNIQUE INDEX IF NOT EXISTS youcan_product_pushes_integration_product_idx
  ON youcan_product_pushes (integration_id, product_id);

CREATE INDEX IF NOT EXISTS youcan_product_pushes_seller_product_idx
  ON youcan_product_pushes (seller_store_id, product_id);
