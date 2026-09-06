/**
 * Logo TajerDrop.
 *
 * Une goutte dont la pointe est un colis, posee sur une base qui evoque un
 * comptoir : le drop du dropshipping et la marchandise, en une seule forme.
 * Dessine en SVG plutot qu'importe en image — il doit rester net sur un
 * favicon de 32 px comme sur un hero en plein ecran, et changer de couleur
 * selon le fond sans qu'on ait a produire deux fichiers.
 */
export function TajerDropMark({ className = "", size = 40 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="td-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e2c07a" />
          <stop offset="100%" stopColor="#b8873f" />
        </linearGradient>
      </defs>

      {/* Goutte */}
      <path
        d="M24 3c0 0 13 13.4 13 21.6C37 32.5 31.2 38 24 38S11 32.5 11 24.6C11 16.4 24 3 24 3z"
        fill="url(#td-gold)"
      />

      {/* Colis inscrit dans la goutte : les deux volets et la fente centrale
          suffisent a le lire, meme reduit a quelques pixels. */}
      <path d="M16.5 21.5h15v10.5a1.5 1.5 0 0 1-1.5 1.5H18a1.5 1.5 0 0 1-1.5-1.5V21.5z" fill="#0f1e38" />
      <path d="M15 18.5h18v4H15z" fill="#0f1e38" />
      <path d="M23 18.5h2v15h-2z" fill="url(#td-gold)" />
    </svg>
  );
}

export function TajerDropLogo({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <TajerDropMark size={36} />
      <span className="text-xl font-extrabold tracking-tight" style={{ color: light ? "#fff" : "#0f1e38" }}>
        <span style={{ color: "#c49a55" }}>تاجر</span>دروب
      </span>
    </div>
  );
}
