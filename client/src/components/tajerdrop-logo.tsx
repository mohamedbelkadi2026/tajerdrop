/**
 * Logo TajerDrop.
 *
 * Le T porte la marque : sa barre reste droite, sa hampe se termine en goutte.
 * Une seule lettre dit donc les deux moities du nom — Tajer et Drop — sans
 * pictogramme a cote. C'est ce qui rend la marque reconnaissable reduite a un
 * favicon, la ou un symbole separe du texte disparait.
 *
 * Dessine en SVG, pas importe en image : net du favicon 32 px au hero plein
 * ecran, et il suit la charte sans qu'on reexporte de fichier.
 */
export function TajerDropMark({
  className = "",
  size = 40,
  onDark = false,
}: { className?: string; size?: number; onDark?: boolean }) {
  const stem = onDark ? "#ffffff" : "#1d4ed8";
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      {/* Barre du T */}
      <rect x="8" y="7" width="32" height="7.5" rx="3" fill={stem} />
      {/* Hampe, qui s'affine vers le bas pour amener la goutte */}
      <path d="M20.5 14.5h7v13.5h-7z" fill={stem} />
      {/* Goutte terminale, en orange : le seul point de couleur d'accent,
          la ou l'oeil arrive en fin de lettre. */}
      <path
        d="M24 26c0 0 8 8.6 8 13.4C32 43.6 28.4 46 24 46s-8-2.4-8-6.6C16 34.6 24 26 24 26z"
        fill="#FF6B35"
      />
      {/* Reflet : sans lui la goutte parait plate a grande taille. */}
      <ellipse cx="21" cy="37.5" rx="1.9" ry="2.7" fill="#fff" opacity="0.35" />
    </svg>
  );
}

export function TajerDropLogo({ light = false, size = 34 }: { light?: boolean; size?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <TajerDropMark size={size} onDark={light} />
      <span
        className="text-xl font-extrabold tracking-tight"
        style={{ color: light ? "#fff" : "#123a8a" }}
      >
        Tajer<span style={{ color: "#FF6B35" }}>Drop</span>
      </span>
    </div>
  );
}
