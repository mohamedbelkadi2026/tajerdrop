-- Coordonnees bancaires du seller.
--
-- Portees par le magasin et non par l'utilisateur : c'est le magasin qui
-- encaisse, et un compte peut avoir plusieurs utilisateurs alors qu'il n'a
-- qu'un seul RIB de reglement.
--
-- Le RIB est stocke sans espaces. Saisi « 230 022 ... » par l'un et
-- « 230022... » par l'autre, il donnerait deux valeurs differentes pour le
-- meme compte, et toute comparaison ou recherche echouerait.

ALTER TABLE stores ADD COLUMN IF NOT EXISTS bank_name   TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS bank_rib    TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS bank_holder TEXT;
