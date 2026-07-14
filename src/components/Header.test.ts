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
