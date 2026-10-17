// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://charlesdays.art',
  trailingSlash: 'always',
  // Pages carry hand-written inline scripts/styles; keep output whitespace as authored.
  compressHTML: false,
});
