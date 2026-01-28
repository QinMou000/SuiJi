import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  build: {
    sourcemap: 'hidden',
  },
  plugins: [
    react({
      babel: {
        plugins: [
          'react-dev-locator',
        ],
      },
    }),
    tsconfigPaths(),
    // 暂时禁用 PWA 插件，避免 Service Worker 缓存导致 App 无法更新
    // VitePWA({
    //   registerType: 'autoUpdate',
    //   includeAssets: ['favicon.svg'],
    //   manifest: {
    //     name: '随记 - 随时随地记录生活',
    //     short_name: '随记',
    //     description: '极简黑白风格的本地记录APP',
    //     theme_color: '#ffffff',
    //     background_color: '#ffffff',
    //     display: 'standalone',
    //     scope: '/',
    //     start_url: '/',
    //     orientation: 'portrait',
    //     icons: [
    //       {
    //         src: 'favicon.svg',
    //         sizes: '192x192',
    //         type: 'image/svg+xml'
    //       },
    //       {
    //         src: 'favicon.svg',
    //         sizes: '512x512',
    //         type: 'image/svg+xml'
    //       }
    //     ]
    //   },
    //   workbox: {
    //     runtimeCaching: [
    //       {
    //         urlPattern: /^https:\/\/api\.microlink\.io\/.*/i,
    //         handler: 'NetworkFirst',
    //         options: {
    //           cacheName: 'link-previews',
    //           expiration: {
    //             maxEntries: 50,
    //             maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
    //           },
    //           cacheableResponse: {
    //             statuses: [0, 200]
    //           }
    //         }
    //       }
    //     ]
    //   }
    // })
  ],
})
