# 🧊 Mi Refri Inteligente

Una app web para que tu nevera deje de ser un cementerio de comida olvidada.

Sabes qué tienes, qué se va a vencer y qué puedes cocinar **antes** de comprar más.
Todo funciona en el navegador, sin backend ni cuentas: tus datos se quedan en tu dispositivo.

![Estado](https://img.shields.io/badge/estado-listo%20para%20usar-1E4E39) ![Stack](https://img.shields.io/badge/stack-HTML%20%2B%20CSS%20%2B%20JS-F2DFB8) ![Dependencias](https://img.shields.io/badge/dependencias-0-A97742)

---

## ✨ Qué hace

| Vista | Para qué sirve |
| --- | --- |
| **Inicio** | Resumen del día: productos, valor en comida, lo que se vence y recetas posibles. |
| **Mi nevera** | Inventario con cantidades, fecha de vencimiento, filtros, búsqueda y semáforo de frescura. |
| **Cocinar** | 16 recetas cruzadas con tu inventario real. Te dice qué tienes, qué falta y descuenta los ingredientes al cocinar. |
| **Compras** | Lista manual + sugerencias inteligentes según lo que se acabó y lo que consumes seguido. |
| **Impacto** | Dinero rescatado, comida desperdiciada, CO₂ evitado, gráfica semanal e historial. |

### Detalles que la hacen útil

- 🚦 **Semáforo de frescura**: verde (fresco), ámbar (≤ 3 días) y rojo (vencido).
- 🍳 **Cocina y descuenta**: al marcar una receta como cocinada, resta los ingredientes del inventario y registra el ahorro.
- 🛒 **Sugerencias con criterio**: básicos que se acabaron, básicos con poca cantidad y productos que consumes seguido.
- 💰 **Valor de la comida**: estima cuánto dinero tienes en la nevera y cuánto has rescatado.
- 🌱 **Impacto ambiental**: estimación de CO₂ evitado a partir del valor rescatado.
- 🌙 **Tema claro/oscuro**, atajos de vencimiento (3, 7, 15, 30 días, 6 meses) y precios sugeridos por producto.
- 📥 **Exportar / importar** tus datos en JSON y restaurar la demo cuando quieras.
- 📱 **Responsive** con barra de navegación inferior en móvil y manifiesto PWA instalable.

---

## 🚀 Cómo usarlo

No hay build ni dependencias. Elige lo que prefieras:

```bash
# Opción 1: abrir directamente
open index.html          # macOS
xdg-open index.html      # Linux

# Opción 2: servidor local (recomendado para el manifiesto PWA)
python3 -m http.server 4173
# → http://localhost:4173
```

Si usas VS Code, la extensión **Live Server** también funciona.

La app arranca con **datos de demostración** (25 productos, historial de un mes y lista de compras) para que veas cómo se comporta. Puedes vaciarlo desde **Impacto → Ajustes → Vaciar**.

---

## 🗂️ Estructura

```
mi-refri-inteligente/
├── index.html              # estructura de las 5 vistas y los modales
├── manifest.webmanifest    # instalación como PWA
├── css/
│   └── styles.css          # sistema de diseño, temas y responsive
├── js/
│   ├── data.js             # catálogo de ~65 alimentos, 16 recetas y consejos
│   ├── store.js            # estado, localStorage, dominio y estadísticas
│   └── app.js              # renderizado, eventos y modales
└── assets/
    ├── icon.svg            # icono de la app
    ├── icon-192.png
    └── icon-512.png
```

### Separación de responsabilidades

- **`data.js`** — contenido puro: catálogo (`CATALOG`), recetas (`RECIPES`) y tips. Añadir un alimento o una receta es editar solo este archivo.
- **`store.js`** — toda la lógica: fechas, vencimientos, salud de la nevera, cruce recetas/inventario, historia, estadísticas, import/export.
- **`app.js`** — solo presentación: pinta las vistas, escucha eventos y muestra toasts.

No hay frameworks ni librerías: HTML semántico, CSS moderno y JavaScript vanilla.

---

## 🧠 Cómo se calcula lo importante

**Salud de la nevera** (`healthScore`): empieza en 100 y resta 16 por producto vencido, 7 por producto a ≤ 2 días y 3 por producto a ≤ 4 días. Suma 4 si tienes más de 12 productos (despensa variada). Se acota entre 0 y 100.

**Aprovechamiento**: de todo lo que salió de la nevera en 30 días, el porcentaje que se consumió en lugar de descartarse.

**CO₂ evitado**: estimación de `savedValue / 4 × 2.5 kg`, una aproximación didáctica — no es un cálculo de huella real.

**Cruce de recetas**: una receta es *lista* cuando tienes todos los ingredientes en las cantidades necesarias. Si te falta cantidad de alguno, aparece como *casi lista* y marca el ingrediente con la cantidad disponible.

---

## 🛠️ Personalizar

**Agregar un alimento** — en `js/data.js`:

```js
{ id: 'tofu', name: 'Tofu', emoji: '🧊', category: 'Otros', unit: 'g', shelf: 7, price: 3.20 }
```

**Agregar una receta** — en `js/data.js`, usando los `id` del catálogo:

```js
{
  id: 'tofu-salteado',
  name: 'Tofu salteado',
  emoji: '🍳',
  tone: 'green',           // green | amber | rose | blue | lilac
  description: '...',
  time: 15,
  servings: 2,
  difficulty: 'Fácil',
  tags: ['vegetariano'],
  ingredients: [{ id: 'tofu', use: 200 }, { id: 'pimiento', use: 1 }],
  steps: ['...'],
  tip: '...',
}
```

La app detecta automáticamente el nuevo contenido: no hay que tocar nada más.

---

## 📌 Notas

- Los datos se guardan en `localStorage` con la clave `mi-refri-inteligente.v1`. Si borras los datos del navegador, se pierden.
- Las fechas de vencimiento son estimaciones de vida útil por tipo de producto; ajústalas a tu realidad.
- La app no necesita conexión, salvo las tipografías de Google Fonts (con fallback a fuentes del sistema).

---

Hecho para que nada se pierda. 🥬
