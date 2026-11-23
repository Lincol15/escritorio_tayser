/*
 * ==================================================
 * Proyecto desarrollado por: 4BYTES
 * Equipo de desarrollo de software
 * Proyecto: Tayser - Diseño paramétrico 3D y optimización de cortes
 * Archivo: src/main.tsx
 * Descripción: Punto de entrada de la interfaz React.
 * ==================================================
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// ==================================================
// 4BYTES - Equipo de desarrollo
// Sección: Montar la aplicación React en el elemento #root
// ==================================================
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
