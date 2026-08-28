<script setup lang="ts">
/*
 * One frame of a float: a box placed over the space it floats on, with a grip
 * on every edge and corner.
 *
 * What is *inside* it arrives as a slot — a node like any other, usually a
 * group whose tab strip doubles as the window's title bar. The node is passed
 * in rather than rendered here so that this component and the one that renders
 * nodes do not have to import each other.
 */
import { computed } from 'vue'
import type { FloatFrame, FrameHandle } from '../window/types'
import {
  frontPanel,
  hasPanel,
  isGroup,
  isMaximized,
  isMinimized,
  MINIMIZED_HEIGHT,
  MINIMIZED_WIDTH,
  nodeTitle,
  panelIds,
  spaceTitle,
} from '../window/layout'
import { useWindowContext } from '../composables/windowContext'
import MenuButton from './MenuButton.vue'
import WindowGlyph from './WindowGlyph.vue'

const props = defineProps<{
  frame: FloatFrame
  /** Child indices from the root — where this frame sits in the tree. */
  path: number[]
  /** Place in the stack, counted from the back. */
  order: number
  /**
   * Where it docks along the bottom when it is rolled up. Worked out by the
   * float, which is the only thing that knows how many others are rolled up
   * beside it — and `null` whenever this one is not.
   */
  place?: { x: number; bottom: number } | null
}>()

const win = useWindowContext()

/*
 * This window says where it is rather than which panel it holds.
 *
 * A panel would name the wrong frame as soon as this one holds a desktop: every
 * panel on that desktop is a panel of this window too, and the model answers
 * with the innermost frame holding one — a window *inside* this one. So moving,
 * resizing, maximizing, rolling up and raising all go by the path this frame
 * was rendered at, which names this frame and nothing else.
 *
 * A panel is still what the window is *called* by, and whose `fixed` says it
 * stays put: the one it is showing, which is the pane on top of its tabs or the
 * window in front of its desktop.
 */
const anchor = computed(() => frontPanel(props.frame.node))

const fixed = computed(() => win.panelFor(anchor.value)?.fixed === true)
/**
 * Filling the float, or rolled up out of the way: nowhere to drag or resize to.
 * Read off the frame itself — it is right here, and asking about a panel in it
 * would be asking about a window inside it.
 */
const maximized = computed(() => isMaximized(props.frame))
const minimized = computed(() => isMinimized(props.frame))
const settled = computed(() => maximized.value || minimized.value)
const resizable = computed(() => win.resizable.value && !fixed.value && !settled.value)
const movable = computed(() => win.movable.value && !fixed.value && !settled.value)

/** The panel a rolled-up window's close button would close, if there is one. */
const only = computed(() => {
  const ids = panelIds(props.frame.node)
  return ids.length === 1 ? (ids[0] ?? null) : null
})
const closable = computed(() => only.value !== null && win.closable(only.value))

/**
 * A frame holding a single group needs no title bar: that group's tab strip is
 * already the window's, and a second bar above it would say the same thing
 * twice. A frame holding a *space* has no such strip — it would draw a bar of
 * its own inside this one — so this bar is that space's, which is also the
 * only unambiguous place to take hold of the window.
 *
 * Rolled up, every window gets one: what is rolled away includes the tab strip
 * that would otherwise have been the title, and a window with nothing left to
 * read would be unrollable only by luck.
 *
 * A headless space is the exception to both, and to the roll-up too — "no
 * title bar" is the whole of what it asked for. A window with nothing on it to
 * press is one the host presses for it, rolled up included.
 */
const headless = computed(() => props.frame.node.headless === true)
const titled = computed(
  () => !headless.value && (!isGroup(props.frame.node) || minimized.value),
)

/**
 * The frame's own name, then the name of the space it holds, then the one it
 * borrows from the pane it is named after. A window holding a space is that
 * space's chrome, so it says what the space would have said for itself.
 */
const title = computed(
  () =>
    props.frame.title ||
    spaceTitle(props.frame.node) ||
    nodeTitle(props.frame.node, (id) => win.panelFor(id)?.title),
)

/**
 * The menu of the space this window holds, when what it holds is a space: that
 * space draws no bar inside the window, so its four choices are on this one.
 * Empty for a window holding a single group, whose pane speaks for its tabs.
 */
const spaceMenu = computed(() => win.spaceMenu(props.path))

function onBarPointerDown(event: PointerEvent) {
  const target = event.target as HTMLElement | null
  if (target?.closest('button, a, input, select, textarea, label')) return
  win.beginFrameDragAt(props.path, event, 'move')
}

/**
 * A double-click on the title bar maximizes a window — or, on one already
 * rolled up, unrolls it, which is the only thing a rolled-up window's bar can
 * usefully mean.
 */
function onBarDoubleClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null
  if (target?.closest('button, a, input, select, textarea, label')) return
  if (minimized.value) win.toggleMinimizeAt(props.path)
  else win.toggleMaximizeAt(props.path)
}

/** True while any of this frame's panels is the one being dragged by the frame. */
const dragging = computed(() => {
  const id = win.framing.value
  return id !== null && hasPanel(props.frame.node, id)
})

const style = computed(() => ({
  // Neither maximizing nor rolling up overwrites the rect: it is where the
  // window goes back to, and both are a way of not being there for a while.
  ...(maximized.value
    ? { inset: '0' }
    : minimized.value && props.place
    ? {
        left: `${props.place.x}px`,
        bottom: `${props.place.bottom}px`,
        width: `${MINIMIZED_WIDTH}px`,
        height: `${MINIMIZED_HEIGHT}px`,
      }
    : {
        left: `${props.frame.rect.x}px`,
        top: `${props.frame.rect.y}px`,
        width: `${props.frame.rect.w}px`,
        height: `${props.frame.rect.h}px`,
      }),
  // Back to front. The DOM order says the same thing, but a frame that paints
  // a shadow over its neighbour should not depend on that being noticed.
  zIndex: props.order + 1,
}))

/** Corners last: they sit over the edges they share a side with. */
const HANDLES: FrameHandle[] = ['n', 's', 'e', 'w', 'nw', 'ne', 'sw', 'se']
</script>

<template>
  <div
    class="dc-float"
    :style="style"
    :data-dc-order="order"
    :data-dc-path="path.join('/')"
    :data-dc-maximized="maximized ? 'true' : 'false'"
    :data-dc-minimized="minimized ? 'true' : 'false'"
    :data-dc-dragging="dragging ? 'true' : 'false'"
    @pointerdown="win.raiseAt(path)"
  >
    <header
      v-if="titled"
      class="dc-float__bar"
      :data-dc-movable="movable ? 'true' : 'false'"
      @pointerdown="onBarPointerDown"
      @dblclick="onBarDoubleClick"
    >
      <span class="dc-float__title dc-truncate">{{ title }}</span>
      <MenuButton
        v-if="spaceMenu.length"
        :items="spaceMenu"
        :label="`${title} menu`"
      />
      <!--
        A group of their own, so a theme can move all three at once: macOS
        wants them at the left of the bar, in the other order. Which is also
        why the close comes last here rather than where it is drawn.
      -->
      <div
        v-if="!fixed || (minimized && closable && only)"
        class="dc-float__controls dc-controls"
      >
        <button
          v-if="!fixed"
          type="button"
          class="dc-float__button dc-control"
          :aria-label="`${minimized ? 'Unroll' : 'Minimize'} ${title}`"
          :aria-pressed="minimized"
          :data-dc-minimize="anchor"
          @click="win.toggleMinimizeAt(path)"
        >
          <WindowGlyph :kind="minimized ? 'unroll' : 'minimize'" />
        </button>
        <button
          v-if="!fixed"
          type="button"
          class="dc-float__button dc-control"
          :aria-label="`${maximized ? 'Restore' : 'Maximize'} ${title}`"
          :aria-pressed="maximized"
          :data-dc-maximize="anchor"
          @click="win.toggleMaximizeAt(path)"
        >
          <WindowGlyph :kind="maximized ? 'restore' : 'maximize'" />
        </button>
        <!-- Rolled up, the pane's own close has gone with the rest of it. -->
        <button
          v-if="minimized && closable && only"
          type="button"
          class="dc-float__button dc-control"
          :aria-label="`Close ${title}`"
          :data-dc-close="only"
          @click="win.close(only)"
        >
          <WindowGlyph kind="close" />
        </button>
      </div>
    </header>

    <!-- `display: contents` normally, so what is inside lays out as though
         this were not here; `display: none` once rolled up, which keeps it in
         the DOM — and keeps its scroll position and whatever else. -->
    <div class="dc-float__content">
      <slot />
    </div>

    <!-- Pointer-only: the same reach without one is the pane's own grip, which
         moves and resizes this frame from the arrow keys. -->
    <span
      v-for="handle in resizable ? HANDLES : []"
      :key="handle"
      class="dc-float__grip"
      :data-dc-handle="handle"
      aria-hidden="true"
      @pointerdown.stop="win.beginFrameDragAt(path, $event, handle)"
    />
  </div>
</template>

<style scoped>
.dc-float {
  position: absolute;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  border: 1px solid var(--dc-line-2);
  border-radius: var(--dc-radius);
  background: var(--dc-bg-1);
  box-shadow: var(--dc-shadow);
  /* The frame clips its own corners, so the pane inside need not round them. */
  overflow: hidden;
}

.dc-float[data-dc-dragging='true'] {
  border-color: var(--dc-accent);
  /* Nothing inside should select or scroll while the frame is being carried. */
  user-select: none;
}

.dc-float__bar {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  min-height: 28px;
  border-bottom: 1px solid var(--dc-line);
  background: var(--dc-bg-2);
}

.dc-float__bar[data-dc-movable='true'] {
  cursor: grab;
  /* A drag on a touch screen must not also scroll what is inside the window. */
  touch-action: none;
}

.dc-float[data-dc-dragging='true'] .dc-float__bar {
  cursor: grabbing;
}

.dc-float__title {
  flex: 1 1 auto;
  min-width: 0;
  color: var(--dc-fg-0);
  font-size: 12px;
  font-weight: 600;
}

.dc-float__controls {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 4px;
}

/*
 * Fluent's title bar buttons run into the corner of the window, so the bar's
 * own padding comes back off — the bar is the only one that knows what it
 * padded by. What the buttons look like is the theme's, in tokens.css.
 */
[data-dc-theme='windows'] .dc-float__bar > .dc-float__controls {
  margin-right: -10px;
}

.dc-float__button {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: var(--dc-radius-sm);
  background: transparent;
  color: var(--dc-fg-3);
  font-size: 12px;
  line-height: 1;
  cursor: default;
}

.dc-float__button:hover {
  background: var(--dc-accent-bg);
  color: var(--dc-fg-0);
}

/* Filling its float: no shadow to cast, and no corners to round off. */
.dc-float[data-dc-maximized='true'] {
  border-radius: 0;
  box-shadow: none;
}

.dc-float__content {
  display: contents;
}

.dc-float[data-dc-minimized='true'] .dc-float__content {
  display: none;
}

/* Rolled up to its bar: no border under it, and nothing left to scroll. */
.dc-float[data-dc-minimized='true'] .dc-float__bar {
  border-bottom: none;
}

/*
 * A grip is a comfortable target that straddles the border rather than sitting
 * inside it, so the pointer finds the edge where the edge looks to be. They
 * are the frame's only children besides the node, and are drawn over it.
 */
.dc-float__grip {
  position: absolute;
  z-index: 10;
  touch-action: none;
}

.dc-float__grip[data-dc-handle='n'],
.dc-float__grip[data-dc-handle='s'] {
  left: 8px;
  right: 8px;
  height: 8px;
  cursor: ns-resize;
}

.dc-float__grip[data-dc-handle='e'],
.dc-float__grip[data-dc-handle='w'] {
  top: 8px;
  bottom: 8px;
  width: 8px;
  cursor: ew-resize;
}

.dc-float__grip[data-dc-handle='n'] {
  top: -3px;
}
.dc-float__grip[data-dc-handle='s'] {
  bottom: -3px;
}
.dc-float__grip[data-dc-handle='w'] {
  left: -3px;
}
.dc-float__grip[data-dc-handle='e'] {
  right: -3px;
}

.dc-float__grip[data-dc-handle='nw'],
.dc-float__grip[data-dc-handle='ne'],
.dc-float__grip[data-dc-handle='sw'],
.dc-float__grip[data-dc-handle='se'] {
  width: 14px;
  height: 14px;
}

.dc-float__grip[data-dc-handle='nw'] {
  top: -3px;
  left: -3px;
  cursor: nwse-resize;
}
.dc-float__grip[data-dc-handle='ne'] {
  top: -3px;
  right: -3px;
  cursor: nesw-resize;
}
.dc-float__grip[data-dc-handle='sw'] {
  bottom: -3px;
  left: -3px;
  cursor: nesw-resize;
}
.dc-float__grip[data-dc-handle='se'] {
  bottom: -3px;
  right: -3px;
  cursor: nwse-resize;
}
</style>
