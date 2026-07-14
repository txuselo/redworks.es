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
        .length(3)
        .optional(),
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
