<script setup lang="ts">
/*
 * One pane of a window: a strip of tabs saying what is in it, and the body of
 * whichever tab is on top. A group of one is a plain panel and reads as one —
 * a title rather than a tab — so nothing about a window without tabs changes.
 *
 * A tab is usually a panel, and holds host content. It can also be a whole
 * *space* — a desktop tabbed beside the panes it was collapsed in with — and
 * then this strip is that space's own bar: it says the space's name, carries
 * the four choices about it, and the space draws no bar of its own inside. The
 * space itself is rendered through the `space` slot, by the component that
 * renders nodes, so a pane and a node need not import each other.
 *
 * `.dc-pane` rather than `.dc-panel`, which the query panel already owns.
 */
import { computed, useId } from 'vue'
import type { WindowGroup, WindowNode, WindowPanelDef } from '../window/types'
import {
  activePanel,
  activeTab,
  frontPanel,
  isPanelTab,
  isTabOf,
  nodeTitle,
  panelTabs,
  spaceTitle,
} from '../window/layout'
import type { MoveDirection } from '../composables/windowContext'
import { useWindowContext } from '../composables/windowContext'
import { providePaneContext } from '../composables/paneMenu'
import MenuButton from './MenuButton.vue'
import WindowGlyph from './WindowGlyph.vue'

const props = defineProps<{
  group: WindowGroup
  /** Child indices from the root — how a space sharing this strip is addressed. */
  path: number[]
}>()

const win = useWindowContext()
const uid = useId() ?? 'dc-pane'

/** One tab of the strip: a panel of the host's, or a space sharing it. */
type Tab =
  | { kind: 'panel'; index: number; id: string; title: string; panel: WindowPanelDef }
  | { kind: 'space'; index: number; id: string; title: string; node: WindowNode }

/**
 * The strip: a tab per panel the host still declares, and one per space sharing
 * it. `index` is the place in the group rather than in this list — a panel the
 * host has dropped leaves a gap here, and everything that addresses a tab
 * addresses it by where it sits in the model.
 */
const tabs = computed<Tab[]>(() =>
  props.group.panels.flatMap((tab, index): Tab[] => {
    if (!isPanelTab(tab)) {
      const title = spaceTitle(tab) || nodeTitle(tab, (id) => win.panelFor(id)?.title)
      return [{ kind: 'space', index, id: `space-${index}`, title, node: tab }]
    }
    const panel = win.panelFor(tab)
    return panel ? [{ kind: 'panel', index, id: tab, title: panel.title, panel }] : []
  }),
)
const tabbed = computed(() => tabs.value.length > 1)

/** The tab on top, and — when it is a panel — the panel it is. */
const shown = computed<Tab | null>(() => {
  const at = activeTab(props.group)
  return tabs.value.find((tab) => tab.index === at) ?? tabs.value[0] ?? null
})
/** The space on top, or `null` when what is on top is a panel. */
const space = computed(() => (shown.value?.kind === 'space' ? shown.value.node : null))
const activeId = computed(() => (space.value ? '' : activePanel(props.group)))
const active = computed(() => (space.value ? null : win.panelFor(activeId.value)))
/** What the bar says: the panel's title, or the space's own name. */
const label = computed(() => shown.value?.title ?? '')

/**
 * The name of the space this strip *is*, when the layout gave it one.
 *
 * A row, a column and a desktop each draw a header of their own to say it on;
 * a strip has only its tabs, so it says it in front of them — which is what
 * keeps a named space named in the fourth of the four shapes as well as the
 * other three. The host can turn it off with `space-names`, and the name is
 * kept in the layout either way.
 */
const spaceName = computed(() => (win.spaceNames.value ? (props.group.title ?? '') : ''))
/** Where the space on top sits in the tree — what its own menu is asked for by. */
const spacePath = computed(() => [...props.path, shown.value?.index ?? 0])

/**
 * The panel that names the *window* this strip is the title bar of, when a
 * space is on top and has no panel of its own to name it by: the first panel
 * tab along. What is being moved or maximized is the window either way.
 */
const anchor = computed(() => activeId.value || panelTabs(props.group)[0] || '')

const view = computed(() => win.viewFor(activeId.value))

/*
 * What this space says about its own bar: a headless one draws no bar at all —
 * with the tabs, the window controls, the menu the view is chosen from and the
 * grip that carried it. What each of them set is then the host's to set, which
 * is the point of saying so.
 */
const headless = computed(() => props.group.headless === true)
const isFocused = computed(() => win.focused.value === activeId.value)
const isDragging = computed(() => win.dragging.value === activeId.value)
const isMoving = computed(() => win.moving.value === activeId.value)

/**
 * A pane in a floating frame is that window's own chrome: its strip is the
 * title bar, so dragging the strip carries the window rather than lifting the
 * panel out of it. Dragging a *tab* still lifts the panel, which is how a
 * floating window is docked back into the grid.
 */
const floating = computed(() => win.frameOf(anchor.value) !== null)
const fixed = computed(() => win.panelFor(anchor.value)?.fixed === true)

/**
 * The grip is offered when the panel has somewhere to go, or when there is a
 * window around it to carry — a float of one panel has nowhere to dock, but
 * its window still moves.
 *
 * Never for a space on top: what the grip picks up is a panel, and a space
 * sharing a strip is not one. The window it may be in is still carried by the
 * strip itself, which is where a title bar is dragged from anyway.
 */
const movable = computed(
  () =>
    !space.value &&
    (win.canMove(activeId.value) || (floating.value && win.movable.value && !fixed.value)),
)

/**
 * The menu on the bar: the panel's, or — when a space is on top — that space's
 * own, since this strip is the only bar it has. Both already carry the four
 * choices about the space they are for.
 */
const menu = computed(() =>
  space.value ? win.spaceMenu(spacePath.value) : win.menuFor(activeId.value),
)
const closable = (id: string) => win.closable(id)

/*
 * What the content inside this pane is told about it: which panel it belongs
 * to, which is what lets it put items in that panel's own menu without being
 * handed an id it has no way to know. Only the tab on top is rendered, so that
 * tab is the panel the content is.
 */
providePaneContext({ panel: activeId })

/** In a float the strip is the window's title bar, so it carries its buttons. */
const maximized = computed(() => win.maximized(anchor.value))

/**
 * Whether there is a window control to put in the corner at all: minimizing
 * and maximizing are a floating window's, and a close belongs to the panel on
 * top — a tabbed strip carries one per tab instead. With none of the three the
 * group is left out rather than drawn empty, which would still take its gap.
 */
const controls = computed(
  () =>
    (floating.value && !fixed.value) ||
    (!tabbed.value && !!active.value && closable(active.value.id)),
)

const tabId = (id: string) => `${uid}-tab-${id}`
const bodyId = computed(() => `${uid}-body`)

/** Where a drop on this pane would put the panel being carried, if anywhere. */
const drop = computed(() => {
  const target = win.dropTarget.value
  // A panel of a space sharing this strip is that space's business: the drop is
  // previewed by the pane inside it, not by the strip around it.
  if (!target || !isTabOf(props.group, target.panel)) return null
  // A drop on bare desktop names a panel of that float to say which desktop it
  // is — it is not a drop on that panel's pane, so this pane previews nothing.
  if (target.edge === 'float') return null
  return target
})
const dropEdge = computed(() => (drop.value?.index === undefined ? (drop.value?.edge ?? null) : null))
/** The gap in the strip the panel would land in. */
const dropIndex = computed(() => drop.value?.index ?? null)

/*
 * Slot content comes through the context rather than down the template: a pane
 * sits an arbitrary number of splits below the window, and forwarding slots
 * through each one would make the depth of the tree part of every signature.
 *
 * Only the tab on top is rendered. A host that needs a background tab to keep
 * its state holds that state outside the slot.
 */
const Content = () =>
  active.value ? (win.renderContent(active.value, view.value, isFocused.value) ?? null) : null
const Actions = () =>
  active.value ? (win.renderActions(active.value, view.value, isFocused.value) ?? null) : null

/* ------------------------------------------------------------------ moving */

/** Distinguishes a click on a tab or the grip from a drag that began on one. */
let pressedAt: { x: number; y: number } | null = null

function travelled(event: MouseEvent): boolean {
  const moved =
    pressedAt !== null && Math.hypot(event.clientX - pressedAt.x, event.clientY - pressedAt.y) >= 4
  pressedAt = null
  return moved
}

/** Which panel selecting a tab selects: itself, or what its space is showing. */
const panelOf = (tab: Tab) => (tab.kind === 'panel' ? tab.id : frontPanel(tab.node))

function onTabPointerDown(event: PointerEvent, tab: Tab) {
  // A space is not picked up by its tab: it is a space rather than a panel, and
  // there is nothing a drag of it could mean. Clicking still brings it forward.
  if (tab.kind === 'space') return
  win.focus(tab.id)
  pressedAt = { x: event.clientX, y: event.clientY }
  win.beginDrag(tab.id, event)
}

/*
 * Selection waits for the release rather than following the press, so that
 * dragging a tab out of a group does not first bring it to the top and leave
 * the group showing whichever tab was next along. A tab dropped somewhere is
 * selected by the drop itself.
 */
function onTabClick(event: MouseEvent, tab: Tab) {
  if (travelled(event)) return
  const panel = panelOf(tab)
  if (panel) win.selectPanel(panel)
}

/** The rest of the strip carries the tab that is on top — or the window it is in. */
function onStripPointerDown(event: PointerEvent) {
  if (activeId.value) win.focus(activeId.value)
  const target = event.target as HTMLElement | null
  if (target?.closest('.dc-tab, button, a, input, select, textarea, label')) return
  if (floating.value) win.beginFrameDrag(anchor.value, event, 'move')
  else win.beginDrag(activeId.value, event)
}

function onGripPointerDown(event: PointerEvent) {
  pressedAt = { x: event.clientX, y: event.clientY }
  win.beginDrag(activeId.value, event)
}

function onGripClick(event: MouseEvent) {
  // A press that travelled was the drag, and has already been dealt with.
  if (travelled(event)) return
  win.toggleMoveMode(activeId.value)
}

const ARROWS: Record<string, MoveDirection> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
}

function onGripKeydown(event: KeyboardEvent) {
  if (!isMoving.value) return
  if (event.key === 'Escape') {
    event.preventDefault()
    win.toggleMoveMode(activeId.value)
    return
  }
  const direction = ARROWS[event.key]
  if (!direction) return
  event.preventDefault()
  // In a float the arrows move the window and shift resizes it. Tiled, they
  // move the panel, and shift joins the neighbouring group as a tab.
  if (floating.value) win.nudgeFrame(activeId.value, direction, event.shiftKey)
  else win.nudge(activeId.value, direction, event.shiftKey)
}

/** A double-click on the title bar is the shortest way to maximize a window. */
function onStripDoubleClick(event: MouseEvent) {
  if (!floating.value) return
  const target = event.target as HTMLElement | null
  if (target?.closest('.dc-tab, button, a, input, select, textarea, label')) return
  win.toggleMaximize(anchor.value)
}

/** Closing a tab must not also select it, or begin dragging it. */
function onCloseTab(event: MouseEvent, id: string) {
  event.stopPropagation()
  pressedAt = null
  win.close(id)
}

/**
 * Tablist keyboard behaviour: arrows move between tabs and select as they go,
 * Home/End jump to the ends. Only the selected tab is tabbable, so the strip
 * is one tab stop rather than one per panel.
 */
function onTabKeydown(event: KeyboardEvent, index: number) {
  const count = tabs.value.length
  let next: number | null = null
  if (event.key === 'ArrowRight') next = (index + 1) % count
  else if (event.key === 'ArrowLeft') next = (index - 1 + count) % count
  else if (event.key === 'Home') next = 0
  else if (event.key === 'End') next = count - 1
  if (next === null) return

  event.preventDefault()
  const tab = tabs.value[next]
  if (!tab) return
  const panel = panelOf(tab)
  if (panel) win.selectPanel(panel)
}
</script>

<template>
  <!--
    `data-dc-panels` is the panel *tabs* only. It is what a drop on this strip is
    named by, and a panel inside a space sharing the strip is not this strip's to
    be named by: the pane it is in speaks for it. A strip with no panel tab at
    all therefore advertises none, and is no drop target — what is on it is the
    space's, and the space's own panes and desktop are the targets.
  -->
  <section
    v-if="shown"
    class="dc-pane"
    :data-dc-panel="activeId || undefined"
    :data-dc-panels="panelTabs(group).join(' ') || undefined"
    :data-dc-tabbed="tabbed ? 'true' : 'false'"
    :data-dc-floating="floating ? 'true' : 'false'"
    :data-dc-maximized="maximized ? 'true' : 'false'"
    :data-dc-headless="headless ? 'true' : 'false'"
    :data-dc-active="isFocused ? 'true' : 'false'"
    :data-dc-dragging="isDragging ? 'true' : 'false'"
    :aria-label="label"
    @focusin="activeId && win.focus(activeId)"
  >
    <header
      v-if="!headless"
      class="dc-pane__head"
      :data-dc-movable="movable ? 'true' : 'false'"
      @pointerdown="onStripPointerDown"
      @dblclick="onStripDoubleClick"
    >
      <button
        v-if="movable"
        type="button"
        class="dc-pane__grip"
        :aria-label="`Move ${label}`"
        :aria-pressed="isMoving"
        @pointerdown="onGripPointerDown"
        @click="onGripClick"
        @keydown="onGripKeydown"
      >
        <span aria-hidden="true">⠿</span>
      </button>

      <!--
        The name of the space this strip is, in front of the tabs it holds: a
        name is said about the space rather than about what is on it, so it is
        not one of the things the tabs switch between.
      -->
      <span
        v-if="spaceName"
        class="dc-pane__name"
        :data-dc-space-name="spaceName"
      >
        <!-- The name inside the box that draws the rule, so it ellipses on a
             narrow strip the way a tab's own name does. -->
        <span class="dc-truncate">{{ spaceName }}</span>
      </span>

      <div
        class="dc-pane__tabs"
        role="tablist"
        :aria-label="`${label} panels`"
      >
        <template
          v-for="(tab, index) in tabs"
          :key="tab.id"
        >
          <!-- Where a tab dropped on the strip would land. -->
          <span
            v-if="dropIndex === index"
            class="dc-pane__insert"
            aria-hidden="true"
          />
          <button
            :id="tabId(tab.id)"
            type="button"
            role="tab"
            class="dc-tab"
            :data-dc-panel="tab.kind === 'panel' ? tab.id : undefined"
            :data-dc-space="tab.kind === 'space' ? tab.title : undefined"
            :aria-selected="tab.index === shown.index"
            :aria-controls="bodyId"
            :tabindex="tab.index === shown.index ? 0 : -1"
            @pointerdown="onTabPointerDown($event, tab)"
            @click="onTabClick($event, tab)"
            @keydown="onTabKeydown($event, index)"
          >
            <span class="dc-tab__name dc-truncate">{{ tab.title }}</span>
            <span
              v-if="tab.kind === 'panel' && tab.panel.subtitle"
              class="dc-pane__sub dc-mono dc-truncate"
            >
              {{ tab.panel.subtitle }}
            </span>
            <!-- A tab carries its own close: closing a tab that is not the one
                 on top is otherwise unreachable. A space sharing the strip has
                 no close, the way no space anywhere has one: what closes is a
                 panel, and closing every panel of a space is what removes it. -->
            <span
              v-if="tabbed && tab.kind === 'panel' && closable(tab.id)"
              class="dc-tab__close"
              role="button"
              tabindex="-1"
              :aria-label="`Close ${tab.title}`"
              :data-dc-close="tab.id"
              @pointerdown.stop
              @click="onCloseTab($event, tab.id)"
            >
              <span aria-hidden="true">×</span>
            </span>
          </button>
        </template>
        <span
          v-if="dropIndex === tabs.length"
          class="dc-pane__insert"
          aria-hidden="true"
        />
      </div>

      <div class="dc-pane__tools">
        <Actions />
        <MenuButton
          v-if="menu.length"
          :items="menu"
          :label="`${label} menu`"
        />
      </div>

      <!--
        The window controls, in a group of their own rather than among the
        tools: which corner they sit in and which order they come in is the
        theme's to decide — a Mac puts them at the left and leads with close —
        and a group is the thing a theme can move.
      -->
      <div
        v-if="controls"
        class="dc-pane__controls dc-controls"
      >
        <button
          v-if="floating && !fixed"
          type="button"
          class="dc-pane__button dc-control"
          :aria-label="`Minimize ${label}`"
          :data-dc-minimize="anchor"
          @pointerdown.stop
          @click="win.toggleMinimize(anchor)"
        >
          <WindowGlyph kind="minimize" />
        </button>
        <button
          v-if="floating && !fixed"
          type="button"
          class="dc-pane__button dc-control"
          :aria-label="`${maximized ? 'Restore' : 'Maximize'} ${label}`"
          :aria-pressed="maximized"
          :data-dc-maximize="anchor"
          @pointerdown.stop
          @click="win.toggleMaximize(anchor)"
        >
          <WindowGlyph :kind="maximized ? 'restore' : 'maximize'" />
        </button>
        <button
          v-if="!tabbed && active && closable(active.id)"
          type="button"
          class="dc-pane__close dc-control"
          :aria-label="`Close ${label}`"
          :data-dc-close="active.id"
          @pointerdown.stop
          @click="win.close(active.id)"
        >
          <WindowGlyph kind="close" />
        </button>
      </div>
    </header>

    <!--
      A space sharing the strip renders in place of the body: the strip is its
      title bar, so it draws none of its own, and what is inside it — panes, a
      desktop, a grid — is the space's business rather than this pane's.
    -->
    <div
      v-if="space"
      :id="bodyId"
      class="dc-pane__space"
      :role="headless ? undefined : 'tabpanel'"
      :aria-labelledby="headless ? undefined : tabId(shown.id)"
    >
      <slot
        name="space"
        :node="space"
        :path="spacePath"
      />
    </div>

    <!-- A headless pane has no strip, so its body is a plain box rather than a
         tab panel: the tab it would name is not on screen to name it. -->
    <div
      v-else
      :id="bodyId"
      class="dc-pane__body"
      :role="headless ? undefined : 'tabpanel'"
      :aria-labelledby="headless ? undefined : tabId(activeId)"
    >
      <Content />
    </div>

    <!-- Where the panel being carried would land. Purely a preview: the drop
         itself is decided from the pointer, not from this element. -->
    <div
      v-if="dropEdge"
      class="dc-pane__drop"
      :data-dc-edge="dropEdge"
      aria-hidden="true"
    />
  </section>
</template>

<style scoped>
.dc-pane {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  border: 1px solid var(--dc-line);
  border-radius: var(--dc-radius);
  background: var(--dc-bg-1);
  overflow: hidden;
  /* Content responds to the width of its own pane rather than the window's,
     so a table narrows when the pane beside it is dragged wider. */
  container-type: inline-size;
}

.dc-pane[data-dc-active='true'] {
  border-color: var(--dc-line-2);
}

/* The floating frame around it already draws the border and clips the corners,
   and a second one inside the first reads as a box in a box. */
.dc-pane[data-dc-floating='true'] {
  border: none;
  border-radius: 0;
}

.dc-pane[data-dc-dragging='true'] {
  opacity: 0.5;
}

.dc-pane__head {
  display: flex;
  flex: 0 0 auto;
  align-items: stretch;
  gap: 8px;
  padding: 0 8px 0 12px;
  border-bottom: 1px solid var(--dc-line);
  background: var(--dc-bg-2);
  min-height: 36px;
}

.dc-pane__head[data-dc-movable='true'] {
  cursor: grab;
  /* A drag on a touch screen must not also scroll the pane under it. */
  touch-action: none;
}

.dc-pane[data-dc-dragging='true'] .dc-pane__head {
  cursor: grabbing;
}

.dc-pane__grip {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  margin: 6px 0;
  padding: 2px 4px;
  border: none;
  border-radius: var(--dc-radius-sm);
  background: transparent;
  color: var(--dc-fg-3);
  font-size: var(--dc-text-body);
  line-height: var(--dc-leading-flat);
  cursor: grab;
}

.dc-pane__grip:hover {
  color: var(--dc-fg-1);
}

/* In move mode the arrow keys belong to the panel, so say so. */
.dc-pane__grip[aria-pressed='true'] {
  background: var(--dc-accent-bg);
  color: var(--dc-fg-0);
}

/*
 * The name of the space the strip is. A rule between it and the tabs, because
 * the two say different things: one what this space is called, the others what
 * is in it — and only the second of those is switched between.
 */
.dc-pane__name {
  display: flex;
  flex: 0 1 auto;
  align-items: center;
  min-width: 0;
  padding-right: 8px;
  border-right: 1px solid var(--dc-line);
  color: var(--dc-fg-0);
  font-size: var(--dc-text-meta);
  font-weight: var(--dc-weight-semibold);
  letter-spacing: var(--dc-tracking-wide);
  white-space: nowrap;
}

.dc-pane__tabs {
  display: flex;
  flex: 1;
  align-items: stretch;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}

.dc-pane__tabs::-webkit-scrollbar {
  display: none;
}

/*
 * A tab. Alone in its strip it is the pane's title and carries none of the
 * chrome — there is nothing to switch between, so nothing to look switchable.
 */
.dc-tab {
  display: flex;
  flex: 0 1 auto;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 0 2px;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--dc-fg-0);
  font-size: var(--dc-text-meta);
  font-weight: var(--dc-weight-semibold);
  letter-spacing: var(--dc-tracking-wide);
  white-space: nowrap;
  cursor: inherit;
}

.dc-pane[data-dc-tabbed='true'] .dc-tab {
  padding: 0 12px;
  color: var(--dc-fg-3);
  font-weight: var(--dc-weight-medium);
}

.dc-pane[data-dc-tabbed='true'] .dc-tab:hover {
  color: var(--dc-fg-1);
}

.dc-pane[data-dc-tabbed='true'] .dc-tab[aria-selected='true'] {
  border-bottom-color: var(--dc-accent);
  background: var(--dc-bg-1);
  color: var(--dc-fg-0);
  font-weight: var(--dc-weight-semibold);
}

.dc-tab__name {
  min-width: 0;
}

/* One panel's worth of chrome is a title and its subtitle; several panels'
   worth is a row of names, and the subtitles would only crowd them. */
.dc-pane[data-dc-tabbed='true'] .dc-pane__sub {
  display: none;
}

.dc-pane__sub {
  font-size: var(--dc-text-micro);
  font-weight: var(--dc-weight-regular);
  color: var(--dc-fg-3);
}

/* The gap a dragged tab would drop into. */
.dc-pane__insert {
  flex: 0 0 auto;
  align-self: center;
  width: 2px;
  height: 20px;
  border-radius: 1px;
  background: var(--dc-accent);
}

.dc-pane__tools {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  padding: 5px 0;
}

.dc-pane__controls {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 6px;
}

/*
 * Fluent's title bar buttons run into the corner of the window, so the head's
 * own padding comes back off — the head is the only one that knows what it
 * padded by. The look of the buttons themselves is the theme's, in tokens.css.
 */
[data-dc-theme='windows'] .dc-pane__head > .dc-pane__controls {
  margin-right: -8px;
}

/*
 * A tab's close is held out of the way until that tab is hovered or is the one
 * on top, so a strip of many tabs reads as a row of names rather than a row of
 * crosses.
 */
.dc-tab__close,
.dc-pane__close,
.dc-pane__button {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: none;
  border-radius: var(--dc-radius-sm);
  background: transparent;
  color: var(--dc-fg-3);
  font-size: var(--dc-text-body);
  line-height: var(--dc-leading-flat);
  cursor: default;
}

.dc-tab__close {
  visibility: hidden;
  margin-left: -2px;
}

.dc-tab:hover .dc-tab__close,
.dc-tab[aria-selected='true'] .dc-tab__close {
  visibility: visible;
}

.dc-tab__close:hover,
.dc-pane__close:hover,
.dc-pane__button:hover {
  background: var(--dc-accent-bg);
  color: var(--dc-fg-0);
}

.dc-pane__body {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

/*
 * A space sharing the strip fills the body rather than scrolling in it: what it
 * holds is panes and windows, which divide and place themselves. `display: flex`
 * because the space inside it is a flex child like every other node, and no
 * padding, because the space draws its own inset from its own border.
 */
.dc-pane__space {
  display: flex;
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

/*
 * The drop preview covers the half of the pane the panel would take, so the
 * shape of the result is visible before the button comes up. A centre drop
 * covers the whole pane, which is it joining as a tab.
 */
.dc-pane__drop {
  position: absolute;
  z-index: 5;
  border: 1px solid var(--dc-accent);
  border-radius: var(--dc-radius-sm);
  background: var(--dc-accent-bg);
  opacity: 0.75;
  pointer-events: none;
}

.dc-pane__drop[data-dc-edge='center'] {
  inset: 0;
}

.dc-pane__drop[data-dc-edge='left'] {
  inset: 0 50% 0 0;
}

.dc-pane__drop[data-dc-edge='right'] {
  inset: 0 0 0 50%;
}

.dc-pane__drop[data-dc-edge='top'] {
  inset: 0 0 50% 0;
}

.dc-pane__drop[data-dc-edge='bottom'] {
  inset: 50% 0 0 0;
}

/* A narrow pane keeps its name and its menu; the subtitle is the first thing
   that can go. */
@container (max-width: 340px) {
  .dc-pane__sub {
    display: none;
  }
}
</style>
