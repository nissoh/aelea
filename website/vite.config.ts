import replace from '@rollup/plugin-replace'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import tsconfigPaths from 'vite-tsconfig-paths' // Import the plugin
import { dark } from './src/common/theme.js'

const SITE_CONFIG = {
  __WEBSITE__: 'https://puppet.house',
  __TWITTER_ID__: '@PuppetCopy',
  __APP_NAME__: 'Puppet',
  __APP_DESC_SHORT__: 'Puppet - Copy Trading',
  __APP_DESC_LONG__: 'Copy Trading Protocol - Matching the best traders with investors',
  __OG_IMAGE__: '/.netlify/functions/og-middlware',
  __THEME_PRIMARY__: dark.pallete.primary,
  __THEME_BACKGROUND__: dark.pallete.horizon,
}

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          subgraph: [
            'ponder',
          ],
          middleware: [
            '@puppet/middleware/const',
            '@puppet/middleware/core',
            '@puppet/middleware/wallet',
            '@puppet/middleware/utils',
            '@puppet/middleware/gmx',
            '@puppet/middleware/gbc',
            '@puppet/middleware/ui-components',
            '@puppet/middleware/ui-router',
            '@puppet/middleware/ui-storage',
          ],
          vendor: [
            '@aelea/core',
            '@aelea/dom',
            '@aelea/router',
            '@aelea/ui-components',
            '@aelea/ui-components-theme',
            '@most/core',
            '@most/disposable',
            '@most/prelude',
            '@most/scheduler',
            '@most/types',
            'color',
            'mersenne-twister',
            'abitype',
            'viem',
          ],
          wallet: [
            "@reown/appkit",
            "@reown/appkit-adapter-wagmi",
            "@wagmi/core"
          ],
          charts: ['lightweight-charts'],
        },
      },
    },
  },
  server: {
    port: Number(process.env.PORT) || 3000,
  },
  plugins: [
    tsconfigPaths(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      injectManifest: {
        maximumFileSizeToCacheInBytes: 3000000,
        globPatterns: ['**/*.{js,html,woff2}']
      },
      injectRegister: 'auto',
      srcDir: 'src/sw',
      filename: 'service-worker.ts',
      pwaAssets: {
        config: true,
        overrideManifestIcons: true,
      },
      manifest: {
        name: SITE_CONFIG.__APP_NAME__,
        short_name: SITE_CONFIG.__APP_NAME__,
        description: SITE_CONFIG.__APP_DESC_LONG__,
        theme_color: SITE_CONFIG.__THEME_BACKGROUND__,
        background_color: SITE_CONFIG.__THEME_BACKGROUND__,
        lang: "en",
        // start_url: '/',
        display: "standalone",
        orientation: "portrait-primary",
        categories: ["Copy Trading", "Decentralized Perpetual Exchange", "DeFi"],
        screenshots: [
          { src: "assets/screenshot/narrow1.png", type: "image/png", sizes: "828x1792", form_factor: "narrow" },
          { src: "assets/screenshot/narrow2.png", type: "image/png", sizes: "828x1792", form_factor: "narrow" },

          { src: "assets/screenshot/wide1.png", type: "image/png", sizes: "3260x1692", form_factor: "wide" },
          { src: "assets/screenshot/wide2.png", type: "image/png", sizes: "3260x1692", form_factor: "wide" }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        
      },
      mode: 'development',
      devOptions: {
        enabled: true,
        navigateFallback: 'index.html',
        suppressWarnings: true,
        type: 'module',
      },
    }),
    replace({
      preventAssignment: true,
      include: 'index.html',
      ...SITE_CONFIG
    })
  ],
})