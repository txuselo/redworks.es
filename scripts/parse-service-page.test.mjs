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
