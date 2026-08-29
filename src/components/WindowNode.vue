<script setup lang="ts">
/*
 * One node of the layout tree, rendering itself: a group becomes a pane of
 * tabs, a split becomes a row or column of further nodes with a draggable
 * boundary between each neighbouring pair, and a float becomes a panel its
 * frames are placed over. Recursion is the whole implementation of "any
 * grid" — this component knows about one node and nothing else.
 *
 * A tab of that pane can be a space rather than a panel, so the recursion goes
 * through a pane as well as around it: the pane renders the strip and this
 * renders whichever space is on top of it.
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { WindowNode } from '../window/types'
import {
  frameOf,
  isFloat,
  isGroup,
  isSplit,
  MINIMIZED_GAP,
  MINIMIZED_HEIGHT,
  MINIMIZED_WIDTH,
  panelIds,
  resizeSplit,
  sizesOf,
  spaceTitle,
} from '../window/layout'
import { useWindowContext } from '../composables/windowContext'
import MenuButton from './MenuButton.vue'
import WindowFloat from './WindowFloat.vue'
import WindowPane from './WindowPane.vue'

const props = defineProps<{
  node: WindowNode
  /** Child indices from the root — how a resize addresses this split. */
  path: number[]
  /**
   * Whether this node *is* a floating window's whole content. A space that is
   * draws no title bar of its own: the frame around it already has one, it is
   * the only place that window can be taken hold of, and two bars saying the
   * same name is one more than the space has.
   */
  framed?: boolean
}>()

const win = useWindowContext()
const container = ref<HTMLElement | null>(null)

const pane = computed(() => (isGroup(props.node) ? props.node : null))
const split = computed(() => (isSplit(props.node) ? props.node : null))
const floating = computed(() => (isFloat(props.node) ? props.node : null))

/** What sits under this node — a split's children, or a float's frames. */
const children = computed(() =>
  split.value ? split.value.children : (floating.value?.frames.map((held) => held.node) ?? []),
)
const sizes = computed(() => (split.value ? sizesOf(split.value) : []))

/**
 * Frames in a *stable* order, with the stacking left entirely to `z-index`.
 *
 * Reordering the DOM to match the stack is the obvious way to do it and the
 * wrong one: raising a window would move its subtree, and what Vue moves it
 * rebuilds — losing the scroll position of everything inside, an open menu,
 * and whatever state the host had put there. So what is rendered never
 * reorders. Only `order` changes, and the `z-index` it decides.
 */
const rendered = computed(() =>
  (floating.value?.frames ?? [])
    .map((held, index) => ({
      held,
      /** Place in the stack, counted from the back — what `z-index` follows. */
      order: index,
      key: keyFor(held.node),
      path: [...props.path, index],
    }))
    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0)),
)

/*
 * What this space is called, and the menu it offers.
 *
 * A container has no tab to take a name from, so unless the layout gives it
 * one it says how it is shown — `Row`, `Column`, `Desktop` — which is exactly
 * what the menu beside the name switches between. Borrowing from a pane inside
 * would be worse than plain: a float's front window changes every time one is
 * touched, and a space that renames itself for being clicked on is no name.
 *
 * The menu is the space's own, asked for by where this node sits rather than
 * by a panel in it — the panes in a space hold host content, and none of them
 * speaks for the space around it.
 */
const title = computed(() => spaceTitle(props.node))
const menu = computed(() => win.spaceMenu(props.path))

/**
 * A space told to draw no bar draws none, the way a framed one draws none: the
 * name it would have said, and the menu that would have been beside it, are
 * the host's to say and to set instead.
 */
const headless = computed(() => props.node.headless === true)

/** How this space is shown, for a test and a stylesheet to name it by. */
const mode = computed(() => (floating.value ? 'desktop' : (split.value?.direction ?? '')))

/* ------------------------------------------------------------ the dock */

const desktop = ref<HTMLElement | null>(null)
const desktopWidth = ref(0)

/*
 * How wide the float is decides how many rolled-up windows fit along the
 * bottom of it, and nothing else here needs measuring — so it is watched
 * rather than read, and only while there is a float to watch.
 */
let watching: ResizeObserver | null = null
watch(
  desktop,
  (element) => {
    watching?.disconnect()
    watching = null
    if (!element || typeof ResizeObserver === 'undefined') return
    desktopWidth.value = element.clientWidth
    watching = new ResizeObserver(([entry]) => {
      desktopWidth.value = entry?.contentRect.width ?? 0
    })
    watching.observe(element)
  },
  { immediate: true },
)
onBeforeUnmount(() => watching?.disconnect())

/**
 * Where each rolled-up window docks, by the key of the frame holding it.
 *
 * They are laid out left to right along the bottom and wrap onto a second row
 * when they run out of width. The order is `rendered`'s — the stable one — so
 * that raising a window does not make every rolled-up one shuffle along.
 */
const dock = computed(() => {
  const perRow = Math.max(
    1,
    Math.floor((desktopWidth.value + MINIMIZED_GAP) / (MINIMIZED_WIDTH + MINIMIZED_GAP)),
  )
  const places = new Map<string, { x: number; bottom: number }>()
  let slot = 0
  for (const entry of rendered.value) {
    if (entry.held.minimized !== true) continue
    places.set(entry.key, {
      x: MINIMIZED_GAP + (slot % perRow) * (MINIMIZED_WIDTH + MINIMIZED_GAP),
      bottom: MINIMIZED_GAP + Math.floor(slot / perRow) * (MINIMIZED_HEIGHT + MINIMIZED_GAP),
    })
    slot += 1
  }
  return places
})

/** Whether a drop target names this very space, by the path it was rendered at. */
const targeted = (space: readonly number[] | undefined): boolean =>
  !!space && space.join('/') === props.path.join('/')

/**
 * The window a drop on this float's bare desktop would make. The drop names a
 * panel on the desktop it means, so this checks the innermost frame holding
 * that panel is one of *this* float's — otherwise a float nested inside one of
 * them would have both draw the same preview.
 *
 * A desktop with nothing on it has no panel to be named by and is named by its
 * path instead, which says which desktop is meant just as exactly.
 */
const dropFrame = computed(() => {
  const target = win.dropTarget.value
  const node = floating.value
  if (!node || !target?.rect || target.edge !== 'float') return null
  if (target.space) return targeted(target.space) ? target.rect : null
  const innermost = frameOf(node, target.panel)
  return innermost && node.frames.includes(innermost) ? target.rect : null
})

/**
 * Whether a drop would put a panel into this space, which is holding nothing.
 *
 * Drawn where the panes would be rather than as an outline over them, because
 * there are none: what the preview says is that this empty space is the one
 * about to be filled, and the space is all there is to say it on.
 */
const dropInto = computed(() => {
  const target = win.dropTarget.value
  return !!target && !target.rect && targeted(target.space)
})
const horizontal = computed(() => split.value?.direction === 'row')

/*
 * Held rather than built in the template: a new array on every render would
 * count as a changed prop, so any re-render of the window would cascade all
 * the way down the tree instead of stopping where nothing actually moved.
 */
const childPaths = computed(() => children.value.map((_, index) => [...props.path, index]))

/**
 * Keyed by the panels underneath rather than by index, so a move that
 * reorders a split carries each pane's DOM — and anything stateful a host has
 * rendered inside it — along with it instead of re-creating it in place.
 *
 * Sorted, because the panel order of a float *is* its stacking order: an
 * unsorted key would change every time a window came forward, and Vue rebuilds
 * what it cannot match — throwing away the scroll position, the open menu, and
 * whatever the host had put inside the very window that was clicked.
 */
const keyFor = (child: WindowNode) => [...panelIds(child)].sort().join('/')

const titleOf = (child: WindowNode) => {
  const first = panelIds(child)[0]
  return (first ? win.panelFor(first)?.title : null) ?? first ?? 'panel'
}

const gutterLabel = (index: number) => {
  const before = children.value[index]
  const after = children.value[index + 1]
  if (!before || !after) return 'Resize panels'
  return `Resize ${titleOf(before)} and ${titleOf(after)}`
}

/** The first of the pair as a percentage of the pair — what a splitter reports. */
const gutterValue = (index: number) => {
  const before = sizes.value[index] ?? 0
  const after = sizes.value[index + 1] ?? 0
  const pair = before + after
  return pair > 0 ? Math.round((before / pair) * 100) : 50
}

/* ---------------------------------------------------------------- resizing */

/** The minimum share a pane may be squeezed to, from the pixel floor. */
function minShare(): number {
  const element = container.value
  const total = element ? (horizontal.value ? element.clientWidth : element.clientHeight) : 0
  if (total <= 0) return 0.05
  return Math.min(win.minPanelSize.value / total, 0.4)
}

let releaseResize: (() => void) | null = null

function beginResize(event: PointerEvent, index: number) {
  const node = split.value
  const element = container.value
  if (!win.resizable.value || !node || !element || event.button !== 0) return

  const total = horizontal.value ? element.clientWidth : element.clientHeight
  if (total <= 0) return

  // Both captured up front: the drag is a delta from where it started, so a
  // rounding error cannot accumulate across a long one.
  const start = horizontal.value ? event.clientX : event.clientY
  const base = sizesOf(node)
  const min = Math.min(win.minPanelSize.value / total, 0.4)

  event.preventDefault()

  const onMove = (moveEvent: PointerEvent) => {
    const delta = ((horizontal.value ? moveEvent.clientX : moveEvent.clientY) - start) / total
    win.setSizes(props.path, resizeSplit(base, index, delta, min))
  }
  const onUp = () => releaseResize?.()
  const onKey = (keyEvent: KeyboardEvent) => {
    if (keyEvent.key !== 'Escape') return
    win.setSizes(props.path, base)
    releaseResize?.()
  }

  releaseResize = () => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointercancel', onUp)
    window.removeEventListener('keydown', onKey)
    releaseResize = null
  }

  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', onUp)
  window.addEventListener('keydown', onKey)
}

onBeforeUnmount(() => releaseResize?.())

/** Arrow keys nudge the boundary, so a splitter is reachable without a mouse. */
function onGutterKey(event: KeyboardEvent, index: number) {
  const node = split.value
  if (!win.resizable.value || !node) return

  const forward = horizontal.value ? 'ArrowRight' : 'ArrowDown'
  const backward = horizontal.value ? 'ArrowLeft' : 'ArrowUp'
  const step = event.shiftKey ? 0.1 : 0.02

  if (event.key !== forward && event.key !== backward) return
  const delta = event.key === forward ? step : -step

  event.preventDefault()
  win.setSizes(props.path, resizeSplit(sizesOf(node), index, delta, minShare()))
}
</script>

<template>
  <!--
    A pane, and — through the slot — whatever space shares its strip. The node
    is rendered here rather than in the pane for the same reason a floating
    frame's is: this is the component that renders nodes, and the two would
    otherwise have to import each other. `framed` because the strip is that
    space's title bar already, exactly as a floating window's bar is.
  -->
  <WindowPane
    v-if="pane"
    :group="pane"
    :path="path"
  >
    <template #space="{ node: shared, path: sharedPath }">
      <WindowNode
        :node="shared"
        :path="sharedPath"
        framed
      />
    </template>
  </WindowPane>

  <!--
    Anything that holds panels is a panel itself: a title bar saying what the
    space is and how it is shown, and under it the row, the column or the
    desktop it holds. That bar is the one place a space can speak for itself,
    which is why the panes in it no longer offer to.
  -->
  <section
    v-else
    class="dc-space"
    :data-dc-space="mode"
    :data-dc-path="path.join('/')"
    :aria-label="title"
  >
    <header
      v-if="!framed && !headless"
      class="dc-space__head"
    >
      <span class="dc-space__title dc-truncate">{{ title }}</span>
      <MenuButton
        v-if="menu.length"
        :items="menu"
        :label="`${title} menu`"
      />
    </header>

    <div
      v-if="floating"
      ref="desktop"
      class="dc-window__desktop"
    >
      <!-- The window a drop here would make, before the button comes up. -->
      <div
        v-if="dropFrame"
        class="dc-window__drop"
        :style="{
          left: `${dropFrame.x}px`,
          top: `${dropFrame.y}px`,
          width: `${dropFrame.w}px`,
          height: `${dropFrame.h}px`,
        }"
        aria-hidden="true"
      />
      <WindowFloat
        v-for="entry in rendered"
        :key="entry.key"
        :frame="entry.held"
        :path="entry.path"
        :order="entry.order"
        :place="dock.get(entry.key) ?? null"
      >
        <WindowNode
          :node="entry.held.node"
          :path="entry.path"
          :framed="entry.held.node.kind !== 'group'"
        />
      </WindowFloat>
    </div>

    <div
      v-else-if="split"
      ref="container"
      class="dc-window__split"
      :data-dc-direction="split.direction"
    >
      <div
        v-if="dropInto"
        class="dc-space__drop"
        aria-hidden="true"
      />
      <template
        v-for="(child, index) in children"
        :key="keyFor(child)"
      >
        <div
          class="dc-window__cell"
          :style="{ flexGrow: sizes[index] ?? 1 }"
        >
          <WindowNode
            :node="child"
            :path="childPaths[index] ?? []"
          />
        </div>

        <div
          v-if="index < children.length - 1"
          class="dc-window__gutter"
          role="separator"
          :aria-orientation="horizontal ? 'vertical' : 'horizontal'"
          :aria-label="gutterLabel(index)"
          :aria-valuenow="gutterValue(index)"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-disabled="win.resizable.value ? undefined : 'true'"
          :tabindex="win.resizable.value ? 0 : -1"
          @pointerdown="beginResize($event, index)"
          @keydown="onGutterKey($event, index)"
        />
      </template>
    </div>
  </section>
</template>

<style scoped>
/*
 * A space is a panel: it holds panels rather than content, so it takes the
 * same border and the same header a pane does, and reads as one thing beside
 * them rather than as an arrangement of several.
 */
.dc-space {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  border: 1px solid var(--dc-line);
  border-radius: var(--dc-radius);
  background: var(--dc-bg-1);
  overflow: hidden;
}

/* Inside a floating window the frame already draws the box and clips it. */
.dc-float .dc-space {
  border: none;
  border-radius: 0;
}

.dc-space__head {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  padding: 0 8px 0 12px;
  border-bottom: 1px solid var(--dc-line);
  background: var(--dc-bg-2);
}

.dc-space__title {
  flex: 1 1 auto;
  min-width: 0;
  color: var(--dc-fg-0);
  font-size: var(--dc-text-meta);
  font-weight: var(--dc-weight-semibold);
  letter-spacing: var(--dc-tracking-wide);
}

/*
 * `position: relative` twice over: it is what a frame's `left`/`top` are
 * measured from, and what keeps each frame's stacking order to this float
 * rather than letting it compete with the window's own chrome.
 */
.dc-window__desktop {
  position: relative;
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

/*
 * A space about to be filled, drawn where its one pane would go — the whole of
 * it, since a space with nothing in it has no edge to land on either side of.
 */
.dc-space__drop {
  flex: 1;
  border: 1px dashed var(--dc-accent);
  border-radius: var(--dc-radius);
  background: var(--dc-accent-bg);
  opacity: 0.75;
  pointer-events: none;
}

/*
 * Drawn over every frame, because it is where a frame is about to be: a
 * preview behind the stack would be hidden by the very windows it is being
 * placed among.
 */
.dc-window__drop {
  position: absolute;
  z-index: 40;
  border: 1px dashed var(--dc-accent);
  border-radius: var(--dc-radius);
  background: var(--dc-accent-bg);
  opacity: 0.75;
  pointer-events: none;
}

/*
 * Inset from the space's own border, so the panes sit *on* the space rather
 * than sharing an edge with it — the same margin the desktop's windows keep
 * from theirs, and what stops two borders reading as one thick one.
 */
.dc-window__split {
  display: flex;
  flex: 1;
  min-width: 0;
  min-height: 0;
  padding: 6px;
}

.dc-window__split[data-dc-direction='row'] {
  flex-direction: row;
}

.dc-window__split[data-dc-direction='column'] {
  flex-direction: column;
}

/*
 * `flex-basis: 0` so the shares are of the whole split rather than of what is
 * left over after each pane's content has had its say — a table with wide
 * columns must not push its own pane wider.
 */
.dc-window__cell {
  display: flex;
  flex-basis: 0;
  flex-shrink: 1;
  min-width: 0;
  min-height: 0;
}

/*
 * A hairline to look at, a comfortable target to hit: the visible rule is the
 * pseudo-element, the grabbable area is the whole gutter.
 */
.dc-window__gutter {
  position: relative;
  flex: 0 0 auto;
  border-radius: var(--dc-radius-sm);
}

.dc-window__split[data-dc-direction='row'] > .dc-window__gutter {
  width: 8px;
  cursor: col-resize;
  touch-action: none;
}

.dc-window__split[data-dc-direction='column'] > .dc-window__gutter {
  height: 8px;
  cursor: row-resize;
  touch-action: none;
}

.dc-window__gutter[aria-disabled='true'] {
  cursor: default;
}

.dc-window__gutter::after {
  content: '';
  position: absolute;
  inset: 0;
  margin: auto;
  background: transparent;
  border-radius: 2px;
  transition: background 0.12s ease-out;
}

.dc-window__split[data-dc-direction='row'] > .dc-window__gutter::after {
  width: 2px;
  height: 100%;
}

.dc-window__split[data-dc-direction='column'] > .dc-window__gutter::after {
  width: 100%;
  height: 2px;
}

.dc-window__gutter:hover::after,
.dc-window__gutter:focus-visible::after {
  background: var(--dc-accent);
}

.dc-window__gutter[aria-disabled='true']:hover::after {
  background: transparent;
}
</style>
