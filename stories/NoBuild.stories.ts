import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { defineComponent, h } from 'vue'

/**
 * Nothing in this file may import from `../src` — that would put the library
 * back through Storybook's bundler and quietly test the source instead of the
 * artifacts. The subject is the static page at `stories/no-build/index.html`,
 * which is served untouched and framed here in an iframe of its own.
 */
const NoBuildPage = defineComponent({
  name: 'NoBuildPage',
  props: {
    /** Query string handed to the page, and on to the window inside it. */
    search: { type: String, default: '' },
  },
  setup(props) {
    return () =>
      h('div', { class: 'sb-frame' }, [
        h('iframe', {
          // Keyed on the search, so changing a control reloads the page rather
          // than leaving the previous run's checklist on screen.
          key: props.search,
          src: `/no-build/index.html${props.search}`,
          title: 'window-frame with no build step',
          style: 'flex:1; min-height:0; width:100%; border:0',
        }),
      ])
  },
})

const meta = {
  title: 'No Build / Static Page',
  component: NoBuildPage,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: [
          'Proof that `dist/` is usable with no build step at all. The frame',
          'below is a plain HTML file — `stories/no-build/index.html` — served',
          'as it sits on disk. It has an import map, one `<script type=module>`',
          'and `<link>`s to the shipped stylesheets, and that is the whole of',
          'its machinery.',
          '',
          'The host application is written as real SFCs. They are fetched as',
          '`.vue` *source* and compiled in the browser by vue3-sfc-loader, so',
          'the code in them is the same code you would write against a bundler —',
          'bare `import` of `window-frame` and `appfr`, `<script setup>`, scoped',
          'styles, relative imports between them.',
          '',
          'The strip across the top is the verification. Each line is a check',
          'the page ran on itself: the artifacts imported, the SFCs compiled',
          'after load, the window mounted with its panels, and the stylesheets',
          'actually applied. `MissingStylesheet` is the negative control — it',
          'removes the stylesheets so you can see the checks fail.',
          '',
          'These stories read `dist/`, not `src/`. Run `npm run build` first,',
          'or you are looking at the artifacts from the last build.',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof NoBuildPage>

export default meta

type Story = StoryObj<typeof meta>

/**
 * A panel grid, dragged and resized and closed, all of it from
 * `dist/index.js`.
 *
 * Two of the three panels are filled by components the host wrote as its own
 * `.vue` files. `ItemsPanel.vue` is the worked one — it provides the shell
 * context from `useQueryState` and `useResults` and renders `ResultsArea`
 * inside the pane, so what is in that panel is a real query against real rows.
 * `SourcesPanel.vue` is the plainer kind: its own markup, a `StatusPill` from
 * the shell, and a scoped style the loader injects. The third panel is markup
 * in the slot, to show a panel needs no component at all.
 *
 * Everything the window does is here: drag a header onto another panel, pull a
 * boundary, take the menu on a pane, close one.
 */
export const PanelGrid: Story = { args: { search: '' } }

/**
 * The same window with the items panel opened on a different view. The choice
 * is the panel's own — declared in `WindowApp.vue`, offered under *View* in that
 * pane's menu, and handed to the slot, which passes it to `ItemsPanel.vue`.
 */
export const PanelGridAsCards: Story = { args: { search: '?view=cards' } }

/**
 * With the three files the loader compiled shown beside the window they
 * became: the entry, and the two panel components it imports.
 */
export const PanelGridWithHostSource: Story = { args: { search: '?source' } }

/** And under a shipped palette, which the window takes from its `theme` prop. */
export const PanelGridThemed: Story = { args: { search: '?theme=windows' } }

/**
 * The negative control. `?no-css` removes the `<link>`s to the stylesheets
 * before they can apply, and the checklist says so: the window still mounts,
 * but it has no tokens and is not a query container.
 */
export const MissingStylesheet: Story = { args: { search: '?no-css' } }
