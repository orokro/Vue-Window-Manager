import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		vue(),
	],

	build: {
		lib: {
			entry: fileURLToPath(new URL('./src/export.ts', import.meta.url)),
			name: 'VueWinMgr',
			fileName: (format) => `vue-win-mgr.${format}.js`,
		},
		rollupOptions: {
			// Make sure to externalize Vue to avoid bundling it
			external: ['vue'],
			output: {
				globals: {
					vue: 'Vue',
				},
			},
		},
		emptyOutDir: true, // clears dist/ before build
	},

	resolve: {
		alias: {
			'@': fileURLToPath(new URL('./src', import.meta.url)),
			'@classes': fileURLToPath(new URL('./src/classes', import.meta.url)),
			'@hooks': fileURLToPath(new URL('./src/hooks', import.meta.url)),
			'@components': fileURLToPath(new URL('./src/components', import.meta.url)),
			'@misc': fileURLToPath(new URL('./src/misc', import.meta.url)),
			'@demoWindows': fileURLToPath(new URL('./src/DemoWindowComponents', import.meta.url)),
		}
	},
	base: './'

});
