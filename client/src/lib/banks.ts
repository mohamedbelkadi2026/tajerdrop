/**
 * Etablissements de paiement marocains proposes au seller.
 *
 * Pas de logos embarques. Ce sont des marques deposees appartenant a des tiers,
 * et les redistribuer dans le depot pose une question de droits qui n'a pas a
 * etre tranchee ici. Chaque etablissement est donc represente par un monogramme
 * sur sa couleur — assez pour le reconnaitre dans une liste.
 *
 * Un logo officiel peut etre depose plus tard dans client/public/banks/ sous le
 * nom `<id>.png` : le composant le detecte et remplace le monogramme, sans
 * modification de code. En cas d'erreur de chargement, le monogramme reprend
 * la place plutot que de laisser un cadre vide.
 */
export type Bank = { id: string; name: string; short: string; color: string };

export const BANKS: Bank[] = [
  { id: "attijariwafa",     name: "Attijariwafa Bank",     short: "AW",  color: "#E9A400" },
  { id: "banque-populaire", name: "Banque Populaire",      short: "BP",  color: "#C8571F" },
  { id: "bank-of-africa",   name: "Bank of Africa",        short: "BOA", color: "#0B7285" },
  { id: "bmci",             name: "BMCI",                  short: "BM",  color: "#0F7A3D" },
  { id: "cih",              name: "CIH Bank",              short: "CIH", color: "#1F3C88" },
  { id: "credit-du-maroc",  name: "Crédit du Maroc",       short: "CDM", color: "#0E7C4A" },
  { id: "credit-agricole",  name: "Crédit Agricole",       short: "CAM", color: "#1F7A34" },
  { id: "societe-generale", name: "Société Générale",      short: "SG",  color: "#1B1B1B" },
  { id: "cfg",              name: "CFG Bank",              short: "CFG", color: "#C0392F" },
  { id: "al-barid",         name: "Al Barid Bank",         short: "ABB", color: "#F0A500" },
  { id: "umnia",            name: "Umnia Bank",            short: "UB",  color: "#A6194C" },
  { id: "bank-al-yousr",    name: "Bank Al Yousr",         short: "BAY", color: "#C0392F" },
  { id: "al-akhdar",        name: "Al Akhdar Bank",        short: "AAB", color: "#2E7D32" },
  { id: "arab-bank",        name: "Arab Bank",             short: "AB",  color: "#1F3C5A" },
  // Services de transfert : pas des banques, mais un seller peut n'avoir que
  // cela — les exclure reviendrait a lui interdire d'etre paye.
  { id: "cash-plus",        name: "Cash Plus",             short: "CP",  color: "#0A9B4E" },
  { id: "barid-cash",       name: "Barid Cash",            short: "BC",  color: "#E8820C" },
];

export const bankById = (id?: string | null) => BANKS.find(b => b.id === id) || null;
