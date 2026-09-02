import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// TODO: replace with the real production domain once purchased,
// e.g. 'https://www.p20medical.com'
export default defineConfig({
  site: 'https://p20-website.pages.dev',
  integrations: [
    sitemap({
      // Internal-only pages must stay out of the sitemap.
      filter: (page) => !page.includes('/blocks-demo'),
    }),
  ],
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
});
