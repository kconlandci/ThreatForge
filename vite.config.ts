import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), 'VITE_')
  return {
    plugins: [react(), tailwindcss()],
    // Select entire modules at build time so Firebase is never imported by DCI.
    // Consumer imports resolve exactly as before, including synchronous saves.
    resolve: {
      alias: env.VITE_EDITION === 'dci' ? [
        {
          find: /^@capacitor\/preferences$/,
          replacement: fileURLToPath(new URL('./src/sync/dciPreferences.ts', import.meta.url)),
        },
        {
          find: /^(?:\.\.\/|\.\/)contexts\/AuthContext$/,
          replacement: fileURLToPath(new URL('./src/contexts/DciAuthContext.tsx', import.meta.url)),
        },
        {
          find: /^(?:\.\.\/|\.\/)services\/sync$/,
          replacement: fileURLToPath(new URL('./src/sync/dciSync.ts', import.meta.url)),
        },
      ] : [],
    },
  }
})
