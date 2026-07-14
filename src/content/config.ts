import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

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
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    metaDescription: z.string(),
    heroTitle: z.string(),
  }),
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      metaDescription: z.string(),
      excerpt: z.string(),
      heroImage: image(),
      heroImageAlt: z.string(),
      publishDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      relatedService: z.string().optional(),
      faqs: z
        .array(
          z.object({
            question: z.string(),
            answer: z.string(),
          })
        )
        .optional(),
    }),
});

export const collections = { services, pages, blog };
