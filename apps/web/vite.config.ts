import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'
import tsConfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  server: {
    port: Number(process.env.WEB_PORT) || 3000,
  },
  plugins: [
    tsConfigPaths({ projects: ['./tsconfig.json'] }),
    tanstackStart(),
    nitro({ config: { preset: 'vercel' } }),
    tailwindcss(),
    react(),
  ],
})
