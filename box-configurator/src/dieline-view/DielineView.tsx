import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent, type WheelEvent } from 'react';
import type { DielineModel } from '../engine/dieline/dieline-model';
import { DIELINE_COLORS, polylinePath, segmentsPath } from '../engine/dieline/svg';

export interface DielineLayers {
  readonly bleed: boolean;
  readonly safe: boolean;
  readonly glue: boolean;
  readonly labels: boolean;
}

export const DEFAULT_DIELINE_LAYERS: DielineLayers = { bleed: true, safe: true, glue: true, labels: true };

interface DielineViewProps {
  readonly model: DielineModel;
  readonly layers: DielineLayers;
}

interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

const MARGIN_RATIO = 0.06;
const MIN_ZOOM_WIDTH_MM = 5;

function fitViewBox(model: DielineModel): ViewBox {
  const margin = Math.max(model.extent.width, model.extent.height) * MARGIN_RATIO;
  // Le contenu est dessiné avec y inversé : il occupe [−maxY, −minY].
  return {
    x: model.extent.minX - margin,
    y: -model.extent.maxY - margin,
    w: model.extent.width + 2 * margin,
    h: model.extent.height + 2 * margin,
  };
}

/**
 * Patron 2D interactif (SVG React) : zoom molette / pincement, déplacement à la souris.
 * Les tracés sont les mêmes polygones que la 3D (aucune image).
 */
export function DielineView({ model, layers }: DielineViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewBox, setViewBox] = useState<ViewBox>(() => fitViewBox(model));
  const dragging = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setViewBox(fitViewBox(model));
  }, [model]);

  const toUser = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const rect = svg.getBoundingClientRect();
      return {
        x: viewBox.x + ((clientX - rect.left) / rect.width) * viewBox.w,
        y: viewBox.y + ((clientY - rect.top) / rect.height) * viewBox.h,
      };
    },
    [viewBox],
  );

  const onWheel = useCallback(
    (e: WheelEvent<SVGSVGElement>) => {
      e.preventDefault();
      const factor = Math.exp(e.deltaY * 0.0015);
      const m = toUser(e.clientX, e.clientY);
      setViewBox((vb) => {
        const w = Math.max(MIN_ZOOM_WIDTH_MM, vb.w * factor);
        const ratio = w / vb.w;
        return { x: m.x - (m.x - vb.x) * ratio, y: m.y - (m.y - vb.y) * ratio, w, h: vb.h * ratio };
      });
    },
    [toUser],
  );

  const onPointerDown = useCallback((e: PointerEvent<SVGSVGElement>) => {
    dragging.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: PointerEvent<SVGSVGElement>) => {
    const start = dragging.current;
    const svg = svgRef.current;
    if (!start || !svg) return;
    const rect = svg.getBoundingClientRect();
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    dragging.current = { x: e.clientX, y: e.clientY };
    setViewBox((vb) => ({ ...vb, x: vb.x - (dx / rect.width) * vb.w, y: vb.y - (dy / rect.height) * vb.h }));
  }, []);

  const endDrag = useCallback((e: PointerEvent<SVGSVGElement>) => {
    dragging.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  }, []);

  const paths = useMemo(
    () => ({
      cut: model.cut.map((loop) => polylinePath(loop, true)).join(' '),
      open: model.openCuts.map((chain) => polylinePath(chain, false)).join(' '),
      crease: segmentsPath(model.crease),
      bleed: model.bleedOutline.map((loop) => polylinePath(loop, true)).join(' '),
      safe: model.safeZones.map((z) => polylinePath(z.polygon, true)).join(' '),
      glue: model.glueZones.map((z) => polylinePath(z.polygon, true)).join(' '),
    }),
    [model],
  );

  const fontSize = Math.min(8, Math.max(2.5, model.blank.width / 60));

  return (
    <div className="dieline-view">
      <svg
        ref={svgRef}
        className="dieline-svg"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        preserveAspectRatio="xMidYMid meet"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
        role="img"
        aria-label="Patron de la boîte"
      >
        <defs>
          <pattern id="dieline-glue-hatch" patternUnits="userSpaceOnUse" width="3" height="3" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="3" stroke={DIELINE_COLORS.glue} strokeWidth="0.6" />
          </pattern>
        </defs>
        <g transform="matrix(1 0 0 -1 0 0)">
          {layers.bleed ? (
            <path d={paths.bleed} fill="none" stroke={DIELINE_COLORS.bleed} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          ) : null}
          <path d={paths.cut} fill="#FFFFFF" stroke="none" />
          {layers.glue ? <path d={paths.glue} fill="url(#dieline-glue-hatch)" stroke="none" /> : null}
          {layers.safe ? (
            <path d={paths.safe} fill="none" stroke={DIELINE_COLORS.safe} strokeWidth={1} strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
          ) : null}
          <path d={paths.crease} fill="none" stroke={DIELINE_COLORS.crease} strokeWidth={1.4} strokeDasharray="7 4" vectorEffect="non-scaling-stroke" />
          <path d={paths.cut} fill="none" stroke={DIELINE_COLORS.cut} strokeWidth={1.8} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {paths.open ? <path d={paths.open} fill="none" stroke="#E11D48" strokeWidth={2} vectorEffect="non-scaling-stroke" /> : null}
          {layers.labels
            ? model.panels.map((p) => (
                <text
                  key={p.id}
                  transform={`translate(${p.center.x} ${p.center.y}) scale(1 -1)${p.bounds.width < p.bounds.height * 0.45 ? ' rotate(-90)' : ''}`}
                  fontSize={fontSize}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={DIELINE_COLORS.label}
                  className="dieline-label"
                >
                  {p.label}
                </text>
              ))
            : null}
        </g>
      </svg>
      <button type="button" className="dieline-fit" onClick={() => setViewBox(fitViewBox(model))} aria-label="Recadrer le patron">
        Recadrer
      </button>
    </div>
  );
}
