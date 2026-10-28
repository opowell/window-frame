import type { StorybookConfig } from '@storybook/vue3-vite'

const config: StorybookConfig = {
  stories: ['../stories/**/*.stories.ts'],
  /**
   * Served verbatim, for the story that proves the built artifacts run with no
   * build step. Nothing under these paths may pass through a bundler: the page
   * at `/no-build` fetches them over HTTP exactly as a static host would serve
   * them, and `.vue` files have to arrive as source for the loader to compile.
   */
  staticDirs: [
    { from: '../stories/no-build', to: '/no-build' },
    { from: '../dist', to: '/dist' },
    { from: '../node_modules/themes/dist', to: '/vendor/themes' },
    { from: '../node_modules/menu-bar/dist', to: '/vendor/menu-bar' },
    { from: '../node_modules/appfr/dist', to: '/vendor/appfr' },
    { from: '../node_modules/vue/dist', to: '/vendor/vue' },
    { from: '../node_modules/vue3-sfc-loader/dist', to: '/vendor/vue3-sfc-loader' },
  ],
  framework: {
    name: '@storybook/vue3-vite',
    options: {},
  },
  core: {
    disableTelemetry: true,
  },
}

export default config
