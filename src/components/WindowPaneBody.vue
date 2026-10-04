<script setup lang="ts">
/*
 * The content of one panel inside a pane. Its own component so that each panel
 * rendered in a pane — the tab on top, and any kept alive behind it — is told
 * which panel it is: content registering items in its panel's menu has to name
 * its own panel, not whichever tab happens to be on top.
 *
 * `display: contents`, so the body lays the content out exactly as it would
 * with nothing in between; `v-show` hiding it is the only thing it adds.
 */
import { computed } from 'vue'
import { useWindowContext } from '../composables/windowContext'
import { providePaneContext } from '../composables/paneMenu'

const props = defineProps<{
  panel: string
  /** Whether this panel is the tab on top and the one with focus. */
  active: boolean
}>()

const win = useWindowContext()

providePaneContext({ panel: computed(() => props.panel) })

const Content = () => {
  const panel = win.panelFor(props.panel)
  return panel ? (win.renderContent(panel, win.viewFor(props.panel), props.active) ?? null) : null
}
</script>

<template>
  <div
    class="dc-pane__content"
    :data-dc-panel="props.panel"
  >
    <Content />
  </div>
</template>

<style scoped>
.dc-pane__content {
  display: contents;
}
</style>
