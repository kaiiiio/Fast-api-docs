import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Vite Configuration File.
 * Guides the build process and dev server settings.
 */
export default defineConfig({
    plugins: [react()], // Use React plugin for JSX/TSX support
    server: {
        port: 5173, // Default Vite port
        host: true, // Needed for Docker exposure
    },
})
