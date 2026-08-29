<!--
  A second panel of the host's own, and the plainer kind: a list it renders
  itself, borrowing one component and a few tokens from the library. Its scoped
  style is compiled and injected here in the page along with its template.
-->
<script setup>
import { StatusPill } from 'header-content-layout'

const SOURCES = [
  { name: 'Hacker News', url: 'news.ycombinator.com', status: 'ok' },
  { name: 'RSS bridge', url: 'rss.example.dev/feed', status: 'running' },
  { name: 'Supplier directory', url: 'example.com/eu', status: 'queued' },
  { name: 'Regulatory filings', url: 'sec.example.gov', status: 'review' },
  { name: 'Recall notices', url: 'recalls.example.org', status: 'failed' },
]
</script>

<template>
  <ul class="host-sources">
    <li
      v-for="source in SOURCES"
      :key="source.name"
      class="host-sources__row"
    >
      <span class="host-sources__name dc-truncate">{{ source.name }}</span>
      <span class="host-sources__url dc-mono dc-truncate">{{ source.url }}</span>
      <StatusPill :status="source.status" />
    </li>
  </ul>
</template>

<style scoped>
.host-sources {
  margin: 0;
  padding: 6px;
  list-style: none;
}

.host-sources__row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  border-radius: var(--dc-radius-sm, 4px);
}

.host-sources__row:hover {
  background: var(--dc-bg-2, #f4f4f4);
}

.host-sources__name {
  font-size: var(--dc-text-body, 13px);
  font-weight: var(--dc-weight-medium, 500);
  color: var(--dc-fg-0, #111);
}

.host-sources__url {
  flex: 1;
  font-size: var(--dc-text-micro, 11px);
  color: var(--dc-fg-3, #666);
}
</style>
