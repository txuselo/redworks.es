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
};
const SHARED_SERVICES_DIR = 'src/assets/shared/services';

const concerns = [];
const skipped = [];

async function resolveHeroImage(entry, parsed, dir) {
  try {
    await copyFile(resolveBackupImage(parsed.heroImage), `${dir}/hero.jpg`);
    return true;
  } catch (err) {
    const fallbackName = FALLBACK_HERO_IMAGES[entry.slug];
    if (fallbackName) {
      await copyFile(`${SHARED_SERVICES_DIR}/${fallbackName}`, `${dir}/hero.jpg`);
      concerns.push(`${entry.slug}: heroImage "${parsed.heroImage}" not in backup, used fallback ${fallbackName}`);
      return true;
    }
    return false;
  }
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

  // The Task 3 schema requires at least one section and exactly three whyChooseUs cards. The parser
  // (Task 4) was built and fixture-tested against the site's older Elementor template; several live
  // pages have since been redesigned and no longer carry a "¿Por Qué Elegirnos?" 3-card block (or any
  // prose sections) at all, at any Wayback snapshot available for that URL. Rather than writing YAML
  // that will fail schema validation — or fabricating cards/sections that don't exist on the real page —
  // skip this slug and surface it as a concern for a human decision (see task-6-report.md).
  if (parsed.sections.length < 1 || parsed.whyChooseUs.length !== 3) {
    await rm(dir, { recursive: true, force: true });
    skipped.push(
      `${entry.slug}: real extracted content has ${parsed.sections.length} section(s) and ${parsed.whyChooseUs.length} whyChooseUs card(s) ` +
        `(schema requires >=1 and exactly 3) — this page's current content does not match the template the schema/parser assume; skipped rather than forcing invalid or fabricated data`
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
    whyChooseUs: parsed.whyChooseUs,
  };

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
