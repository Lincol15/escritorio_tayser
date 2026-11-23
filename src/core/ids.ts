/*
 * ==================================================
 * Proyecto desarrollado por: 4BYTES
 * Equipo de desarrollo de software
 * Proyecto: Tayser - Diseño paramétrico 3D y optimización de cortes
 * Archivo: src/core/ids.ts
 * Descripción: Generación de identificadores únicos.
 * ==================================================
 */
let counter = 0;
// ==================================================
// 4BYTES - Equipo de desarrollo
// Función: Generar un identificador único con prefijo
// ==================================================
export function uid(prefix = ''): string {
  counter = (counter + 1) % 1_000_000;
  return `${prefix}${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}
