import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    test: {
        include: ["**/__tests__/**/*.[jt]s?(x)", "**/?(*.)+(spec|test).[jt]s?(x)"],
        globals: true,
        setupFiles: 'src/setupTests.js',
        environment: 'jsdom',
        testTimeout: 60000
   },
});