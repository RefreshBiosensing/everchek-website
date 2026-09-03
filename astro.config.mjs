import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://ever-chek.com',
  integrations: [
    sitemap({
      // Internal-only pages must stay out of the sitemap.
      filter: (page) => !page.includes('/blocks-demo'),
    }),
  ],
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'fr'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
});
