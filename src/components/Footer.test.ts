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
