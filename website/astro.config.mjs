import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'
import tailwind from '@astrojs/tailwind'
import config from './conf/config.js'

const integrations = config.base_url ? [sitemap()] : []

// https://astro.build/config
export default defineConfig({
	site: config.base_url || undefined,
	output: 'static',
	integrations: [tailwind(), ...integrations]
})
