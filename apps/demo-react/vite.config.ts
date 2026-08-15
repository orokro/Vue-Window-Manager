import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The demo runs against the packages' SOURCE, not their build output, so a change in
// the core shows up in the browser without a rebuild step in between.
export default defineConfig({

	plugins: [react()],

	resolve: {
		alias: {
			'@win-mgr/core': fileURLToPath(new URL('../../packages/core/src/index.ts', import.meta.url)),
			'react-win-mgr': fileURLToPath(new URL('../../packages/react/src/index.ts', import.meta.url)),
		},
	},

	server: {
		port: 5174,
	},
});
