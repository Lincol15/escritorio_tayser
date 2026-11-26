/*
 * Proyecto:    Tayser 1.0.0
 * Archivo:     src/main.tsx
 * Autores:     LWYC, RCO, GDMS, JDAP
 * Descripción: Punto de entrada de React.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import WRGJApp from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WRGJApp />
  </StrictMode>,
);
