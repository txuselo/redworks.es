# Diseño: Recuperación de redworks.com.es en Astro + despliegue en Cloudflare Workers

Fecha: 2026-07-14

## Contexto y objetivo

El sitio original en `https://redworks.com.es/` (WordPress + tema "Total" + Elementor) ya
no está accesible / tiene imágenes rotas. El objetivo es reconstruirlo como un sitio
Astro estático, recuperando texto e imágenes desde Wayback Machine, y desplegarlo en
Cloudflare Workers bajo el dominio `redworks.es` (ya presente en la cuenta de Cloudflare
del usuario).

## Alcance del contenido recuperado

Se ha verificado en la CDX API de Wayback Machine (`web.archive.org/cdx/search/cdx`) que
las siguientes 19 rutas tienen snapshots con contenido completo (no solo el interstitial
"One moment, please..." de Cloudflare que aparece en los snapshots más antiguos/pequeños):

- `/` (inicio)
- Servicios: `/telecomunicaciones/`, `/telefonia-voip/`, `/audiovisuales/`,
  `/videoconferencias/`, `/megafonia/`, `/conferencias/`, `/sistemas-informaticos/`,
  `/redes-wifi/`, `/seguridad/`, `/electricidad/`, `/paneles/`,
  `/instalacion-electrica-de-baja-tension/`
- Institucionales: `/quienes-somos/`, `/clientes/`, `/contacto/`
- Legales: `/accesibilidad/`, `/politica-de-privacidad/`, `/terminos-y-condiciones/`

Para cada ruta se usa el snapshot más reciente con tamaño "completo" (~20-32 KB; los
snapshots de ~1.1-5.5 KB son el interstitial y se descartan). Se mantienen los slugs
originales para conservar el SEO/backlinks existentes del dominio.

Las imágenes reales (`wp-content/uploads/...`: logo, fotos de servicios, logos de
clientes/proveedores, iconos) se descargan desde Wayback (`id_`/`im_` flags) y se
autoalojan en `src/assets/` del proyecto Astro, optimizadas vía `astro:assets`.

## Arquitectura técnica

- **Framework**: Astro, adaptador oficial `@astrojs/cloudflare`.
- **Modo de render**: híbrido. Todas las páginas de contenido llevan
  `export const prerender = true` (HTML estático servido como asset). Solo
  `src/pages/api/contact.ts` corre como función SSR en el Worker. El build de Astro
  compila esto a un único Worker que sirve assets estáticos + esa ruta dinámica — el
  patrón actual recomendado por Cloudflare (Workers con static assets), no el producto
  "Pages" (deprecado en favor de Workers).
- **Estilos**: CSS plano con variables CSS (sin framework tipo Tailwind), mobile-first,
  scoped styles de Astro por componente. Paleta extraída del sitio original: azul
  primario `#0971b7`/`#136fb8`, rojo de acento `#be1824`, verde `#61a229` (bloques de
  energía renovable), texto `#333333`.
- **Estructura de componentes**: `Layout` base con `Header` (nav + dropdown de
  servicios) y `Footer` (legales, teléfono `910 52 74 99`, dirección, copyright);
  componentes reutilizables `Hero`, `ServiceCard`, `WhyChooseUs`, `CtaBand`,
  `BrandsStrip` para no duplicar markup entre las 12 páginas de servicio (muy
  homogéneas en estructura: hero + 1-2 bloques descriptivos + 3 tarjetas "por qué
  elegirnos" + CTA + tira de marcas).
- **Contenido estructurado**: los datos de cada página de servicio (título, párrafos,
  imágenes, tarjetas) se guardan como objetos tipados en `src/content/` (content
  collection o módulos `.ts`), no hardcodeados en cada `.astro`, para que el layout se
  reutilice y el contenido sea fácil de editar después.

## Formulario de contacto

Se replican los campos del formulario original de Elementor (nombre, email, teléfono,
mensaje, checkbox de aceptación de política de privacidad) en un `<form>` HTML con
mejora progresiva (funciona sin JS mediante submit normal a `/api/contact`, y con JS
hace `fetch` para mostrar estado sin recargar).

`src/pages/api/contact.ts` valida los campos server-side y envía el email vía la API
de Resend, usando variables de entorno/secrets del Worker:

- `RESEND_API_KEY`
- `CONTACT_TO_EMAIL` (destino)
- `CONTACT_FROM_EMAIL` (remitente verificado en Resend, dominio `redworks.es`)

Estas variables las configura el usuario en el dashboard de Cloudflare al conectar el
Worker; no se commitean secretos al repo. Se documenta esto en el `README.md` del
proyecto.

## Entorno de desarrollo local (Docker-first)

Siguiendo la convención del usuario de no usar runtimes de lenguaje en el host:

- `Dockerfile` multi-stage con un stage `dev` (Node, `astro dev` con hot reload).
- `docker-compose.yml` con bind mount del código (`.:/app`) y volumen anónimo para
  `/app/node_modules`.
- No se incluye un stage `prod` que empaquete un contenedor de producción: el destino
  de despliegue real es el sistema de build de Cloudflare Workers (Workers Builds),
  que no ejecuta esta imagen Docker. Se deja anotado explícitamente para que quede
  claro que no falta nada, no que se haya omitido por descuido.

## Repositorio y despliegue

- Se crea el repositorio `txuselo/redworks.es` en GitHub (no existe todavía) y se hace
  push inicial del proyecto completo.
- `wrangler.toml` configurado para Workers con binding de assets estáticos apuntando al
  `dist/` generado por Astro.
- El usuario conecta el Worker a este repositorio desde el dashboard de Cloudflare
  (Workers Builds) para CI/CD automático en cada push, y asocia el dominio `redworks.es`
  ya presente en su cuenta. Este proyecto no ejecuta `wrangler deploy` ni toca la cuenta
  de Cloudflare del usuario directamente.

## Fuera de alcance

- No se recupera/replica ningún backend de WordPress (admin, plugins, base de datos).
- No se garantiza pixel-perfect con el diseño original de Elementor; se reconstruye el
  contenido real con un diseño nuevo y limpio (decisión explícita del usuario).
- No se gestiona el registro/verificación de dominio en Resend ni la configuración de
  DNS asociada — son pasos manuales del usuario fuera del código.
