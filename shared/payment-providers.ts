/**
 * Etablissements de paiement marocains proposes au seller.
 *
 * La liste est partagee entre le client et le serveur : le serveur refuse une
 * valeur hors liste, et l'ecran affiche exactement ce que le serveur accepte.
 * Deux listes auraient fini par diverger, et c'est le seller qui aurait vu son
 * enregistrement refuse sans comprendre.
 *
 * Chaque entree porte une couleur plutot qu'un logo. Les logos des banques
 * sont des marques deposees qu'on ne peut pas embarquer sans autorisation, et
 * un fichier manquant laisserait un carre vide a la place. Une pastille
 * coloree avec les initiales reste lisible et n'emprunte rien.
 */
export type PaymentProvider = {
  id: string;
  label: string;
  /** Initiales affichees dans la pastille. */
  short: string;
  color: string;
};

export const PAYMENT_PROVIDERS: PaymentProvider[] = [
  { id: "attijariwafa",     label: "Attijariwafa Bank",     short: "AW",  color: "#E8A33D" },
  { id: "banque_populaire", label: "Banque Populaire",      short: "BP",  color: "#C8102E" },
  { id: "bank_of_africa",   label: "Bank of Africa",        short: "BOA", color: "#0B7285" },
  { id: "cih",              label: "CIH Bank",              short: "CIH", color: "#00A0A5" },
  { id: "bmci",             label: "BMCI",                  short: "BM",  color: "#00834A" },
  { id: "societe_generale", label: "Société Générale",      short: "SG",  color: "#1F1F1F" },
  { id: "credit_agricole",  label: "Crédit Agricole",       short: "CA",  color: "#2E7D32" },
  { id: "credit_du_maroc",  label: "Crédit du Maroc",       short: "CDM", color: "#C62828" },
  { id: "al_barid",         label: "Al Barid Bank",         short: "ABB", color: "#F2A900" },
  { id: "cfg",              label: "CFG Bank",              short: "CFG", color: "#B3261E" },
  { id: "al_yousr",         label: "Bank Al Yousr",         short: "AY",  color: "#C0392F" },
  { id: "umnia",            label: "Umnia Bank",            short: "UM",  color: "#8E44AD" },
  { id: "al_akhdar",        label: "Al Akhdar Bank",        short: "AK",  color: "#1E8449" },
  { id: "arab_bank",        label: "Arab Bank",             short: "AB",  color: "#2C3E50" },
  // Services de transfert : pas de RIB, mais un numero de telephone sert de
  // reference. Traites comme les banques pour ne pas multiplier les formulaires.
  { id: "cash_plus",        label: "Cash Plus",             short: "CP",  color: "#0E8CD1" },
  { id: "barid_cash",       label: "Barid Cash",            short: "BC",  color: "#F2A900" },
  { id: "wafacash",         label: "Wafacash",              short: "WC",  color: "#E8A33D" },
];

export const PAYMENT_PROVIDER_IDS = PAYMENT_PROVIDERS.map(p => p.id);

/** Les services de transfert prennent un numero, pas un RIB de 24 chiffres. */
export const CASH_PROVIDERS = ["cash_plus", "barid_cash", "wafacash"];

/** Retire tout ce qui n'est pas un chiffre : espaces, tirets, points. */
export function normalizeRib(raw: string): string {
  return (raw || "").replace(/\D/g, "");
}

/** Groupes de 4, comme sur un relevé — plus facile a relire qu'un bloc de 24. */
export function formatRib(raw: string): string {
  const digits = normalizeRib(raw);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}
