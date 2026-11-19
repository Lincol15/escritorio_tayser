import { useMemo } from 'react';
import { AlignVerticalJustifyStart, Copy, Eye, EyeOff, RotateCcw, RotateCw, Trash2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { TEMPLATE_MAP } from '../core/templates';
import { buildItem, itemParams } from '../core/items';
import { BOARD_MATERIALS, MATERIALS, REFERENCE_MATERIALS, WALL_MATERIALS } from '../core/materials';
import type { ParamDef, SceneItem } from '../core/types';
import { Btn, NumberField, Row, Section, Select, TextField, Toggle } from './ui';
import PieceEditor from './PieceEditor';
import { fmtLen } from '../core/units';

export default function Inspector() {
  const items = useStore((s) => s.project.items);
  const selectedId = useStore((s) => s.selectedId);
  const selectedPiece = useStore((s) => s.selectedPiece);
  const item = items.find((i) => i.id === selectedId);
  return (
    <aside className="scroll-thin w-80 shrink-0 overflow-y-auto border-l border-line bg-panel">
      {item ? (
        <>
          <ItemInspector item={item} />
          {selectedPiece && <PieceEditor item={item} pieceKey={selectedPiece} />}
        </>
      ) : (
        <ProjectInspector />
      )}
    </aside>
  );
}

function ParamField({ def, value, onChange }: { def: ParamDef; value: unknown; onChange: (v: number | string | boolean) => void }) {
  if (def.type === 'length') return <NumberField value={Number(value)} min={def.min} max={def.max} onChange={onChange} />;
  if (def.type === 'number' || def.type === 'angle')
    return <NumberField length={false} value={Number(value)} min={def.min} max={def.max} step={def.step ?? 1} suffix={def.type === 'angle' ? '°' : ''} onChange={(v) => onChange(def.type === 'number' ? Math.round(v) : v)} />;
  if (def.type === 'boolean') return <Toggle value={value === true || value === 'si'} onChange={onChange} />;
  return <Select value={String(value)} options={def.options ?? []} onChange={onChange} />;
}

function ItemInspector({ item }: { item: SceneItem }) {
  const st = useStore.getState();
  const items = useStore((s) => s.project.items);
  const rotSnap = useStore((s) => s.rotSnap);
  const unit = useStore((s) => s.unit);
  const t = TEMPLATE_MAP[item.templateId];
  const params = itemParams(item);
  const built = buildItem(item);
  const groups = useMemo(() => {
    const g = new Map<string, ParamDef[]>();
    t?.params.forEach((p) => {
      const k = p.group ?? 'Medidas';
      if (!g.has(k)) g.set(k, []);
      g.get(k)!.push(p);
    });
    return [...g.entries()];
  }, [t]);
  const mats = item.category === 'wall' || item.category === 'floor' ? WALL_MATERIALS : item.category === 'reference' ? REFERENCE_MATERIALS : BOARD_MATERIALS;
  const others = items.filter((i) => i.id !== item.id && (i.category === 'module' || i.category === 'reference' || i.category === 'piece'));
  const matOpts = (list: typeof MATERIALS) => list.map((m) => ({ value: m.id, label: m.name }));

  return (
    <>
      <Section title={t?.name ?? 'Elemento'}>
        <Row label="Nombre">
          <TextField value={item.name} onChange={(v) => st.updateItem(item.id, { name: v }, false)} />
        </Row>
        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span>
            Total: {fmtLen(built.size.w, unit)} × {fmtLen(built.size.h, unit)} × {fmtLen(built.size.d, unit)}
          </span>
          <span>{built.pieces.length} piezas</span>
        </div>
        <div className="flex gap-1">
          <Btn size="sm" onClick={() => st.duplicateItem(item.id)} title="Duplicar (Ctrl+D)">
            <Copy size={13} /> Duplicar
          </Btn>
          <Btn size="sm" onClick={() => st.toggleItemHidden(item.id)}>
            {item.hidden ? <EyeOff size={13} /> : <Eye size={13} />} {item.hidden ? 'Mostrar' : 'Ocultar'}
          </Btn>
          <Btn size="sm" variant="danger" onClick={() => st.removeItem(item.id)} title="Eliminar (Supr)">
            <Trash2 size={13} />
          </Btn>
        </div>
        {item.hiddenPieces.length > 0 && (
          <Btn size="sm" variant="ghost" onClick={() => st.showAllPieces(item.id)}>
            Mostrar {item.hiddenPieces.length} pieza(s) oculta(s)
          </Btn>
        )}
      </Section>

      {groups.map(([g, defs]) => (
        <Section key={g} title={g}>
          {defs.map((d) => (
            <Row key={d.key} label={d.label} hint={d.hint}>
              <ParamField def={d} value={params[d.key]} onChange={(v) => st.updateParam(item.id, d.key, v)} />
            </Row>
          ))}
        </Section>
      ))}

      <Section title="Materiales">
        <Row label={item.category === 'module' ? 'Casco / estructura' : 'Material'}>
          <Select value={item.materialId} options={matOpts(mats)} onChange={(v) => st.updateItem(item.id, { materialId: v })} />
        </Row>
        {item.category === 'module' && (
          <>
            <Row label="Puertas / frentes">
              <Select value={item.frontMaterialId} options={matOpts(BOARD_MATERIALS)} onChange={(v) => st.updateItem(item.id, { frontMaterialId: v })} />
            </Row>
            <Row label="Fondos">
              <Select value={item.backMaterialId} options={matOpts(BOARD_MATERIALS)} onChange={(v) => st.updateItem(item.id, { backMaterialId: v })} />
            </Row>
          </>
        )}
      </Section>

      <Section title="Ubicación en escena">
        <Row label="X (izq/der)">
          <NumberField value={item.position[0]} onChange={(v) => st.updateItem(item.id, { position: [v, item.position[1], item.position[2]] })} />
        </Row>
        <Row label="Y (elevación)">
          <NumberField value={item.position[1]} min={-5000} onChange={(v) => st.updateItem(item.id, { position: [item.position[0], v, item.position[2]] })} />
        </Row>
        <Row label="Z (fondo/frente)">
          <NumberField value={item.position[2]} onChange={(v) => st.updateItem(item.id, { position: [item.position[0], item.position[1], v] })} />
        </Row>
        <Row label="Rotación Y">
          <NumberField length={false} value={item.rotationY} suffix="°" onChange={(v) => st.updateItem(item.id, { rotationY: v })} />
        </Row>
        <div className="flex flex-wrap gap-1">
          <Btn size="sm" onClick={() => st.rotateItem(item.id, -90)}>
            <RotateCcw size={13} /> 90°
          </Btn>
          <Btn size="sm" onClick={() => st.rotateItem(item.id, -rotSnap)}>
            <RotateCcw size={13} /> {rotSnap}°
          </Btn>
          <Btn size="sm" onClick={() => st.rotateItem(item.id, rotSnap)}>
            <RotateCw size={13} /> {rotSnap}°
          </Btn>
          <Btn size="sm" onClick={() => st.rotateItem(item.id, 90)}>
            <RotateCw size={13} /> 90°
          </Btn>
        </div>
        {item.category !== 'wall' && item.category !== 'floor' && (
          <>
            <Btn size="sm" className="w-full" onClick={() => st.alignToWall(item.id)}>
              <AlignVerticalJustifyStart size={13} /> Alinear contra la pared más cercana
            </Btn>
            {others.length > 0 && (
              <div className="grid grid-cols-[1fr_auto_auto] gap-1">
                <select id="nextto" className="field" defaultValue={others[0].id}>
                  {others.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
                <Btn size="sm" title="Pegar a la izquierda del elemento elegido" onClick={() => st.placeNextTo(item.id, (document.getElementById('nextto') as HTMLSelectElement).value, 'left')}>
                  ◀ Izq
                </Btn>
                <Btn size="sm" title="Pegar a la derecha del elemento elegido" onClick={() => st.placeNextTo(item.id, (document.getElementById('nextto') as HTMLSelectElement).value, 'right')}>
                  Der ▶
                </Btn>
              </div>
            )}
          </>
        )}
      </Section>

      {!useStore.getState().selectedPiece && (
        <div className="px-3 py-3 text-[11px] text-slate-500">Haz clic sobre una pieza en el visor 3D (o en la lista del proyecto) para editar sus cantos, veta y cortes especiales.</div>
      )}
    </>
  );
}

function ProjectInspector() {
  const p = useStore((s) => s.project);
  const st = useStore.getState();
  return (
    <>
      <Section title="Proyecto">
        <Row label="Nombre">
          <TextField value={p.name} onChange={(v) => st.updateProject({ name: v })} />
        </Row>
        <Row label="Cliente">
          <TextField value={p.client} onChange={(v) => st.updateProject({ client: v })} />
        </Row>
        <label className="block text-xs text-slate-400">
          Notas
          <textarea className="field mt-1 h-16! w-full py-1" value={p.notes} onChange={(e) => st.updateProject({ notes: e.target.value })} />
        </label>
      </Section>
      <Section title="Tablero y sierra">
        <Row label="Largo del tablero">
          <NumberField value={p.sheet.length} min={300} onChange={(v) => st.setSheet({ length: v })} />
        </Row>
        <Row label="Ancho del tablero">
          <NumberField value={p.sheet.width} min={300} onChange={(v) => st.setSheet({ width: v })} />
        </Row>
        <Row label="Espesor de sierra">
          <NumberField value={p.sheet.kerf} min={0} max={10} onChange={(v) => st.setSheet({ kerf: v })} />
        </Row>
        <Row label="Refilado de bordes">
          <NumberField value={p.sheet.trim} min={0} max={50} onChange={(v) => st.setSheet({ trim: v })} />
        </Row>
        <Row label="Descontar canto">
          <Toggle value={p.settings.discountEdges} onChange={(v) => st.setSettings({ discountEdges: v })} />
        </Row>
      </Section>
      <div className="space-y-2 px-3 py-3 text-[11px] leading-relaxed text-slate-500">
        <p>
          <b className="text-slate-300">Flujo sugerido:</b> 1) inserta paredes y módulos del catálogo · 2) ajusta medidas en este panel · 3) revisa <b>Despiece y cortes</b> · 4) exporta PDF/CSV · 5) muestra la <b>Vista cliente</b>.
        </p>
        <p>Los campos numéricos aceptan expresiones: <code>2440/3-4</code>, <code>23 1/2</code>, flechas ↑↓ (Shift ×10).</p>
      </div>
    </>
  );
}
