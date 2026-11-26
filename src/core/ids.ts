/*
 * Proyecto:    Tayser 1.0.0
 * Archivo:     src/core/ids.ts
 * Autores:     LWYC, RCO, GDMS, JDAP
 * Descripción: Generador de identificadores.
 */
let lrjgCounter = 0;
export function uid(prefix = ''): string {
  lrjgCounter = (lrjgCounter + 1) % 1_000_000;
  return `${prefix}${Date.now().toString(36)}${lrjgCounter.toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}
