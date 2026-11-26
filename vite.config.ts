/*
 * Proyecto:    Tayser 1.0.0
 * Archivo:     vite.config.ts
 * Autor:       LRGJ
 * Descripción: Configuración de Vite con React y Tailwind CSS.
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// base './' para que el build cargue por file:// dentro de Electron (sin servidor ni red)
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  build: { outDir: 'dist', chunkSizeWarningLimit: 4000, sourcemap: false },
});
