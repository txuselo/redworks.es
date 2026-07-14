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
