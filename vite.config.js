import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		vue(),
	],
	resolve: {
		alias: {
			'@': fileURLToPath(new URL('./src', import.meta.url)),
			'@classes': fileURLToPath(new URL('./src/classes', import.meta.url)),
			'@hooks': fileURLToPath(new URL('./src/hooks', import.meta.url)),
			'@components': fileURLToPath(new URL('./src/components', import.meta.url)),
			'@misc': fileURLToPath(new URL('./src/misc', import.meta.url)),
		}
	},
	base: './'

});
