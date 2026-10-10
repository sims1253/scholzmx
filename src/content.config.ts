import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';
import { checkRecipe } from './lib/recipe';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
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
  loader: glob({ pattern: '**/*.md', base: './src/content/recipes' }),
  schema: ({ image }) =>
    z
      .object({
        title: z.string(),
        description: z.string(),
        servings: z.string(),
        time: z.string(),
        date: z.coerce.date().optional(),
        tags: z.array(z.string()).optional(),
        /** Scaling multiplies this, e.g. { amount: 15, unit: 'rolls' }. */
        makes: z.object({ amount: z.number().positive(), unit: z.string() }).optional(),
        /** Minutes of chopping and weighing before the first step. */
        prepMinutes: z.number().nonnegative().optional(),
        equipment: z.array(z.string()).optional(),
        ingredients: z
          .array(
            z.object({
              id: z.string(),
              name: z.string(),
              amount: z.number().positive().optional(),
              unit: z.string().optional(),
              prep: z.string().optional(),
              note: z.string().optional(),
              scales: z.boolean().optional(),
            })
          )
          .optional(),
        steps: z
          .array(
            z.object({
              id: z.string(),
              uses: z.array(z.string()).min(1),
              do: z.string(),
              detail: z.string().optional(),
              minutes: z
                .union([z.number().positive(), z.tuple([z.number(), z.number()])])
                .optional(),
              wait: z.boolean().optional(),
              heat: z.string().optional(),
              result: z.string().optional(),
            })
          )
          .optional(),
        meanwhile: z.array(z.object({ do: z.string(), during: z.string() })).optional(),
        heroImage: image().optional(),
        heroImagePositionX: z.number().optional(),
        heroImagePositionY: z.number().optional(),
        heroImageScale: z.number().optional(),
        draft: z.boolean().optional().default(false),
      })
      // A recipe table that doesn't add up should fail the build, not mislead a cook.
      .superRefine((data, ctx) => {
        if (!data.steps) return;
        for (const message of checkRecipe(data.ingredients ?? [], data.steps, data.meanwhile)) {
          ctx.addIssue({ code: 'custom', message });
        }
      }),
});

const notes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/notes' }),
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
