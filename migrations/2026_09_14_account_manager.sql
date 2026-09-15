-- Interlocuteur attribue a chaque seller chez l'operateur.
--
-- Porte par le magasin et non par l'utilisateur : le suivi appartient au
-- compte vendeur, et il survit au depart de la personne qui s'y connecte.
--
-- Nullable a dessein : un seller qui vient de s'inscrire n'a pas encore
-- d'interlocuteur, et forcer une valeur obligerait a en inventer une.

ALTER TABLE stores ADD COLUMN IF NOT EXISTS account_manager_id INTEGER REFERENCES users(id);

CREATE INDEX IF NOT EXISTS stores_account_manager_idx ON stores (account_manager_id);
