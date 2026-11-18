import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';
import { checkRecipe, tie } from './lib/recipe';

/** A recipe's running text: a number in it stays on the line of its unit. */
const text = () => z.string().transform(tie);

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
        /** When the recipe was added. */
        date: z.coerce.date(),
        tags: z.array(z.string()).optional(),
        /** Scaling multiplies this, e.g. { amount: 15, unit: 'rolls' }. */
        makes: z.object({ amount: z.number().positive(), unit: z.string() }).optional(),
        /** Minutes of chopping and weighing before the first step. */
        prepMinutes: z.number().nonnegative().optional(),
        /** Plain text, or { name, doubled } when doubling needs different gear. */
        equipment: z
          .array(
            z.union([
              text().transform((name) => ({ name })),
              z.object({ name: text(), doubled: text().optional() }),
            ])
          )
          .optional(),
        ingredients: z
          .array(
            z.object({
              id: z.string(),
              name: z.string(),
              amount: z.number().positive().optional(),
              unit: z.string().optional(),
              prep: text().optional(),
              note: text().optional(),
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
              detail: text().optional(),
              minutes: z
                .union([z.number().positive(), z.tuple([z.number(), z.number()])])
                .optional(),
              wait: z.boolean().optional(),
              heat: z.string().optional(),
              result: z.string().optional(),
              /** The why and the tips; amounts in braces scale with the recipe. */
              notes: z.array(text()).optional(),
              /** `alt` says what the picture shows; `caption` what it tells the cook. */
              photo: z.object({ src: image(), alt: z.string(), caption: text() }).optional(),
              /** Stages of a timed step; they add up to `minutes`. */
              timers: z
                .array(z.object({ minutes: z.number().positive(), cue: text().optional() }))
                .optional(),
              /** The instruction when halved or doubled, where `detail` would be wrong. */
              halved: text().optional(),
              doubled: text().optional(),
            })
          )
          .optional(),
        meanwhile: z.array(z.object({ do: text(), during: z.string() })).optional(),
        heroImage: image().optional(),
        /** What the hero picture shows, for whoever cannot see it. */
        heroAlt: z.string().optional(),
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

export const collections = {
  blog,
  recipes,
};
