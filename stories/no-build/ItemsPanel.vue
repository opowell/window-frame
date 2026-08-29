<!--
  A panel's content, written by the host as its own component — and compiled in
  the page like every other file here.

  Nothing in it is window-specific. It is the shell's query state and results,
  both exported on their own, provided as a context for `ResultsArea` to read,
  with the view the window's menu is on pushed into the query. A host with its
  own table would bind that view to its own renderer instead.
-->
<script setup>
import { computed, watch } from 'vue'
import {
  ResultsArea,
  createMemoryAdapter,
  createMockDataSource,
  isViewKind,
  provideShellContext,
  useQueryState,
  useResults,
} from 'header-content-layout'
import { iRadarSchema } from 'header-content-layout/fixtures'

const props = defineProps({
  /** The view the window's menu is on, handed down by the panel slot. */
  view: { type: String, default: 'table' },
})

const LIMIT = 50

// In memory, so this panel's query stays its own and never reaches the address
// bar the page is otherwise bound to.
const adapter = createMemoryAdapter('?e=items')
const schema = computed(() => iRadarSchema)
const limit = computed(() => LIMIT)

const query = useQueryState({ schema, adapter })
const source = computed(() => createMockDataSource({ seed: iRadarSchema.key }))
const results = useResults({
  source,
  query: query.query,
  schema,
  entity: query.entity,
  limit,
})

provideShellContext({
  ...query,
  schema,
  entities: computed(() => iRadarSchema.entities),
  rows: results.rows,
  total: results.total,
  limit,
  offset: results.offset,
  pageCount: results.pageCount,
  pending: results.pending,
  error: results.error,
  source,
  previewsPerType: computed(() => 3),
  pinnable: computed(() => false),
  isPinned: () => false,
  isPinnedId: () => false,
  togglePin: () => {},
  activate: () => {},
  create: () => {},
})

watch(
  () => props.view,
  (view) => {
    if (isViewKind(view)) query.setView(view)
  },
  { immediate: true },
)
</script>

<template>
  <ResultsArea />
</template>
