import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import dts from 'vite-plugin-dts';

// https://vitejs.dev/config/
export default defineConfig({

	server: {
		port: 3000,
		host: 'localhost'
	},

	plugins: [
		vue(),
		dts(),
	],

	build: {

		lib: {
			entry: fileURLToPath(new URL('./src/export.ts', import.meta.url)),
			name: 'VueWinMgr',
			fileName: (format) => `vue-win-mgr.${format}.js`,
			formats: ['es', 'umd'], // UMD for demo/dev, ESM for consumers
		},

		rollupOptions: {
			
			// Make sure to externalize Vue to avoid bundling it
			external: (id) => id === 'vue', // better than ['vue'] for ESM

			output: {
				globals: {
					vue: 'Vue',
				},
				exports: 'named', // ✅ Avoids default import creation
        		interop: 'esModule', // ✅ Tells Rollup Vue is a pure ESM module
			},
		},

		optimizeDeps: {
			exclude: ['vue'] // tell Vite not to pre-bundle vue
		},

		emptyOutDir: true, // clears dist/ before build

		// ✅ ENSURE COMMONJS INTEROP WORKS CORRECTLY
		commonjsOptions: {
			transformMixedEsModules: true,
		},

	},

	resolve: {
		alias: {
			'@': fileURLToPath(new URL('./src', import.meta.url)),
			'@classes': fileURLToPath(new URL('./src/classes', import.meta.url)),
			'@hooks': fileURLToPath(new URL('./src/hooks', import.meta.url)),
			'@components': fileURLToPath(new URL('./src/components', import.meta.url)),
			'@misc': fileURLToPath(new URL('./src/misc', import.meta.url)),
			'@demoWindows': fileURLToPath(new URL('./src/DemoWindowComponents', import.meta.url)),
			'@assets': fileURLToPath(new URL('./src/assets', import.meta.url)),
		}
	},
	base: './'

});
