// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
	site: 'https://seankoray.github.io',
	output: 'static',
	trailingSlash: 'always',
	integrations: [sitemap()],
	i18n: {
		locales: ['en', 'zh'],
		defaultLocale: 'en',
		routing: {
			prefixDefaultLocale: false,
		},
	},
});
