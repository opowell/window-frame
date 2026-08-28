<script setup lang="ts">
/*
 * The window: panels in a recursively split grid.
 *
 * It owns three things and delegates the rest — the layout tree (a `v-model`,
 * so a host can persist or restore it), which view each panel is showing, and
 * the in-flight drag. What a panel *contains* is never its business: the
 * matching slot renders it.
 *
 * The tokens stylesheet is imported here for the same reason `DataShell` does
 * it: a CSS import from the type-bearing entry point ends up in the emitted
 * `.d.ts` as a module consumers cannot resolve.
 */
import '../style/tokens.css'

import { computed, h, nextTick, onBeforeUnmount, ref, useSlots } from 'vue'
import type { VNode } from 'vue'
import type { ShellTheme } from '../types'
import type { MenuItemDef } from '../menu/types'
import type {
  DropEdge,
  FloatRect,
  FrameChange,
  FrameGrip,
  PanelMove,
  SplitDirection,
  WindowGroup,
  WindowNode,
  WindowPanelDef,
} from '../window/types'
import {
  activeTab,
  clampRect,
  collapseSpace,
  hasPanel,
  DEFAULT_FRAME,
  floatPanel,
  floatSplit,
  floatTabs,
  frameAt,
  frameOf as findFrame,
  framePathOf,
  frontPanel,
  groupOf,
  isFloat,
  isGroup,
  isSplit,
  isMaximized,
  isMinimized,
  maximizeFrameAt,
  minimizeFrameAt,
  moveTab,
  movePanel,
  nodeAt,
  normalizeLayout,
  raisedPath,
  raiseFrameAt,
  reconcileLayout,
  replaceAt,
  resizeRect,
  rootSpace,
  setActivePanel,
  setFrameRect,
  setFrameRectAt,
  setSizesAt,
  spreadTabs,
  swapPanels,
  tileFloat,
} from '../window/layout'
import type { DropTarget, MoveDirection } from '../composables/windowContext'
import { provideWindowContext } from '../composables/windowContext'
import WindowNodeView from './WindowNode.vue'

const props = withDefaults(
  defineProps<{
    /** The panels this window can show, in the order a default layout uses. */
    panels: WindowPanelDef[]
    /** Lets panels be dragged by their header into a new part of the grid. */
    movable?: boolean
    /** Lets the boundary between two panels be dragged. */
    resizable?: boolean
    /** Smallest a panel may be resized to, in pixels. */
    minPanelSize?: number
    /**
     * Gives every panel a close button. Closing is a request, not something
     * the window does itself: it emits `panel-close` and the host drops the
     * panel from `panels`, which is what removes it. A panel can say otherwise
     * with its own `closable`.
     */
    closable?: boolean
    /**
     * Whether a pane offers the items the *window* contributes to its menu —
     * which view it is showing, how its space is shown, the way along its
     * tabs. Items the content inside it registered with `usePaneMenu` are not
     * the window's to withhold, and stay.
     *
     * A panel's `views` go with them: with no menu there is nowhere to offer
     * them, and switching stays the host's from `v-model:views`. `fixedView`
     * is how a space keeps its menu and drops that one choice.
     */
    menu?: boolean
    /**
     * Whether a strip that *is* a named space says that name beside its tabs.
     *
     * A row, a column and a desktop each draw a header of their own to say it
     * on; a strip has only its tabs, so the name goes in front of them — which
     * is what keeps a named space named in all four of the shapes it is shown
     * in. Off, the name is kept in the layout and said again the moment the
     * space is shown any other way: what a strip spends on chrome is then its
     * tabs and nothing else.
     */
    spaceNames?: boolean
    /**
     * Extends or replaces the menu a pane offers, given the items it would
     * have had: the content's own, then the window's. Return them with yours
     * appended, or something else entirely.
     */
    paneMenu?: (panel: WindowPanelDef, items: MenuItemDef[]) => MenuItemDef[]
    /** Overrides the `--dc-accent` token. Shorthand for `tokens`. */
    accent?: string
    /** Design tokens set on the window element — `{ '--dc-surface': '#101418' }`. */
    tokens?: Record<string, string>
    /**
     * `minimal`, the default, is paper, ink and hairlines with nothing else
     * on; `mono-size` is that theme with every word set at one size and one
     * weight; `auto` follows the system setting; `macos` and `windows` wear
     * that system's design language and follow its scheme; `inherit` brings
     * no palette at all.
     */
    theme?: ShellTheme
  }>(),
  {
    movable: false,
    resizable: true,
    minPanelSize: 120,
    closable: false,
    menu: true,
    spaceNames: true,
    theme: 'minimal',
  },
)

const emit = defineEmits<{
  /** A panel was dropped somewhere new. The layout has already been updated. */
  'panel-move': [move: PanelMove]
  'view-change': [change: { panel: string; view: string }]
  /** A panel was clicked into or focused. */
  'panel-activate': [panel: string]
  /** A tab was brought to the top of its group. */
  'tab-select': [selection: { panel: string }]
  /** A floating frame finished being moved or resized. */
  'frame-change': [change: FrameChange]
  /** A floating window was maximized, or put back where it was. */
  'frame-maximize': [change: { panel: string; maximized: boolean }]
  /** A floating window was rolled up to its title bar, or unrolled. */
  'frame-minimize': [change: { panel: string; minimized: boolean }]
  /**
   * A panel's close button was pressed. The window has not removed it — drop
   * it from `panels` to do that, and the layout reconciles around it.
   */
  'panel-close': [panel: string]
}>()

/**
 * Both optionally controlled, the way `DataShell` treats its panel and pins:
 * bind `v-model:layout` to own the arrangement — to persist it per user, say —
 * or leave it alone and the window keeps it. `update:layout` is emitted either
 * way, so a host can listen without also having to supply the value.
 *
 * `null` means "no layout given": every panel goes in a row, and the first
 * drag replaces that with a real tree.
 */
const layout = defineModel<WindowNode | null>('layout', { default: null })
/** Chosen view per panel id. Absent falls back to the panel's own default. */
const views = defineModel<Record<string, string>>('views', { default: () => ({}) })

/*
 * Slots are read here and handed to the panes through the context. A pane sits
 * an arbitrary number of splits below this component, so forwarding slots down
 * the template would mean every split re-declaring every slot it might contain.
 */
const slots = useSlots()

const byId = computed(() => new Map(props.panels.map((panel) => [panel.id, panel])))
const ids = computed(() => props.panels.map((panel) => panel.id))

/**
 * What is actually rendered: the given layout squared with the panels that
 * exist. A stored layout naming a panel that has since gone, or missing one
 * that has since appeared, renders anyway rather than leaving a hole.
 */
const resolved = computed(() => reconcileLayout(layout.value, ids.value))

const focused = ref<string | null>(null)
const dragging = ref<string | null>(null)
const dropTarget = ref<DropTarget | null>(null)
/**
 * Whether the drag in flight may dock — join the panel to whatever is under
 * the pointer — or is being held off the grid by the modifier. True whenever
 * nothing is being dragged, since nothing is then being held off anything.
 */
const docking = ref(true)
const moving = ref<string | null>(null)
const framing = ref<string | null>(null)
const pointer = ref<{ x: number; y: number } | null>(null)
/** Narrates keyboard moves, which have no pointer to follow. */
const announcement = ref('')

/*
 * Drop targeting and keyboard moves both need to know where each pane is. They
 * read that from the panes on screen rather than from a registry the panes
 * keep up to date: a registry has to be right about mount order — a pane being
 * re-keyed into a new position mounts before the old one unmounts — and this
 * cannot be wrong, because it is only ever read at the moment it is needed.
 */
const root = ref<HTMLElement | null>(null)

interface Pane {
  /**
   * The panels this pane holds, in tab order — its own tabs only. A space
   * sharing its strip has panes of its own, and those are the panes that speak
   * for the panels in it.
   */
  panels: string[]
  element: HTMLElement
}

function paneElements(): Pane[] {
  const container = root.value
  if (!container) return []
  const found = container.querySelectorAll<HTMLElement>('.dc-pane[data-dc-panels]')
  return [...found]
    // A window nested inside a pane owns its own panes.
    .filter((element) => element.closest('.dc-window') === container)
    .map((element) => ({ panels: (element.dataset.dcPanels ?? '').split(' '), element }))
}

/**
 * How far forward a pane is: the stacking order of every float above it, the
 * outermost first. Read from the DOM rather than the tree because that is
 * where the hit test is already looking, and because the two cannot disagree —
 * the attribute is written from the same number that decides the `z-index`.
 */
function stackOrder(element: HTMLElement): number[] {
  const order: number[] = []
  let current = element.closest<HTMLElement>('.dc-float')
  while (current) {
    order.unshift(Number(current.dataset.dcOrder ?? 0))
    current = current.parentElement?.closest<HTMLElement>('.dc-float') ?? null
  }
  return order
}

/** Back to front. Ties keep the order they were found in, which is layout order. */
function paneElementsByStack(): Pane[] {
  return paneElements()
    .map((pane) => ({ pane, order: stackOrder(pane.element) }))
    .sort((a, b) => {
      const depth = Math.max(a.order.length, b.order.length)
      for (let level = 0; level < depth; level += 1) {
        // A pane on no float at all is behind one that is on a float above it.
        const step = (a.order[level] ?? -1) - (b.order[level] ?? -1)
        if (step !== 0) return step
      }
      return 0
    })
    .map((entry) => entry.pane)
}

/** The pane a panel lives in, whether or not its tab is the one on top. */
const paneOf = (id: string): Pane | null =>
  paneElements().find((pane) => pane.panels.includes(id)) ?? null

/* -------------------------------------------------------------------- view */

function viewFor(id: string): string {
  const panel = byId.value.get(id)
  if (!panel) return ''
  const chosen = views.value[id]
  if (chosen && panel.views?.some((view) => view.key === chosen)) return chosen
  return panel.defaultView ?? panel.views?.[0]?.key ?? ''
}

function setView(id: string, view: string) {
  views.value = { ...views.value, [id]: view }
  emit('view-change', { panel: id, view })
}

/* ------------------------------------------------------------------ moving */

const draggablePanels = computed(
  () => props.panels.filter((panel) => panel.fixed !== true).length,
)

function canMove(id: string): boolean {
  if (!props.movable) return false
  // Somewhere to go: one movable panel among fixed ones has nowhere to land.
  if (draggablePanels.value < 1 || props.panels.length < 2) return false
  return byId.value.get(id)?.fixed !== true
}

function apply(next: WindowNode | null, move: PanelMove | null) {
  const current = resolved.value
  if (!next || !current || next === current) return
  layout.value = next
  if (move) emit('panel-move', move)
}

/** Which part of a panel the pointer is over — the four edges, or the middle. */
function edgeAt(box: DOMRect, x: number, y: number): DropEdge {
  if (box.width <= 0 || box.height <= 0) return 'center'
  const rx = (x - box.left) / box.width
  const ry = (y - box.top) / box.height
  const band = 0.3
  if (rx > band && rx < 1 - band && ry > band && ry < 1 - band) return 'center'

  const edges = [
    { edge: 'left', distance: rx },
    { edge: 'right', distance: 1 - rx },
    { edge: 'top', distance: ry },
    { edge: 'bottom', distance: 1 - ry },
  ] as const
  return edges.reduce((best, candidate) =>
    candidate.distance < best.distance ? candidate : best,
  ).edge
}

/** The gap between tabs the pointer is nearest, counted from the left. */
function tabIndexAt(strip: HTMLElement, x: number): number {
  const tabs = [...strip.querySelectorAll<HTMLElement>('.dc-tab')]
  const index = tabs.findIndex((tab) => {
    const box = tab.getBoundingClientRect()
    return x < box.left + box.width / 2
  })
  return index === -1 ? tabs.length : index
}

/**
 * The pane under the pointer, and where in it a drop would land.
 *
 * The pane holding the dragged panel is skipped only when it holds nothing
 * else — hovering back over where it came from then offers no target and
 * releasing cancels. A pane it shares with other tabs is still a target: that
 * is how a tab is reordered along its own strip, or split out to one side of
 * the group it is in.
 */
function targetAt(x: number, y: number, dragged: string): DropTarget | null {
  // Front to back: where floating windows overlap, the one on top is the one
  // being dropped on. Tiled panes never overlap, so the order is moot there.
  for (const { panels, element } of paneElementsByStack().reverse()) {
    const box = element.getBoundingClientRect()
    if (x < box.left || x > box.right || y < box.top || y > box.bottom) continue

    // The group is named by one of its panels, and never by the one in flight:
    // a panel cannot be dropped relative to itself.
    const panel = panels.find((id) => id !== dragged)

    // The strip is inside the top edge's band, and wins over it — dropping on
    // tabs is how a position among them is chosen.
    const strip = element.querySelector<HTMLElement>('.dc-pane__tabs')
    const stripBox = strip?.getBoundingClientRect()
    if (strip && stripBox && y >= stripBox.top && y <= stripBox.bottom) {
      return panel ? { panel, edge: 'center', index: tabIndexAt(strip, x) } : null
    }

    /*
     * A space sharing this strip covers the rest of the pane, and none of that
     * is the pane's to be dropped on: what the pointer is over is a pane of
     * that space, or its bare desktop, and both are targets of their own —
     * found by carrying on rather than by answering for them here.
     */
    const shared = element.querySelector<HTMLElement>(':scope > .dc-pane__space')
    if (shared) {
      const inner = shared.getBoundingClientRect()
      if (x >= inner.left && x <= inner.right && y >= inner.top && y <= inner.bottom) continue
    }

    if (!panel) return null
    return { panel, edge: edgeAt(box, x, y) }
  }
  // Over no pane at all: a float's bare desktop takes the panel as a window.
  return desktopTargetAt(x, y, dragged)
}

/** The floats on screen, innermost first — a nested one is inside its parent. */
function desktopElements(): HTMLElement[] {
  const container = root.value
  if (!container) return []
  return [...container.querySelectorAll<HTMLElement>('.dc-window__desktop')]
    .filter((element) => element.closest('.dc-window') === container)
    .reverse()
}

/**
 * A drop on a float's bare desktop, and the window it would make: the size of
 * the frame the panel is leaving — so a tab dragged out of a window becomes a
 * window that size — or the default when it was tiled rather than floating.
 *
 * The new window is placed so the pointer lands just inside its title bar,
 * which is where the panel was picked up from.
 */
function desktopTargetAt(x: number, y: number, dragged: string): DropTarget | null {
  const current = resolved.value
  if (!current) return null

  for (const desktop of desktopElements()) {
    const box = desktop.getBoundingClientRect()
    if (x < box.left || x > box.right || y < box.top || y > box.bottom) continue

    // Named by something already on this desktop, and never by the panel in
    // flight: a panel cannot be dropped relative to itself.
    const near = panesIn(desktop).flatMap((pane) => pane.panels).find((id) => id !== dragged)
    if (!near) return null

    const from = findFrame(current, dragged)?.rect
    const rect = clampRect(
      {
        x: x - box.left - 24,
        y: y - box.top - 12,
        w: from?.w ?? DEFAULT_FRAME.w,
        h: from?.h ?? DEFAULT_FRAME.h,
      },
      { w: desktop.clientWidth, h: desktop.clientHeight },
      props.minPanelSize,
    )
    return { panel: near, edge: 'float', rect }
  }
  return null
}

/** The panes belonging to one float, rather than to a float nested inside it. */
function panesIn(desktop: HTMLElement): Pane[] {
  return paneElements().filter(
    (pane) => pane.element.closest('.dc-window__desktop') === desktop,
  )
}

let releaseDrag: (() => void) | null = null

/**
 * Whether the modifier that holds a panel off the grid is down. While it is, a
 * drag docks nowhere — no edge, no middle, no strip of tabs — and a float's
 * bare desktop is the only thing left to drop on, so a window moves around the
 * desktop it is on instead of joining whatever it passes over.
 *
 * Alt, because the other three are spoken for: shift already means "into the
 * pane that way, as a tab" in a keyboard move, which is the opposite of this;
 * ctrl and a press is a secondary click on macOS; and meta belongs to the
 * platform. Alt is also where a desktop puts the alternate reading of a drag.
 */
const heldOff = (event: { altKey: boolean }) => event.altKey

function beginDrag(id: string, event: PointerEvent) {
  if (!canMove(id) || dragging.value || framing.value || event.button !== 0) return

  const startX = event.clientX
  const startY = event.clientY
  let started = false
  /*
   * Taken from every event that carries it rather than read once: the modifier
   * is pressed and let go mid-drag, and a pointer event tells the truth about
   * it — so a keyup the window never saw, because the key went to something
   * else entirely, corrects itself on the next move.
   */
  let free = heldOff(event)

  /** Where a release would land, from the last point the pointer passed over. */
  const aim = () => {
    const at = pointer.value
    if (!at) return
    // Docking off leaves one thing to drop on: a float's bare desktop.
    dropTarget.value = free ? desktopTargetAt(at.x, at.y, id) : targetAt(at.x, at.y, id)
  }

  const onMove = (moveEvent: PointerEvent) => {
    // A press that never travels is a click on the header, not a drag.
    if (!started) {
      if (Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY) < 4) return
      started = true
      dragging.value = id
      moving.value = null
    }
    free = heldOff(moveEvent)
    docking.value = !free
    pointer.value = { x: moveEvent.clientX, y: moveEvent.clientY }
    aim()
  }

  /**
   * The modifier on its own moves no pointer, so pressing it or letting it go
   * re-aims the drop at the point the panel is already over.
   */
  const onModifier = (keyEvent: KeyboardEvent) => {
    if (heldOff(keyEvent) === free) return
    free = !free
    docking.value = !free
    if (started) aim()
  }

  const finish = (drop: boolean) => {
    releaseDrag?.()
    const target = dropTarget.value
    const current = resolved.value
    if (drop && started && target && current) {
      // A drop on bare desktop makes a window rather than dividing a group,
      // so it is the one drop `movePanel` is not the operation for.
      const next =
        target.edge === 'float' && target.rect
          ? floatPanel(current, id, target.panel, target.rect)
          : movePanel(current, id, target.panel, target.edge, target.index)
      apply(next, {
        panel: id,
        target: target.panel,
        edge: target.edge,
        ...(target.index === undefined ? {} : { index: target.index }),
        ...(target.rect === undefined ? {} : { rect: target.rect }),
      })
    }
    dragging.value = null
    dropTarget.value = null
    pointer.value = null
    docking.value = true
  }

  const onUp = () => finish(true)
  const onCancel = () => finish(false)
  const onKey = (keyEvent: KeyboardEvent) => {
    if (keyEvent.key === 'Escape') {
      finish(false)
      return
    }
    onModifier(keyEvent)
  }

  releaseDrag = () => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointercancel', onCancel)
    window.removeEventListener('keydown', onKey)
    window.removeEventListener('keyup', onModifier)
    releaseDrag = null
  }

  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', onCancel)
  window.addEventListener('keydown', onKey)
  window.addEventListener('keyup', onModifier)
}

onBeforeUnmount(() => releaseDrag?.())

/* ------------------------------------------------------------------ floats */

let releaseFrame: (() => void) | null = null

/**
 * The float a frame sits on — the box its position is measured against, and
 * the box it is kept inside. Read from the DOM at the moment a drag starts,
 * for the same reason pane positions are: it cannot then be out of date.
 *
 * Found by the path the frame was rendered at rather than from a pane inside
 * it: the panes inside a window holding a desktop are on *that* desktop, and
 * would hand back the wrong box.
 */
function desktopAt(path: readonly number[]): HTMLElement | null {
  const container = root.value
  if (!container) return null
  const found = container.querySelectorAll<HTMLElement>(
    `.dc-float[data-dc-path="${path.join('/')}"]`,
  )
  // A window nested inside a pane's content is another window's frame, and
  // numbers its own paths.
  const own = [...found].find((element) => element.closest('.dc-window') === container)
  return own?.parentElement ?? null
}

/*
 * A frame is addressed by where it was rendered, and a panel is turned into
 * that address on the way in.
 *
 * Every operation below acts on a path, because that is the only thing that
 * names one frame and no other: a window holding a desktop shares its panels
 * with the windows on it. A pane still speaks with the panel it holds, and
 * `framePathOf` is where the two meet — it answers with the innermost frame
 * holding that panel, which is the frame the pane is in.
 */
function framePath(id: string): number[] | null {
  const current = resolved.value
  return current ? framePathOf(current, id) : null
}

function raiseAt(path: readonly number[]) {
  const current = resolved.value
  if (!current) return
  const next = raiseFrameAt(current, path)
  if (next !== current) layout.value = next
}

function raise(id: string) {
  const path = framePath(id)
  if (path) raiseAt(path)
}

function maximized(id: string): boolean {
  const current = resolved.value
  const held = current ? findFrame(current, id) : null
  return held !== null && isMaximized(held)
}

function minimized(id: string): boolean {
  const current = resolved.value
  const held = current ? findFrame(current, id) : null
  return held !== null && isMinimized(held)
}

/** The panel a window is named by in the events it emits: the one it is showing. */
function frameName(path: readonly number[]): string {
  const current = resolved.value
  const held = current ? frameAt(current, path) : null
  return held ? frontPanel(held.node) : ''
}

/**
 * Rolls a window up to its title bar and docks it along the bottom of its
 * float, or unrolls it. Where it docks is worked out from how many others are
 * rolled up beside it, so nothing about it is stored on the frame.
 */
function toggleMinimizeAt(path: readonly number[]) {
  const current = resolved.value
  const held = current ? frameAt(current, path) : null
  if (!current || !held) return
  const panel = frontPanel(held.node)
  if (byId.value.get(panel)?.fixed === true) return

  const rolling = !isMinimized(held)
  let next = minimizeFrameAt(current, path, rolling)
  if (next === current) return

  // Unrolling brings it forward, the way touching any window does; rolling up
  // leaves the stack alone, since the window is going out of the way.
  if (!rolling) next = raiseFrameAt(next, path)

  layout.value = next
  emit('frame-minimize', { panel, minimized: rolling })
}

function toggleMinimize(id: string) {
  const path = framePath(id)
  if (path) toggleMinimizeAt(path)
}

/**
 * A maximized window fills its float and cannot be moved or resized while it
 * does — there is nowhere for it to go, and a drag that did nothing would be
 * worse than one that is not offered.
 */
function toggleMaximizeAt(path: readonly number[]) {
  const current = resolved.value
  const held = current ? frameAt(current, path) : null
  if (!current || !held) return
  const panel = frontPanel(held.node)
  if (byId.value.get(panel)?.fixed === true) return

  const filling = !isMaximized(held)
  let next = maximizeFrameAt(current, path, filling)
  if (next === current) return

  // A window filling its float has to be in front of what it covers, so
  // maximizing raises it too. Both are composed before anything is written:
  // `layout` may be a controlled model, in which case a second write built
  // from `resolved` would be built from the tree before the first.
  if (filling) next = raiseFrameAt(next, path)

  layout.value = next
  emit('frame-maximize', { panel, maximized: filling })
}

function toggleMaximize(id: string) {
  const path = framePath(id)
  if (path) toggleMaximizeAt(path)
}

/**
 * Moving and resizing a floating frame are the same drag with a different sum:
 * `move` carries the whole rect, a compass point moves one edge or corner and
 * leaves the opposite one where it is.
 */
function beginFrameDragAt(path: readonly number[], event: PointerEvent, grip: FrameGrip) {
  const current = resolved.value
  const held = current ? frameAt(current, path) : null
  if (!current || !held || event.button !== 0 || dragging.value || framing.value) return
  const id = frontPanel(held.node)
  if (byId.value.get(id)?.fixed === true) return
  // Neither has anywhere to be dragged to: one fills its float, the other is
  // docked along the bottom of it.
  if (isMaximized(held) || isMinimized(held)) return
  if (grip === 'move' ? !props.movable : !props.resizable) return

  // The box the drag is measured against, read before anything moves: raising
  // the window is about to renumber the paths its float hands out, and the
  // element's own path is what finds it.
  const desktop = desktopAt(path)

  // Forward on the press rather than the release, the way a desktop brings a
  // window up the moment it is touched — and the frame's address follows it up
  // the pile, since raising one is what moves it in the list a path indexes.
  const carried = raisedPath(current, path)
  raiseAt(path)

  const bounds = { w: desktop?.clientWidth ?? 0, h: desktop?.clientHeight ?? 0 }
  const base = { ...held.rect }
  const startX = event.clientX
  const startY = event.clientY
  const min = props.minPanelSize

  /*
   * Deliberately no `preventDefault` here: on a pointer press it suppresses
   * the compatibility mouse events that follow, and with them the `dblclick`
   * that maximizes a window from its title bar. Selection is held off by the
   * `user-select` the frame takes on while it is being dragged, and by the
   * first move below, which is the point at which a press becomes a drag.
   */
  framing.value = id

  const put = (rect: FloatRect) => {
    // Re-read rather than close over the tree captured above: the raise has
    // already replaced it, and this drag must not put that back.
    const tree = resolved.value
    if (!tree) return
    const next = setFrameRectAt(tree, carried, clampRect(rect, bounds, min))
    if (next !== tree) layout.value = next
  }

  const onMove = (moveEvent: PointerEvent) => {
    moveEvent.preventDefault()
    const dx = moveEvent.clientX - startX
    const dy = moveEvent.clientY - startY
    put(
      grip === 'move'
        ? { ...base, x: base.x + dx, y: base.y + dy }
        : resizeRect(base, grip, dx, dy, min),
    )
  }

  const finish = (keep: boolean) => {
    releaseFrame?.()
    framing.value = null
    if (!keep) {
      put(base)
      return
    }
    const landed = resolved.value ? frameAt(resolved.value, carried) : null
    if (landed) emit('frame-change', { panel: frameName(carried), rect: landed.rect })
  }

  const onUp = () => finish(true)
  const onCancel = () => finish(false)
  const onKey = (keyEvent: KeyboardEvent) => {
    if (keyEvent.key === 'Escape') finish(false)
  }

  releaseFrame = () => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointercancel', onCancel)
    window.removeEventListener('keydown', onKey)
    releaseFrame = null
  }

  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', onCancel)
  window.addEventListener('keydown', onKey)
}

function beginFrameDrag(id: string, event: PointerEvent, grip: FrameGrip) {
  const path = framePath(id)
  if (path) beginFrameDragAt(path, event, grip)
}

/** How far one arrow key moves or resizes a floating frame, in pixels. */
const FRAME_STEP = 16

/**
 * The keyboard's version of dragging a frame: an arrow moves it, shift and an
 * arrow resizes it from the bottom-right corner. Between them a window can be
 * placed and sized without a pointer, which the grips themselves cannot offer.
 */
function nudgeFrame(id: string, direction: MoveDirection, resize = false) {
  const current = resolved.value
  const path = framePath(id)
  const held = current && path ? frameAt(current, path) : null
  if (!current || !path || !held) return
  if (byId.value.get(id)?.fixed === true) return
  if (resize ? !props.resizable : !props.movable) return
  if (isMaximized(held) || isMinimized(held)) {
    announcement.value = `${titleOf(id)} is ${
      isMaximized(held) ? 'maximized' : 'minimized'
    }, so it cannot be moved.`
    return
  }

  const dx = direction === 'left' ? -FRAME_STEP : direction === 'right' ? FRAME_STEP : 0
  const dy = direction === 'up' ? -FRAME_STEP : direction === 'down' ? FRAME_STEP : 0
  const desktop = desktopAt(path)
  const bounds = { w: desktop?.clientWidth ?? 0, h: desktop?.clientHeight ?? 0 }

  const wanted = resize
    ? resizeRect(held.rect, 'se', dx, dy, props.minPanelSize)
    : { ...held.rect, x: held.rect.x + dx, y: held.rect.y + dy }

  const next = setFrameRectAt(current, path, clampRect(wanted, bounds, props.minPanelSize))
  // Identical means it was already against that edge, or already that small.
  if (next === current) {
    announcement.value = resize
      ? `${titleOf(id)} cannot be resized further.`
      : `${titleOf(id)} cannot move ${direction}.`
    return
  }

  layout.value = next
  const landed = frameAt(next, path)
  if (!landed) return
  emit('frame-change', { panel: id, rect: landed.rect })
  announcement.value = resize
    ? `${titleOf(id)} resized to ${landed.rect.w} by ${landed.rect.h}.`
    : `${titleOf(id)} moved to ${landed.rect.x}, ${landed.rect.y}.`
}

onBeforeUnmount(() => releaseFrame?.())

/* ---------------------------------------------------------------- keyboard */

/**
 * The pane next to this one in a direction: the nearest that overlaps it on
 * the other axis, so "left" from a tall pane finds whichever of the stack
 * beside it is level with it — the top one.
 */
function neighbourOf(id: string, direction: MoveDirection): string | null {
  const home = paneOf(id)
  const from = home?.element.getBoundingClientRect()
  if (!home || !from) return null
  const horizontal = direction === 'left' || direction === 'right'

  let best: { id: string; distance: number } | null = null
  for (const pane of paneElements()) {
    if (pane === home || pane.element === home.element) continue
    const box = pane.element.getBoundingClientRect()
    const overlaps = horizontal
      ? box.bottom > from.top + 1 && box.top < from.bottom - 1
      : box.right > from.left + 1 && box.left < from.right - 1
    if (!overlaps) continue

    const distance =
      direction === 'left'
        ? from.left - box.right
        : direction === 'right'
          ? box.left - from.right
          : direction === 'up'
            ? from.top - box.bottom
            : box.top - from.bottom
    // Negative means it is on the other side of the pane entirely.
    if (distance < -1) continue

    // Named by a panel that is not the one being moved, since a panel cannot
    // be moved relative to itself.
    const panel = pane.panels.find((other) => other !== id)
    if (!panel) continue
    if (!best || distance < best.distance) best = { id: panel, distance }
  }
  return best?.id ?? null
}

function toggleMoveMode(id: string) {
  const floating = resolved.value ? findFrame(resolved.value, id) !== null : false
  if (!floating && !canMove(id)) return
  moving.value = moving.value === id ? null : id
  const title = titleOf(id)
  if (!moving.value) {
    announcement.value = `${title}: move mode off.`
    return
  }
  announcement.value = floating
    ? `${title}: move mode on. Arrow keys move the window, shift and an arrow ` +
      `resize it, Escape leaves move mode.`
    : `${title}: move mode on. Arrow keys move the panel, shift and an arrow ` +
      `make it a tab of the panel that way, Escape leaves move mode.`
}

const titleOf = (id: string) => byId.value.get(id)?.title ?? id

const EDGE_FOR: Record<MoveDirection, Exclude<DropEdge, 'center'>> = {
  left: 'left',
  right: 'right',
  up: 'top',
  down: 'bottom',
}

/**
 * A keyboard move says the same things a drag can, in the same vocabulary: an
 * arrow moves the panel one place that way, and shift with an arrow drops it
 * into the neighbour that way as a tab. Along a strip of tabs the arrows
 * reorder the strip first, and only take the panel out of the group once it is
 * at the end of it.
 */
function nudge(id: string, direction: MoveDirection, join = false) {
  if (!canMove(id)) return
  const current = resolved.value
  if (!current) return
  const title = titleOf(id)

  // Within a strip, left and right are the strip's own order.
  const home = groupOf(current, id)
  const horizontal = direction === 'left' || direction === 'right'
  if (!join && home && horizontal && home.panels.length > 1) {
    const from = home.panels.indexOf(id)
    const to = direction === 'left' ? from - 1 : from + 1
    if (to >= 0 && to < home.panels.length) {
      apply(moveTab(current, id, to), { panel: id, target: id, edge: 'center', index: to })
      announcement.value = `${title} moved ${direction}, now tab ${to + 1} of ${home.panels.length}.`
      restoreGrip(id)
      return
    }
  }

  const neighbour = neighbourOf(id, direction)
  if (!neighbour || !canMove(neighbour)) {
    announcement.value = `${title} cannot move ${direction}.`
    return
  }

  const edge = EDGE_FOR[direction]
  const alone = home?.panels.length === 1 && groupOf(current, neighbour)?.panels.length === 1

  if (join) {
    apply(movePanel(current, id, neighbour, 'center'), {
      panel: id,
      target: neighbour,
      edge: 'center',
    })
    announcement.value = `${title} joined ${titleOf(neighbour)} as a tab.`
  } else if (alone) {
    /*
     * Two panes of one panel each: trading places puts the panel exactly where
     * the neighbour was, which is the same order an edge drop would give while
     * leaving every size in the window untouched. Lifting it out and putting
     * it back would halve the neighbour instead, so a panel walked across the
     * grid would leave a trail of resized panes behind it.
     */
    apply(swapPanels(current, id, neighbour), { panel: id, target: neighbour, edge })
    announcement.value = `${title} moved ${direction}, trading places with ${titleOf(neighbour)}.`
  } else {
    apply(movePanel(current, id, neighbour, edge), { panel: id, target: neighbour, edge })
    announcement.value = `${title} moved ${direction}, beside ${titleOf(neighbour)}.`
  }
  restoreGrip(id)
}

/**
 * The pane is re-created where it landed, so the grip that is driving this has
 * gone with the old one. Move mode is a sequence of presses; put the focus
 * back on the panel that moved so the next arrow key still reaches it.
 */
function restoreGrip(id: string) {
  void nextTick(() => {
    paneOf(id)?.element.querySelector<HTMLElement>('.dc-pane__grip')?.focus()
  })
}

/* ------------------------------------------------------------------ sizing */

function setSizes(path: readonly number[], sizes: number[]) {
  const current = resolved.value
  if (!current) return
  layout.value = setSizesAt(current, path, sizes)
}

/** Brings a panel's tab to the top of its group. */
function selectPanel(id: string) {
  const current = resolved.value
  if (!current) return
  const next = setActivePanel(current, id)
  if (next === current) return
  layout.value = next
  emit('tab-select', { panel: id })
}

/* ------------------------------------------------------------------- menu */

/*
 * Named for what it answers rather than after the prop it falls back to: a
 * `closable` here would be a second thing of that name the template can see,
 * and the one that would win.
 */
function canClose(id: string): boolean {
  return byId.value.get(id)?.closable ?? props.closable
}

function close(id: string) {
  if (!canClose(id)) return
  emit('panel-close', id)
}

/*
 * Menu items the content of a panel has registered, through `usePaneMenu`.
 *
 * Held as getters rather than as values, so what the content offers is read
 * when the menu is built and can say what is true at that moment. Keyed by a
 * token of its own so that two contents in one panel — or the same content
 * remounted — cannot displace each other's items.
 */
const contributed = ref(new Map<number, { panel: () => string; items: () => MenuItemDef[] }>())
let contributions = 0

function registerMenu(panel: () => string, items: () => MenuItemDef[]): () => void {
  const token = (contributions += 1)
  contributed.value.set(token, { panel, items })
  return () => {
    contributed.value.delete(token)
  }
}

/** What the content of this panel has put in its menu, in registration order. */
function contributedFor(id: string): MenuItemDef[] {
  const items: MenuItemDef[] = []
  for (const source of contributed.value.values()) {
    if (source.panel() === id) items.push(...source.items())
  }
  return items
}

/** A group of menu items, and what to call it when it is not the only one. */
interface MenuSectionDef {
  /** Named for what the items are about, since that is what a heading says. */
  id: string
  title: string
  items: MenuItemDef[]
}

/**
 * Groups of items with a name over each — or, where only one of them has
 * anything in it, that one on its own and unnamed.
 *
 * A heading answers "which of these is this item about?", so a menu with one
 * answer has no question to put: a pane of host content offering nothing but
 * its views is the list of views, the way it always was.
 */
function sectioned(groups: MenuSectionDef[]): MenuItemDef[] {
  const filled = groups.filter((group) => group.items.length > 0)
  if (filled.length < 2) return filled.flatMap((group) => group.items)
  return filled.flatMap((group) => [
    { id: group.id, heading: true, label: group.title },
    ...group.items,
  ])
}

/** What a strip of tabs is called over the items that are about it. */
const tabsTitle = (home: WindowGroup): string => home.title || 'These tabs'

/**
 * The half of a pane's menu the window contributes, in the two halves *it* is
 * really in: what is about the panel on top — which view it is showing — and
 * what is about the tabs it is one of, how they are shown and the way along
 * them.
 *
 * They come back apart rather than as one list because they are about
 * different things, and a menu that does not say which is which asks whoever
 * opened it to know the tree: the view is the panel's, and the four display
 * modes are its container's. `menuFor` puts a name over each.
 *
 * The four ways a space can be shown are appfr's four display modes, expressed
 * as operations on the tree rather than as a field on a node: a row, a column,
 * one set of tabs, or a desktop they float over. Which of them is *already*
 * true is read back off the layout, and an option that would change nothing is
 * offered disabled rather than hidden — which the pure operations make exact,
 * since each returns the tree it was given, identical, when it has nothing to
 * do.
 */
function windowMenu(
  current: WindowNode,
  panel: WindowPanelDef,
): { panel: MenuItemDef[]; tabs: MenuItemDef[]; tabsTitle: string } {
  const id = panel.id
  const home = groupOf(current, id)
  const tabbed = (home?.panels.length ?? 0) > 1
  /** A space whose display the host fixed offers no way to change it. */
  const fixedView = home?.fixedView === true

  /** An option that would leave the layout exactly as it is cannot be taken. */
  const change = (next: WindowNode) => ({
    disabled: next === current,
    action: () => {
      if (next !== current) layout.value = next
    },
  })

  /** About the panel on top, and about the tabs it is one of. */
  const forPanel: MenuItemDef[] = []
  const forTabs: MenuItemDef[] = []

  /*
   * Which view the panel is showing, from the `views` it declares.
   *
   * In the menu rather than beside the name: a header carrying a switcher, a
   * name, a subtitle, tabs, window controls and a menu button spends most of a
   * narrow pane on chrome, and the switcher is the widest thing on it. It is
   * also the only one of them that was two controls for one question — the
   * segmented switcher for a panel's declared views, and a menu item for the
   * views content registers with `usePaneMenu`, which look nothing alike.
   *
   * A submenu rather than four ticked items on the menu itself, which is what
   * the four display modes below are: those name the space, these name what is
   * in it, and two flat groups of ticked choices in one menu read as one list
   * of eight. The label was meant to tell them apart and cannot: a submenu
   * opens level with the item that opened it, so these four ticked names land
   * beside the other four with the word that named them behind the pointer.
   * The heading over each group says it where both can be read at once.
   *
   * A panel offering one view offers no choice, and a space whose display the
   * host fixed offers none either — the same two conditions the switcher was
   * drawn under.
   */
  const offered = panel.views ?? []
  if (offered.length > 1 && !fixedView) {
    const shown = viewFor(id)
    forPanel.push({
      id: 'view',
      label: 'View',
      items: offered.map((view) => ({
        id: `view-${view.key}`,
        label: view.label,
        checked: view.key === shown,
        action: () => setView(id, view.key),
      })),
    })
  }

  /*
   * How a space is shown is a *space's* question, and a pane is a space only
   * when it holds more than one panel — a strip of tabs is what a container of
   * panels looks like when it has stopped dividing itself. The four choices
   * are about those tabs, which are its children.
   *
   * They sit on the menu itself rather than behind an item that opens them.
   * Four ticked choices are short enough to read at a glance, and a submenu
   * holding nearly the whole of what the window contributes is a step in front
   * of every one of them — the heading over them says what a submenu's label
   * would have said, and says it without hiding them.
   *
   * A pane holding one panel arranges nothing: what is in it is host content,
   * not panels, so it has nothing to show one way or another. The space it
   * sits in is a split or a desktop, and both of those draw a title bar of
   * their own to say it from — see `spaceMenu`.
   */
  if (tabbed && !fixedView) {
    forTabs.push(
      { id: 'show-row', label: 'Row', checked: false, ...change(spreadTabs(current, id, 'row')) },
      {
        id: 'show-column',
        label: 'Column',
        checked: false,
        ...change(spreadTabs(current, id, 'column')),
      },
      // Already true, and nothing to collapse: these panes are tabs.
      { id: 'show-tabs', label: 'Tabs', checked: true, disabled: true },
      {
        id: 'show-desktop',
        label: 'Desktop',
        checked: false,
        ...change(floatTabs(current, id)),
      },
    )
  }

  /*
   * Maximize, minimize and close are not here.
   *
   * Each of them is already a button in the very header this menu opens from —
   * the two window controls on a floating pane, the cross on a closable one —
   * and an item that repeats the button beside it only makes the menu longer.
   * It is also what leaves a pane of host content with nothing in its menu but
   * the views its panel declares — and none to open at all when it declares
   * none, which is the point: a button whose menu holds nothing but what is
   * next to it is worse than no button.
   */

  if (tabbed && home) {
    // A rule between the four choices and the two, and never one at the top:
    // both groups are about the same tabs, so one heading is over the pair.
    if (forTabs.length) forTabs.push({ separator: true })
    forTabs.push(...tabSteps(home, id))
  }

  return { panel: forPanel, tabs: forTabs, tabsTitle: home ? tabsTitle(home) : '' }
}

/**
 * Along the strip and back: the two items that step through a group's tabs.
 *
 * Named by a panel, because that is what the layout stores as the tab on top —
 * a space sharing the strip is stepped to by whatever panel it is showing, so
 * that landing on it neither reaches into it nor forgets which of its own tabs
 * was in front.
 */
function tabSteps(home: WindowGroup, fallback: string): MenuItemDef[] {
  const at = activeTab(home)
  const step = (by: 1 | -1) => {
    const tab = home.panels[(at + by + home.panels.length) % home.panels.length]
    return (tab === undefined ? '' : frontPanel(tab)) || fallback
  }
  return [
    { id: 'next-tab', label: 'Next tab', action: () => selectPanel(step(1)) },
    { id: 'previous-tab', label: 'Previous tab', action: () => selectPanel(step(-1)) },
  ]
}

/**
 * The menu a *space* offers, rather than a pane: the four display modes again,
 * on the title bar of the desktop they are about.
 *
 * A desktop is addressed by where it is rather than by a panel inside it. Every
 * operation above finds a space by asking which one holds a given pane, because
 * a pane's menu has only its own id to speak with — but a desktop opening its
 * own menu already knows where it is, and a float whose every window holds a
 * grid has no pane whose container it is, so there would be nothing to name it
 * by. The path it was rendered at says it exactly, and once.
 *
 * "Desktop" is what it already is, so it is ticked and cannot be taken; the
 * other three each rewrite the float into the space it would become.
 *
 * The two that step along a strip are about the space *around* this one, so
 * where there is a strip both groups are named — the same two levels a pane's
 * menu names, a level up.
 */
function spaceMenu(path: readonly number[]): MenuItemDef[] {
  const current = resolved.value
  if (!props.menu || !current) return []
  const node = nodeAt(current, path)
  if (!node || isGroup(node)) return []
  // The four choices are the whole of a space's menu, so a space that offers
  // none of them offers no menu — and its bar shows no button to open one.
  if (node.fixedView) return []

  /** How this space is shown now — the one of the four that is already true. */
  const shown = isFloat(node) ? 'desktop' : node.direction

  /*
   * A tiled space of one pane is already all three of the tiled shapes: a row
   * of one, a column of one and one set of tabs are the same thing on screen,
   * so only "Desktop" has anywhere to take it. A *float* of one is not — every
   * one of the three takes it off the desktop, which is a real change.
   */
  const inert = isSplit(node) && node.children.length === 1

  /*
   * An option that names what is already true, or that has nothing to do,
   * cannot be taken. The rest each rewrite this node into the space it would
   * become, in place: the path is what says where, so nothing has to be found
   * from a panel inside it.
   */
  const mode = (key: string, label: string, becomes: () => WindowNode): MenuItemDef =>
    shown === key || (inert && key !== 'desktop')
      ? { id: `show-${key}`, label, checked: shown === key, disabled: true }
      : {
          id: `show-${key}`,
          label,
          checked: false,
          action: () => {
            const tree = resolved.value
            // Settled the way the window settles anything it renders, so the
            // layout a host stores is the one on screen.
            if (tree) layout.value = rootSpace(normalizeLayout(replaceAt(tree, path, becomes())))
          },
        }

  const asSplit = (direction: SplitDirection) => () =>
    isFloat(node) ? tileFloat(node, direction) : { ...node, direction }

  /*
   * A space sharing a strip has that strip for a bar, so the two items that step
   * along it belong on this menu: they are the only way off the space and back
   * to the tab beside it, and every other bar this menu is drawn on is a bar the
   * space has to itself.
   */
  const strip = path.length > 0 ? nodeAt(current, path.slice(0, -1)) : null
  const inStrip = strip && isGroup(strip) && strip.panels.length > 1 ? strip : null

  return sectioned([
    {
      id: 'about-space',
      /*
       * Its own name, or what it is rather than how it is shown: `spaceTitle`
       * would answer "Row" for an unnamed row, which is the item directly
       * under it and the one already ticked.
       */
      title: node.title || 'This space',
      items: [
        mode('row', 'Row', asSplit('row')),
        mode('column', 'Column', asSplit('column')),
        // Everything in this space in one strip: the panes as tabs, and a
        // desktop among them as a tab of its own, keeping the windows on it.
        mode('tabs', 'Tabs', () => collapseSpace(node, activeIn(node))),
        mode('desktop', 'Desktop', () => (isFloat(node) ? node : floatSplit(node))),
      ],
    },
    {
      id: 'about-tabs',
      title: inStrip ? tabsTitle(inStrip) : '',
      items: inStrip ? tabSteps(inStrip, frontPanel(node)) : [],
    },
  ])
}

/**
 * The panel a space's tabs should open on when it is collapsed into them: the
 * one that had the focus if it is in there, so collapsing a space leaves you
 * looking at what you were looking at.
 */
function activeIn(node: WindowNode): string | undefined {
  const current = focused.value
  return current && hasPanel(node, current) ? current : undefined
}

/**
 * The menu a pane offers: what is about the panel on top, and what is about
 * the tabs it is one of, each under a name that says which.
 *
 * The panel's name is over the first of them because that is the pane's own
 * answer to *which* panel — a menu opened from a strip of five tabs offers a
 * view for exactly one of them, and nothing in a list of view names says so.
 * The tabs are named next, and the four ways they can be shown sit under that
 * rather than under the tab they were opened from.
 *
 * Within the panel's own group the content's items come first: they are about
 * what is *in* the pane, where the window's *View* is about the pane's own
 * declared views — and the item someone opened the menu for is far more often
 * the former.
 */
function menuFor(id: string): MenuItemDef[] {
  const current = resolved.value
  const panel = byId.value.get(id)
  if (!current || !panel) return []

  const own = props.menu ? windowMenu(current, panel) : null

  const forPanel = contributedFor(id)
  if (forPanel.length && own?.panel.length) forPanel.push({ separator: true })
  if (own) forPanel.push(...own.panel)

  const items = sectioned([
    { id: 'about-panel', title: panel.title, items: forPanel },
    { id: 'about-tabs', title: own?.tabsTitle ?? '', items: own?.tabs ?? [] },
  ])

  return props.paneMenu ? props.paneMenu(panel, items) : items
}

/* ----------------------------------------------------------------- context */

function slotFor(prefix: string, id: string) {
  return slots[`${prefix}-${id}`] ?? slots[prefix]
}

function render(
  prefix: string,
  panel: WindowPanelDef,
  view: string,
  isActive: boolean,
): VNode[] | undefined {
  return slotFor(prefix, panel.id)?.({ panel, view, active: isActive })
}

provideWindowContext({
  panelFor: (id) => byId.value.get(id) ?? null,
  viewFor,
  setView,
  movable: computed(() => props.movable),
  resizable: computed(() => props.resizable),
  minPanelSize: computed(() => props.minPanelSize),
  spaceNames: computed(() => props.spaceNames),
  focused,
  dragging,
  dropTarget,
  moving,
  framing,
  canMove,
  focus(id) {
    if (focused.value === id) return
    focused.value = id
    emit('panel-activate', id)
  },
  selectPanel,
  beginDrag,
  toggleMoveMode,
  nudge,
  setSizes,
  frameOf: (id) => (resolved.value ? findFrame(resolved.value, id) : null),
  beginFrameDrag,
  nudgeFrame,
  raise,
  maximized,
  toggleMaximize,
  minimized,
  toggleMinimize,
  beginFrameDragAt,
  raiseAt,
  toggleMaximizeAt,
  toggleMinimizeAt,
  menuFor,
  spaceMenu,
  registerMenu,
  closable: canClose,
  close,
  renderContent: (panel, view, isActive) => render('panel', panel, view, isActive),
  renderActions: (panel, view, isActive) => render('actions', panel, view, isActive),
  layout: resolved,
})

const style = computed(() => {
  if (!props.accent && !props.tokens) return undefined
  return { ...props.tokens, ...(props.accent ? { '--dc-accent': props.accent } : {}) }
})

/*
 * The panel being carried, following the pointer. Its own component so that a
 * pointer move re-renders a label and not the entire grid underneath it —
 * everything a functional component reads is tracked against its own render,
 * not against the window's.
 */
const Ghost = () => {
  const id = dragging.value
  const at = pointer.value
  if (!id || !at) return null
  return h(
    'div',
    {
      class: 'dc-window__ghost',
      style: { left: `${at.x}px`, top: `${at.y}px` },
      'aria-hidden': 'true',
    },
    byId.value.get(id)?.title ?? id,
  )
}

defineExpose({
  /** The layout as rendered, reconciled against the current panels. */
  layout: resolved,
  /** Moves a panel programmatically — the same operation a drag performs. */
  move(panel: string, target: string, edge: DropEdge, index?: number) {
    const current = resolved.value
    if (!current) return
    apply(movePanel(current, panel, target, edge, index), {
      panel,
      target,
      edge,
      ...(index === undefined ? {} : { index }),
    })
  },
  /** Brings a panel's tab to the top of its group. */
  select(panel: string) {
    const current = resolved.value
    if (!current) return
    layout.value = setActivePanel(current, panel)
  },
  /** Lifts a panel onto the float holding `near`, as a window of its own. */
  float(panel: string, near: string, rect: FloatRect) {
    const current = resolved.value
    if (!current) return
    apply(floatPanel(current, panel, near, rect), {
      panel,
      target: near,
      edge: 'float',
      rect,
    })
  },
  /** Puts a floating frame somewhere else, or makes it another size. */
  setRect(panel: string, rect: FloatRect) {
    const current = resolved.value
    if (!current) return
    const next = setFrameRect(current, panel, rect)
    if (next === current) return
    layout.value = next
    const landed = findFrame(next, panel)
    if (landed) emit('frame-change', { panel, rect: landed.rect })
  },
  /**
   * Puts a panel on one of its views, the way its menu would — the way a pane
   * whose space fixed its view, or took its bar away, is switched at all.
   */
  setView,
  /** Brings a floating frame to the front of its stack. */
  raise,
  /** Fills the float with a window, or puts it back where it was. */
  toggleMaximize,
  /** Rolls a window up to its title bar, or unrolls it. */
  toggleMinimize,
})
</script>

<template>
  <div
    ref="root"
    class="dc-shell dc-window"
    :data-dc-theme="theme"
    :data-dc-dragging="dragging ? 'true' : 'false'"
    :data-dc-docking="docking ? 'true' : 'false'"
    :style="style"
  >
    <WindowNodeView
      v-if="resolved"
      :node="resolved"
      :path="[]"
    />

    <p
      v-else
      class="dc-window__empty"
    >
      This window has no panels.
    </p>

    <!-- Follows the pointer, so the panel being carried stays visible over
         whatever it is passing across. -->
    <Ghost />

    <p
      class="dc-window__live"
      aria-live="polite"
      role="status"
    >
      {{ announcement }}
    </p>
  </div>
</template>

<style scoped>
.dc-window {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 8px;
  gap: 0;
}

/* Nothing inside a window should start a text selection mid-drag. */
.dc-window[data-dc-dragging='true'] {
  user-select: none;
  cursor: grabbing;
}

.dc-window__empty {
  margin: auto;
  color: var(--dc-fg-3);
  font-family: var(--dc-mono);
  font-size: var(--dc-text-meta);
}

.dc-window__ghost {
  position: fixed;
  z-index: 60;
  transform: translate(12px, 12px);
  padding: 5px 10px;
  border: 1px solid var(--dc-accent);
  border-radius: var(--dc-radius-sm);
  background: var(--dc-raised);
  color: var(--dc-raised-ink);
  box-shadow: var(--dc-shadow);
  font-size: var(--dc-text-meta);
  font-weight: var(--dc-weight-semibold);
  pointer-events: none;
  white-space: nowrap;
}

/*
 * Docking off, so the only thing the panel can be dropped on is bare desktop:
 * the label being carried says so, since over a tiled pane there is no preview
 * left to say anything at all.
 */
.dc-window[data-dc-docking='false'] .dc-window__ghost {
  border-style: dashed;
}

/* Announces keyboard moves, which have no ghost to watch. */
.dc-window__live {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  border: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
