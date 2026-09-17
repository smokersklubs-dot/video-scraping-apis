/** Petit schéma isométrique indiquant W / D / H. */
export function DimensionDiagram() {
  return (
    <svg className="dim-diagram" viewBox="0 0 160 120" aria-hidden="true">
      <g fill="none" stroke="#1F2A36" strokeWidth="1.5" strokeLinejoin="round">
        <path d="M30 45 L90 45 L90 95 L30 95 Z" fill="#FFFFFF" />
        <path d="M30 45 L60 25 L120 25 L90 45 Z" fill="#E6EBF0" />
        <path d="M90 45 L120 25 L120 75 L90 95 Z" fill="#D5DCE3" />
      </g>
      <g stroke="#FF6A00" strokeWidth="1.2" fill="none">
        <path d="M30 104 L90 104" />
        <path d="M22 45 L22 95" />
        <path d="M128 25 L128 75" transform="translate(0 0)" />
        <path d="M97 101 L127 81" />
      </g>
      <g fontFamily="DM Sans, sans-serif" fontSize="9" fill="#1F2A36" fontWeight="700">
        <text x="60" y="114" textAnchor="middle">
          W
        </text>
        <text x="14" y="73" textAnchor="middle">
          H
        </text>
        <text x="120" y="100" textAnchor="middle">
          D
        </text>
      </g>
    </svg>
  );
}
