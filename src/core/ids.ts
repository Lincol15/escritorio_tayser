/*
 * Proyecto:    Tayser 1.0.0
 * Archivo:     src/core/ids.ts
 * Autores:     LWYC, RCO, GDMS, JDAP
 * Descripción: Generador de identificadores.
 */
let wrgjCounter = 0;
export function wrgjUid(prefix = ''): string {
  wrgjCounter = (wrgjCounter + 1) % 1_000_000;
  return `${prefix}${Date.now().toString(36)}${wrgjCounter.toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}
