/*
 * Proyecto:    Tayser 1.0.0
 * Archivo:     src/core/presets.ts
 * Autores:     LWYC, RCO, GDMS, JDAP
 * Descripción: Proyecto vacío y cocina de ejemplo.
 */
// Escenas prearmadas (offline)
import type { WRGJProject, WRGJSceneItem } from './types';
import { wrgjCreateItem } from './items';
import { wrgjUid } from './ids';

export function wrgjKitchenPreset(): WRGJSceneItem[] {
  const T = 150;
  const items: WRGJSceneItem[] = [
    wrgjCreateItem('floor', { name: 'Piso cocina', params: { ancho: 3800, profundidad: 2600 }, position: [1700, 0, 1100] }),
    wrgjCreateItem('wall', { name: 'Pared cocina', params: { largo: 3800, alto: 2500, grosor: T }, position: [1700, 0, -T / 2], materialId: 'pared-blanca' }),
  ];
  // muebles bajos: cajonera 600 + bajo 800 + bajo 800 (lavadero)
  const bd = 560 + 18;
  items.push(wrgjCreateItem('drawer-unit', { name: 'Cajonera 600', params: { ancho: 600 }, position: [300, 0, bd / 2] }));
  items.push(wrgjCreateItem('base-cabinet', { name: 'Bajo 800', params: { ancho: 800 }, position: [600 + 400, 0, bd / 2] }));
  items.push(wrgjCreateItem('base-cabinet', { name: 'Bajo lavadero 800', params: { ancho: 800, repisas: 0 }, position: [1400 + 400, 0, bd / 2] }));
  items.push(wrgjCreateItem('reference', { name: 'Cocina', params: { tipo: 'cocina', ancho: 600, alto: 870, profundidad: 600 }, position: [2200 + 300, 0, 300] }));
  items.push(wrgjCreateItem('reference', { name: 'Refrigerador', params: { tipo: 'refrigerador', ancho: 700, alto: 1800, profundidad: 700 }, position: [2800 + 360, 0, 350] }));
  items.push(wrgjCreateItem('reference', { name: 'Mesón', params: { tipo: 'meson', ancho: 2800, alto: 40, profundidad: 600 }, position: [1400, 870, 300] }));
  // alacenas
  const wd = 330 + 18;
  items.push(wrgjCreateItem('wall-cabinet', { name: 'Alacena 600', params: { ancho: 600 }, position: [300, 1450, wd / 2] }));
  items.push(wrgjCreateItem('wall-cabinet', { name: 'Alacena 800', params: { ancho: 800 }, position: [1000, 1450, wd / 2] }));
  items.push(wrgjCreateItem('wall-cabinet', { name: 'Alacena 800', params: { ancho: 800 }, position: [1800, 1450, wd / 2] }));
  return items;
}

export function wrgjEmptyProject(name = 'Proyecto sin título', items: WRGJSceneItem[] = []): WRGJProject {
  const now = new Date().toISOString();
  return {
    format: 'tayser',
    version: 1,
    id: wrgjUid('pr'),
    name,
    client: '',
    notes: '',
    createdAt: now,
    updatedAt: now,
    items,
    sheet: { length: 2440, width: 1220, kerf: 4, trim: 10, algorithm: 'auto' },
    settings: { discountEdges: false, edgeWastePct: 10 },
  };
}
