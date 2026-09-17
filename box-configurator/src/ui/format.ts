const mmFormatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });
const intFormatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const areaFormatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 });

export function fmtMm(value: number): string {
  return `${mmFormatter.format(value)} mm`;
}

export function fmtInt(value: number): string {
  return intFormatter.format(value);
}

export function fmtM2(value: number): string {
  return `${areaFormatter.format(value)} m²`;
}

export function fmtDims(width: number, depth: number, height: number): string {
  return `${mmFormatter.format(width)} × ${mmFormatter.format(depth)} × ${mmFormatter.format(height)} mm`;
}
