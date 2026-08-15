import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({

	plugins: [
		dts({ include: ['src'] }),
	],

	build: {
		lib: {
			entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
			name: 'ReactWinMgr',
			fileName: () => 'index.js',
			formats: ['es'],
		},
		rollupOptions: {
			external: ['react', 'react-dom', 'react/jsx-runtime', 'react-dom/client'],
		},
		emptyOutDir: true,
		minify: false,
		sourcemap: true,
	},
});
