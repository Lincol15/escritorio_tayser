# Guía de instalación de Tayser

Esta guía explica cómo instalar Tayser en Windows, desde cero. Internet solo hace falta una vez, para descargar las dependencias; después el programa funciona sin conexión.

[← Volver a la documentación](README.md)

---

## Contenido

- [Opción A: usar el instalador (.exe)](#opción-a-usar-el-instalador-exe)
- [Opción B: instalar desde el código fuente](#opción-b-instalar-desde-el-código-fuente)
- [Crear el instalador .exe](#crear-el-instalador-exe)
- [Actualizar a una nueva versión](#actualizar-a-una-nueva-versión)
- [Desinstalar](#desinstalar)
- [Solución de problemas](#solución-de-problemas)

---

## Requisitos

| Requisito | Detalle |
| --- | --- |
| Sistema operativo | Windows 10 u 11 de 64 bits |
| Node.js | 20.19 o superior (recomendado **22 LTS**); incluye npm |
| Git | Para descargar el código (opcional: también puedes bajar el ZIP) |
| Espacio en disco | Unos 2 GB para dependencias e instalador |
| Internet | Solo para `npm install` |

> Si solo vas a **usar** Tayser y alguien ya te pasó el instalador `.exe`, no necesitas Node.js ni Git: ve a la opción A.

---

## Opción A: usar el instalador (.exe)

1. Consigue el archivo `Tayser Setup 1.0.0.exe` (está en la carpeta `release/` de quien lo generó).
2. Haz doble clic sobre él.
3. Si Windows muestra *"Windows protegió su PC"*, pulsa **Más información** → **Ejecutar de todas formas**. Aparece porque el instalador no está firmado digitalmente.
4. Elige la carpeta de instalación y pulsa **Instalar**.
5. Abre **Tayser** desde el menú Inicio o el acceso directo del escritorio.

Los archivos `.tayser` quedan asociados al programa y se abren con doble clic.

**Versión portable:** en `release/` también hay un `.exe` portable que se ejecuta sin instalar, por ejemplo desde una memoria USB.

---

## Opción B: instalar desde el código fuente

### 1. Instalar Node.js

1. Descarga la versión **LTS** desde [nodejs.org](https://nodejs.org).
2. Ejecuta el instalador con las opciones por defecto.
3. Abre una terminal nueva (PowerShell o Símbolo del sistema) y comprueba:

```bash
node -v    # debe mostrar v20.19 o superior, por ejemplo v22.20.0
npm -v     # por ejemplo 10.9.3
```

### 2. Instalar Git (opcional)

Descárgalo desde [git-scm.com](https://git-scm.com) e instálalo con las opciones por defecto. Comprueba con:

```bash
git --version
```

### 3. Descargar el proyecto

Con Git:

```bash
git clone https://github.com/Lincol15/escritorio_tayser.git
cd escritorio_tayser
```

Sin Git: en GitHub pulsa **Code → Download ZIP**, descomprime el archivo y abre una terminal dentro de la carpeta.

### 4. Instalar las dependencias

```bash
npm install
```

Tarda unos minutos la primera vez: descarga Electron, React, Three.js y el resto de librerías en la carpeta `node_modules/`.

### 5. Abrir Tayser

```bash
npm run dev
```

Se abre la ventana de Tayser. Mientras la terminal siga abierta, cualquier cambio en el código se ve al instante. Para cerrar, cierra la ventana o pulsa `Ctrl+C` en la terminal.

**Solo en el navegador** (sin ventana de escritorio):

```bash
npm run dev:web
```

y abre http://127.0.0.1:5173. En el navegador, guardar y exportar se hacen como descargas.

### 6. Compilar y abrir sin conexión

```bash
npm run build   # revisa los tipos y compila en dist/
npm start       # abre Tayser usando la versión compilada
```

---

## Crear el instalador .exe

```bash
npm run dist
```

Este comando compila el proyecto y genera en la carpeta `release/`:

| Archivo | Para qué sirve |
| --- | --- |
| `Tayser Setup 1.0.0.exe` | Instalador normal (permite elegir carpeta) |
| `Tayser 1.0.0.exe` | Versión portable, sin instalar |

Ese `.exe` es el que compartes con otras personas; ellas no necesitan Node.js.

---

## Actualizar a una nueva versión

Si instalaste desde el código:

```bash
git pull
npm install
npm run dev
```

Si usas el instalador, ejecuta el nuevo `Tayser Setup` encima del anterior. Tus proyectos `.tayser` no se borran.

---

## Desinstalar

- **Instalador:** Configuración de Windows → Aplicaciones → Tayser → Desinstalar.
- **Desde código:** borra la carpeta del proyecto.
- **Portable:** borra el `.exe`.

---

## Solución de problemas

| Problema | Solución |
| --- | --- |
| `'npm' no se reconoce como un comando` | Node.js no está instalado o la terminal se abrió antes de instalarlo. Cierra y abre la terminal de nuevo. |
| `npm install` falla con errores de red | Revisa tu conexión a Internet o el proxy. Luego borra `node_modules/` y ejecuta `npm install` otra vez. |
| Error de versión de Node (`engine`, `Unsupported`) | Actualiza Node.js a 22 LTS. |
| En PowerShell: *"la ejecución de scripts está deshabilitada"* | Usa el Símbolo del sistema (cmd) o ejecuta una vez: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`. |
| `npm run dev` se queda esperando y no abre la ventana | El puerto 5173 está ocupado. Cierra otras terminales con Vite abierto e inténtalo de nuevo. |
| La ventana se abre en blanco con `npm start` | Falta compilar: ejecuta `npm run build` antes de `npm start`. |
| Windows bloquea el instalador | Pulsa **Más información → Ejecutar de todas formas** (el instalador no está firmado). |
| El 3D va lento | Actualiza el controlador de la tarjeta gráfica y cierra otros programas pesados. |

---

[← Volver a la documentación](README.md)
