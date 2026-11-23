/*
 * ==================================================
 * Proyecto desarrollado por: 4BYTES
 * Equipo de desarrollo de software
 * Proyecto: Tayser - Diseño paramétrico 3D y optimización de cortes
 * Archivo: vite.config.ts
 * Descripción: Configuración de Vite: compilación de la interfaz para Electron.
 * ==================================================
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// ==================================================
// 4BYTES - Equipo de desarrollo
// Sección: Configuración de Vite: base relativa, plugins y servidor local
// ==================================================
// base './' para que el build cargue por file:// dentro de Electron (sin servidor ni red)
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  build: { outDir: 'dist', chunkSizeWarningLimit: 4000, sourcemap: false },
});
