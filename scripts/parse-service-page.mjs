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
