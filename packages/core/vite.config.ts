import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({

	plugins: [
		dts({ rollupTypes: false, include: ['src'] }),
	],

	build: {
		lib: {
			entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
			name: 'WinMgrCore',
			fileName: () => 'index.js',
			formats: ['es'],
		},
		emptyOutDir: true,
		minify: false,
		sourcemap: true,
	},
});
