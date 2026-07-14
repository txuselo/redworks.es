# Redworks.es

Sitio de Redworks Solutions reconstruido en Astro a partir de contenido e imágenes recuperadas (el sitio original
en WordPress/Elementor dejó de estar accesible). Desplegado en Cloudflare Workers.

## Desarrollo local

Todo corre en Docker — no se necesita Node.js instalado en el host.

```bash
docker compose up
```

Abre http://localhost:4321.

**Importante:** tras modificar `package.json` o el `Dockerfile`, ejecuta `docker compose build` antes de volver a
levantar/ejecutar comandos — de lo contrario los cambios de dependencias se pierden en cada contenedor efímero.

## Tests

```bash
docker compose run --rm app npm run test
```

## Build de producción

```bash
docker compose run --rm app npm run build
```

## Despliegue en Cloudflare Workers

Este repositorio está pensado para conectarse a **Cloudflare Workers Builds** (Workers con assets estáticos, no el
producto "Pages", deprecado). Pasos manuales en el dashboard de Cloudflare:

1. Crear un Worker nuevo y conectarlo a este repositorio de GitHub (Workers Builds → Git integration).
2. Comando de build: `npm run build`. Directorio de salida de assets: `dist`.
3. Configurar estos secrets del Worker (Settings → Variables and Secrets):
   - `RESEND_API_KEY` — API key de [Resend](https://resend.com), usada por el formulario de contacto.
   - `CONTACT_TO_EMAIL` — email donde llegan los mensajes del formulario.
   - `CONTACT_FROM_EMAIL` — remitente verificado en Resend sobre el dominio `redworks.es`.
4. Asociar el dominio personalizado `redworks.es` (ya presente en la cuenta de Cloudflare) al Worker.

## Estructura de contenido

- `src/content/services/*.yaml` — las 11 páginas de servicio de detalle, extraídas de snapshots reales de Wayback
  Machine (ver `scripts/services-manifest.mjs` y `scripts/fetch-services.mjs`). Las imágenes vienen de un backup
  privado de WordPress (`txuselo/redworks-web`), no de Wayback — Wayback nunca archivó los binarios de este
  dominio, solo el HTML.
- `src/content/pages/*.md` — páginas de contenido único escritas a mano: quiénes somos, clientes, telecomunicaciones
  (página hub), y las legales (accesibilidad, política de privacidad, términos y condiciones).

## Origen de las imágenes

Ver `docs/superpowers/plans/2026-07-14-redworks-astro-recovery.md` (Tarea 5) para el detalle completo de dónde
viene cada imagen recuperada.
