import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages（プロジェクトサイト）は /リポジトリ名/ で配信されるため、
// CI では VITE_BASE_PATH=/repo名 を渡す。ローカルは未設定で '/'。
const rawBase = process.env.VITE_BASE_PATH?.trim()
const base =
  !rawBase || rawBase === '/'
    ? '/'
    : rawBase.endsWith('/')
      ? rawBase
      : `${rawBase}/`

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'AINAN 釣り×街おこし',
        short_name: 'AINAN',
        display: 'standalone',
        theme_color: '#0d6b5c',
        background_color: '#f0f7f5',
        start_url: base,
        // icons は public/ に icon-192.png, icon-512.png を置くとインストール可能に
      },
      workbox: { globPatterns: ['**/*.{js,css,html,ico,png,svg}'] }
    })
  ]
})
