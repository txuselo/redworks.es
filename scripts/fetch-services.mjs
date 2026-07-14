import { copyFile, mkdir, rm, writeFile } from 'node:fs/promises';
import { stringify } from 'yaml';
import { parseServicePage } from './parse-service-page.mjs';
import { resolveBackupImage } from './resolve-backup-image.mjs';
import { SERVICES_MANIFEST } from './services-manifest.mjs';

// Task 5 staged a handful of real per-service photos under src/assets/shared/services/ (found via a
// different route than the 2021 WordPress backup). When resolveBackupImage can't find a filename in the
// backup — usually because the photo was added to the live site after the Dec 2021 backup was taken — fall
// back to the same-topic file here instead of fabricating anything.
const FALLBACK_HERO_IMAGES = {
  electricidad: 'electricidad-destacada.jpg',
  paneles: 'placas-fotovoltaicas-destacada.jpg',
  'instalacion-electrica-de-baja-tension': 'proyectos-baja-tension-destacada.jpg',
  videoconferencias: 'videoconferencia01.jpg',
  seguridad: 'seguridad03-redworks.jpg',
  'redes-wifi': 'sistema-wifi03.jpg',
  megafonia: 'portada-megafonia.jpg',
  audiovisuales: 'portada-audiovisuales.jpg',
  'sistemas-informaticos': 'portada-sistemas-informaticos.jpg',
  'telefonia-voip': 'telefonia-1.jpg',
  // conferencias' real og:image (.../2024/04/Ordendor-de-sobremesa-scaled.jpg) postdates the Dec 2021
  // backup AND was never captured by Wayback (verified via the CDX API: zero snapshots exist for that
  // exact URL, at any timestamp) — so unlike the other fallbacks above, there is no way to recover the
  // real photo at all. Reusing clientes-portada.jpg is a deliberate choice, not a placeholder hack: it's
  // a real 2021 photo already referenced on this very page (conferencias' own "Sistema de Votación"
  // section links to the same file) and it depicts an actual conference room table — a genuine thematic
  // match for a "sala de conferencias" hero, confirmed by viewing the image directly.
  conferencias: 'sala-conferencias.jpg',
};
const SHARED_SERVICES_DIR = 'src/assets/shared/services';

// The live site's Yoast/og:image tag defaults to whatever image WordPress decides is "first on the
// page" when no per-page featured image is set. On 6 of the redesigned pages that happens to be the
// site-wide client-logos strip thumbnail (verified in real fetched HTML: audiovisuales, megafonia,
// sistemas-informaticos, redes-wifi, seguridad and paneles all report the exact same
// ".../2021/02/logs-clientes-150x150.png" as og:image) — resolveBackupImage happily finds that filename
// in the 2021 backup (it's a real, if generic, file) and would silently use a 150x150 client-logo icon
// as the page's hero photo instead of a real one. Treat that specific filename as "not a real hero
// image" so these pages fall through to their curated FALLBACK_HERO_IMAGES entry instead.
const GENERIC_PLACEHOLDER_HERO_FILENAME = 'logs-clientes-150x150.png';

const concerns = [];
const skipped = [];

async function resolveHeroImage(entry, parsed, dir) {
  const filename = parsed.heroImage.split('/').pop() || '';
  if (filename && filename !== GENERIC_PLACEHOLDER_HERO_FILENAME) {
    try {
      await copyFile(resolveBackupImage(parsed.heroImage), `${dir}/hero.jpg`);
      return true;
    } catch (err) {
      // fall through to the curated fallback below
    }
  }

  const fallbackName = FALLBACK_HERO_IMAGES[entry.slug];
  if (fallbackName) {
    await copyFile(`${SHARED_SERVICES_DIR}/${fallbackName}`, `${dir}/hero.jpg`);
    concerns.push(
      filename === GENERIC_PLACEHOLDER_HERO_FILENAME
        ? `${entry.slug}: heroImage is the site-wide generic client-logos placeholder (not a real per-page photo), used fallback ${fallbackName}`
        : `${entry.slug}: heroImage "${parsed.heroImage}" not in backup, used fallback ${fallbackName}`
    );
    return true;
  }
  return false;
}

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

  // The Task 3 schema requires at least one section; whyChooseUs is now optional (either omitted
  // entirely or exactly 3 cards — never a partial count), since the site was redesigned at some point
  // and most pages no longer carry a "¿Por Qué Elegirnos?" 3-card block at all (see
  // task-6-continuation-report.md). Only skip when a page's real content still doesn't clear the bar
  // that *is* required (>=1 section, or a whyChooseUs count that's neither 0 nor 3) — never write YAML
  // that would fail schema validation, and never fabricate cards/sections that don't exist on the page.
  if (parsed.sections.length < 1 || (parsed.whyChooseUs.length !== 0 && parsed.whyChooseUs.length !== 3)) {
    await rm(dir, { recursive: true, force: true });
    skipped.push(
      `${entry.slug}: real extracted content has ${parsed.sections.length} section(s) and ${parsed.whyChooseUs.length} whyChooseUs card(s) ` +
        `(schema requires >=1 section and 0 or exactly 3 whyChooseUs cards) — this page's current content does not match the template the schema/parser assume; skipped rather than forcing invalid or fabricated data`
    );
    continue;
  }

  const heroOk = await resolveHeroImage(entry, parsed, dir);
  if (!heroOk) {
    await rm(dir, { recursive: true, force: true });
    skipped.push(`${entry.slug}: heroImage "${parsed.heroImage}" not found in backup and no shared/services fallback defined — skipped (heroImage is required by schema)`);
    continue;
  }

  const sections = [];
  for (const [i, section] of parsed.sections.entries()) {
    const sectionData = { heading: section.heading, body: section.body };
    if (section.imageSrc) {
      try {
        await copyFile(resolveBackupImage(section.imageSrc), `${dir}/section-${i}.jpg`);
        sectionData.image = `./${entry.slug}/section-${i}.jpg`;
      } catch (err) {
        concerns.push(`${entry.slug}: section ${i} image "${section.imageSrc}" not found in backup, left without image`);
      }
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
  };
  // whyChooseUs is schema-optional (z.array(...).length(3).optional()) — it must be omitted entirely
  // when the page has no "why choose us" block, not written as an empty array, since an empty array
  // would still fail the .length(3) check on the (optional-but-if-present) field.
  if (parsed.whyChooseUs.length > 0) {
    yamlData.whyChooseUs = parsed.whyChooseUs;
  }

  await writeFile(`src/content/services/${entry.slug}.yaml`, stringify(yamlData), 'utf-8');
  console.log(`Wrote src/content/services/${entry.slug}.yaml`);
}

if (concerns.length > 0) {
  console.log('\nConcerns (image fallbacks / missing section images):');
  for (const concern of concerns) console.log(`  - ${concern}`);
}

if (skipped.length > 0) {
  console.log(`\nSkipped ${skipped.length} of ${SERVICES_MANIFEST.length} pages (content drift vs. schema/parser expectations):`);
  for (const s of skipped) console.log(`  - ${s}`);
}
