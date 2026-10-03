import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      workbox: { navigateFallbackDenylist: [/^\/login/, /^\/logout/] },
      manifest: {
        name: 'Two Skies',
        short_name: 'Two Skies',
        theme_color: '#0b1020',
        background_color: '#0b1020',
        display: 'standalone',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
    }),
  ],
  server: { host: true },
  preview: { host: true, port: 47318, strictPort: true, allowedHosts: true },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
})
