import { cp, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// GitHub Pages（プロジェクトサイト）は /リポジトリ名/ で配信されるため、
// CI では VITE_BASE_PATH=/repo名 を渡す。ローカルは未設定で '/'。
const rawBase = process.env.VITE_BASE_PATH?.trim()
const base =
  !rawBase || rawBase === '/'
    ? '/'
    : rawBase.endsWith('/')
      ? rawBase
      : `${rawBase}/`

// Phaser 側は実行時に文字列パスで画像を読むため、Vite の通常の
// import 解析だけでは fishing-game/assets が dist にコピーされない。
// writeBundle で明示的にコピーし、GitHub Pages でも同じパスを維持する。
const copyFishingAssets = () => ({
  name: 'copy-fishing-game-assets',
  apply: 'build' as const,
  async writeBundle(outputOptions: { dir?: string }) {
    const outputDir = path.resolve(__dirname, outputOptions.dir ?? 'dist')
    const source = path.resolve(__dirname, 'fishing-game/assets')
    const target = path.join(outputDir, 'fishing-game/assets')
    await mkdir(path.dirname(target), { recursive: true })
    await cp(source, target, { recursive: true, force: true })
  },
})

export default defineConfig({
  base,
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        fishing: path.resolve(__dirname, 'fishing-game/index.html'),
      },
    },
  },
  plugins: [
    react(),
    copyFishingAssets(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'AINAN 釣り×町おこし',
        short_name: 'AINAN',
        display: 'standalone',
        theme_color: '#0d6b5c',
        background_color: '#f0f7f5',
        start_url: base,
        icons: [
          {
            src: 'ainan-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
      },
    }),
  ],
})
