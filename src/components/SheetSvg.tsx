/*
 * Proyecto:    Tayser 1.0.0
 * Archivo:     src/components/SheetSvg.tsx
 * Autores:     LWYC, RCO, GDMS, JDAP
 * Descripción: Dibujo de cada tablero con sus piezas.
 */
import type { WRGJGroupOptimization, WRGJPackedSheet } from '../core/optimizer';
import { wrgjColorForCode } from '../core/export';
import { wrgjFmtLen } from '../core/units';
import type { WRGJUnit } from '../core/types';

export default function WRGJSheetSvg({ opt, sheet, index, unit }: { opt: WRGJGroupOptimization; sheet: WRGJPackedSheet; index: number; unit: WRGJUnit }) {
  const L = opt.sheetLength;
  const W = opt.sheetWidth;
  const pad = 60;
  const fs = Math.max(L, W) / 70;
  return (
    <div className="rounded-lg border border-line bg-panel2 p-2">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-semibold text-zinc-800">
          Tablero {index + 1}/{opt.sheets.length}
          <span className="ml-2 font-normal text-zinc-500">
            {wrgjFmtLen(L, unit)} × {wrgjFmtLen(W, unit)} · {sheet.placements.length} piezas
          </span>
        </span>
        <span className={sheet.utilization > 0.75 ? 'text-emerald-700' : sheet.utilization > 0.5 ? 'text-amber-700' : 'text-red-700'}>
          {(sheet.utilization * 100).toFixed(1)} % aprovechado · desperdicio {(100 - sheet.utilization * 100).toFixed(1)} %
        </span>
      </div>
      <svg viewBox={`${-pad} ${-pad} ${L + pad * 2} ${W + pad * 2}`} className="w-full">
        <defs>
          <pattern id={`waste-${opt.key}-${index}`} width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="40" stroke="#c9cec8" strokeWidth="6" />
          </pattern>
        </defs>
        <rect x={0} y={0} width={L} height={W} fill={`url(#waste-${opt.key}-${index})`} stroke="#5c635d" strokeWidth={4} />
        <rect x={opt.trim} y={opt.trim} width={L - 2 * opt.trim} height={W - 2 * opt.trim} fill="none" stroke="#8a908a" strokeDasharray="20 12" strokeWidth={2} />
        {sheet.placements.map((p) => {
          const [r, g, b] = wrgjColorForCode(p.code);
          const small = Math.min(p.w, p.h);
          const f = Math.min(fs * 1.3, small / 3.2);
          return (
            <g key={p.uid}>
              <rect x={p.x} y={p.y} width={p.w} height={p.h} fill={`rgb(${r},${g},${b})`} stroke="#18181b" strokeWidth={3} />
              {p.grain && (
                <line x1={p.x + p.w * 0.15} x2={p.x + p.w * 0.85} y1={p.y + p.h * 0.82} y2={p.y + p.h * 0.82} stroke="#0f172a55" strokeWidth={Math.max(2, f / 6)} markerEnd="" strokeDasharray={`${f} ${f / 2}`} />
              )}
              {small > 40 && (
                <>
                  <text x={p.x + p.w / 2} y={p.y + p.h / 2} fontSize={f} fontWeight="700" textAnchor="middle" fill="#18181b">
                    {p.code}
                  </text>
                  <text x={p.x + p.w / 2} y={p.y + p.h / 2 + f * 1.05} fontSize={f * 0.72} textAnchor="middle" fill="#27272a">
                    {wrgjFmtLen(p.w, unit, false)} × {wrgjFmtLen(p.h, unit, false)}
                    {p.rotated ? ' ⟲' : ''}
                  </text>
                </>
              )}
              <title>
                {p.code} · {p.name} · {wrgjFmtLen(p.w, unit)} × {wrgjFmtLen(p.h, unit)}
                {p.grain ? ' · con veta' : ''}
                {p.rotated ? ' · rotada 90°' : ''}
              </title>
            </g>
          );
        })}
        <text x={L / 2} y={-pad / 3} fontSize={fs * 1.2} textAnchor="middle" fill="#5c635d">
          {wrgjFmtLen(L, unit)} — veta del tablero ⟷
        </text>
        <text x={-pad / 2.5} y={W / 2} fontSize={fs * 1.2} textAnchor="middle" fill="#5c635d" transform={`rotate(-90 ${-pad / 2.5} ${W / 2})`}>
          {wrgjFmtLen(W, unit)}
        </text>
      </svg>
    </div>
  );
}
