import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://redworks.es',
  output: 'server',
  integrations: [sitemap()],
  adapter: cloudflare({
    imageService: 'compile',
    // Under Vitest, Astro's getViteConfig() resolves the full dev config, which
    // triggers this adapter's astro:server:setup hook. That hook spawns the local
    // Cloudflare Workers runtime (`workerd`) via wrangler's getPlatformProxy, which
    // isn't installed/compatible in this container and hangs/crashes test runs.
    // Component tests don't need the platform proxy, so disable it under Vitest
    // (which sets process.env.VITEST) while leaving `astro dev` unaffected.
    platformProxy: { enabled: !process.env.VITEST },
  }),
});
