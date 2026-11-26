/*
 * Proyecto:    Tayser 1.0.0
 * Archivo:     src/components/Inspector.tsx
 * Autores:     LWYC, RCO, GDMS, JDAP
 * Descripción: Panel derecho: propiedades del mueble o del proyecto.
 */
import { useMemo } from 'react';
import { AlignVerticalJustifyStart, Copy, Eye, EyeOff, RotateCcw, RotateCw, Trash2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { WRGJ_TEMPLATE_MAP } from '../core/templates';
import { wrgjBuildItem, wrgjItemParams } from '../core/items';
import { WRGJ_BOARD_MATERIALS, WRGJ_MATERIALS, WRGJ_REFERENCE_MATERIALS, WRGJ_WALL_MATERIALS } from '../core/materials';
import type { WRGJParamDef, WRGJSceneItem } from '../core/types';
import { WRGJBtn, WRGJNumberField, WRGJRow, WRGJSection, WRGJSelect, WRGJTextField, WRGJToggle } from './ui';
import WRGJPieceEditor from './PieceEditor';
import { wrgjFmtLen } from '../core/units';

export default function WRGJInspector() {
  const items = useStore((s) => s.project.items);
  const selectedId = useStore((s) => s.selectedId);
  const selectedPiece = useStore((s) => s.selectedPiece);
  const item = items.find((i) => i.id === selectedId);
  return (
    <aside className="scroll-thin w-80 shrink-0 overflow-y-auto border-l border-line bg-panel">
      {item ? (
        <>
          <WRGJItemInspector item={item} />
          {selectedPiece && <WRGJPieceEditor item={item} pieceKey={selectedPiece} />}
        </>
      ) : (
        <WRGJProjectInspector />
      )}
    </aside>
  );
}

function WRGJParamField({ def, value, onChange }: { def: WRGJParamDef; value: unknown; onChange: (v: number | string | boolean) => void }) {
  if (def.type === 'length') return <WRGJNumberField value={Number(value)} min={def.min} max={def.max} onChange={onChange} />;
  if (def.type === 'number' || def.type === 'angle')
    return <WRGJNumberField length={false} value={Number(value)} min={def.min} max={def.max} step={def.step ?? 1} suffix={def.type === 'angle' ? '°' : ''} onChange={(v) => onChange(def.type === 'number' ? Math.round(v) : v)} />;
  if (def.type === 'boolean') return <WRGJToggle value={value === true || value === 'si'} onChange={onChange} />;
  return <WRGJSelect value={String(value)} options={def.options ?? []} onChange={onChange} />;
}

function WRGJItemInspector({ item }: { item: WRGJSceneItem }) {
  const st = useStore.getState();
  const items = useStore((s) => s.project.items);
  const rotSnap = useStore((s) => s.rotSnap);
  const unit = useStore((s) => s.unit);
  const t = WRGJ_TEMPLATE_MAP[item.templateId];
  const params = wrgjItemParams(item);
  const built = wrgjBuildItem(item);
  const groups = useMemo(() => {
    const g = new Map<string, WRGJParamDef[]>();
    t?.params.forEach((p) => {
      const k = p.group ?? 'Medidas';
      if (!g.has(k)) g.set(k, []);
      g.get(k)!.push(p);
    });
    return [...g.entries()];
  }, [t]);
  const mats = item.category === 'wall' || item.category === 'floor' ? WRGJ_WALL_MATERIALS : item.category === 'reference' ? WRGJ_REFERENCE_MATERIALS : WRGJ_BOARD_MATERIALS;
  const others = items.filter((i) => i.id !== item.id && (i.category === 'module' || i.category === 'reference' || i.category === 'piece'));
  const matOpts = (list: typeof WRGJ_MATERIALS) => list.map((m) => ({ value: m.id, label: m.name }));

  return (
    <>
      <WRGJSection title={t?.name ?? 'Elemento'}>
        <WRGJRow label="Nombre">
          <WRGJTextField value={item.name} onChange={(v) => st.updateItem(item.id, { name: v }, false)} />
        </WRGJRow>
        <div className="flex items-center justify-between text-[11px] text-zinc-500">
          <span>
            Total: {wrgjFmtLen(built.size.w, unit)} × {wrgjFmtLen(built.size.h, unit)} × {wrgjFmtLen(built.size.d, unit)}
          </span>
          <span>{built.pieces.length} piezas</span>
        </div>
        <div className="flex gap-1">
          <WRGJBtn size="sm" onClick={() => st.duplicateItem(item.id)} title="Duplicar (Ctrl+D)">
            <Copy size={13} /> Duplicar
          </WRGJBtn>
          <WRGJBtn size="sm" onClick={() => st.toggleItemHidden(item.id)}>
            {item.hidden ? <EyeOff size={13} /> : <Eye size={13} />} {item.hidden ? 'Mostrar' : 'Ocultar'}
          </WRGJBtn>
          <WRGJBtn size="sm" variant="danger" onClick={() => st.removeItem(item.id)} title="Eliminar (Supr)">
            <Trash2 size={13} />
          </WRGJBtn>
        </div>
        {item.hiddenPieces.length > 0 && (
          <WRGJBtn size="sm" variant="ghost" onClick={() => st.showAllPieces(item.id)}>
            Mostrar {item.hiddenPieces.length} pieza(s) oculta(s)
          </WRGJBtn>
        )}
      </WRGJSection>

      {groups.map(([g, defs]) => (
        <WRGJSection key={g} title={g}>
          {defs.map((d) => (
            <WRGJRow key={d.key} label={d.label} hint={d.hint}>
              <WRGJParamField def={d} value={params[d.key]} onChange={(v) => st.updateParam(item.id, d.key, v)} />
            </WRGJRow>
          ))}
        </WRGJSection>
      ))}

      <WRGJSection title="Materiales">
        <WRGJRow label={item.category === 'module' ? 'Casco / estructura' : 'Material'}>
          <WRGJSelect value={item.materialId} options={matOpts(mats)} onChange={(v) => st.updateItem(item.id, { materialId: v })} />
        </WRGJRow>
        {item.category === 'module' && (
          <>
            <WRGJRow label="Puertas / frentes">
              <WRGJSelect value={item.frontMaterialId} options={matOpts(WRGJ_BOARD_MATERIALS)} onChange={(v) => st.updateItem(item.id, { frontMaterialId: v })} />
            </WRGJRow>
            <WRGJRow label="Fondos">
              <WRGJSelect value={item.backMaterialId} options={matOpts(WRGJ_BOARD_MATERIALS)} onChange={(v) => st.updateItem(item.id, { backMaterialId: v })} />
            </WRGJRow>
          </>
        )}
      </WRGJSection>

      <WRGJSection title="Ubicación en escena">
        <WRGJRow label="X (izq/der)">
          <WRGJNumberField value={item.position[0]} onChange={(v) => st.updateItem(item.id, { position: [v, item.position[1], item.position[2]] })} />
        </WRGJRow>
        <WRGJRow label="Y (elevación)">
          <WRGJNumberField value={item.position[1]} min={-5000} onChange={(v) => st.updateItem(item.id, { position: [item.position[0], v, item.position[2]] })} />
        </WRGJRow>
        <WRGJRow label="Z (fondo/frente)">
          <WRGJNumberField value={item.position[2]} onChange={(v) => st.updateItem(item.id, { position: [item.position[0], item.position[1], v] })} />
        </WRGJRow>
        <WRGJRow label="Rotación Y">
          <WRGJNumberField length={false} value={item.rotationY} suffix="°" onChange={(v) => st.updateItem(item.id, { rotationY: v })} />
        </WRGJRow>
        <div className="flex flex-wrap gap-1">
          <WRGJBtn size="sm" onClick={() => st.rotateItem(item.id, -90)}>
            <RotateCcw size={13} /> 90°
          </WRGJBtn>
          <WRGJBtn size="sm" onClick={() => st.rotateItem(item.id, -rotSnap)}>
            <RotateCcw size={13} /> {rotSnap}°
          </WRGJBtn>
          <WRGJBtn size="sm" onClick={() => st.rotateItem(item.id, rotSnap)}>
            <RotateCw size={13} /> {rotSnap}°
          </WRGJBtn>
          <WRGJBtn size="sm" onClick={() => st.rotateItem(item.id, 90)}>
            <RotateCw size={13} /> 90°
          </WRGJBtn>
        </div>
        {item.category !== 'wall' && item.category !== 'floor' && (
          <>
            <WRGJBtn size="sm" className="w-full" onClick={() => st.alignToWall(item.id)}>
              <AlignVerticalJustifyStart size={13} /> Alinear contra la pared más cercana
            </WRGJBtn>
            {others.length > 0 && (
              <div className="grid grid-cols-[1fr_auto_auto] gap-1">
                <select id="wrgjNextto" className="field" defaultValue={others[0].id}>
                  {others.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
                <WRGJBtn size="sm" title="Pegar a la izquierda del elemento elegido" onClick={() => st.placeNextTo(item.id, (document.getElementById('wrgjNextto') as HTMLSelectElement).value, 'left')}>
                  ◀ Izq
                </WRGJBtn>
                <WRGJBtn size="sm" title="Pegar a la derecha del elemento elegido" onClick={() => st.placeNextTo(item.id, (document.getElementById('wrgjNextto') as HTMLSelectElement).value, 'right')}>
                  Der ▶
                </WRGJBtn>
              </div>
            )}
          </>
        )}
      </WRGJSection>

      {!useStore.getState().selectedPiece && (
        <div className="px-3 py-3 text-[11px] text-zinc-500">Haz clic sobre una pieza en el visor 3D (o en la lista del proyecto) para editar sus cantos, veta y cortes especiales.</div>
      )}
    </>
  );
}

function WRGJProjectInspector() {
  const p = useStore((s) => s.project);
  const st = useStore.getState();
  return (
    <>
      <WRGJSection title="Proyecto">
        <WRGJRow label="Nombre">
          <WRGJTextField value={p.name} onChange={(v) => st.updateProject({ name: v })} />
        </WRGJRow>
        <WRGJRow label="Cliente">
          <WRGJTextField value={p.client} onChange={(v) => st.updateProject({ client: v })} />
        </WRGJRow>
        <label className="block text-xs text-zinc-600">
          Notas
          <textarea className="field mt-1 h-16! w-full py-1" value={p.notes} onChange={(e) => st.updateProject({ notes: e.target.value })} />
        </label>
      </WRGJSection>
      <WRGJSection title="Tablero y sierra">
        <WRGJRow label="Largo del tablero">
          <WRGJNumberField value={p.sheet.length} min={300} onChange={(v) => st.setSheet({ length: v })} />
        </WRGJRow>
        <WRGJRow label="Ancho del tablero">
          <WRGJNumberField value={p.sheet.width} min={300} onChange={(v) => st.setSheet({ width: v })} />
        </WRGJRow>
        <WRGJRow label="Espesor de sierra">
          <WRGJNumberField value={p.sheet.kerf} min={0} max={10} onChange={(v) => st.setSheet({ kerf: v })} />
        </WRGJRow>
        <WRGJRow label="Refilado de bordes">
          <WRGJNumberField value={p.sheet.trim} min={0} max={50} onChange={(v) => st.setSheet({ trim: v })} />
        </WRGJRow>
        <WRGJRow label="Descontar canto">
          <WRGJToggle value={p.settings.discountEdges} onChange={(v) => st.setSettings({ discountEdges: v })} />
        </WRGJRow>
      </WRGJSection>
      <div className="space-y-2 px-3 py-3 text-[11px] leading-relaxed text-zinc-500">
        <p>
          <b className="text-zinc-700">Flujo sugerido:</b> 1) inserta paredes y módulos del catálogo · 2) ajusta medidas en este panel · 3) revisa <b>Despiece y cortes</b> · 4) exporta PDF/CSV · 5) muestra la <b>Vista cliente</b>.
        </p>
        <p>Los campos numéricos aceptan expresiones: <code>2440/3-4</code>, <code>23 1/2</code>, flechas ↑↓ (Shift ×10).</p>
      </div>
    </>
  );
}
