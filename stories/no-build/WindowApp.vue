<!--
  The second host this page can mount: the panel grid rather than the shell.
  `?app=window` picks it, and the loader compiles this file and the two panel
  components it imports the same way it compiles `App.vue`.

  Everything the layout is made of — `row`, `column`, `panelNode` — comes out
  of `dist/index.js` as plain functions, so the arrangement is data the host
  builds here and hands over.
-->
<script setup>
import { ref } from 'vue'
import { WindowFrame, column, panelNode, row } from 'header-content-layout'
import ItemsPanel from './ItemsPanel.vue'
import SourcesPanel from './SourcesPanel.vue'

const params = new URLSearchParams(location.search)
const theme = params.get('theme') ?? 'minimal'

/*
 * The panel *list* is the host's, which is why closing one is a filter down
 * here rather than something the window does to itself.
 */
const panels = ref([
  {
    id: 'items',
    title: 'Items',
    subtitle: 'entity:items',
    // Offered under *View* in this panel's own menu. What each key means is
    // the slot's business, not the window's.
    views: [
      { key: 'table', label: 'Table' },
      { key: 'list', label: 'List' },
      { key: 'grid', label: 'Grid' },
      { key: 'cards', label: 'Cards' },
    ],
    defaultView: params.get('view') ?? 'table',
  },
  { id: 'sources', title: 'Sources', subtitle: '5 scrapers' },
  { id: 'activity', title: 'Activity', subtitle: 'live' },
])

// A row whose second child is a column: the shape a tree gives you for free.
const layout = ref(
  row([panelNode('items'), column([panelNode('sources'), panelNode('activity')])], [0.62, 0.38]),
)

const ACTIVITY = [
  '09:14:02  index rebuilt in 4.2s',
  '09:14:44  scraper hacker-news → 38 new',
  '09:15:10  price rule matched 12 items',
  '09:15:11  digest queued for 17:00',
  '09:16:38  scraper rss-bridge → 0 new',
  '09:17:02  recall notice · rev 2 stored',
]

function closePanel(id) {
  panels.value = panels.value.filter((panel) => panel.id !== id)
}
</script>

<template>
  <WindowFrame
    v-model:layout="layout"
    :panels="panels"
    :theme="theme"
    movable
    closable
    @panel-close="closePanel"
  >
    <!-- A panel's content is whatever its slot renders. This one is a
         component of the host's own, in a file of its own, compiled after
         the page loaded — the same as this one. -->
    <template #panel-items="{ view }">
      <ItemsPanel :view="view" />
    </template>

    <template #panel-sources>
      <SourcesPanel />
    </template>

    <!-- And this one is markup right here, to show that a panel needs no
         component at all. -->
    <template #panel-activity>
      <pre class="host-log dc-mono">{{ ACTIVITY.join('\n') }}</pre>
    </template>
  </WindowFrame>
</template>

<style scoped>
.host-log {
  margin: 0;
  padding: 12px;
  font: inherit;
  font-size: var(--dc-text-micro, 11px);
  line-height: 1.8;
  color: var(--dc-fg-2, #444);
  white-space: pre-wrap;
}
</style>
