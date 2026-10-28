import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

const entry = (path: string) => fileURLToPath(new URL(path, import.meta.url))

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      'window-frame': entry('./src/index.ts'),
    },
  },
  build: {
    target: 'es2022',
    cssCodeSplit: false,
    lib: {
      entry: { index: entry('./src/index.ts') },
      formats: ['es'],
    },
    rollupOptions: {
      // The menus come from `menu-bar` and its stylesheet, and the tokens from
      // `themes/tokens.css` — each loaded by the page once, not copied in here.
      external: ['vue', /^themes(\/|$)/, /^menu-bar(\/|$)/],
      output: { assetFileNames: 'style.css' },
    },
  },
  test: {
    // Unit tests only. Component behaviour is covered by the Playwright specs
    // in tests/e2e, which drive the real stories in a real browser.
    environment: 'jsdom',
    globals: true,
    include: ['tests/unit/**/*.spec.ts'],
    restoreMocks: true,
  },
})
