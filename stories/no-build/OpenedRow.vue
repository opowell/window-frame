<!--
  A second SFC, imported by `App.vue` with a relative path. It is here to show
  that runtime compilation is not a one-file trick: the loader resolves this
  import, fetches this file, compiles its template, and hands its scoped style
  to the page — all after the page has already loaded.
-->
<script setup>
defineProps({
  row: { type: Object, default: null },
})
</script>

<template>
  <span
    class="host-note"
    :data-open="row ? 'true' : 'false'"
  >
    <template v-if="row">Opened <strong>{{ row.primary }}</strong></template>
    <template v-else>Open a record</template>
  </span>
</template>

<style scoped>
.host-note {
  padding: 3px 9px;
  border: 1px solid var(--dc-line-2, #ddd);
  border-radius: var(--dc-radius-sm, 4px);
  font-size: var(--dc-text-micro, 11px);
  color: var(--dc-fg-3, #666);
  white-space: nowrap;
}

.host-note[data-open='true'] {
  color: var(--dc-fg-1, #222);
}
</style>
