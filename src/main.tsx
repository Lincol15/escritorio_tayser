/*
 * Proyecto:    Tayser 1.0.0
 * Archivo:     src/main.tsx
 * Autor:       LRGJ
 * Descripción: Punto de entrada de React.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
