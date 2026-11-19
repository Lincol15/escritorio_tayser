# Tayser — Diseño paramétrico 3D, despiece y optimización de tableros (100% offline)

Aplicación de escritorio (Electron + Vite + React + TypeScript + Three.js) para carpintería en melamina, madera y pino.
No usa CDNs, APIs ni cuentas: el proceso principal **bloquea toda petición de red externa** y las texturas se generan por código.

## Comandos

```bash
npm install          # una sola vez (requiere internet solo para descargar dependencias)
npm run dev          # Vite + Electron en modo desarrollo
npm run dev:web      # solo en el navegador (http://127.0.0.1:5173)
npm run build        # chequeo de tipos + build de producción en dist/
npm start            # abre Electron con el build de dist/ (offline)
npm run dist         # instalador Windows (NSIS + portable) en release/
```

## Estructura

```
tayser/
├─ electron/
│  ├─ main.cjs            # ventana, bloqueo de red, IPC de archivos (.tayser, PDF, CSV, PNG)
│  └─ preload.cjs         # puente seguro window.tayser
├─ src/
│  ├─ core/               # lógica pura (sin React)
│  │  ├─ types.ts         # modelos de dominio (mm internos)
│  │  ├─ units.ts         # mm/cm/in, fracciones, evaluador de expresiones
│  │  ├─ materials.ts     # catálogo de materiales
│  │  ├─ templates.ts     # generadores paramétricos (bajo, alto, cajonera, clóset, escritorio, estante, pieza, pared, piso, referencias)
│  │  ├─ items.ts         # motor paramétrico: ítem → piezas resueltas (+ overrides)
│  │  ├─ calculators.ts   # 6 calculadoras de taller
│  │  ├─ cutlist.ts       # despiece agrupado por material con tapacantos
│  │  ├─ optimizer.ts     # MaxRects + Guillotina con sierra, refilado y veta
│  │  ├─ export.ts        # PDF (jsPDF + autotable) y CSV
│  │  ├─ persistence.ts   # .tayser por IPC + respaldo IndexedDB
│  │  ├─ homography.ts    # perspectiva foto ↔ pared real
│  │  ├─ roomPlanner.ts   # sugerencia de distribución + conversión a escena 3D
│  │  └─ presets.ts       # cocina de ejemplo, proyecto vacío
│  ├─ three/              # texturas procedurales, geometría de cortes especiales, materiales
│  ├─ store/useStore.ts   # Zustand (escena, selección, deshacer/rehacer)
│  └─ components/         # TopBar, LeftPanel, Inspector, PieceEditor, Viewer3D, ViewerOverlay,
│                         # CutListView, SheetSvg, CalculatorsView, ClientView, RoomPlanner
└─ index.html             # CSP restrictiva (sin orígenes externos)
```

## Módulos

- **Build 3D**: catálogo, paredes con vano, multi-mueble, mover/rotar con imán de 5/15/45/90°, alinear contra la pared, pegar a izq./der., ocultar módulos o piezas, cotas 3D, vistas Frontal/Superior/Lateral/Isométrica, pasos de armado animados, captura PNG y pantalla completa.
- **Cortes especiales por pieza**: radios por esquina, diagonales, biseles con grados, calados rectangulares o circulares, espigas y piezas cilíndricas o cónicas. Se ven en 3D y aparecen en las observaciones del despiece.
- **Despiece y cortes**: códigos, cantidades, medidas de corte (opción de descontar el canto), tapacantos L1/L2/A1/A2 y metros por grosor. El optimizador respeta la veta y muestra cada tablero con su aprovechamiento.
- **Calculadoras**: gavetas, repisas (sistema 32), frentes, manijas, bisagras y conversor.
- **Vista cliente**: visor limpio con iluminación cuidada, cambio de acabados en vivo y dimensiones totales.
- **Foto del ambiente**: subes la foto, marcas las 4 esquinas de la pared y sus medidas reales. Luego marcas puertas y ventanas (o mides sobre la foto) y eliges los muebles. Tayser propone dónde va cada uno con sus medidas: respeta el giro de las puertas, los alféizares y los espacios de circulación. El resultado se ve en planta, encima de la foto, y puede enviarse a Build 3D.

Atajos: Supr eliminar · Ctrl+D duplicar · Ctrl+Z/Y deshacer/rehacer · Ctrl+S guardar · 1-4 vistas · G mover · R rotar · Esc soltar selección.
