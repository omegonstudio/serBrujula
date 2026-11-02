# SER BRÚJULA — Design System

## Alcance de este documento

1. **Análisis verificado** de la referencia visual YAMI (solo hechos del código).
2. **Sistema visual propio** de Ser Brújula, inspirado en el *craft* de esa referencia, no en su marca.

YAMI no se copia como base de código, arquitectura, componentes ni dependencias.

Fuente inspeccionada: `/home/titin/Documentos/omegon/00-OMEGON/00-proyectos/YAMI/00 - codigo/front/yamila-velay-landing/` (`tailwind.config.ts`, `src/index.css`, secciones de página).

---

## Parte A — Análisis de referencia YAMI (verificado)

### Paleta (tokens Tailwind)

| Token | Hex | Rol observado |
|-------|-----|---------------|
| primary | `#AD6CD9` | Violeta principal |
| primary.dark | `#7B51A6` | Violeta oscuro |
| primary.light / muted | `#C2D4C8` | Mint-gris |
| secondary | `#0D1440` | Navy |
| secondary.dark | `#646262` | Gris |
| accent | `#ECC165` | Dorado |
| light | `#F8F8F8` | Fondo claro |
| (gradientes) | `#D3BAE4` | Lavanda |

Gradientes: `cosmic-gradient` (violeta→dorado), `card-gradient`, `courses-gradient`, `higthlight-gradient`, `star-pattern`.

### Tipografía

- Familia única: **Josefin Sans** (300–700) vía Google Fonts.
- Body e headings con la misma familia; headings `font-semibold`.

### Jerarquía y espaciado

- Hero H1: `text-4xl md:text-7xl`, highlight con gradient clip.
- H2 sección: `text-3xl md:text-4xl` + underline `w-20 h-1`.
- Secciones: `py-20`, contenedor `max-w-7xl`, paddings `px-4 sm:px-6 lg:px-8`.
- Radius base: `0.5rem`.

### Composición

Landing one-page: Navbar fixed → Hero full-bleed oscuro (shader) → About (fondo mint) → Sessions (fondo claro) → Courses (navy) → Footer. Encabezados de sección centrados con barra decorativa.

### Imágenes

Foto about circular con borde suave; cards de cursos con `object-cover` y hover `scale-105`; logo en nav.

### Botones y cards

- CTA primario violeta; CTA acento dorado sobre navy; outline violeta.
- Cards con sombra y hover (`shadow-xl`, a veces `-translate-y-2`).
- Nav: transparente → `bg-secondary/90 backdrop-blur` al scroll; links blancos → hover dorado.

### Responsive

Mobile-first; nav hamburger bajo `md`; grids 1 → 2 → 3 columnas.

### Motion

Transiciones 300–500ms; hover lift/scale; Framer Motion casi solo en modal; shader WebGL en hero (Three.js). Keyframes `float` / `pulse-slow` definidos pero poco usados en páginas.

### Personalidad observada

Wellness “cósmico”, místico, premium suave: violeta + navy + dorado. No corporativo frío.

### Stack YAMI (no reutilizar)

Vite, React Router, shadcn/Radix, Strapi, Calendly, Three.js, framer-motion.

---

## Parte B — Sistema visual propio SER BRÚJULA

### Intención

Misma calidad de craft (jerarquía clara, hero fuerte, secciones respiradas, nav cuidadosa, CTAs legibles, motion sobrio), con identidad **natural, terrestre, orientada** (Artemisa / brújula / cuerpo), no cósmica-violeta.

### Principios de UI

- Mobile-first, accesible (contraste, foco, labels).
- Un composition por viewport de hero: marca, un titular, una frase, un grupo CTA, una imagen dominante full-bleed (sin collage ni cards en hero).
- Sin estética spa genérica ni plantilla ecommerce ruidosa.
- Cards solo cuando contienen interacción (producto, formulario); el resto fluye en secciones.
- No clonar paleta ni Josefin de YAMI.

### Paleta propuesta (tokens)

Nombres CSS / Tailwind a implementar en Fase C:

| Token | Hex propuesto | Uso |
|-------|---------------|-----|
| `--color-forest` | `#2F4A3C` | Primario profundo (naturaleza) |
| `--color-sage` | `#7A9A86` | Primario suave / hovers |
| `--color-clay` | `#C4A484` | Acento tierra (CTAs secundarios) |
| `--color-sand` | `#F3EDE4` | Fondos cálidos de sección |
| `--color-ink` | `#1C1A17` | Texto principal |
| `--color-stone` | `#6B6560` | Texto secundario |
| `--color-cream` | `#FAF8F5` | Fondo página |
| `--color-line` | `#E4DDD4` | Bordes sutiles |
| `--color-error` | `#A63D3D` | Errores |
| `--color-success` | `#3D6B4F` | Éxito |

Gradientes: solo sutiles (sand→cream, forest con opacity), no rainbow cósmico.

### Tipografía propuesta

| Rol | Familia | Notas |
|-----|---------|-------|
| Display / títulos | **Fraunces** (o similar serif orgánica variable) | Personalidad, no Inter/Roboto |
| UI / cuerpo | **Source Sans 3** | Legibilidad admin y tienda |

Pesos: display 500–700; body 400–600. Evitar una sola familia geométrica tipo Josefin para no parecer la marca de referencia.

### Espaciado y layout

Heredar ritmos observados en YAMI (no valores de marca):

- Sección: `py-16 md:py-24`
- Contenedor: `max-w-6xl` / `max-w-7xl`, padding horizontal progresivo
- Stack de encabezado de sección: título + regla corta en `--color-clay` o `--color-sage` + párrafo `max-w-2xl`
- Radius: `0.5rem` controles; `0.75rem` media si hace falta

### Navegación

- Fixed; fondo transparente sobre hero → fondo cream/forest translúcido + blur al scroll.
- Links con hover en sage/clay; CTA único destacado.
- Mobile: menú accesible (button + panel), no depender solo de iconos sin label.

### Botones

| Variante | Estilo |
|----------|--------|
| Primary | Fondo forest, texto cream, hover sage |
| Accent | Fondo clay, texto ink |
| Outline | Borde forest, texto forest, hover sand |
| Ghost | Texto ink/stone, hover sand |

Tamaños: `sm` / `md` / `lg`; focus ring visible.

### Tienda (integrada a la marca)

- Listado limpio, filtros discretos, fichas con foto generosa y tipografía de marca.
- Carrito y checkout sobrios; mismos botones y formularios del sistema.
- Evitar badges tipo “marketplace” (pills de oferta, contadores de rating falsos).

### Admin

- Misma tipografía UI; densidad mayor; contraste claro.
- Priorizar claridad sobre ornamentación (sin hero full-bleed en admin).

### Motion (2–3 intenciones)

1. Transición de nav al scroll (opacity/blur).
2. Fade/slide suave de entrada en secciones (respetando `prefers-reduced-motion`).
3. Hover contenido en media de producto (scale leve o sombra).

Sin shaders WebGL ni dependencia Three.js salvo decisión explícita posterior.

### Responsive

Breakpoints estándar Tailwind. Tipografía hero escalada; grids de productos 1 → 2 → 3; formularios de una columna en mobile.

### Accesibilidad

- Contraste AA mínimo en texto y botones.
- Focus visible; skip link al contenido.
- Imágenes con `alt` significativo; decorative con alt vacío.
- Formularios con errores asociados al campo.

### Inventario de componentes base (Fase C)

`Button`, `Input`, `Textarea`, `Select`, `Label`, `Link`, `Container`, `SectionHeading`, `Navbar`, `Footer`, `ProductCard`, `EmptyState`, `Spinner`/`Skeleton`, `Alert`, `Badge` (uso mínimo).

---

## Diferencia clave referencia vs Ser Brújula

| Aspecto | YAMI (referencia) | Ser Brújula |
|---------|-------------------|-------------|
| Mood | Cósmico / místico | Natural / orientación / cuerpo |
| Color | Violeta + dorado + navy | Forest + sage + clay + sand |
| Tipo | Josefin Sans única | Fraunces + Source Sans 3 |
| Hero | Shader WebGL | Imagen/atmósfera real, full-bleed |
| Craft | Jerarquía, nav, CTAs, spacing | Conservar el nivel de craft |
