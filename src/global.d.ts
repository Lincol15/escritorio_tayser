/*
 * ==================================================
 * Proyecto desarrollado por: 4BYTES
 * Equipo de desarrollo de software
 * Proyecto: Tayser - Diseño paramétrico 3D y optimización de cortes
 * Archivo: src/global.d.ts
 * Descripción: Tipos globales del puente window.tayser.
 * ==================================================
 */
export {};

// ==================================================
// 4BYTES - Equipo de desarrollo
// Sección: Declaración del puente window.tayser
// ==================================================
declare global {
  interface TayserBridge {
    isElectron: true;
    saveProject(args: { content: string; filePath: string | null; saveAs: boolean; defaultName: string }): Promise<string | null>;
    openProject(): Promise<{ filePath: string; content: string } | null>;
    saveFile(args: { defaultName: string; data: Uint8Array | string; filters: { name: string; extensions: string[] }[] }): Promise<string | null>;
  }
  interface Window {
    tayser?: TayserBridge;
  }
}
