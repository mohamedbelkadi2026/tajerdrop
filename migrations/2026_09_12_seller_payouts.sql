-- Versements faits a un seller.
--
-- En COD c'est l'operateur qui encaisse le client : il ne facture pas le
-- seller, il lui doit de l'argent. La relation est un solde courant.
--
--   gagne (commandes livrees, frais deduits)  -  verse  =  reste du
--
-- Un versement est immuable, d'un montant et d'une date libres : l'operateur
-- regle quand il veut et autant qu'il veut. Une erreur se corrige par un
-- versement negatif, ce qui conserve la trace des deux ecritures — un UPDATE
-- aurait fait disparaitre la premiere.
--
-- Le montant gagne n'est PAS stocke : il se recalcule depuis les commandes
-- livrees avec la meme regle que le tableau de bord seller. Le figer ici
-- creerait un second chiffre a maintenir, et deux chiffres finissent toujours
-- par differer.

CREATE TABLE IF NOT EXISTS seller_payouts (
  id              SERIAL PRIMARY KEY,
  seller_store_id INTEGER NOT NULL REFERENCES stores(id),
  -- Centimes, comme tous les montants du schema. Peut etre negatif.
  amount          INTEGER NOT NULL,
  method          TEXT NOT NULL DEFAULT 'cash',
  reference       TEXT,
  note            TEXT,
  -- Date du reglement reel, distincte de la date de saisie.
  paid_at         DATE NOT NULL,
  created_by_id   INTEGER REFERENCES users(id),
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS seller_payouts_seller_paid_idx
  ON seller_payouts (seller_store_id, paid_at);
