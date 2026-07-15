import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const localizedText = z.object({
	en: z.string().trim().min(1),
	zh: z.string().trim().min(1),
});

const courses = defineCollection({
	loader: glob({ pattern: '**/*.{yaml,yml}', base: './src/content/courses' }),
	schema: z.object({
		order: z.number().int().positive(),
		title: localizedText,
		description: localizedText,
		resources: z
			.array(
				z.object({
					path: z.string().trim().min(1),
					order: z.number().int().positive(),
					title: localizedText,
					description: localizedText.optional(),
					updated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
				}),
			)
			.default([]),
	}),
});

export const collections = { courses };
