import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://nykolas.me',
  trailingSlash: 'never',
  build: { format: 'file', inlineStylesheets: 'always' },
  compressHTML: true,
});
