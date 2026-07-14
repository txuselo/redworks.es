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

    // The site was redesigned at some point: the classic template (electricidad, telefonia-voip)
    // headed its prose sections with elementor-size-default and its "why choose us" block with
    // elementor-size-large. Most of the redesigned pages kept elementor-size-default for their prose
    // headings, but real fetched HTML shows a genuine mix — some redesigned pages (videoconferencias,
    // conferencias) use elementor-size-xl instead, and others (megafonia, paneles,
    // instalacion-electrica-de-baja-tension) use elementor-size-large for prose that has nothing to do
    // with "why choose us". None of the redesigned pages have a "why choose us" block at all. So rather
    // than assuming heading *size* determines role, match on any of the three real classes and branch on
    // heading *text* instead — this generalizes correctly across both templates without misclassifying
    // anything (verified: "TRABAJAMOS CON" only ever appears on elementor-size-default across every page
    // checked, and "Por Qué Elegirnos" only ever appears on elementor-size-large, on the 2 pages that have
    // it at all).
    const h2 = section
      .find(
        [
          'h2.elementor-heading-title.elementor-size-default',
          'h2.elementor-heading-title.elementor-size-xl',
          'h2.elementor-heading-title.elementor-size-large',
        ].join(', ')
      )
      .first();
    if (!h2.length) return;

    // Elementor renders separate desktop/mobile variants of the same content side by side in the
    // markup (one wrapped in elementor-hidden-mobile, its twin in elementor-hidden-desktop, either as
    // the whole top-level section or nested one column deeper), toggling which one is visible via CSS
    // per breakpoint. Left unfiltered, both variants get extracted as separate near-duplicate sections
    // (verified on conferencias and videoconferencias, e.g. "Sistemas Inalámbricos" / "Sistemas
    // inalámbricos"). Skip anything whose heading sits inside an elementor-hidden-desktop ancestor
    // (section or column) so only the desktop-rendered copy of each section survives.
    if (h2.closest('.elementor-hidden-desktop').length > 0) return;

    const heading = collapse(h2.text());

    if (heading.toUpperCase().includes('TRABAJAMOS CON')) return;

    if (heading.toLowerCase().includes('por qué elegirnos')) {
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
      return;
    }

    const bodyParts = section
      .find('.elementor-widget-text-editor .elementor-widget-container')
      .map((__, el) => $(el).text())
      .get();
    const body = collapse(bodyParts.join(' '));
    const imageSrc = section.find('.elementor-widget-image img').first().attr('src') || undefined;
    sections.push({ heading, body, imageSrc });
  });

  return { title, metaDescription, heroImage, heroTitle, sections, whyChooseUs };
}
