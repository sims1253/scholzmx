import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      date: z.coerce.date(),
      lastUpdated: z.coerce.date().optional(),
      tags: z.array(z.string()).optional(),
      categories: z.array(z.string()).optional(),
      author: z.string().optional(),
      heroImage: z.union([image(), z.string()]).optional(),
      heroImagePositionX: z.number().optional(),
      heroImagePositionY: z.number().optional(),
      heroImageScale: z.number().optional(),
      images: z.array(image()).optional(),
      draft: z.boolean().optional().default(false),
    }),
});

const recipes = defineCollection({
  type: 'content',
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      servings: z.string(),
      time: z.string(),
      season: z.string(),
      tags: z.array(z.string()).optional(),
      ingredients: z.array(z.string()).optional(),
      equipment: z.array(z.string()).optional(),
      heroImage: image().optional(),
      draft: z.boolean().optional().default(false),
    }),
});

const notes = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    type: z.enum(['thought', 'observation', 'draft', 'idea', 'reference']).default('thought'),
    tags: z.array(z.string()).optional(),
    created: z.coerce.date(),
    updated: z.coerce.date().optional(),
    connections: z.array(z.string()).optional(), // Array of note slugs that this note connects to
    draft: z.boolean().optional().default(false),
  }),
});

export const collections = {
  blog,
  recipes,
  notes,
};
