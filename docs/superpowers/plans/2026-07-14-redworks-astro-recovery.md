# Redworks.es Astro Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `redworks.com.es` (broken WordPress/Elementor site) as a new Astro site with content and images recovered from Wayback Machine, and prepare it for deployment to Cloudflare Workers under the `redworks.es` domain.

**Architecture:** Astro with `@astrojs/cloudflare` in hybrid mode — every content page is prerendered to static HTML at build time (`export const prerender = true`), and only `/api/contact` runs as a live function in the Worker. Two Astro content collections (`services`, a `data` collection populated by an automated Wayback-scraping script; `pages`, a `content`/Markdown collection with hand-authored real copy) drive a small set of reusable templates, so the 12 near-identical service pages share one dynamic route instead of 12 hand-built files.

**Tech Stack:** Astro 5, `@astrojs/cloudflare`, TypeScript, plain CSS (no framework), Vitest for unit tests, `cheerio` for HTML scraping, Resend (via raw `fetch`, no SDK) for the contact form email, Docker for all local dev/build commands, Wrangler for the Cloudflare Workers config.

## Global Constraints

- All commands run via `docker compose run --rm app <command>` (or `exec` once the service is up) — the host has no Node.js runtime. (Playwright in Task 12 is the one documented exception and runs on the host.)
- Every content page must be prerendered (`export const prerender = true`); only `src/pages/api/contact.ts` is SSR.
- Keep the original URL slugs (`/electricidad/`, `/telefonia-voip/`, etc.) exactly as they were on `redworks.com.es` to preserve existing SEO/backlinks.
- No secrets committed to the repo. `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL` are Cloudflare Worker secrets configured later by the user, not in code.
- Recovered content that is factually broken in the original (the "tres décadas" vs "fundada en 2019" contradiction on the homepage, the `info@87.98.229.92` IP-address email bug in the privacy policy, the unfilled `NOMBREWEB`/`Titular:` placeholder template used for "Términos y condiciones") is corrected, not faithfully reproduced — per explicit user decision for the "Términos y condiciones" case, and as an obvious-bug fix for the other two.
- Real recovered copy is written in the language it was published in (Spanish).

---

## Content manifest (Wayback Machine)

This is the exact set of snapshots verified during design to contain full content (not the Cloudflare "One moment, please..." interstitial that many snapshots of this domain return). Tasks that fetch pages use these exact `https://web.archive.org/web/{timestamp}id_/{url}` URLs — do not re-resolve them from the CDX API, they were hand-verified.

| slug | original URL | timestamp |
|---|---|---|
| (home) | `https://redworks.com.es/` | `20260416143413` |
| telecomunicaciones | `https://redworks.com.es/telecomunicaciones/` | `20260416161407` |
| telefonia-voip | `https://redworks.com.es/telefonia-voip/` | `20260511054809` |
| audiovisuales | `https://redworks.com.es/audiovisuales/` | `20260511054445` |
| videoconferencias | `https://redworks.com.es/videoconferencias/` | `20250912223833` |
| megafonia | `https://redworks.com.es/megafonia/` | `20260416135221` |
| conferencias | `https://redworks.com.es/conferencias/` | `20260416150433` |
| sistemas-informaticos | `https://redworks.com.es/sistemas-informaticos/` | `20251119050208` |
| redes-wifi | `https://redworks.com.es/redes-wifi/` | `20260511061430` |
| seguridad | `https://redworks.com.es/seguridad/` | `20251119042754` |
| electricidad | `https://redworks.com.es/electricidad/` | `20260416150555` |
| paneles | `https://redworks.com.es/paneles/` | `20260416150132` |
| instalacion-electrica-de-baja-tension | `https://redworks.com.es/instalacion-electrica-de-baja-tension/` | `20260416150417` |

`quienes-somos`, `clientes`, `contacto`, `accesibilidad`, `politica-de-privacidad` are hand-authored from real copy already extracted from these snapshots (see each task). `terminos-y-condiciones` is newly written (see Global Constraints).

---

### Task 1: Project scaffold, Docker dev environment, Cloudflare adapter

**Files:**
- Create: `package.json`
- Create: `astro.config.mjs`
- Create: `tsconfig.json`
- Create: `wrangler.toml`
- Create: `Dockerfile`
- Create: `docker-compose.yml`
- Create: `.dockerignore`
- Create: `.gitignore`
- Create: `src/pages/index.astro` (temporary placeholder, replaced in Task 8)
- Create: `public/robots.txt`

**Interfaces:**
- Produces: an `app` Docker Compose service that runs `npm run dev|build|test|extract:*` for every later task.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "redworks-es",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "test": "vitest run",
    "extract:shared": "node scripts/fetch-shared-assets.mjs",
    "extract:services": "node scripts/fetch-services.mjs"
  },
  "dependencies": {
    "astro": "^5.7.0",
    "@astrojs/cloudflare": "^12.2.0"
  },
  "devDependencies": {
    "cheerio": "^1.0.0",
    "vitest": "^3.0.0",
    "yaml": "^2.6.0",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 2: Write `astro.config.mjs`**

```js
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'server',
  adapter: cloudflare({ imageService: 'compile' }),
});
```

- [ ] **Step 3: Write `tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"]
}
```

- [ ] **Step 4: Write `wrangler.toml`**

```toml
name = "redworks-es"
compatibility_date = "2026-07-01"
main = "./dist/_worker.js/index.js"

[assets]
binding = "ASSETS"
directory = "./dist"
```

- [ ] **Step 5: Write `Dockerfile`**

```dockerfile
FROM node:22-alpine AS dev
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
EXPOSE 4321
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

- [ ] **Step 6: Write `docker-compose.yml`**

```yaml
services:
  app:
    build:
      context: .
      target: dev
    ports:
      - "4321:4321"
    volumes:
      - .:/app
      - /app/node_modules
```

- [ ] **Step 7: Write `.dockerignore` and `.gitignore`**

`.dockerignore`:
```
node_modules
dist
.astro
```

`.gitignore`:
```
node_modules
dist
.astro
.env
.wrangler
```

- [ ] **Step 8: Write a placeholder homepage so the build has something to render**

`src/pages/index.astro`:
```astro
---
export const prerender = true;
---
<html lang="es">
  <body>
    <h1>Redworks Solutions</h1>
  </body>
</html>
```

- [ ] **Step 9: Write `public/robots.txt`**

```
User-agent: *
Allow: /

Sitemap: https://redworks.es/sitemap-index.xml
```

- [ ] **Step 10: Build the dev image and install dependencies**

Run: `docker compose build`
Expected: image builds successfully, `npm install` completes with no errors.

- [ ] **Step 11: Verify the production build works**

Run: `docker compose run --rm app npm run build`
Expected: `dist/` is created, ends with `Complete!` and no errors. This confirms the Cloudflare adapter and placeholder page both work end-to-end.

- [ ] **Step 12: Commit**

```bash
git add package.json astro.config.mjs tsconfig.json wrangler.toml Dockerfile docker-compose.yml .dockerignore .gitignore src/pages/index.astro public/robots.txt
git commit -m "Scaffold Astro project with Cloudflare adapter and Docker dev environment"
```

---

### Task 2: Design tokens, base Layout, Header, Footer

**Files:**
- Create: `src/styles/global.css`
- Create: `src/layouts/Layout.astro`
- Create: `src/components/Header.astro`
- Create: `src/components/Footer.astro`
- Test: `src/components/Header.test.ts`, `src/components/Footer.test.ts`

**Interfaces:**
- Produces: `Layout.astro` — props `{ title: string; description: string }`, renders `<slot />` between Header and Footer, imports `global.css`.
- Produces: `NAV_ITEMS` real Spanish nav labels/hrefs, hardcoded in `Header.astro` for now (Task 7 will replace the services sublist with data pulled from the `services` collection once it exists).
- Consumes (Task 7 onward): nothing yet — this task hardcodes the 12 service nav links since the collection doesn't exist until Task 6.

- [ ] **Step 1: Write global design tokens**

`src/styles/global.css`:
```css
:root {
  --color-primary: #0971b7;
  --color-primary-dark: #075686;
  --color-accent: #be1824;
  --color-renewable: #61a229;
  --color-text: #333333;
  --color-text-muted: #666666;
  --color-bg: #ffffff;
  --color-bg-alt: #f4f6f8;
  --font-sans: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --max-width: 1200px;
  --radius: 8px;
}

* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  font-family: var(--font-sans);
  color: var(--color-text);
  background: var(--color-bg);
  line-height: 1.6;
}
h1, h2, h3 { line-height: 1.2; margin: 0 0 0.6em; }
p { margin: 0 0 1em; }
a { color: var(--color-primary); text-decoration: none; }
a:hover { text-decoration: underline; }
img { max-width: 100%; display: block; }
.container {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 0 1.5rem;
}
.button {
  display: inline-block;
  background: var(--color-primary);
  color: #fff;
  padding: 0.75rem 1.5rem;
  border-radius: var(--radius);
  font-weight: 600;
}
.button:hover { background: var(--color-primary-dark); text-decoration: none; }
```

- [ ] **Step 2: Write the Header component**

`src/components/Header.astro`:
```astro
---
const SERVICES = [
  { label: "Telecomunicaciones", href: "/telecomunicaciones/" },
  { label: "Telefonía VoIP", href: "/telefonia-voip/" },
  { label: "Audiovisuales", href: "/audiovisuales/" },
  { label: "Videoconferencias", href: "/videoconferencias/" },
  { label: "Megafonía", href: "/megafonia/" },
  { label: "Sala de conferencias", href: "/conferencias/" },
  { label: "Redes informáticas", href: "/sistemas-informaticos/" },
  { label: "Redes wifi", href: "/redes-wifi/" },
  { label: "Sistema de seguridad", href: "/seguridad/" },
  { label: "Electricidad", href: "/electricidad/" },
  { label: "Paneles solares", href: "/paneles/" },
  { label: "Instalación eléctrica de baja tensión", href: "/instalacion-electrica-de-baja-tension/" },
];
---
<header class="site-header">
  <div class="container bar">
    <a href="/" class="logo">Redworks Solutions</a>
    <nav aria-label="Principal">
      <ul>
        <li class="has-dropdown">
          <span>Servicios</span>
          <ul class="dropdown">
            {SERVICES.map((item) => (
              <li><a href={item.href}>{item.label}</a></li>
            ))}
          </ul>
        </li>
        <li><a href="/clientes/">Clientes</a></li>
        <li><a href="/quienes-somos/">Quiénes somos</a></li>
        <li><a href="/contacto/">Contacto</a></li>
      </ul>
    </nav>
    <a class="phone" href="tel:+34910527499">910 52 74 99</a>
  </div>
</header>
<style>
  .site-header { border-bottom: 1px solid #eee; }
  .bar { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.5rem; gap: 1rem; }
  .logo { font-weight: 700; font-size: 1.25rem; color: var(--color-text); }
  nav ul { display: flex; gap: 1.5rem; list-style: none; margin: 0; padding: 0; }
  nav > ul > li { position: relative; }
  .has-dropdown > span { cursor: default; font-weight: 600; }
  .dropdown {
    display: none;
    position: absolute;
    top: 100%;
    left: 0;
    background: #fff;
    border: 1px solid #eee;
    border-radius: var(--radius);
    padding: 0.5rem 0;
    min-width: 260px;
    flex-direction: column;
    z-index: 10;
  }
  .has-dropdown:hover .dropdown { display: flex; }
  .dropdown li a { display: block; padding: 0.4rem 1rem; }
  .phone { font-weight: 700; white-space: nowrap; }
</style>
```

- [ ] **Step 3: Write the Footer component**

`src/components/Footer.astro`:
```astro
---
const year = new Date().getFullYear();
---
<footer class="site-footer">
  <div class="container footer-grid">
    <div>
      <p><strong>Redworks Solutions</strong></p>
      <p>Calle José Echegaray, 14<br />Edificio A2, planta 2, nave 8</p>
      <p><a href="tel:+34910527499">910 52 74 99</a></p>
    </div>
    <nav aria-label="Legal">
      <ul class="legal-links">
        <li><a href="/accesibilidad/">Accesibilidad</a></li>
        <li><a href="/politica-de-privacidad/">Política de privacidad</a></li>
        <li><a href="/terminos-y-condiciones/">Términos y condiciones</a></li>
      </ul>
    </nav>
  </div>
  <div class="container copyright">
    <p>Copyright {year} Redworks Solutions. Todos los derechos reservados.</p>
  </div>
</footer>
<style>
  .site-footer { background: var(--color-bg-alt); margin-top: 3rem; padding: 2.5rem 0 1rem; }
  .footer-grid { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 2rem; }
  .legal-links { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.4rem; }
  .copyright { margin-top: 1.5rem; font-size: 0.85rem; color: var(--color-text-muted); }
</style>
```

- [ ] **Step 4: Write the Layout component**

`src/layouts/Layout.astro`:
```astro
---
import Header from '../components/Header.astro';
import Footer from '../components/Footer.astro';
import '../styles/global.css';

interface Props {
  title: string;
  description: string;
}
const { title, description } = Astro.props;
---
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="icon" href="/favicon.png" />
  </head>
  <body>
    <Header />
    <main>
      <slot />
    </main>
    <Footer />
  </body>
</html>
```

- [ ] **Step 5: Write failing component tests using the Astro Container API**

`src/components/Header.test.ts`:
```ts
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import Header from './Header.astro';

describe('Header', () => {
  it('renders the phone number and all 12 service links', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Header);

    expect(html).toContain('tel:+34910527499');
    expect(html).toContain('910 52 74 99');
    expect(html).toContain('/electricidad/');
    expect(html).toContain('/instalacion-electrica-de-baja-tension/');
    expect(html).toContain('Quiénes somos');
    expect(html).toContain('Contacto');
  });
});
```

`src/components/Footer.test.ts`:
```ts
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import Footer from './Footer.astro';

describe('Footer', () => {
  it('renders address, phone and the three legal links', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Footer);

    expect(html).toContain('Calle José Echegaray, 14');
    expect(html).toContain('Edificio A2, planta 2, nave 8');
    expect(html).toContain('/accesibilidad/');
    expect(html).toContain('/politica-de-privacidad/');
    expect(html).toContain('/terminos-y-condiciones/');
    expect(html).toMatch(/Copyright \d{4} Redworks Solutions/);
  });
});
```

- [ ] **Step 6: Run the tests to verify they fail for the right reason first (before writing components), then pass**

Run: `docker compose run --rm app npm run test`
Expected: both test files PASS (components were written in Steps 2-4 before the tests in this task; if you are following strict red-green-refactor, write the two test files first, run `npm run test` and confirm they fail with "Cannot find module './Header.astro'", then write Steps 2-4, then re-run and confirm PASS).

- [ ] **Step 7: Commit**

```bash
git add src/styles/global.css src/layouts/Layout.astro src/components/Header.astro src/components/Footer.astro src/components/Header.test.ts src/components/Footer.test.ts
git commit -m "Add design tokens, base Layout, Header and Footer"
```

---

### Task 3: `services` content collection schema

**Files:**
- Create: `src/content/config.ts`
- Test: `src/content/config.test.ts`

**Interfaces:**
- Produces: `serviceSchema` (Zod schema, exported from `src/content/config.ts`) with shape:
  ```ts
  {
    order: number;
    category: 'telecomunicaciones' | 'electricidad';
    navLabel: string;
    title: string;
    metaDescription: string;
    heroImage: ImageFunction; // astro:content image() helper
    heroTitle: string;
    sections: { heading: string; body: string; image?: ImageFunction }[]; // min 1
    whyChooseUs: { icon: string; title: string; body: string }[]; // exactly 3
  }
  ```
- Consumes (Task 6, G): this schema is what `fetch-services.mjs` must produce YAML matching, and what `[slug].astro` reads via `getCollection('services')`.

- [ ] **Step 1: Write the failing schema test**

`src/content/config.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { z } from 'astro:content';

// Mirrors the object shape defineCollection's schema will enforce; kept here
// as a plain-Zod smoke test so it runs under Vitest without spinning up Astro's
// content pipeline.
const serviceEntrySchema = z.object({
  order: z.number(),
  category: z.enum(['telecomunicaciones', 'electricidad']),
  navLabel: z.string(),
  title: z.string(),
  metaDescription: z.string(),
  heroTitle: z.string(),
  sections: z.array(z.object({ heading: z.string(), body: z.string() })).min(1),
  whyChooseUs: z
    .array(z.object({ icon: z.string(), title: z.string(), body: z.string() }))
    .length(3),
});

describe('service entry schema', () => {
  it('accepts a valid electricidad-shaped entry', () => {
    const result = serviceEntrySchema.safeParse({
      order: 10,
      category: 'electricidad',
      navLabel: 'Electricidad',
      title: 'Electricidad y Energías Renovables en Madrid',
      metaDescription: 'Empresa Instaladora de Electricidad y Energías Renovables en Madrid',
      heroTitle: 'Empresa Instaladora de Electricidad y Energías Renovables en Madrid',
      sections: [
        { heading: 'Electricidad', body: 'En Redworks disponemos del mejor equipo...' },
        { heading: 'Energía Renovable', body: 'Comprometidos con la eficiencia energética...' },
      ],
      whyChooseUs: [
        { icon: 'user-tie', title: 'Experiencia y profesionalismo', body: '...' },
        { icon: 'balance-scale', title: 'Compromiso con la sostenibilidad', body: '...' },
        { icon: 'record-vinyl', title: 'Enfoque personalizado', body: '...' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects an entry with only 2 whyChooseUs cards', () => {
    const result = serviceEntrySchema.safeParse({
      order: 1,
      category: 'telecomunicaciones',
      navLabel: 'Telecomunicaciones',
      title: 't',
      metaDescription: 'd',
      heroTitle: 'h',
      sections: [{ heading: 'a', body: 'b' }],
      whyChooseUs: [
        { icon: 'wifi', title: 'a', body: 'b' },
        { icon: 'wifi', title: 'a', body: 'b' },
      ],
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `docker compose run --rm app npm run test`
Expected: FAIL — `src/content/config.ts` does not exist yet, so `astro:content` types are unresolved for the collection (the raw `z` import from `astro:content` still works standalone; if the test errors on the missing collections file instead, that also counts as a legitimate first-run failure).

- [ ] **Step 3: Write `src/content/config.ts`**

```ts
import { defineCollection, z } from 'astro:content';

const services = defineCollection({
  type: 'data',
  schema: ({ image }) =>
    z.object({
      order: z.number(),
      category: z.enum(['telecomunicaciones', 'electricidad']),
      navLabel: z.string(),
      title: z.string(),
      metaDescription: z.string(),
      heroImage: image(),
      heroTitle: z.string(),
      sections: z
        .array(
          z.object({
            heading: z.string(),
            body: z.string(),
            image: image().optional(),
          })
        )
        .min(1),
      whyChooseUs: z
        .array(
          z.object({
            icon: z.string(),
            title: z.string(),
            body: z.string(),
          })
        )
        .length(3),
    }),
});

const pages = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    metaDescription: z.string(),
    heroTitle: z.string(),
  }),
});

export const collections = { services, pages };
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `docker compose run --rm app npm run test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/content/config.ts src/content/config.test.ts
git commit -m "Add services/pages content collection schemas"
```

---

### Task 4: Elementor service-page parser (extraction logic + fixture test)

**Files:**
- Create: `scripts/parse-service-page.mjs`
- Create: `scripts/fixtures/electricidad.html`
- Test: `scripts/parse-service-page.test.mjs`

**Interfaces:**
- Produces: `parseServicePage(html: string): { title, metaDescription, heroImage, heroTitle, sections: {heading, body, imageSrc?}[], whyChooseUs: {icon, title, body}[] }` and `mapIcon(faClass: string): string`, both exported from `scripts/parse-service-page.mjs`.
- Consumes (Task 6): `fetch-services.mjs` imports both functions.

- [ ] **Step 1: Download the real fixture (byte-identical Wayback snapshot)**

Run: `curl -s "https://web.archive.org/web/20260416150555id_/https://redworks.com.es/electricidad/" -o scripts/fixtures/electricidad.html`
Expected: file is created, `wc -c scripts/fixtures/electricidad.html` reports roughly 900,000+ bytes (it's a full page including the accessibility-toolbar plugin markup — that's fine, the parser below only reads the sections it needs).

- [ ] **Step 2: Write the failing test**

`scripts/parse-service-page.test.mjs`:
```js
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseServicePage, mapIcon } from './parse-service-page.mjs';

const fixturePath = fileURLToPath(new URL('./fixtures/electricidad.html', import.meta.url));
const html = readFileSync(fixturePath, 'utf-8');

describe('parseServicePage', () => {
  const result = parseServicePage(html);

  it('extracts the page title without the "| Redworks" suffix', () => {
    expect(result.title).toBe('Electricidad y Energías Renovables en Madrid');
  });

  it('extracts the meta description', () => {
    expect(result.metaDescription).toBe(
      'Empresa Instaladora de Electricidad y Energías Renovables en Madrid ✅Instalación eléctrica de baja tensión, placas y paneles solares ☎️910527499'
    );
  });

  it('extracts the og:image as the hero image', () => {
    expect(result.heroImage).toBe(
      'https://redworks.com.es/wp-content/uploads/2021/10/proyectos-baja-tension-destacada.jpg'
    );
  });

  it('extracts the h1 hero title', () => {
    expect(result.heroTitle).toBe('Empresa Instaladora de Electricidad y Energías Renovables en Madrid');
  });

  it('extracts the two content sections in order, skipping the shared brands heading', () => {
    expect(result.sections).toHaveLength(2);
    expect(result.sections[0].heading).toBe('Electricidad');
    expect(result.sections[0].body).toContain('montaje y mantenimiento de líneas de baja tensión');
    expect(result.sections[1].heading).toBe('Energía Renovable');
    expect(result.sections[1].body).toContain('placas y paneles fotovoltáicos');
    expect(result.sections[1].body).toContain('revisiones y comprobaciones del funcionamiento');
  });

  it('extracts the three "why choose us" cards with mapped icons, in order', () => {
    expect(result.whyChooseUs).toEqual([
      {
        icon: 'user-tie',
        title: 'Experiencia y profesionalismo',
        body: expect.stringContaining('más de 15 años de experiencia en el sector eléctrico'),
      },
      {
        icon: 'balance-scale',
        title: 'Compromiso con la sostenibilidad',
        body: expect.stringContaining('creemos en un futuro más sostenible'),
      },
      {
        icon: 'check-circle',
        title: 'Enfoque personalizado',
        body: expect.stringContaining('diseñar soluciones a medida'),
      },
    ]);
  });
});

describe('mapIcon', () => {
  it('maps known Font Awesome classes to our icon keywords', () => {
    expect(mapIcon('fas fa-user-tie')).toBe('user-tie');
    expect(mapIcon('fas fa-balance-scale')).toBe('balance-scale');
  });

  it('falls back to check-circle for unmapped classes', () => {
    expect(mapIcon('fas fa-record-vinyl')).toBe('check-circle');
    expect(mapIcon('')).toBe('check-circle');
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `docker compose run --rm app npm run test`
Expected: FAIL with "Cannot find module './parse-service-page.mjs'".

- [ ] **Step 4: Write `scripts/parse-service-page.mjs`**

```js
import * as cheerio from 'cheerio';

// Keep this list in exact sync with the keys implemented in src/components/Icon.astro (Task 7) —
// anything else Wayback throws at us (e.g. the real "fa-record-vinyl" on the electricidad page)
// intentionally falls back to 'check-circle' rather than rendering a name with no matching SVG.
const KNOWN_ICONS = ['user-tie', 'balance-scale', 'shield-alt', 'wifi', 'headset', 'sun', 'bolt', 'network-wired'];

export function mapIcon(faClass) {
  const match = /fa-([a-z0-9-]+)/.exec(faClass || '');
  const key = match ? match[1] : '';
  return KNOWN_ICONS.includes(key) ? key : 'check-circle';
}

function collapse(text) {
  return text.replace(/\s+/g, ' ').trim();
}

export function parseServicePage(html) {
  const $ = cheerio.load(html);

  const rawTitle = $('title').first().text().trim();
  const title = rawTitle.replace(/\s*\|\s*Redworks\s*$/, '').trim();
  const metaDescription = ($('meta[name="description"]').attr('content') || '').trim();
  const heroImage = ($('meta[property="og:image"]').attr('content') || '').trim();

  let heroTitle = '';
  const sections = [];
  const whyChooseUs = [];

  $('section.elementor-top-section').each((_, sectionEl) => {
    const section = $(sectionEl);

    const h1 = section.find('h1.elementor-heading-title').first();
    if (h1.length) {
      heroTitle = collapse(h1.text());
      return;
    }

    const h2 = section.find('h2.elementor-heading-title.elementor-size-default').first();
    if (h2.length) {
      const heading = collapse(h2.text());
      if (heading.toUpperCase().includes('TRABAJAMOS CON')) return;
      const bodyParts = section
        .find('.elementor-widget-text-editor .elementor-widget-container')
        .map((__, el) => $(el).text())
        .get();
      const body = collapse(bodyParts.join(' '));
      const imageSrc = section.find('.elementor-widget-image img').first().attr('src') || undefined;
      sections.push({ heading, body, imageSrc });
      return;
    }

    const h2Large = section.find('h2.elementor-heading-title.elementor-size-large').first();
    if (h2Large.length && h2Large.text().includes('Por Qué Elegirnos')) {
      section.find('.elementor-inner-column').each((__, colEl) => {
        const col = $(colEl);
        const h3 = col.find('h3.elementor-heading-title.elementor-size-medium').first();
        if (!h3.length) return;
        const iconClass = col.find('.elementor-widget-icon i').first().attr('class') || '';
        const bodyParts = col
          .find('.elementor-widget-text-editor .elementor-widget-container')
          .map((___, el) => $(el).text())
          .get();
        whyChooseUs.push({
          icon: mapIcon(iconClass),
          title: collapse(h3.text()),
          body: collapse(bodyParts.join(' ')),
        });
      });
    }
  });

  return { title, metaDescription, heroImage, heroTitle, sections, whyChooseUs };
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `docker compose run --rm app npm run test`
Expected: PASS. Note the fixture test intentionally expects `check-circle` (not `record-vinyl`) for the third card — `record-vinyl` is a real Font Awesome class on the original page but isn't in our small hand-drawn icon set (Task 7), so it correctly falls back.

- [ ] **Step 6: Commit**

```bash
git add scripts/parse-service-page.mjs scripts/parse-service-page.test.mjs scripts/fixtures/electricidad.html
git commit -m "Add Elementor service-page parser with fixture test"
```

---

### Task 5: Shared image assets (logo, brand logos, client logos, team photos)

**Files:**
- Create: `scripts/download-image.mjs`
- Create: `scripts/shared-assets-manifest.mjs`
- Create: `scripts/fetch-shared-assets.mjs`

**Interfaces:**
- Produces: `downloadImage(waybackUrl: string, destPath: string): Promise<void>` from `download-image.mjs`, used by both this task and Task 6.
- Produces: on disk, `src/assets/shared/logo.svg`, `logo-white.svg`, `footer-bg.jpg`, `eu-funding-badge.png`, `digitalizador-badge.svg`, `brands/*.png|jpg` (~35 files), `clients/*.png` (18 files), `team/*.jpg` (8 files), `public/favicon-*.png`.

- [ ] **Step 1: Write `scripts/download-image.mjs`**

```js
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export async function downloadImage(waybackUrl, destPath) {
  const res = await fetch(waybackUrl);
  if (!res.ok) {
    throw new Error(`Failed to download ${waybackUrl}: HTTP ${res.status}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  await mkdir(dirname(destPath), { recursive: true });
  await writeFile(destPath, buffer);
}
```

- [ ] **Step 2: Write the shared assets manifest**

`scripts/shared-assets-manifest.mjs`:
```js
const W = 'https://web.archive.org/web/20260416143413id_/';

export const SHARED_ASSETS = [
  // Logo + favicons
  [`${W}https://redworks.com.es/wp-content/uploads/2023/08/redworks-logo.svg`, 'src/assets/shared/logo.svg'],
  [`${W}https://redworks.com.es/wp-content/uploads/2023/08/redworks-logo-blanco.svg`, 'src/assets/shared/logo-white.svg'],
  [`${W}https://redworks.com.es/wp-content/uploads/2020/06/cropped-favicon-32x32.png`, 'public/favicon-32x32.png'],
  [`${W}https://redworks.com.es/wp-content/uploads/2020/06/cropped-favicon-180x180.png`, 'public/favicon-180x180.png'],
  [`${W}https://redworks.com.es/wp-content/uploads/2020/06/cropped-favicon-192x192.png`, 'public/favicon-192x192.png'],

  // Footer background
  [`${W}https://redworks.com.es/wp-content/uploads/2021/02/Footer.jpg`, 'src/assets/shared/footer-bg.jpg'],

  // Team photos (quienes-somos)
  [`${W}https://redworks.com.es/wp-content/uploads/2021/10/Felipe-1.jpg`, 'src/assets/shared/team/felipe.jpg'],
  [`${W}https://redworks.com.es/wp-content/uploads/2021/10/Maria.jpg`, 'src/assets/shared/team/maria.jpg'],
  [`${W}https://redworks.com.es/wp-content/uploads/2021/10/Rocio.jpg`, 'src/assets/shared/team/rocio.jpg'],
  [`${W}https://redworks.com.es/wp-content/uploads/2021/10/Jose-Maria.jpg`, 'src/assets/shared/team/jose-maria.jpg'],
  [`${W}https://redworks.com.es/wp-content/uploads/2021/10/Ibra.jpg`, 'src/assets/shared/team/ibrahim.jpg'],
  [`${W}https://redworks.com.es/wp-content/uploads/2021/10/Angel.jpg`, 'src/assets/shared/team/angel.jpg'],
  [`${W}https://redworks.com.es/wp-content/uploads/2021/10/Chema.jpg`, 'src/assets/shared/team/chema.jpg'],
  [`${W}https://redworks.com.es/wp-content/uploads/2021/10/Javier.jpg`, 'src/assets/shared/team/javier.jpg'],

  // Client logos (used on /clientes/), 200x200 versions
  ...['logs-clientes', ...Array.from({ length: 17 }, (_, i) => `logs-clientes_${String(i + 2).padStart(2, '0')}`)]
    .map((name, i) => [
      `${W}https://redworks.com.es/wp-content/uploads/2021/02/${name}-200x200.png`,
      `src/assets/shared/clients/client-${String(i + 1).padStart(2, '0')}.png`,
    ]),

  // Provider/brand logos (brands strip, shared across all pages), 150x150 versions
  ...[
    'Logo_prov_adder', 'Logo_prov_ADVANTECH', 'Logo_prov_alto', 'Logo_prov_aruba', 'Logo_prov_astatic',
    'Logo_prov_Aten', 'Logo_prov_AXIS', 'Logo_prov_BARIX', 'Logo_prov_Bose', 'Logo_prov_BOSH',
    'Logo_prov_Bowers', 'Logo_prov_cambium', 'Logo_prov_Christie', 'Logo_prov_cisco', 'Logo_prov_CONCERTO',
    'Logo_prov_FERMAX', 'Logo_prov_HIKSON', 'Logo_prov_Hitachi', 'Logo_prov_IPRONET', 'Logo_prov_Kramer',
    'Logo_prov_KTI', 'Logo_prov_lifesize', 'Logo_prov_logitech', 'Logo_prov_Longshine', 'Logo_prov_mackie',
    'Logo_prov_MILESTONE', 'Logo_prov_MOXA', 'Logo_prov_NEC', 'Logo_prov_NUUO', 'Logo_prov_OPTOMA',
    'Logo_prov_PANASONIC', 'Logo_prov_PAXTON', 'Logo_prov_PELCO', 'Logo_prov_POLKAUDIO', 'Logo_prov_polycom',
    'Logo_prov_radvision', 'Logo_prov_ROSSLARE', 'Logo_prov_ruckus', 'Logo_prov_SAMSUNG', 'Logo_prov_SIEMENS',
    'Logo_prov_Ubiquiti', 'Logo_prov_VIVITECK', 'Logo_prov_VOGELS', 'Logo_prov_yamaha', 'Logo_prov-webex',
  ].map((name, i) => [
    `${W}https://redworks.com.es/wp-content/uploads/2021/04/${name}-150x150.png`,
    `src/assets/shared/brands/brand-${String(i + 1).padStart(2, '0')}.png`,
  ]),
  ...['ALTO-PROFESSIONAL', 'ASTATIC', 'BOSE', 'BOWER-WILKINS', 'MACKIE', 'YAMAHA'].map((name, i) => [
    `${W}https://redworks.com.es/wp-content/uploads/2021/03/${name}-150x150.png`,
    `src/assets/shared/brands/brand-audio-${String(i + 1).padStart(2, '0')}.png`,
  ]),
];
```

- [ ] **Step 2: Write `scripts/fetch-shared-assets.mjs`**

```js
import { downloadImage } from './download-image.mjs';
import { SHARED_ASSETS } from './shared-assets-manifest.mjs';

let failures = 0;
for (const [url, dest] of SHARED_ASSETS) {
  try {
    await downloadImage(url, dest);
    console.log(`OK   ${dest}`);
  } catch (err) {
    failures += 1;
    console.error(`FAIL ${dest}: ${err.message}`);
  }
}

if (failures > 0) {
  console.error(`${failures} of ${SHARED_ASSETS.length} shared assets failed to download.`);
  process.exit(1);
}
```

- [ ] **Step 3: Run the download and verify the result**

Run: `docker compose run --rm app node scripts/fetch-shared-assets.mjs`
Expected: every line prints `OK   <path>`, exit code 0. If any URL 404s (a Wayback snapshot can occasionally miss one asset captured at a slightly different time), do not silently skip it — re-run the CDX lookup for that specific file's URL (`https://web.archive.org/cdx/search/cdx?url=redworks.com.es/wp-content/uploads/...&output=json`) to find a timestamp where it was actually captured, and fix that one manifest entry.

Run: `docker compose run --rm app node -e "import('./scripts/shared-assets-manifest.mjs').then(m => console.log(m.SHARED_ASSETS.length))"`
Expected: prints a number (currently 83: 2 logos + 3 favicons + 1 footer bg + 8 team photos + 18 client logos + 51 brand logos).

Run: `find src/assets/shared public/favicon-32x32.png public/favicon-180x180.png public/favicon-192x192.png -type f | wc -l`
Expected: the same number printed above. If it's lower, some downloads silently failed to write, which Step 3's exit-code check should already have caught — investigate before moving on rather than assuming it's fine.

- [ ] **Step 4: Commit the manifest, scripts, and downloaded binary assets**

```bash
git add scripts/download-image.mjs scripts/shared-assets-manifest.mjs scripts/fetch-shared-assets.mjs src/assets/shared public/favicon-32x32.png public/favicon-180x180.png public/favicon-192x192.png
git commit -m "Download and commit shared image assets from Wayback Machine"
```

---

### Task 6: Run the extraction for all 12 service pages

**Files:**
- Create: `scripts/services-manifest.mjs`
- Create: `scripts/fetch-services.mjs`
- Create: `src/content/services/*.yaml` (12 generated files)
- Create: `src/content/services/*/hero.jpg` and `section-*.jpg` (generated images, one subfolder per service)

**Interfaces:**
- Consumes: `parseServicePage`, `mapIcon` (Task 4), `downloadImage` (Task 5).
- Produces: 12 YAML files conforming exactly to the `services` schema from Task 3 — this is what Task 7's dynamic route reads via `getCollection('services')`.

- [ ] **Step 1: Write the services manifest (slug → category → nav order → Wayback URL)**

`scripts/services-manifest.mjs`:
```js
export const SERVICES_MANIFEST = [
  { slug: 'telecomunicaciones', order: 1, category: 'telecomunicaciones', navLabel: 'Telecomunicaciones', timestamp: '20260416161407' },
  { slug: 'telefonia-voip', order: 2, category: 'telecomunicaciones', navLabel: 'Telefonía VoIP', timestamp: '20260511054809' },
  { slug: 'audiovisuales', order: 3, category: 'telecomunicaciones', navLabel: 'Audiovisuales', timestamp: '20260511054445' },
  { slug: 'videoconferencias', order: 4, category: 'telecomunicaciones', navLabel: 'Videoconferencias', timestamp: '20250912223833' },
  { slug: 'megafonia', order: 5, category: 'telecomunicaciones', navLabel: 'Megafonía', timestamp: '20260416135221' },
  { slug: 'conferencias', order: 6, category: 'telecomunicaciones', navLabel: 'Sala de conferencias', timestamp: '20260416150433' },
  { slug: 'sistemas-informaticos', order: 7, category: 'telecomunicaciones', navLabel: 'Redes informáticas', timestamp: '20251119050208' },
  { slug: 'redes-wifi', order: 8, category: 'telecomunicaciones', navLabel: 'Redes wifi', timestamp: '20260511061430' },
  { slug: 'seguridad', order: 9, category: 'telecomunicaciones', navLabel: 'Sistema de seguridad', timestamp: '20251119042754' },
  { slug: 'electricidad', order: 10, category: 'electricidad', navLabel: 'Electricidad', timestamp: '20260416150555' },
  { slug: 'paneles', order: 11, category: 'electricidad', navLabel: 'Paneles solares', timestamp: '20260416150132' },
  { slug: 'instalacion-electrica-de-baja-tension', order: 12, category: 'electricidad', navLabel: 'Instalación eléctrica de baja tensión', timestamp: '20260416150417' },
];
```

- [ ] **Step 2: Write the runner**

`scripts/fetch-services.mjs`:
```js
import { mkdir, writeFile } from 'node:fs/promises';
import { stringify } from 'yaml';
import { parseServicePage } from './parse-service-page.mjs';
import { downloadImage } from './download-image.mjs';
import { SERVICES_MANIFEST } from './services-manifest.mjs';

for (const entry of SERVICES_MANIFEST) {
  const waybackBase = `https://web.archive.org/web/${entry.timestamp}id_/`;
  const originalUrl = `https://redworks.com.es/${entry.slug}/`;
  const snapshotUrl = `${waybackBase}${originalUrl}`;

  console.log(`Fetching ${entry.slug}...`);
  const res = await fetch(snapshotUrl);
  if (!res.ok) throw new Error(`Failed to fetch ${snapshotUrl}: HTTP ${res.status}`);
  const html = await res.text();

  const parsed = parseServicePage(html);
  const dir = `src/content/services/${entry.slug}`;
  await mkdir(dir, { recursive: true });

  await downloadImage(`${waybackBase}${parsed.heroImage}`, `${dir}/hero.jpg`);

  const sections = [];
  for (const [i, section] of parsed.sections.entries()) {
    const sectionData = { heading: section.heading, body: section.body };
    if (section.imageSrc) {
      await downloadImage(`${waybackBase}${section.imageSrc}`, `${dir}/section-${i}.jpg`);
      sectionData.image = `./${entry.slug}/section-${i}.jpg`;
    }
    sections.push(sectionData);
  }

  const yamlData = {
    order: entry.order,
    category: entry.category,
    navLabel: entry.navLabel,
    title: parsed.title,
    metaDescription: parsed.metaDescription,
    heroImage: `./${entry.slug}/hero.jpg`,
    heroTitle: parsed.heroTitle,
    sections,
    whyChooseUs: parsed.whyChooseUs,
  };

  await writeFile(`src/content/services/${entry.slug}.yaml`, stringify(yamlData), 'utf-8');
  console.log(`Wrote src/content/services/${entry.slug}.yaml`);
}
```

- [ ] **Step 3: Run the extraction**

Run: `docker compose run --rm app npm run extract:services`
Expected: 12 lines of `Fetching ...` / `Wrote ...`, no thrown errors.

- [ ] **Step 4: Sanity-check the generated content by hand for one file**

Run: `cat src/content/services/electricidad.yaml`
Expected: `heroTitle` reads "Empresa Instaladora de Electricidad y Energías Renovables en Madrid", `sections` has exactly 2 entries ("Electricidad", "Energía Renovable"), `whyChooseUs` has exactly 3 entries. This must match the values already verified in Task 4's fixture test — if it doesn't, the live snapshot at this timestamp drifted from the fixture; re-run Step 1 of Task 4 with the current timestamp and diff.

- [ ] **Step 5: Verify the build accepts all 12 generated files against the Task 3 schema**

Run: `docker compose run --rm app npm run build`
Expected: build succeeds with no `[content-schema]` errors. If a specific field fails validation (e.g. a page had 4 why-choose-us cards instead of 3, or a missing image), fix that one YAML file or re-run the extraction for that slug — do not loosen the schema to accommodate bad data.

- [ ] **Step 6: Commit**

```bash
git add scripts/services-manifest.mjs scripts/fetch-services.mjs src/content/services
git commit -m "Extract and commit content for all 12 service pages from Wayback Machine"
```

---

### Task 7: Service page template, shared UI components, dynamic route

**Files:**
- Create: `src/components/Hero.astro`
- Create: `src/components/Icon.astro`
- Create: `src/components/WhyChooseUs.astro`
- Create: `src/components/CtaBand.astro`
- Create: `src/components/BrandsStrip.astro`
- Create: `src/templates/ServicePage.astro`
- Create: `src/pages/[slug].astro`
- Test: `src/templates/ServicePage.test.ts`

**Interfaces:**
- Produces: `ServicePage.astro` — prop `{ entry: CollectionEntry<'services'> }`.
- Consumes: `getCollection('services')` (Task 3 schema, Task 6 data), `Layout.astro` (Task 2).
- Produces: `[slug].astro` also renders the `pages` collection (wired properly in Task 9; for this task it only needs to handle `services` without breaking when Task 9 adds the `pages` branch — so branch on a `type` field passed via `getStaticPaths` props).

- [ ] **Step 1: Write `Icon.astro`**

```astro
---
interface Props { name: string }
const { name } = Astro.props;

const ICONS: Record<string, string> = {
  'user-tie': '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>',
  'balance-scale': '<path d="M12 3v18M5 7h14M5 7l-3 6h6l-3-6zM19 7l-3 6h6l-3-6zM7 21h10"/>',
  'shield-alt': '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/>',
  wifi: '<path d="M2 8.5a15 15 0 0 1 20 0M5.5 12a10 10 0 0 1 13 0M9 15.5a5 5 0 0 1 6 0"/><circle cx="12" cy="19" r="1"/>',
  headset: '<path d="M4 13a8 8 0 0 1 16 0v5a2 2 0 0 1-2 2h-2v-6h4M4 18v-5a2 2 0 0 1 2-2h0v6H4a0 0 0 0 1 0 0z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
  bolt: '<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z"/>',
  'network-wired': '<circle cx="12" cy="4" r="2"/><circle cx="5" cy="18" r="2"/><circle cx="19" cy="18" r="2"/><path d="M12 6v6M12 12l-7 6M12 12l7 6"/>',
  'check-circle': '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
};

const path = ICONS[name] ?? ICONS['check-circle'];
---
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="32" height="32" set:html={path} />
```

- [ ] **Step 2: Write `Hero.astro`**

```astro
---
interface Props { title: string; image?: ImageMetadata }
const { title, image } = Astro.props;
---
<section class="hero">
  {image && <img src={image.src} alt="" class="hero-bg" />}
  <div class="container">
    <h1><slot name="title">{title}</slot></h1>
    <p><slot /></p>
  </div>
</section>
<style>
  .hero { position: relative; padding: 3rem 0; background: var(--color-bg-alt); }
  .hero-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.15; z-index: 0; }
  .hero .container { position: relative; z-index: 1; max-width: 800px; }
</style>
```

- [ ] **Step 3: Write `WhyChooseUs.astro`**

```astro
---
import Icon from './Icon.astro';
interface Props { cards: { icon: string; title: string; body: string }[] }
const { cards } = Astro.props;
---
<section class="why container">
  <h2>¿Por Qué Elegirnos?</h2>
  <div class="cards">
    {cards.map((card) => (
      <div class="card">
        <Icon name={card.icon} />
        <h3>{card.title}</h3>
        <p>{card.body}</p>
      </div>
    ))}
  </div>
</section>
<style>
  .why { padding: 3rem 0; text-align: center; }
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 2rem; margin-top: 2rem; }
  .card { color: var(--color-primary); }
  .card h3, .card p { color: var(--color-text); }
</style>
```

- [ ] **Step 4: Write `CtaBand.astro`**

```astro
---
---
<section class="cta">
  <div class="container">
    <h2>Contacta con nosotros</h2>
    <p>Optimiza tus instalaciones hoy mismo con Redworks Solutions, tu socio de confianza en telecomunicaciones y electricidad en Madrid.</p>
    <div class="actions">
      <a class="button" href="tel:+34910527499">Llámanos</a>
      <a class="button secondary" href="/contacto/">Escríbenos</a>
    </div>
  </div>
</section>
<style>
  .cta { background: var(--color-primary); color: #fff; padding: 3rem 0; text-align: center; }
  .cta h2 { color: #fff; }
  .actions { display: flex; gap: 1rem; justify-content: center; margin-top: 1rem; }
  .button.secondary { background: #fff; color: var(--color-primary); }
  .button.secondary:hover { background: #eee; }
</style>
```

- [ ] **Step 5: Write `BrandsStrip.astro`**

```astro
---
import brand01 from '../assets/shared/brands/brand-01.png';
import brand02 from '../assets/shared/brands/brand-02.png';
import brand03 from '../assets/shared/brands/brand-03.png';
import brand04 from '../assets/shared/brands/brand-04.png';
import brand05 from '../assets/shared/brands/brand-05.png';
import brand06 from '../assets/shared/brands/brand-06.png';
import brand07 from '../assets/shared/brands/brand-07.png';
import brand08 from '../assets/shared/brands/brand-08.png';
import brand09 from '../assets/shared/brands/brand-09.png';
import brand10 from '../assets/shared/brands/brand-10.png';

const brands = [brand01, brand02, brand03, brand04, brand05, brand06, brand07, brand08, brand09, brand10];
---
<section class="brands container">
  <h2>Trabajamos con las mejores marcas</h2>
  <div class="logos">
    {brands.map((brand) => <img src={brand.src} alt="" loading="lazy" />)}
  </div>
</section>
<style>
  .brands { padding: 3rem 0; text-align: center; }
  .logos { display: flex; flex-wrap: wrap; gap: 2rem; justify-content: center; align-items: center; margin-top: 1.5rem; }
  .logos img { width: 80px; height: 80px; object-fit: contain; filter: grayscale(1); opacity: 0.7; }
</style>
```

*(Only 10 representative brand logos are wired in for layout purposes — Task 5 downloaded all ~51; this component intentionally samples a subset for a clean strip rather than a 51-logo wall. This is a design choice, not a missed asset: nothing else references the remaining files, so note in the PR description that most downloaded brand logos are unused by the UI, kept only as recovered source material.)*

- [ ] **Step 6: Write `ServicePage.astro`**

```astro
---
import type { CollectionEntry } from 'astro:content';
import { Image } from 'astro:assets';
import Layout from '../layouts/Layout.astro';
import Hero from '../components/Hero.astro';
import WhyChooseUs from '../components/WhyChooseUs.astro';
import CtaBand from '../components/CtaBand.astro';
import BrandsStrip from '../components/BrandsStrip.astro';

interface Props { entry: CollectionEntry<'services'> }
const { entry } = Astro.props;
const { title, metaDescription, heroTitle, heroImage, sections, whyChooseUs } = entry.data;
---
<Layout title={`${title} | Redworks`} description={metaDescription}>
  <Hero title={heroTitle} image={heroImage} />
  {sections.map((section) => (
    <section class="content-section container">
      <h2>{section.heading}</h2>
      <p>{section.body}</p>
      {section.image && <Image src={section.image} alt="" width={900} height={675} />}
    </section>
  ))}
  <WhyChooseUs cards={whyChooseUs} />
  <CtaBand />
  <BrandsStrip />
</Layout>
```

- [ ] **Step 7: Write `src/pages/[slug].astro`**

```astro
---
export const prerender = true;

import { getCollection } from 'astro:content';
import ServicePage from '../templates/ServicePage.astro';

export async function getStaticPaths() {
  const services = await getCollection('services');
  return services.map((entry) => ({
    params: { slug: entry.id },
    props: { type: 'service' as const, entry },
  }));
}

const { type, entry } = Astro.props;
---
{type === 'service' && <ServicePage entry={entry} />}
```

- [ ] **Step 8: Write a build-output test for the representative service**

`src/templates/ServicePage.test.ts`:
```ts
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import { getCollection } from 'astro:content';
import ServicePage from './ServicePage.astro';

describe('ServicePage', () => {
  it('renders the electricidad entry with its real recovered content', async () => {
    const services = await getCollection('services');
    const electricidad = services.find((s) => s.id === 'electricidad');
    if (!electricidad) throw new Error('electricidad entry missing — run npm run extract:services first');

    const container = await AstroContainer.create();
    const html = await container.renderToString(ServicePage, { props: { entry: electricidad } });

    expect(html).toContain('Empresa Instaladora de Electricidad y Energías Renovables en Madrid');
    expect(html).toContain('Experiencia y profesionalismo');
    expect(html).toContain('Compromiso con la sostenibilidad');
    expect(html).toContain('Enfoque personalizado');
    expect(html).toContain('¿Por Qué Elegirnos?');
    expect(html).toContain('Contacta con nosotros');
  });
});
```

- [ ] **Step 9: Run the test**

Run: `docker compose run --rm app npm run test`
Expected: PASS (requires Task 6's generated `electricidad.yaml` to already exist).

- [ ] **Step 10: Verify all 12 service pages build with real content**

Run:
```bash
docker compose run --rm app npm run build
for slug in telecomunicaciones telefonia-voip audiovisuales videoconferencias megafonia conferencias sistemas-informaticos redes-wifi seguridad electricidad paneles instalacion-electrica-de-baja-tension; do
  test -f "dist/$slug/index.html" && echo "OK $slug" || echo "MISSING $slug"
done
```
Expected: 12 `OK` lines, no `MISSING`.

- [ ] **Step 11: Commit**

```bash
git add src/components/Hero.astro src/components/Icon.astro src/components/WhyChooseUs.astro src/components/CtaBand.astro src/components/BrandsStrip.astro src/templates/ServicePage.astro src/templates/ServicePage.test.ts src/pages/\[slug\].astro
git commit -m "Add service page template, shared UI components and dynamic route"
```

---

### Task 8: Homepage

**Files:**
- Modify: `src/pages/index.astro` (replace Task 1's placeholder)
- Test: `src/pages/index.test.ts`

**Interfaces:**
- Consumes: `getCollection('services')` (Task 6 data), `Layout`, `Hero`, `WhyChooseUs`, `CtaBand`, `BrandsStrip` (Task 2/G).

- [ ] **Step 1: Write the failing test**

`src/pages/index.test.ts`:
```ts
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import Index from './index.astro';

describe('Homepage', () => {
  it('renders the hero, both service categories and the why-redworks cards', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Index);

    expect(html).toContain('Empresa Instaladora de Sistemas de Telecomunicaciones y Sistemas de Electricidad en Madrid');
    expect(html).toContain('Telefonía VoIP');
    expect(html).toContain('Paneles solares');
    expect(html).toContain('/telefonia-voip/');
    expect(html).toContain('¿Por Qué Elegir a Redworks?');
    expect(html).toContain('Experiencia');
    expect(html).toContain('Resultados');
    expect(html).toContain('Dedicación');
  });

  it('renders exactly 10 service-grid cards (8 telecom + 2 electricidad sub-services, excluding the two category overview pages)', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Index);

    const cardCount = (html.match(/class="service-card"/g) ?? []).length;
    expect(cardCount).toBe(10);
  });
});
```

Note the second test: the Header (rendered via `Layout` on every page, including this one) always links to `/telecomunicaciones/` and `/electricidad/` in its services dropdown, so a page-wide "does not contain this URL" assertion would be testing the wrong thing and would fail for reasons unrelated to the homepage grids. Counting `service-card` elements checks the actual requirement — the real site's telecom grid has 8 cards excluding "Telecomunicaciones" itself, and the electricity grid has 2 excluding "Electricidad" itself (see Global Constraints table in the design doc) — without depending on Header internals.

- [ ] **Step 2: Run the test to verify it fails**

Run: `docker compose run --rm app npm run test`
Expected: FAIL (placeholder homepage doesn't contain any of the expected strings).

- [ ] **Step 3: Write the real homepage**

`src/pages/index.astro`:
```astro
---
export const prerender = true;

import { getCollection } from 'astro:content';
import Layout from '../layouts/Layout.astro';
import Hero from '../components/Hero.astro';
import WhyChooseUs from '../components/WhyChooseUs.astro';
import CtaBand from '../components/CtaBand.astro';
import BrandsStrip from '../components/BrandsStrip.astro';

const services = await getCollection('services');
const bySlugNot = (slug: string) => (s: (typeof services)[number]) => s.id !== slug;
const telecom = services.filter((s) => s.data.category === 'telecomunicaciones').filter(bySlugNot('telecomunicaciones'));
const electricidad = services.filter((s) => s.data.category === 'electricidad').filter(bySlugNot('electricidad'));

const whyRedworks = [
  {
    icon: 'shield-alt',
    title: 'Experiencia',
    body: 'Con más de 15 años de experiencia en el sector, nuestra empresa está certificada por la Secretaría de Estado de Telecomunicaciones, lo que garantiza nuestra competencia y compromiso con la excelencia.',
  },
  {
    icon: 'check-circle',
    title: 'Resultados',
    body: 'Te brindamos resultados excepcionales en cada proyecto. Nuestro equipo de profesionales especializados trabaja incansablemente para superar tus expectativas.',
  },
  {
    icon: 'headset',
    title: 'Dedicación',
    body: 'Nos enorgullecemos de nuestra dedicación a la satisfacción del cliente y nuestra capacidad para proporcionar soluciones a medida que se adaptan a sus necesidades únicas.',
  },
];
---
<Layout
  title="Empresa Telecomunicaciones y Electricidad Madrid | Redworks"
  description="Empresa Instaladora de Sistemas de Telecomunicaciones y Sistemas de Electricidad en Madrid. Más de 15 años de experiencia. 910527499"
>
  <Hero title="Empresa Instaladora de Sistemas de Telecomunicaciones y Sistemas de Electricidad en Madrid">
    En Redworks Solutions, somos una empresa con más de 15 años de experiencia en el sector. Estamos especializados
    en sistemas de telecomunicaciones, electricidad y energías renovables en Madrid.
  </Hero>

  <section class="container service-group">
    <h2>Servicios de Telecomunicaciones Innovadoras</h2>
    <div class="grid">
      {telecom.map((service) => (
        <a class="service-card" href={`/${service.id}/`}>
          <h3>{service.data.navLabel}</h3>
          <p>{service.data.sections[0]?.body.slice(0, 140)}…</p>
          <span>Ver más</span>
        </a>
      ))}
    </div>
  </section>

  <section class="container service-group">
    <h2>Servicios de Electricidad y Energías Renovables</h2>
    <div class="grid">
      {electricidad.map((service) => (
        <a class="service-card" href={`/${service.id}/`}>
          <h3>{service.data.navLabel}</h3>
          <p>{service.data.sections[0]?.body.slice(0, 140)}…</p>
          <span>Ver más</span>
        </a>
      ))}
    </div>
  </section>

  <WhyChooseUs cards={whyRedworks} />
  <CtaBand />
  <BrandsStrip />
</Layout>
<style>
  .service-group { padding: 3rem 0; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem; margin-top: 1.5rem; }
  .service-card { display: block; padding: 1.5rem; border: 1px solid #eee; border-radius: var(--radius); color: var(--color-text); }
  .service-card:hover { border-color: var(--color-primary); text-decoration: none; }
  .service-card span { color: var(--color-primary); font-weight: 600; }
</style>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `docker compose run --rm app npm run test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/index.astro src/pages/index.test.ts
git commit -m "Build real homepage with service grids from the services collection"
```

---

### Task 9: Quiénes somos & Clientes (hand-authored real content, `pages` collection)

**Files:**
- Create: `src/content/pages/quienes-somos.md`
- Create: `src/content/pages/clientes.md`
- Create: `src/templates/PageTemplate.astro`
- Modify: `src/pages/[slug].astro` (add the `pages` collection branch)
- Create: `src/assets/shared/clients/index.ts` (typed re-export of the 18 client logo imports for `clientes.md` to use)
- Test: `src/templates/PageTemplate.test.ts`

**Interfaces:**
- Produces: `PageTemplate.astro` — prop `{ entry: CollectionEntry<'pages'> }`, renders frontmatter title/heroTitle plus `<Content />` from the Markdown body.
- Modifies: `getStaticPaths()` in `[slug].astro` to also enumerate the `pages` collection, so the router now returns entries from both collections without any URL prefix collision (the two collections don't share slugs).

- [ ] **Step 1: Write `src/content/pages/quienes-somos.md`**

```markdown
---
title: "Quiénes Somos | Redworks"
metaDescription: "Empresa de Sistemas Eléctricos y de Telecomunicaciones en Madrid, con más de 15 años de experiencia. Conoce al equipo de Redworks Solutions."
heroTitle: "Empresa de Sistemas Eléctricos y de Telecomunicaciones"
---

Somos expertos en la instalación y mantenimiento de Telefonía VoIP, Redes informáticas, Sistemas wifi, Audiovisuales,
Megafonía, Videoconferencias, Sistemas de seguridad, Cámaras de videovigilancia en Circuito Cerrado de Televisión
(CCTV) y controles de accesos. En el área de energía y electricidad también tenemos amplia experiencia en la
ejecución de proyectos de baja tensión, así como proyectos de energía solar fotovoltaica.

Fundada en 2019, Redworks Solutions surge con el firme propósito de acercar soluciones tecnológicas de alta calidad a
compañías con necesidades operativas enmarcadas dentro de la revolución tecnológica actual. Para llevar a cabo este
propósito, contamos con un equipo técnico y humano con más de quince años de experiencia en infraestructuras de
telecomunicaciones, siendo expertos en la instalación y diseño de proyectos.

Dentro de nuestro expertise ofrecemos alta calidad en servicios de cableado estructurado, fibra óptica, sistemas
WI-FI, sistemas de seguridad, sistemas de megafonía industrial, así como el diseño y montaje de todo el hardware
audiovisual que precisa tu negocio, empresa, hogar o proyecto. Además, somos empresa homologada para la instalación
eléctrica en baja tensión autorizada por la Comunidad de Madrid y, también, estamos especializados en la instalación
de placas fotovoltaicas.

## Nuestra filosofía

Acercar los estándares más innovadores y punteros de las telecomunicaciones a tu negocio, sin perder de vista nuestra
razón de ser: ofrecer los mejores proveedores y materiales a precios muy competitivos, buscando siempre la
excelencia y la honradez. Para nosotros siempre "prima el cliente y su necesidad".

## Nuestro fuerte

Cuidar cada detalle del proceso de instalación y mantenimiento en cada proyecto, logrando un porcentaje de
satisfacción muy alto en nuestra cartera de clientes.

## Un equipo profesional

**Equipo corporativo**

- Felipe Aguilar — CEO y Fundador
- María Pérez — Directora de Estrategia Técnica
- Rocío Crespo — Directora Financiera
- Jose María Soler — Director Comercial

**Equipo técnico**

- Ibrahim Benzian
- Ángel Herranz
- Chema Cerezo
- Javier Mesías
```

- [ ] **Step 2: Write `src/content/pages/clientes.md`**

```markdown
---
title: "Clientes | Redworks"
metaDescription: "Empresas que han confiado en Redworks Solutions para sus proyectos de telecomunicaciones y electricidad en Madrid."
heroTitle: "Nuestros Clientes"
---

Estas son algunas de las empresas que han confiado en nosotros y, por eso, queremos tener una mención especial con
cada una de ellas.
```

- [ ] **Step 3: Write `src/assets/shared/clients/index.ts`**

```ts
import client01 from './client-01.png';
import client02 from './client-02.png';
import client03 from './client-03.png';
import client04 from './client-04.png';
import client05 from './client-05.png';
import client06 from './client-06.png';
import client07 from './client-07.png';
import client08 from './client-08.png';
import client09 from './client-09.png';
import client10 from './client-10.png';
import client11 from './client-11.png';
import client12 from './client-12.png';
import client13 from './client-13.png';
import client14 from './client-14.png';
import client15 from './client-15.png';
import client16 from './client-16.png';
import client17 from './client-17.png';
import client18 from './client-18.png';

export const CLIENT_LOGOS = [
  client01, client02, client03, client04, client05, client06, client07, client08, client09,
  client10, client11, client12, client13, client14, client15, client16, client17, client18,
];
```

- [ ] **Step 4: Write `PageTemplate.astro`**, rendering the client logo grid only for the `clientes` entry

```astro
---
import type { CollectionEntry } from 'astro:content';
import { render } from 'astro:content';
import Layout from '../layouts/Layout.astro';
import Hero from '../components/Hero.astro';
import { CLIENT_LOGOS } from '../assets/shared/clients/index.ts';

interface Props { entry: CollectionEntry<'pages'> }
const { entry } = Astro.props;
const { title, metaDescription, heroTitle } = entry.data;
const { Content } = await render(entry);
---
<Layout title={title} description={metaDescription}>
  <Hero title={heroTitle} />
  <div class="container prose">
    <Content />
  </div>
  {entry.id === 'clientes' && (
    <div class="container client-logos">
      {CLIENT_LOGOS.map((logo) => <img src={logo.src} alt="" loading="lazy" />)}
    </div>
  )}
</Layout>
<style>
  .prose { padding: 2rem 0; max-width: 760px; }
  .client-logos { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 1.5rem; padding-bottom: 3rem; }
  .client-logos img { width: 100%; max-width: 140px; margin: 0 auto; filter: grayscale(1); opacity: 0.8; }
</style>
```

- [ ] **Step 5: Wire the `pages` collection into `[slug].astro`**

Modify `src/pages/[slug].astro`:
```astro
---
export const prerender = true;

import { getCollection } from 'astro:content';
import ServicePage from '../templates/ServicePage.astro';
import PageTemplate from '../templates/PageTemplate.astro';

export async function getStaticPaths() {
  const services = await getCollection('services');
  const pages = await getCollection('pages');
  return [
    ...services.map((entry) => ({ params: { slug: entry.id }, props: { type: 'service' as const, entry } })),
    ...pages.map((entry) => ({ params: { slug: entry.id }, props: { type: 'page' as const, entry } })),
  ];
}

const { type, entry } = Astro.props;
---
{type === 'service' && <ServicePage entry={entry} />}
{type === 'page' && <PageTemplate entry={entry} />}
```

- [ ] **Step 6: Write the test**

`src/templates/PageTemplate.test.ts`:
```ts
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import { getCollection } from 'astro:content';
import PageTemplate from './PageTemplate.astro';

describe('PageTemplate', () => {
  it('renders quienes-somos with the real team and philosophy content', async () => {
    const pages = await getCollection('pages');
    const entry = pages.find((p) => p.id === 'quienes-somos');
    if (!entry) throw new Error('quienes-somos entry missing');

    const container = await AstroContainer.create();
    const html = await container.renderToString(PageTemplate, { props: { entry } });

    expect(html).toContain('Fundada en 2019');
    expect(html).toContain('Felipe Aguilar');
    expect(html).toContain('Nuestra filosofía');
  });

  it('renders clientes with the 18 client logos', async () => {
    const pages = await getCollection('pages');
    const entry = pages.find((p) => p.id === 'clientes');
    if (!entry) throw new Error('clientes entry missing');

    const container = await AstroContainer.create();
    const html = await container.renderToString(PageTemplate, { props: { entry } });

    expect(html).toContain('empresas que han confiado en nosotros');
    expect((html.match(/client-\d\d\.png/g) ?? []).length).toBeGreaterThanOrEqual(18);
  });
});
```

- [ ] **Step 7: Run the tests and the build**

Run: `docker compose run --rm app npm run test && docker compose run --rm app npm run build`
Expected: tests PASS; build produces `dist/quienes-somos/index.html` and `dist/clientes/index.html`.

- [ ] **Step 8: Commit**

```bash
git add src/content/pages/quienes-somos.md src/content/pages/clientes.md src/templates/PageTemplate.astro src/templates/PageTemplate.test.ts src/assets/shared/clients/index.ts src/pages/\[slug\].astro
git commit -m "Add Quienes somos and Clientes pages with real recovered content"
```

---

### Task 10: Legal pages (Accesibilidad, Política de privacidad, Términos y condiciones)

**Files:**
- Create: `src/content/pages/accesibilidad.md`
- Create: `src/content/pages/politica-de-privacidad.md`
- Create: `src/content/pages/terminos-y-condiciones.md`

**Interfaces:**
- Consumes: same `pages` collection / `PageTemplate.astro` from Task 9 — no new component code, purely content.

- [ ] **Step 1: Write `src/content/pages/accesibilidad.md`**

```markdown
---
title: "Accesibilidad | Redworks"
metaDescription: "Declaración de accesibilidad del sitio web de Redworks Solutions."
heroTitle: "Declaración de Accesibilidad"
---

Creemos firmemente que Internet debe estar disponible y accesible para todos, y estamos comprometidos a proporcionar
un sitio web que sea accesible para la audiencia más amplia posible, independientemente de las circunstancias y la
capacidad.

Nuestro objetivo es adherirnos lo más estrictamente posible a las Directrices de Accesibilidad al Contenido Web 2.1
(WCAG 2.1) del World Wide Web Consortium (W3C) en el nivel AA. Estas pautas explican cómo hacer que el contenido web
sea accesible para personas con una amplia gama de discapacidades, incluyendo personas ciegas, con discapacidades
motoras, visuales o cognitivas.

Esta declaración de accesibilidad se aplica al sitio web [redworks.es](https://redworks.es).

## Estado de cumplimiento

- Algunas imágenes de la web podrían aparecer sin texto alternativo.
- Carga desproporcionada: no aplica.
- Contenido fuera del ámbito de la legislación aplicable: no aplica.

## Observaciones y contacto

Si has encontrado un problema de accesibilidad o tienes ideas para mejorar, estaremos encantados de saber de ti.
Puedes comunicarte con nosotros a través de nuestro [formulario de contacto](/contacto/) o llamando al
[910 52 74 99](tel:+34910527499), indicando:

- cualquier posible incumplimiento de accesibilidad de este sitio web,
- dificultades de acceso al contenido,
- o cualquier consulta o sugerencia de mejora.

## Diseño técnico

El sitio web:

- se ha diseñado adaptándose a los estándares y normativas vigentes en relación a la accesibilidad, cumpliendo con
  los puntos de verificación de prioridad 2 (AA) de las WCAG 2.1;
- está optimizado para las últimas versiones vigentes de Chrome, Edge, Firefox, Safari y Opera;
- está diseñado para su correcta visualización en cualquier resolución y dispositivo — escritorio, tabletas o
  móviles (diseño responsive).
```

- [ ] **Step 2: Write `src/content/pages/politica-de-privacidad.md`**

```markdown
---
title: "Política de Privacidad | Redworks"
metaDescription: "Política de privacidad de Redworks Solutions SL sobre el tratamiento de datos personales."
heroTitle: "Política de Privacidad"
---

Redworks Solutions SL le informa sobre su Política de Privacidad respecto del tratamiento y protección de los datos
de carácter personal de los usuarios y clientes que puedan ser recabados por la navegación o contratación de
servicios a través del sitio web redworks.es.

El Titular garantiza el cumplimiento de la normativa vigente en materia de protección de datos personales, reflejada
en la Ley Orgánica 3/2018, de 5 de diciembre, de Protección de Datos Personales y de Garantía de Derechos Digitales
(LOPD GDD), y cumple también con el Reglamento (UE) 2016/679 del Parlamento Europeo y del Consejo, de 27 de abril de
2016 (RGPD). El uso del sitio web implica la aceptación de esta Política de Privacidad.

## Principios aplicados en el tratamiento de datos

- **Principio de licitud, lealtad y transparencia**: el Titular siempre requerirá tu consentimiento para el
  tratamiento de tus datos, informándote previamente con absoluta transparencia.
- **Principio de minimización de datos**: solo se solicitan los datos estrictamente necesarios para el fin
  correspondiente.
- **Principio de limitación del plazo de conservación**: los datos se mantienen durante el tiempo estrictamente
  necesario para dicho fin.
- **Principio de integridad y confidencialidad**: tus datos se tratan garantizando su seguridad, confidencialidad e
  integridad.

## Obtención de datos personales

Para navegar por redworks.es no es necesario facilitar ningún dato personal. El único caso en el que se proporcionan
datos personales es al contactar a través del formulario de contacto o por correo electrónico.

## Tus derechos

Tienes derecho a solicitar el acceso, rectificación, cancelación, limitación del tratamiento, oposición y
portabilidad de tus datos personales. Para ejercer estos derechos, envía un correo electrónico a
[info@redworks.es](mailto:info@redworks.es) junto con una prueba válida en derecho, como una fotocopia del DNI o
equivalente. También tienes derecho a presentar una reclamación ante la Agencia Española de Protección de Datos si
consideras que el tratamiento de tus datos infringe el Reglamento.

## Finalidad del tratamiento

Al enviar el formulario de contacto, el Titular solicita datos como nombre y apellidos, dirección de correo
electrónico y número de teléfono, con la finalidad de responder a tus consultas. Estos datos también pueden usarse
para garantizar el cumplimiento de la ley aplicable y para mejorar los servicios que ofrece este sitio web.

## Seguridad de los datos personales

Para proteger tus datos personales, el Titular toma todas las precauciones razonables y sigue las mejores prácticas
del sector para evitar su pérdida, mal uso, acceso indebido, divulgación, alteración o destrucción.

## Conservación de datos personales

Los datos personales que nos facilites se conservarán hasta que solicites su supresión.

## Cambios en la Política de Privacidad

El Titular se reserva el derecho a modificar la presente Política de Privacidad para adaptarla a novedades
legislativas o jurisprudenciales, así como a prácticas del sector. Estas políticas estarán vigentes hasta que sean
modificadas por otras debidamente publicadas en este sitio web.
```

- [ ] **Step 3: Write `src/content/pages/terminos-y-condiciones.md`** (newly authored — see Global Constraints; the recovered snapshot was an unfilled ecommerce boilerplate template that didn't fit a services company)

```markdown
---
title: "Términos y Condiciones | Redworks"
metaDescription: "Términos y condiciones de uso del sitio web de Redworks Solutions SL."
heroTitle: "Términos y Condiciones"
---

El acceso y uso del sitio web redworks.es, así como la contratación de los servicios de instalación y mantenimiento
de sistemas de telecomunicaciones, electricidad y energías renovables ofrecidos por **Redworks Solutions SL**,
implican la aceptación plena de los presentes Términos y Condiciones.

## Datos del titular

- **Titular**: Redworks Solutions SL
- **Dirección**: Calle José Echegaray, 14, Edificio A2, planta 2, nave 8
- **Teléfono**: [910 52 74 99](tel:+34910527499)
- **Correo electrónico**: [info@redworks.es](mailto:info@redworks.es)

## Objeto

Redworks Solutions SL presta servicios profesionales de instalación, mantenimiento y asesoramiento en sistemas de
telecomunicaciones, electricidad de baja tensión y energías renovables. El presupuesto, alcance y condiciones
particulares de cada proyecto se acuerdan de forma individual con cada cliente antes de iniciar los trabajos, y
prevalecen sobre estos términos generales en caso de conflicto.

## Uso del sitio web

El contenido de este sitio web tiene carácter informativo y no constituye una oferta comercial vinculante. Los
precios y condiciones de los servicios se comunican de forma individual mediante presupuesto.

## Propiedad intelectual

Los contenidos del sitio web (textos, imágenes, logotipos y diseño) son propiedad de Redworks Solutions SL o de
terceros que han autorizado su uso, y no pueden reproducirse sin autorización previa.

## Responsabilidad

Redworks Solutions SL no se hace responsable de los daños que puedan derivarse de un uso indebido del sitio web ni
de interrupciones del servicio ajenas a su control. Los trabajos de instalación se garantizan conforme a la
legislación vigente y a las condiciones acordadas en cada presupuesto.

## Legislación aplicable

Estos Términos y Condiciones se rigen por la legislación española. Cualquier controversia derivada de su
interpretación o cumplimiento se someterá a los juzgados y tribunales que correspondan según la normativa vigente en
materia de protección de consumidores.

## Modificaciones

Redworks Solutions SL se reserva el derecho a modificar estos Términos y Condiciones. Los cambios serán efectivos
desde su publicación en este sitio web.
```

- [ ] **Step 4: Verify the build**

Run: `docker compose run --rm app npm run build`
Expected: `dist/accesibilidad/index.html`, `dist/politica-de-privacidad/index.html`, `dist/terminos-y-condiciones/index.html` all exist.

Run: `grep -c "87.98.229.92" dist/politica-de-privacidad/index.html`
Expected: `0` — confirms the original IP-address email bug was not carried over.

- [ ] **Step 5: Commit**

```bash
git add src/content/pages/accesibilidad.md src/content/pages/politica-de-privacidad.md src/content/pages/terminos-y-condiciones.md
git commit -m "Add legal pages: accesibilidad, politica de privacidad, terminos y condiciones"
```

---

### Task 11: Contact page and `/api/contact` (Resend integration)

**Files:**
- Create: `src/lib/contactValidation.ts`
- Create: `src/lib/email.ts`
- Create: `src/pages/api/contact.ts`
- Create: `src/pages/contacto.astro`
- Create: `src/scripts/contact-form.ts`
- Test: `src/lib/contactValidation.test.ts`, `src/lib/email.test.ts`

**Interfaces:**
- Produces: `validateContactForm(formData: Record<string, string>): { valid: true; data: {name, email, phone, message} } | { valid: false; errors: string[] }` from `contactValidation.ts`.
- Produces: `sendContactEmail(data: {name, email, phone, message}, env: {RESEND_API_KEY, CONTACT_TO_EMAIL, CONTACT_FROM_EMAIL}, fetchImpl?: typeof fetch): Promise<void>` from `email.ts` — throws on non-2xx response.
- Consumes both in `src/pages/api/contact.ts`.

- [ ] **Step 1: Write the failing validation test**

`src/lib/contactValidation.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { validateContactForm } from './contactValidation';

describe('validateContactForm', () => {
  it('accepts a fully filled valid form', () => {
    const result = validateContactForm({
      name: 'Ana García',
      email: 'ana@example.com',
      phone: '600123456',
      message: 'Quiero un presupuesto para redes wifi.',
      accepted: 'on',
    });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data).toEqual({
        name: 'Ana García',
        email: 'ana@example.com',
        phone: '600123456',
        message: 'Quiero un presupuesto para redes wifi.',
      });
    }
  });

  it('rejects a missing name', () => {
    const result = validateContactForm({ name: '', email: 'a@b.com', phone: '600123456', message: 'hola', accepted: 'on' });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors).toContain('El nombre es obligatorio.');
  });

  it('rejects an invalid email', () => {
    const result = validateContactForm({ name: 'Ana', email: 'not-an-email', phone: '600123456', message: 'hola', accepted: 'on' });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors).toContain('El email no es válido.');
  });

  it('rejects when the privacy checkbox is not accepted', () => {
    const result = validateContactForm({ name: 'Ana', email: 'a@b.com', phone: '600123456', message: 'hola', accepted: '' });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors).toContain('Debes aceptar la política de privacidad.');
  });
});
```

- [ ] **Step 2: Run to verify failure, then write `src/lib/contactValidation.ts`**

Run: `docker compose run --rm app npm run test` → expect FAIL (module missing).

```ts
export interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  message: string;
}

export type ValidationResult =
  | { valid: true; data: ContactFormData }
  | { valid: false; errors: string[] };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateContactForm(formData: Record<string, string>): ValidationResult {
  const errors: string[] = [];
  const name = (formData.name || '').trim();
  const email = (formData.email || '').trim();
  const phone = (formData.phone || '').trim();
  const message = (formData.message || '').trim();
  const accepted = formData.accepted === 'on' || formData.accepted === 'true';

  if (!name) errors.push('El nombre es obligatorio.');
  if (!email || !EMAIL_RE.test(email)) errors.push('El email no es válido.');
  if (!phone) errors.push('El teléfono es obligatorio.');
  if (!message) errors.push('El mensaje es obligatorio.');
  if (!accepted) errors.push('Debes aceptar la política de privacidad.');

  if (errors.length > 0) return { valid: false, errors };
  return { valid: true, data: { name, email, phone, message } };
}
```

Run: `docker compose run --rm app npm run test` → expect PASS.

- [ ] **Step 3: Write the failing email test**

`src/lib/email.test.ts`:
```ts
import { describe, expect, it, vi } from 'vitest';
import { sendContactEmail } from './email';

const ENV = {
  RESEND_API_KEY: 're_test_key',
  CONTACT_TO_EMAIL: 'info@redworks.es',
  CONTACT_FROM_EMAIL: 'web@redworks.es',
};

const DATA = { name: 'Ana García', email: 'ana@example.com', phone: '600123456', message: 'Quiero un presupuesto.' };

describe('sendContactEmail', () => {
  it('POSTs to the Resend API with the right auth header and payload', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: 'abc' }), { status: 200 }));

    await sendContactEmail(DATA, ENV, fetchMock as unknown as typeof fetch);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer re_test_key');
    const body = JSON.parse(init.body as string);
    expect(body.to).toEqual(['info@redworks.es']);
    expect(body.from).toBe('web@redworks.es');
    expect(body.reply_to).toBe('ana@example.com');
    expect(body.subject).toContain('Ana García');
    expect(body.text).toContain('Quiero un presupuesto.');
  });

  it('throws when Resend responds with a non-2xx status', async () => {
    const fetchMock = vi.fn(async () => new Response('nope', { status: 422 }));
    await expect(sendContactEmail(DATA, ENV, fetchMock as unknown as typeof fetch)).rejects.toThrow(/422/);
  });
});
```

- [ ] **Step 4: Run to verify failure, then write `src/lib/email.ts`**

```ts
import type { ContactFormData } from './contactValidation';

export interface EmailEnv {
  RESEND_API_KEY: string;
  CONTACT_TO_EMAIL: string;
  CONTACT_FROM_EMAIL: string;
}

export async function sendContactEmail(
  data: ContactFormData,
  env: EmailEnv,
  fetchImpl: typeof fetch = fetch
): Promise<void> {
  const res = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: [env.CONTACT_TO_EMAIL],
      from: env.CONTACT_FROM_EMAIL,
      reply_to: data.email,
      subject: `Nuevo mensaje de contacto de ${data.name}`,
      text: `Nombre: ${data.name}\nEmail: ${data.email}\nTeléfono: ${data.phone}\n\n${data.message}`,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend API respondió ${res.status}: ${body}`);
  }
}
```

Run: `docker compose run --rm app npm run test` → expect PASS.

- [ ] **Step 5: Write `src/pages/api/contact.ts`**

```ts
import type { APIRoute } from 'astro';
import { validateContactForm } from '../../lib/contactValidation';
import { sendContactEmail } from '../../lib/email';

export const POST: APIRoute = async ({ request, locals }) => {
  const formData = await request.formData();
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    values[key] = String(value);
  }

  const result = validateContactForm(values);
  if (!result.valid) {
    return new Response(JSON.stringify({ ok: false, errors: result.errors }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const env = (locals as { runtime?: { env?: Record<string, string> } }).runtime?.env ?? (process.env as Record<string, string>);

  try {
    await sendContactEmail(result.data, {
      RESEND_API_KEY: env.RESEND_API_KEY,
      CONTACT_TO_EMAIL: env.CONTACT_TO_EMAIL,
      CONTACT_FROM_EMAIL: env.CONTACT_FROM_EMAIL,
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, errors: ['No se ha podido enviar el mensaje. Inténtalo de nuevo o llámanos.'] }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
```

- [ ] **Step 6: Write the progressive-enhancement client script**

`src/scripts/contact-form.ts`:
```ts
const form = document.querySelector<HTMLFormElement>('#contact-form');
const status = document.querySelector<HTMLElement>('#contact-form-status');

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!status) return;
  status.textContent = 'Enviando...';

  const response = await fetch('/api/contact', { method: 'POST', body: new FormData(form) });
  const result = (await response.json()) as { ok: boolean; errors?: string[] };

  if (result.ok) {
    status.textContent = 'Gracias, tu mensaje ha sido enviado. Te responderemos lo antes posible.';
    form.reset();
  } else {
    status.textContent = (result.errors ?? ['Ha ocurrido un error.']).join(' ');
  }
});
```

- [ ] **Step 7: Write `src/pages/contacto.astro`**

```astro
---
export const prerender = true;
import Layout from '../layouts/Layout.astro';
import Hero from '../components/Hero.astro';
---
<Layout
  title="Contacto | Redworks"
  description="Contacta con Redworks Solutions para tus proyectos de telecomunicaciones y electricidad en Madrid. Llámanos al 910 52 74 99."
>
  <Hero title="Contacta con nosotros">
    ¿Tienes un proyecto de telecomunicaciones, electricidad o energías renovables? Cuéntanos qué necesitas y te
    responderemos lo antes posible.
  </Hero>

  <section class="container contact-grid">
    <div class="contact-info">
      <h2>Nuestros datos</h2>
      <p><a href="tel:+34910527499">910 52 74 99</a></p>
      <p>Calle José Echegaray, 14<br />Edificio A2, planta 2, nave 8</p>
    </div>

    <form id="contact-form" method="POST" action="/api/contact">
      <label for="name">Nombre</label>
      <input id="name" name="name" type="text" required />

      <label for="email">Email</label>
      <input id="email" name="email" type="email" required />

      <label for="phone">Teléfono</label>
      <input id="phone" name="phone" type="tel" required pattern="[0-9()#&amp;+*=.-]+" />

      <label for="message">Mensaje</label>
      <textarea id="message" name="message" rows="5" required></textarea>

      <label class="checkbox">
        <input type="checkbox" name="accepted" required />
        He leído y acepto la <a href="/politica-de-privacidad/">política de privacidad</a>.
      </label>

      <button class="button" type="submit">Enviar</button>
      <p id="contact-form-status" role="status"></p>
    </form>
  </section>

  <script src="../scripts/contact-form.ts"></script>
</Layout>
<style>
  .contact-grid { display: grid; grid-template-columns: 1fr 2fr; gap: 3rem; padding: 3rem 0; }
  form { display: flex; flex-direction: column; gap: 0.75rem; max-width: 480px; }
  input, textarea { padding: 0.6rem; border: 1px solid #ccc; border-radius: var(--radius); font: inherit; }
  .checkbox { display: flex; align-items: flex-start; gap: 0.5rem; font-size: 0.9rem; }
  .checkbox input { width: auto; }
  @media (max-width: 700px) { .contact-grid { grid-template-columns: 1fr; } }
</style>
```

- [ ] **Step 8: Manually verify the endpoint against a local dev server**

Run: `docker compose up -d`
Run:
```bash
curl -s -X POST http://localhost:4321/api/contact \
  -F "name=Test" -F "email=not-an-email" -F "phone=600123456" -F "message=hola" -F "accepted=on"
```
Expected: `{"ok":false,"errors":["El email no es válido."]}` — this confirms validation runs even without a real `RESEND_API_KEY` set (a real send is exercised later in Task 12 once secrets exist, or manually once the user configures Resend).

Run: `docker compose down`

- [ ] **Step 9: Commit**

```bash
git add src/lib/contactValidation.ts src/lib/email.ts src/lib/contactValidation.test.ts src/lib/email.test.ts src/pages/api/contact.ts src/pages/contacto.astro src/scripts/contact-form.ts
git commit -m "Add contact page and /api/contact endpoint with Resend integration"
```

---

### Task 12: 404 page, sitemap wiring, final full-site verification

**Files:**
- Create: `src/pages/404.astro`
- Modify: `astro.config.mjs` (add `site` + `@astrojs/sitemap`)
- Modify: `package.json` (add `@astrojs/sitemap` dependency)

**Interfaces:**
- Produces: `dist/sitemap-index.xml` (referenced by `public/robots.txt` from Task 1).

- [ ] **Step 1: Write `src/pages/404.astro`**

```astro
---
export const prerender = true;
import Layout from '../layouts/Layout.astro';
---
<Layout title="Página no encontrada | Redworks" description="La página que buscas no existe.">
  <section class="container not-found">
    <h1>404</h1>
    <p>La página que buscas no existe o ha sido movida.</p>
    <a class="button" href="/">Volver al inicio</a>
  </section>
</Layout>
<style>
  .not-found { padding: 5rem 0; text-align: center; }
  .not-found h1 { font-size: 4rem; color: var(--color-primary); }
</style>
```

- [ ] **Step 2: Add the sitemap integration**

Modify `package.json` dependencies: add `"@astrojs/sitemap": "^3.2.0"`.

Modify `astro.config.mjs`:
```js
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://redworks.es',
  output: 'server',
  adapter: cloudflare({ imageService: 'compile' }),
  integrations: [sitemap()],
});
```

Run: `docker compose run --rm app npm install`

- [ ] **Step 3: Full build + content-presence sweep across all 19 routes**

Run:
```bash
docker compose run --rm app npm run build
```

Run this verification script (paste into the shell, not a file — it's a one-off check):
```bash
declare -A EXPECT=(
  ["index"]="Empresa Instaladora de Sistemas de Telecomunicaciones"
  ["telecomunicaciones"]="Redworks"
  ["telefonia-voip"]="Telefonía"
  ["audiovisuales"]="Audiovisuales"
  ["videoconferencias"]="Videoconferencias"
  ["megafonia"]="Megafonía"
  ["conferencias"]="conferencias"
  ["sistemas-informaticos"]="Redworks"
  ["redes-wifi"]="wifi"
  ["seguridad"]="Redworks"
  ["electricidad"]="Electricidad"
  ["paneles"]="solares"
  ["instalacion-electrica-de-baja-tension"]="baja tensión"
  ["quienes-somos"]="Felipe Aguilar"
  ["clientes"]="confiado en nosotros"
  ["contacto"]="910 52 74 99"
  ["accesibilidad"]="WCAG"
  ["politica-de-privacidad"]="Redworks Solutions SL"
  ["terminos-y-condiciones"]="Redworks Solutions SL"
)
fail=0
for slug in "${!EXPECT[@]}"; do
  path="dist/$slug/index.html"
  [ "$slug" = "index" ] && path="dist/index.html"
  if [ ! -f "$path" ]; then echo "MISSING $path"; fail=1; continue; fi
  grep -q "${EXPECT[$slug]}" "$path" || { echo "CONTENT MISMATCH $path (expected: ${EXPECT[$slug]})"; fail=1; }
done
test $fail -eq 0 && echo "ALL 19 ROUTES OK"
```
Expected: `ALL 19 ROUTES OK`.

Run: `test -f dist/sitemap-index.xml && echo "sitemap OK"`
Expected: `sitemap OK`.

Run (checks for any leftover reference to the dead original domain — a broken-image regression check):
```bash
grep -rl "redworks.com.es" dist/ && echo "FOUND STALE REFERENCES" || echo "NO STALE REFERENCES"
```
Expected: `NO STALE REFERENCES` (every image must have been re-hosted under `src/assets/`; any hit here means an `<img>` or link still points at the dead domain and must be fixed before moving on).

- [ ] **Step 4: Host-side Playwright smoke test (documented exception to Docker-first)**

Run on the host (not Docker — Playwright needs a real browser binary and host networking, per this repo's global dev conventions):
```bash
docker compose up -d
npx --yes playwright install --with-deps chromium
npx --yes playwright test --config=/dev/null -- 2>/dev/null || true
```
Since this project has no Playwright config yet, write a minimal one-off script instead of a full Playwright project:

Create `scripts/smoke-test.mjs` (temporary, not committed — delete after use, or keep as a reusable dev tool, developer's call):
```js
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();

const checks = [
  ['http://localhost:4321/', 'Empresa Instaladora de Sistemas de Telecomunicaciones'],
  ['http://localhost:4321/electricidad/', 'Empresa Instaladora de'],
  ['http://localhost:4321/contacto/', 'Contacta con nosotros'],
  ['http://localhost:4321/quienes-somos/', 'Felipe Aguilar'],
];

for (const [url, expectedText] of checks) {
  await page.goto(url);
  const bodyText = await page.textContent('body');
  const brokenImages = await page.$$eval('img', (imgs) => imgs.filter((img) => !img.complete || img.naturalWidth === 0).map((img) => img.src));
  console.log(url, bodyText?.includes(expectedText) ? 'CONTENT OK' : 'CONTENT MISSING', brokenImages.length === 0 ? 'IMAGES OK' : `BROKEN IMAGES: ${brokenImages.join(', ')}`);
}

await browser.close();
```
Run: `npm install --no-save playwright && node scripts/smoke-test.mjs`
Expected: 4 lines, all `CONTENT OK` and `IMAGES OK`.

Run: `docker compose down`

- [ ] **Step 5: Commit**

```bash
git add src/pages/404.astro astro.config.mjs package.json
git commit -m "Add 404 page, sitemap integration, and verify full site build"
```

---

### Task 13: GitHub repository and initial push

**Files:**
- Create: `README.md`

**Interfaces:**
- Produces: the `txuselo/redworks.es` GitHub repository with this project pushed to its default branch.

- [ ] **Step 1: Write `README.md`**

```markdown
# Redworks.es

Sitio de Redworks Solutions reconstruido en Astro a partir de contenido e imágenes recuperadas de Wayback Machine
(el sitio original en WordPress/Elementor dejó de estar accesible). Desplegado en Cloudflare Workers.

## Desarrollo local

Todo corre en Docker — no se necesita Node.js instalado en el host.

```bash
docker compose up
```

Abre http://localhost:4321.

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
producto "Pages" — deprecado). Pasos a hacer manualmente en el dashboard de Cloudflare, no automatizados aquí:

1. Crear un Worker nuevo y conectarlo a este repositorio de GitHub (Workers Builds → Git integration).
2. Comando de build: `npm run build`. Directorio de salida de assets: `dist`.
3. Configurar los siguientes secrets del Worker (Settings → Variables and Secrets):
   - `RESEND_API_KEY` — API key de [Resend](https://resend.com).
   - `CONTACT_TO_EMAIL` — email donde llegan los mensajes del formulario de contacto.
   - `CONTACT_FROM_EMAIL` — remitente verificado en Resend sobre el dominio `redworks.es`.
4. Asociar el dominio personalizado `redworks.es` (ya presente en la cuenta de Cloudflare) al Worker.

## Estructura de contenido

- `src/content/services/*.yaml` — las 12 páginas de servicio, generadas por `npm run extract:services` a partir de
  snapshots de Wayback Machine (ver `scripts/services-manifest.mjs`). No editar el resultado a mano si se vuelve a
  ejecutar la extracción; edita el script o la fuente si el contenido necesita cambios permanentes.
- `src/content/pages/*.md` — páginas de contenido único (quiénes somos, clientes, legales), escritas a mano.
```

- [ ] **Step 2: Create the GitHub repository**

Run: `gh repo create txuselo/redworks.es --public --source=. --remote=origin --description "Sitio de Redworks Solutions (Astro + Cloudflare Workers)"`
Expected: repository created, `origin` remote added.

(If the user wants it private instead of public, swap `--public` for `--private` before running — confirm with the user first since this changes who can see the repo.)

- [ ] **Step 3: Push**

Run: `git add README.md && git commit -m "Add README with local dev and deployment instructions"`
Run: `git push -u origin main`
Expected: push succeeds; `gh repo view txuselo/redworks.es --web` opens the repo in the browser showing all committed files.

- [ ] **Step 4: Final check-in with the user**

Report the repository URL and remind the user of the three manual steps left, per the README: connect Cloudflare Workers Builds to this repo, set the three Resend-related secrets, and attach the `redworks.es` custom domain.
