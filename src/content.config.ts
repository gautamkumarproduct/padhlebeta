import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    author: z.string().default('Padhle Beta'),
    tags: z.array(z.string()).default([]),
    category: z.enum(['NEET', 'JEE', 'Boards', 'Productivity', 'Print Tips', 'Tools']).default('Productivity'),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
