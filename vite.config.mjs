import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react()], build: { outDir: 'dist/client', manifest: true, rollupOptions: { input: 'src/entry-client.jsx' } } });
