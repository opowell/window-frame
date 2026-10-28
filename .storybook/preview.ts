import type { Preview } from '@storybook/vue3-vite'
import 'themes/tokens.css'
import 'menu-bar/style.css'
import 'appfr/style.css'
import './preview.css'

const preview: Preview = {
  parameters: {
    layout: 'fullscreen',
    controls: { expanded: true },
    backgrounds: { disable: true },
  },
}

export default preview
