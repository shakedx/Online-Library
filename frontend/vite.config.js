import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    plugins: [react()],
    build: {
        outDir: '../public',
        emptyOutDir: true,
    },
    server: {
        host: '127.0.0.1',
        port: 5173,
        strictPort: true,
        proxy: {
            // Только dev-сервер. В production React и /api работают на одном домене Vercel.
            '/api': { target: 'http://127.0.0.1:3000', changeOrigin: false },
        },
    },
});
