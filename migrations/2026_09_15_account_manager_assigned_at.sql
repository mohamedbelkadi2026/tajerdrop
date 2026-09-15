-- Colonne manquante : account_manager_assigned_at.
--
-- Elle a ete declaree dans le schema sans migration correspondante. Drizzle
-- liste toutes les colonnes du schema dans ses SELECT, donc CHAQUE lecture de
-- la table stores echouait — pas seulement les requetes qui s'interessent a
-- cette colonne.
--
-- Cote application, cela renvoyait les sellers vers l'espace operateur : le
-- champ storeType venait d'une lecture du magasin qui ne repondait plus.
--
-- La migration precedente (2026_09_14_account_manager.sql) est deja appliquee
-- et ne peut pas etre modifiee : le runner ne rejoue jamais un fichier deja
-- enregistre. D'ou ce second fichier.

ALTER TABLE stores ADD COLUMN IF NOT EXISTS account_manager_assigned_at TIMESTAMP;
