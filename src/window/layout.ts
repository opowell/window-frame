/**
 * Operations on a window layout.
 *
 * Every function here is pure: it takes a tree and returns a new one, which is
 * what lets the layout be a `v-model`, be persisted, and be tested without a
 * DOM. The interesting decisions live in `insertPanel` and `normalizeLayout` —
 * between them they keep the tree as flat as the arrangement looks on screen,
 * so a row of three panels is three siblings rather than a staircase of nested
 * splits that resize strangely.
 *
 * A leaf is a *group*: one space shared by one or more panels as tabs. A lone
 * panel is a group of one, so nothing here needs a separate notion of a tab.
 * A tab is a panel id, or — where a space shares the strip beside one — a node
 * like any other: `isPanelTab` is the difference, and every function below
 * looks through a space tab the way it looks through a split's children.
 *
 * A *float* is the third kind: frames that overlap the space instead of
 * dividing it. Every function below treats a float's frames the way it treats
 * a split's children — the difference between the two is where they are drawn,
 * not what may be put in them.
 */

import type {
  DropEdge,
  FloatFrame,
  FloatRect,
  FrameHandle,
  FramePlace,
  SplitDirection,
  SplitEdge,
  WindowFloat,
  WindowGroup,
  WindowNode,
  WindowSpace,
  WindowSplit,
  WindowTab,
} from './types'

export const isSplit = (node: WindowNode): node is WindowSplit => node.kind === 'split'
export const isGroup = (node: WindowNode): node is WindowGroup => node.kind === 'group'
export const isFloat = (node: WindowNode): node is WindowFloat => node.kind === 'float'

/** Where a frame goes when nothing says otherwise, and how far the next one is. */
export const DEFAULT_FRAME: FloatRect = { x: 16, y: 16, w: 360, h: 260 }
export const CASCADE_STEP = 28

/** The smallest a floating frame may be dragged to, in pixels. */
export const MIN_FRAME = 120

/**
 * A minimized window is rolled up to its title bar and docked along the bottom
 * of its float, so its size is the chrome's rather than anything it holds.
 */
export const MINIMIZED_WIDTH = 220
export const MINIMIZED_HEIGHT = 38
export const MINIMIZED_GAP = 6

/** A float with the same frames, or the float itself when none of them moved. */
function mapFrames(
  node: WindowFloat,
  map: (node: WindowNode, index: number) => WindowNode,
): WindowFloat {
  let changed = false
  const frames = node.frames.map((held, index) => {
    const next = map(held.node, index)
    if (next === held.node) return held
    changed = true
    return { ...held, node: next }
  })
  return changed ? { ...node, frames } : node
}

/** A group of one — a panel with no tabs beside it. */
export function panelNode(id: string): WindowGroup {
  return { kind: 'group', panels: [id] }
}

/** A group of tabs sharing one space — panels, and whole spaces beside them. */
export function group(panels: WindowTab[], active?: string): WindowGroup {
  return active ? { kind: 'group', panels, active } : { kind: 'group', panels }
}

/*
 * A tab is a panel, or a space.
 *
 * The four display modes act on a space, and three of them keep what it holds:
 * a row shown as a column is the same panes running the other way, and shown
 * as windows it is the same panes placed rather than dividing. "Tabs" is the
 * fourth, so it keeps them too — the panes stop dividing the space and share
 * one strip, and a *desktop* among them shares it whole rather than being
 * emptied into it. That is what a space tab is for, and the only thing it is
 * for: nothing else in the model creates one.
 */

/** True for a tab that is a panel rather than a whole space sharing the strip. */
export const isPanelTab = (tab: WindowTab): tab is string => typeof tab === 'string'

/** A tab as a node: a panel tab is the group of one it already reads as. */
export const tabNode = (tab: WindowTab): WindowNode =>
  isPanelTab(tab) ? panelNode(tab) : tab

/** The panels a tab holds — itself, or every panel in the space it is. */
export const tabPanels = (tab: WindowTab): string[] =>
  isPanelTab(tab) ? [tab] : panelIds(tab)

/** The panel tabs of a group, in strip order, spaces sharing it left out. */
export const panelTabs = (node: WindowGroup): string[] => node.panels.filter(isPanelTab)

/** The spaces sharing a group's strip, in strip order. */
const spaceTabs = (node: WindowGroup): WindowNode[] =>
  node.panels.filter((tab): tab is WindowNode => !isPanelTab(tab))

/**
 * True when a panel is a tab of this group itself, rather than a panel of a
 * space that shares its strip. The distinction is the whole of what a space tab
 * changes: a drop, a reorder and a close are about the strip, and a panel two
 * levels down inside one of its tabs is none of the strip's business.
 */
export const isTabOf = (node: WindowGroup, id: string): boolean => node.panels.includes(id)

/**
 * The same group with the space tab holding a panel rewritten, or the group it
 * was given when no tab of it holds that panel.
 */
function withSpaceTab(
  node: WindowGroup,
  id: string,
  rewrite: (tab: WindowNode) => WindowNode,
): WindowGroup {
  let changed = false
  const panels = node.panels.map((tab) => {
    if (isPanelTab(tab) || !hasPanel(tab, id)) return tab
    const next = rewrite(tab)
    if (next !== tab) changed = true
    return next
  })
  return changed ? { ...node, panels } : node
}

/** One frame of a float. Anything it is not told is taken from `DEFAULT_FRAME`. */
export function frame(node: WindowNode, rect?: Partial<FloatRect>): FloatFrame {
  return { node, rect: { ...DEFAULT_FRAME, ...rect } }
}

/** Frames overlapping one space, the last one on top. */
export function float(frames: FloatFrame[], title?: string): WindowFloat {
  return title ? { kind: 'float', frames, title } : { kind: 'float', frames }
}

/**
 * Nodes as frames stepping down and across from one another, the way a desktop
 * opens windows — so a float can be written as a list of what is on it without
 * every frame having to be placed by hand.
 */
export function cascade(nodes: WindowNode[], start?: Partial<FloatRect>): WindowFloat {
  const first = { ...DEFAULT_FRAME, ...start }
  return float(
    nodes.map((node, index) =>
      frame(node, {
        ...first,
        x: first.x + index * CASCADE_STEP,
        y: first.y + index * CASCADE_STEP,
      }),
    ),
  )
}

export function split(
  direction: SplitDirection,
  children: WindowNode[],
  sizes?: number[],
  title?: string,
): WindowSplit {
  return {
    kind: 'split',
    direction,
    children,
    ...(sizes ? { sizes } : {}),
    ...(title ? { title } : {}),
  }
}

/** Children laid out left to right. */
export const row = (children: WindowNode[], sizes?: number[], title?: string): WindowSplit =>
  split('row', children, sizes, title)

/** Children laid out top to bottom. */
export const column = (children: WindowNode[], sizes?: number[], title?: string): WindowSplit =>
  split('column', children, sizes, title)

/* ------------------------------------------------------------------ chrome */

/**
 * What a space says about its own bar, ready to be spread onto the node it
 * becomes.
 *
 * A space shown another way is the same space: a row a host drew without a
 * title bar is still without one once it is a desktop, and one whose display
 * was fixed does not start offering to be changed for having changed.
 */
export function spaceChrome(node: WindowNode): WindowSpace {
  return {
    ...(node.fixedView ? { fixedView: true } : {}),
    ...(node.headless ? { headless: true } : {}),
  }
}

/**
 * True when a host has said something about the bar this space draws — that it
 * is not drawn, that it offers no choice of display, or what it is called.
 *
 * A name is the strongest of the three: a space a host named is one it means to
 * be a space, so it is neither dissolved into the space around it nor collapsed
 * into the pane inside it. Without that, a named space would keep its name only
 * for as long as its shape happened to stay distinguishable from its parent's —
 * one panel dragged out of it and the name would be gone, with nothing on
 * screen to say why.
 */
const hasChrome = (node: WindowNode): boolean =>
  node.fixedView === true || node.headless === true || (!isGroup(node) && !!node.title)

/**
 * The same space with no title bar of its own — everything that bar carried
 * being the host's to set instead. Composes with `fixedView`, and with any of
 * the builders above: `headless(row([...]))`.
 */
export const headless = <T extends WindowNode>(node: T): T => ({ ...node, headless: true })

/**
 * The same space, shown the way it is shown, with nothing offered to change
 * it: no choice of view on a pane, no display choices on a container.
 */
export const fixedView = <T extends WindowNode>(node: T): T => ({ ...node, fixedView: true })

/** The axis an edge drop splits along. */
export const axisOf = (edge: SplitEdge): SplitDirection =>
  edge === 'left' || edge === 'right' ? 'row' : 'column'

/** Panels in the order they are laid out, tabs included, depth first. */
export function panelIds(node: WindowNode): string[] {
  if (isGroup(node)) return node.panels.flatMap(tabPanels)
  if (isFloat(node)) return node.frames.flatMap((held) => panelIds(held.node))
  return node.children.flatMap(panelIds)
}

export function hasPanel(node: WindowNode, id: string): boolean {
  if (isGroup(node)) {
    return node.panels.some((tab) => (isPanelTab(tab) ? tab === id : hasPanel(tab, id)))
  }
  if (isFloat(node)) return node.frames.some((held) => hasPanel(held.node, id))
  return node.children.some((child) => hasPanel(child, id))
}

/** Nothing left to render — every operation drops these rather than keep them. */
const isEmpty = (node: WindowNode): boolean => panelIds(node).length === 0

/**
 * Every space a node holds, each with the index it is addressed by: a split's
 * panes, a float's windows, and the spaces sharing a group's strip. A panel tab
 * is not one of them — it is a panel rather than a space — but it keeps its
 * place in the numbering, so an index is a position in the strip either way.
 */
function childEntries(node: WindowNode): { node: WindowNode; index: number }[] {
  if (isSplit(node)) return node.children.map((child, index) => ({ node: child, index }))
  if (isFloat(node)) return node.frames.map((held, index) => ({ node: held.node, index }))
  return node.panels.flatMap((tab, index) => (isPanelTab(tab) ? [] : [{ node: tab, index }]))
}

/** A node's children, whichever kind of container it is. */
const childrenOf = (node: WindowNode): WindowNode[] =>
  childEntries(node).map((entry) => entry.node)

/**
 * Which tab is on top, as a place in the strip.
 *
 * `active` names a panel — its own id for a panel tab, any panel inside it for
 * a space — rather than an index, so a strip that has been reordered still
 * shows what it was showing. Named rather than stored-and-trusted, because a
 * group whose active panel has been dragged out of it still has to show
 * something: the first tab, which is also what a layout that says nothing gets.
 */
export function activeTab(node: WindowGroup): number {
  const active = node.active
  if (active) {
    const index = node.panels.findIndex((tab) =>
      isPanelTab(tab) ? tab === active : hasPanel(tab, active),
    )
    if (index >= 0) return index
  }
  return 0
}

/**
 * The panel on top — `''` when the tab on top is a space rather than a panel,
 * which is a strip showing the desktop tabbed beside its panes. The panel a
 * *space* tab is showing is `frontPanel`'s answer, not this one's: what is on
 * top of this strip is not a panel at all.
 */
export function activePanel(node: WindowGroup): string {
  const tab = node.panels[activeTab(node)]
  return tab !== undefined && isPanelTab(tab) ? tab : ''
}

/**
 * The panel a tab is showing: itself, or the one a space in it would be read
 * as — the tab on top of a group, the first pane of a split, the window in
 * front of a float. What a strip pins when it is rewritten, and what selecting
 * a space tab selects.
 */
export function frontPanel(tab: WindowTab): string {
  if (isPanelTab(tab)) return tab
  if (isGroup(tab)) {
    const top = tab.panels[activeTab(tab)]
    return top === undefined ? '' : frontPanel(top)
  }
  if (isFloat(tab)) {
    const front = tab.frames[tab.frames.length - 1]
    return front ? frontPanel(front.node) : ''
  }
  const first = tab.children[0]
  return first ? frontPanel(first) : ''
}

/** The group a panel is a tab of, if the tree holds it at all. */
export function groupOf(node: WindowNode, id: string): WindowGroup | null {
  if (isGroup(node) && isTabOf(node, id)) return node
  for (const child of childrenOf(node)) {
    const found = groupOf(child, id)
    if (found) return found
  }
  return null
}

/** Every group in the tree, in layout order. */
export function groups(node: WindowNode): WindowGroup[] {
  const inside = childrenOf(node).flatMap(groups)
  return isGroup(node) ? [node, ...inside] : inside
}

/* ------------------------------------------------------------------ floats */

/** The floating frame a panel is in, or `null` when it is tiled rather than floating. */
export function frameOf(node: WindowNode, id: string): FloatFrame | null {
  // A desktop sharing this strip holds its windows still: a tab is not the end
  // of the tree, only the end of this pane.
  if (isGroup(node)) {
    for (const tab of spaceTabs(node)) {
      const found = frameOf(tab, id)
      if (found) return found
    }
    return null
  }
  if (isFloat(node)) {
    for (const held of node.frames) {
      if (!hasPanel(held.node, id)) continue
      // A float nested inside this frame owns the panel more closely than this
      // one does, so the innermost frame is the answer.
      return frameOf(held.node, id) ?? held
    }
    return null
  }
  for (const child of node.children) {
    const found = frameOf(child, id)
    if (found) return found
  }
  return null
}

/**
 * Keeps a frame inside the space it floats over and no smaller than `min`,
 * rounded to whole pixels so a stored layout is not a drift of decimals.
 *
 * The size is settled before the position, so a frame too big for its float is
 * shrunk to fit rather than pushed off the far edge.
 */
export function clampRect(
  rect: FloatRect,
  bounds: { w: number; h: number },
  min = MIN_FRAME,
): FloatRect {
  const fit = (size: number, extent: number) =>
    extent > 0 ? Math.max(Math.min(size, extent), Math.min(min, extent)) : Math.max(size, min)
  const w = fit(rect.w, bounds.w)
  const h = fit(rect.h, bounds.h)
  const place = (at: number, size: number, extent: number) =>
    Math.min(Math.max(at, 0), Math.max(extent - size, 0))
  return {
    x: Math.round(place(rect.x, w, bounds.w)),
    y: Math.round(place(rect.y, h, bounds.h)),
    w: Math.round(w),
    h: Math.round(h),
  }
}

/**
 * The rect a resize drag produces: the dragged edge follows the pointer and
 * the opposite one stays put, which is what makes a corner drag feel anchored.
 *
 * Dragging an edge past its opposite pins the frame at `min` rather than
 * turning it inside out — and pins it against the edge that was *not* moving,
 * so a frame squeezed from the left stops with its right edge where it was.
 */
export function resizeRect(
  rect: FloatRect,
  handle: FrameHandle,
  dx: number,
  dy: number,
  min = MIN_FRAME,
): FloatRect {
  let { x, y, w, h } = rect

  if (handle.includes('e')) w = rect.w + dx
  if (handle.includes('w')) {
    w = rect.w - dx
    x = rect.x + dx
  }
  if (handle.includes('s')) h = rect.h + dy
  if (handle.includes('n')) {
    h = rect.h - dy
    y = rect.y + dy
  }

  if (w < min) {
    if (handle.includes('w')) x = rect.x + rect.w - min
    w = min
  }
  if (h < min) {
    if (handle.includes('n')) y = rect.y + rect.h - min
    h = min
  }

  return { x, y, w, h }
}

/** Two rects that would draw the same box. */
const sameRect = (a: FloatRect, b: FloatRect): boolean =>
  a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h

/**
 * Puts a floating frame somewhere else, or makes it another size. Returns the
 * tree it was given — identical — when the panel is not in a float at all, or
 * when the frame is already exactly there: a drag held against the edge of its
 * float then stops producing layouts rather than a new one per pointer move.
 */
/**
 * Rewrites the floating frame a panel is in, wherever in the tree that is.
 *
 * Returns the tree it was given — identical — when the panel is not floating,
 * or when the rewrite hands back the frame it was given. Every operation on a
 * frame goes through here, so none of them has to remember to carry the rest
 * of the frame along with whatever it changed.
 */
function withFrame(
  node: WindowNode,
  id: string,
  rewrite: (held: FloatFrame) => FloatFrame,
): WindowNode {
  if (isGroup(node)) return withSpaceTab(node, id, (tab) => withFrame(tab, id, rewrite))

  if (isFloat(node)) {
    let changed = false
    const frames = node.frames.map((held) => {
      if (!hasPanel(held.node, id)) return held

      // A float nested in this frame owns the panel more closely, so it is
      // that frame the rewrite means rather than this one.
      if (frameOf(held.node, id)) {
        const next = withFrame(held.node, id, rewrite)
        if (next === held.node) return held
        changed = true
        return { ...held, node: next }
      }

      const next = rewrite(held)
      if (next === held) return held
      changed = true
      return next
    })
    return changed ? { ...node, frames } : node
  }

  if (!hasPanel(node, id)) return node
  let changed = false
  const children = node.children.map((child) => {
    const next = withFrame(child, id, rewrite)
    if (next !== child) changed = true
    return next
  })
  return changed ? { ...node, children } : node
}

/**
 * Puts a floating frame somewhere else, or makes it another size. Returns the
 * tree it was given — identical — when the panel is not in a float at all, or
 * when the frame is already exactly there: a drag held against the edge of its
 * float then stops producing layouts rather than a new one per pointer move.
 */
export function setFrameRect(node: WindowNode, id: string, rect: FloatRect): WindowNode {
  return withFrame(node, id, (held) => (sameRect(held.rect, rect) ? held : { ...held, rect }))
}

/** True when this frame fills its float rather than sitting in its rect. */
export const isMaximized = (held: FloatFrame): boolean => held.maximized === true

/**
 * Fills a window's float with it, or puts it back where it came from.
 *
 * The rect is never touched. A maximized frame keeps it as the place to go
 * back to, so restoring is a matter of dropping a flag rather than of having
 * remembered anything somewhere else — and a window stored while maximized
 * reads back with the position it will restore to still intact.
 */
/**
 * The rewrite itself, shared by both ways of naming a frame: a panel in it, or
 * the path it was rendered at.
 */
const filling =
  (maximized: boolean) =>
  (held: FloatFrame): FloatFrame => {
    if (isMaximized(held) === maximized) return held
    // Filling the float and being rolled up out of the way are exclusive, so
    // maximizing a minimized window unrolls it on the way.
    if (maximized) {
      const { minimized: _rolled, ...rest } = held
      return { ...rest, maximized: true }
    }
    // Dropped rather than set to false, so a restored frame is exactly the
    // frame it was before it was ever maximized.
    const { maximized: _was, ...restored } = held
    return restored
  }

export function maximizeFrame(node: WindowNode, id: string, maximized = true): WindowNode {
  return withFrame(node, id, filling(maximized))
}

/** Maximizes a window, or restores it when it is maximized already. */
export function toggleMaximized(node: WindowNode, id: string): WindowNode {
  const held = frameOf(node, id)
  if (!held) return node
  return maximizeFrame(node, id, !isMaximized(held))
}

/** True when this frame is rolled up to its title bar. */
export const isMinimized = (held: FloatFrame): boolean => held.minimized === true

/**
 * Rolls a window up to its title bar, or unrolls it. Like maximizing it leaves
 * the rect alone — where a minimized window sits is decided by how many others
 * are rolled up beside it, not by anything stored on the frame.
 */
const rolled =
  (minimized: boolean) =>
  (held: FloatFrame): FloatFrame => {
    if (isMinimized(held) === minimized) return held
    if (minimized) {
      const { maximized: _filling, ...rest } = held
      return { ...rest, minimized: true }
    }
    const { minimized: _was, ...restored } = held
    return restored
  }

export function minimizeFrame(node: WindowNode, id: string, minimized = true): WindowNode {
  return withFrame(node, id, rolled(minimized))
}

/** Rolls a window up, or unrolls it when it is rolled up already. */
export function toggleMinimized(node: WindowNode, id: string): WindowNode {
  const held = frameOf(node, id)
  if (!held) return node
  return minimizeFrame(node, id, !isMinimized(held))
}

/*
 * A frame is named two ways, and for the same reason a space is.
 *
 * A pane names the frame it is in with a panel of its own, and the innermost
 * frame holding that panel is the answer: a float nested inside a frame owns
 * the panels on it more closely than the frame around them does.
 *
 * A window's *own* chrome cannot speak that way. A window holding a desktop
 * shares every panel with the windows on that desktop, so a panel names one of
 * *them* — dragging the bar of a window holding a desktop would move a window
 * inside it. It already knows where it is, though, so it says so with the path
 * it was rendered at, exactly as a desktop's title bar does for its own menu.
 *
 * The path names the frame's *node*: its last index is the frame's place in the
 * float above it, which is why raising one changes the path — see `raisedPath`.
 */

/** The frame a path names, or `null` when no frame sits there. */
export function frameAt(layout: WindowNode, path: readonly number[]): FloatFrame | null {
  const index = path[path.length - 1]
  if (index === undefined) return null
  const above = nodeAt(layout, path.slice(0, -1))
  if (!above || !isFloat(above)) return null
  return above.frames[index] ?? null
}

/**
 * Where the frame a panel is in was rendered — the path of the innermost frame
 * holding it, which is the frame `frameOf` answers with. `null` when the panel
 * is tiled rather than floating, or is not in the tree at all.
 */
export function framePathOf(layout: WindowNode, id: string): number[] | null {
  if (isFloat(layout)) {
    for (const [index, held] of layout.frames.entries()) {
      if (!hasPanel(held.node, id)) continue
      const inner = framePathOf(held.node, id)
      return inner ? [index, ...inner] : [index]
    }
    return null
  }
  for (const { node: child, index } of childEntries(layout)) {
    if (!hasPanel(child, id)) continue
    const inner = framePathOf(child, id)
    return inner ? [index, ...inner] : null
  }
  return null
}

/**
 * Rewrites the frame a path names. Returns the tree it was given — identical —
 * when nothing sits there, or when the rewrite hands back the frame it was
 * given: the path-addressed twin of `withFrame`, and the same promise.
 */
function withFrameAt(
  layout: WindowNode,
  path: readonly number[],
  rewrite: (held: FloatFrame) => FloatFrame,
): WindowNode {
  const index = path[path.length - 1]
  if (index === undefined) return layout
  const above = path.slice(0, -1)
  const float = nodeAt(layout, above)
  if (!float || !isFloat(float)) return layout
  const held = float.frames[index]
  if (!held) return layout
  const next = rewrite(held)
  if (next === held) return layout
  const frames = [...float.frames]
  frames[index] = next
  return replaceAt(layout, above, { ...float, frames })
}

/** Puts the frame a path names somewhere else, or makes it another size. */
export function setFrameRectAt(
  layout: WindowNode,
  path: readonly number[],
  rect: FloatRect,
): WindowNode {
  return withFrameAt(layout, path, (held) =>
    sameRect(held.rect, rect) ? held : { ...held, rect },
  )
}

/** Fills the float with the frame a path names, or puts it back in its rect. */
export function maximizeFrameAt(
  layout: WindowNode,
  path: readonly number[],
  maximized = true,
): WindowNode {
  return withFrameAt(layout, path, filling(maximized))
}

/** Rolls the frame a path names up to its title bar, or unrolls it. */
export function minimizeFrameAt(
  layout: WindowNode,
  path: readonly number[],
  minimized = true,
): WindowNode {
  return withFrameAt(layout, path, rolled(minimized))
}

/**
 * Brings the frame a path names to the front of the float it is on, and every
 * frame it sits inside to the front of theirs — touching a window brings the
 * pile it is in forward too.
 *
 * What is *inside* it is left alone, which is the difference from naming a
 * frame by a panel: raising a window that holds a desktop must not reorder the
 * windows on that desktop, since none of them was touched.
 */
export function raiseFrameAt(layout: WindowNode, path: readonly number[]): WindowNode {
  const [index, ...rest] = path
  if (index === undefined) return layout

  if (isFloat(layout)) {
    const held = layout.frames[index]
    if (!held) return layout
    const inner = raiseFrameAt(held.node, rest)
    const lifted = inner === held.node ? held : { ...held, node: inner }
    if (index === layout.frames.length - 1 && lifted === held) return layout
    const frames = [...layout.frames]
    frames.splice(index, 1)
    frames.push(lifted)
    return { ...layout, frames }
  }

  // A split or a strip on the way down: stepped through, never reordered.
  const child = nodeAt(layout, [index])
  if (!child) return layout
  const next = raiseFrameAt(child, rest)
  return next === child ? layout : replaceAt(layout, [index], next)
}

/**
 * Where a path lands once the frame it names has been raised: last in every
 * pile along the way, because that is what raising a frame *is* — moving it to
 * the end of the list its path indexes. Taken from the tree before the raise,
 * so a drag can raise the window it has just picked up and go on addressing it.
 */
export function raisedPath(layout: WindowNode, path: readonly number[]): number[] {
  const raised = [...path]
  let current: WindowNode | null = layout
  path.forEach((index, level) => {
    if (!current) return
    if (isFloat(current)) raised[level] = current.frames.length - 1
    current = nodeAt(current, [index])
  })
  return raised
}

/**
 * Puts a new frame on the float holding `near`, on top of the stack.
 *
 * The float is named by something already on it rather than by a path, because
 * the caller has just lifted a panel out of the tree and a path taken before
 * that could point somewhere else by now.
 */
function addFrame(node: WindowNode, panel: string, near: string, rect: FloatRect): WindowNode {
  if (isGroup(node)) return withSpaceTab(node, near, (tab) => addFrame(tab, panel, near, rect))

  if (isFloat(node)) {
    const index = node.frames.findIndex((held) => hasPanel(held.node, near))
    const held = node.frames[index]
    if (!held) return node

    // A float nested in this frame holds `near` more closely, so that is the
    // desktop the drop meant.
    if (frameOf(held.node, near)) {
      const next = addFrame(held.node, panel, near, rect)
      if (next === held.node) return node
      const frames = [...node.frames]
      frames[index] = { ...held, node: next }
      return { ...node, frames }
    }
    return { ...node, frames: [...node.frames, frame(panelNode(panel), rect)] }
  }

  if (!hasPanel(node, near)) return node
  let changed = false
  const children = node.children.map((child) => {
    const next = addFrame(child, panel, near, rect)
    if (next !== child) changed = true
    return next
  })
  return changed ? { ...node, children } : node
}

/**
 * Lifts a panel out of wherever it is and puts it on a float as a window of
 * its own — the move a drop on a float's bare desktop performs, and the one
 * way a panel becomes floating without the layout being rewritten wholesale.
 *
 * `near` is any panel already on that float, and names which desktop is meant.
 * Dropping a panel on the desktop it is already the only thing on is a no-op,
 * as is naming a panel that is not on a float.
 */
export function floatPanel(
  layout: WindowNode,
  panel: string,
  near: string,
  rect: FloatRect,
): WindowNode {
  if (panel === near) return layout
  if (!hasPanel(layout, panel) || !hasPanel(layout, near)) return layout
  if (!frameOf(layout, near)) return layout

  const without = removePanel(layout, panel)
  if (!without) return layout

  const added = addFrame(without, panel, near, rect)
  // Nothing to add it to: leave the layout as it was rather than lose a panel.
  if (added === without) return layout
  return normalizeLayout(added)
}

/**
 * Brings a panel's frame to the front of the float it is on. Returns the tree
 * it was given, identical, when it is already there — so a click on the frame
 * on top does not count as a change to the layout.
 */
export function raiseFrame(node: WindowNode, id: string): WindowNode {
  if (isGroup(node)) return withSpaceTab(node, id, (tab) => raiseFrame(tab, id))
  if (isFloat(node)) {
    const index = node.frames.findIndex((held) => hasPanel(held.node, id))
    const held = node.frames[index]
    if (!held) return node

    // A float inside this frame raises its own stack first: clicking a window
    // within a window brings both to the front of the pile they are in.
    const inner = raiseFrame(held.node, id)
    const lifted = inner === held.node ? held : { ...held, node: inner }
    if (index === node.frames.length - 1 && lifted === held) return node

    const frames = [...node.frames]
    frames.splice(index, 1)
    frames.push(lifted)
    return { ...node, frames }
  }
  if (!hasPanel(node, id)) return node

  let changed = false
  const children = node.children.map((child) => {
    const next = raiseFrame(child, id)
    if (next !== child) changed = true
    return next
  })
  return changed ? { ...node, children } : node
}

/**
 * Shares that sum to 1, one per child. Anything unusable — missing, the wrong
 * length, negative, all zero — falls back to equal shares rather than throwing,
 * so a hand-written or hand-edited layout cannot reach an unrenderable state.
 */
export function normalizeSizes(count: number, sizes?: number[]): number[] {
  if (count <= 0) return []
  const equal = () => Array.from({ length: count }, () => 1 / count)
  if (!sizes || sizes.length !== count) return equal()

  const usable = sizes.map((size) => (Number.isFinite(size) && size > 0 ? size : 0))
  const total = usable.reduce((sum, size) => sum + size, 0)
  if (total <= 0) return equal()
  return usable.map((size) => size / total)
}

/** The normalized shares of a split's children. */
export const sizesOf = (node: WindowSplit): number[] =>
  normalizeSizes(node.children.length, node.sizes)

/**
 * Where a split's children were as windows, when it still answers for them —
 * one place per child, or nothing at all. A split that was never tiled from a
 * float has none, and one whose children have changed under it has a list that
 * no longer pairs with them, which is the same as having none.
 */
export const placesOf = (node: WindowSplit): FramePlace[] | undefined =>
  node.places?.length === node.children.length ? node.places : undefined

/**
 * Collapses the shapes that are indistinguishable on screen: a split with one
 * child *is* that child, and a split nested inside a split of the same
 * direction is the same row — so it is flattened into its parent, its
 * children keeping their proportion of the share it held. A group that has
 * lost every tab is dropped, since there is nothing left to render.
 *
 * A float is flattened into nothing, because its frames do not divide a space
 * and so cannot be indistinguishable from one another: only what each frame
 * holds is normalized, and a frame left holding nothing is dropped.
 *
 * A split that remembers the desktop it was tiled from is one exception, both
 * ways round: it is not flattened into its parent, and it does not flatten its
 * own children. Its `places` pair one to one with those children — each is a
 * window it can be turned back into — and either flattening would break that
 * pairing, which is the only record of where the windows were. Two rows nested
 * this way do look alike, but only one of them has a way back.
 *
 * A split the host shaped is the other: one told to draw no title bar, to keep
 * the display it has, or to go by a name of its own is kept whole rather than
 * flattened into its parent or collapsed into its only child. All three are
 * things said about *that* space, and a space that is dissolved says them no
 * longer — a named row losing a pane would otherwise lose its name with it.
 *
 * A *strip* has the same two shapes to collapse, a level down. A space sharing
 * it that is itself a set of tabs is not a tab: its tabs join this strip, since
 * two strips in one place are one strip. And a strip whose only tab is a space
 * is that space — there is nothing to switch between, exactly as a split of one
 * child is that child.
 */
export function normalizeLayout(node: WindowNode): WindowNode {
  if (isGroup(node)) return normalizeGroup(node)
  if (isFloat(node)) {
    const frames = node.frames.flatMap((held) => {
      const next = normalizeLayout(held.node)
      if (isEmpty(next)) return []
      return [next === held.node ? held : { ...held, node: next }]
    })
    return frames.length === node.frames.length && frames.every((held, i) => held === node.frames[i])
      ? node
      : { ...node, frames }
  }
  if (node.children.length === 0) return node

  const sizes = sizesOf(node)
  const remembered = placesOf(node)
  const children: WindowNode[] = []
  const shares: number[] = []
  const places: FramePlace[] = []

  node.children.forEach((child, index) => {
    const next = normalizeLayout(child)
    const share = sizes[index] ?? 0
    if (isEmpty(next)) return
    // A child that is a space of its own — one this split remembers as a
    // window, or one that remembers a desktop of its own — keeps its children
    // rather than handing them over.
    if (
      !remembered &&
      isSplit(next) &&
      next.direction === node.direction &&
      !placesOf(next) &&
      !hasChrome(next)
    ) {
      const inner = sizesOf(next)
      next.children.forEach((grandchild, position) => {
        children.push(grandchild)
        shares.push(share * (inner[position] ?? 0))
      })
      return
    }
    children.push(next)
    shares.push(share)
    const place = remembered?.[index]
    if (place) places.push(place)
  })

  const only = children[0]
  if (children.length === 1 && only && !hasChrome(node)) return only
  return {
    kind: 'split',
    direction: node.direction,
    children,
    sizes: normalizeSizes(children.length, shares),
    ...(node.title ? { title: node.title } : {}),
    ...spaceChrome(node),
    ...(places.length === children.length && places.length > 0 ? { places } : {}),
  }
}

/** A strip with every space sharing it normalized, and the two shapes above collapsed. */
function normalizeGroup(node: WindowGroup): WindowNode {
  // A strip of panels alone has nothing to normalize, which is most of them.
  if (node.panels.every(isPanelTab)) return node

  const shown = frontPanel(node)
  const panels: WindowTab[] = []
  for (const tab of node.panels) {
    if (isPanelTab(tab)) {
      panels.push(tab)
      continue
    }
    const next = normalizeLayout(tab)
    if (isEmpty(next)) continue
    // Tabs sharing a strip with tabs are that strip's, unless the host shaped
    // that space — in which case what it said about its own bar is why it
    // stays a space of its own.
    if (isGroup(next) && !hasChrome(next)) {
      panels.push(...next.panels)
      continue
    }
    panels.push(next)
  }

  const only = panels[0]
  if (panels.length === 1 && only !== undefined && !isPanelTab(only) && !hasChrome(node)) {
    return only
  }
  if (
    panels.length === node.panels.length &&
    panels.every((tab, index) => tab === node.panels[index])
  ) {
    return node
  }

  // The tab that was on top stays on top, when it is still there to be.
  const active = shown && panels.some((tab) => tabPanels(tab).includes(shown)) ? shown : undefined
  return { kind: 'group', panels, ...(active ? { active } : {}), ...spaceChrome(node) }
}

/**
 * Takes a panel out of the tree. A group with other tabs keeps its space and
 * hands the top of the pile to the next tab along; a group that held nothing
 * else goes with it. Returns `null` when the last panel in the window goes —
 * an empty window is the caller's problem to render, not something to fake a
 * node for.
 */
export function removePanel(node: WindowNode, id: string): WindowNode | null {
  if (isFloat(node)) {
    // The frame it emptied simply goes. Nothing is shared out: the frames
    // beside it never held its space, so they stay exactly where they are.
    const frames = node.frames.flatMap((held) => {
      const next = removePanel(held.node, id)
      if (!next) return []
      return [next === held.node ? held : { ...held, node: next }]
    })
    if (frames.length === 0) return null
    return { ...node, frames }
  }

  if (isGroup(node)) {
    if (!hasPanel(node, id)) return node
    const from = activeTab(node)
    // A panel of a space sharing the strip leaves that space rather than the
    // strip, and the tab goes only when the space it held is empty.
    const panels: WindowTab[] = []
    for (const tab of node.panels) {
      if (isPanelTab(tab)) {
        if (tab !== id) panels.push(tab)
        continue
      }
      const left = removePanel(tab, id)
      if (left) panels.push(left)
    }
    if (panels.length === 0) return null
    // Closing the tab you are looking at moves you to the next one along,
    // falling back to the previous when it was the last.
    const kept = node.active && panels.some((tab) => tabPanels(tab).includes(node.active as string))
    const next = kept
      ? node.active
      : frontPanel(panels[from] ?? (panels[panels.length - 1] as WindowTab))
    return next
      ? { kind: 'group', panels, active: next, ...spaceChrome(node) }
      : { kind: 'group', panels, ...spaceChrome(node) }
  }

  const sizes = sizesOf(node)
  const children: WindowNode[] = []
  const shares: number[] = []

  node.children.forEach((child, index) => {
    const next = removePanel(child, id)
    if (!next) return
    children.push(next)
    shares.push(sizes[index] ?? 0)
  })

  if (children.length === 0) return null
  const only = children[0]
  // The space the removed panel held is shared out among what is left, in
  // proportion to what each already had.
  if (children.length === 1 && only && !hasChrome(node)) return only
  return normalizeLayout({
    kind: 'split',
    direction: node.direction,
    children,
    sizes: shares,
    ...(node.title ? { title: node.title } : {}),
    ...spaceChrome(node),
  })
}

/** Puts a panel into a group's tabs, on top, at `index` or at the end. */
function addTab(node: WindowGroup, id: string, index?: number): WindowGroup {
  const panels = node.panels.filter((tab) => tab !== id)
  const at = index === undefined ? panels.length : Math.max(0, Math.min(index, panels.length))
  panels.splice(at, 0, id)
  return { kind: 'group', panels, active: id, ...spaceChrome(node) }
}

/**
 * Puts a panel beside an existing one, taking half of its group's space, or —
 * for a `center` drop — into that group as a tab.
 *
 * When the target already sits in a split running along the same axis as the
 * drop, the new panel joins it as a sibling; otherwise the target is replaced
 * by a two-child split of the new axis. That distinction is what stops a row
 * of panels from becoming a chain of nested pairs.
 */
export function insertPanel(
  node: WindowNode,
  id: string,
  targetId: string,
  edge: DropEdge,
  index?: number,
): WindowNode {
  const intoFrames = (held: WindowFloat) =>
    mapFrames(held, (child) =>
      hasPanel(child, targetId) ? insertPanel(child, id, targetId, edge, index) : child,
    )

  // Not an insertion relative to a group at all: `floatPanel` does that one.
  if (edge === 'float') return node

  // A space sharing a strip is dropped *into*, not onto: the drop is about a
  // pane inside it, and the strip it shares is no part of that.
  const intoTabs = (held: WindowGroup) =>
    withSpaceTab(held, targetId, (tab) => insertPanel(tab, id, targetId, edge, index))

  if (edge === 'center') {
    if (isGroup(node)) return isTabOf(node, targetId) ? addTab(node, id, index) : intoTabs(node)
    if (isFloat(node)) return intoFrames(node)
    return {
      ...node,
      children: node.children.map((child) =>
        hasPanel(child, targetId) ? insertPanel(child, id, targetId, edge, index) : child,
      ),
    }
  }

  const direction = axisOf(edge)
  const before = edge === 'left' || edge === 'top'
  const pair = (target: WindowNode): WindowSplit => ({
    kind: 'split',
    direction,
    children: before ? [panelNode(id), target] : [target, panelNode(id)],
    sizes: [0.5, 0.5],
  })

  // The target is the whole window: it becomes one half of a new split.
  if (isGroup(node)) return isTabOf(node, targetId) ? pair(node) : intoTabs(node)

  // An edge drop inside a float divides the frame holding the target rather
  // than the desktop: the frame keeps its place and splits within its own bounds.
  if (isFloat(node)) return intoFrames(node)

  const sizes = sizesOf(node)
  const position = node.children.findIndex(
    (child) => isGroup(child) && isTabOf(child, targetId),
  )

  if (position >= 0 && node.direction === direction) {
    const share = (sizes[position] ?? 0) / 2
    const children = [...node.children]
    const nextSizes = [...sizes]
    children.splice(before ? position : position + 1, 0, panelNode(id))
    nextSizes.splice(position, 1, share, share)
    return {
      kind: 'split',
      direction,
      children,
      sizes: nextSizes,
      ...(node.title ? { title: node.title } : {}),
      ...spaceChrome(node),
    }
  }

  const children = node.children.map((child) => {
    if (!hasPanel(child, targetId)) return child
    if (isGroup(child) && isTabOf(child, targetId)) return pair(child)
    return insertPanel(child, id, targetId, edge)
  })
  return {
    kind: 'split',
    direction: node.direction,
    children,
    sizes,
    ...(node.title ? { title: node.title } : {}),
    ...spaceChrome(node),
  }
}

/**
 * Brings a panel's tab to the top of its group. Returns the tree it was given,
 * identical, when that tab is already on top — a caller comparing by reference
 * can tell a real change from a click on the tab already showing.
 */
export function setActivePanel(node: WindowNode, id: string): WindowNode {
  if (isGroup(node)) {
    if (isTabOf(node, id)) {
      if (activePanel(node) === id) return node
      return { kind: 'group', panels: node.panels, active: id, ...spaceChrome(node) }
    }
    // A panel of a space sharing the strip: that space brings its own tab to
    // the top, and this strip names it so the tab it is in is the one showing.
    const index = node.panels.findIndex((tab) => !isPanelTab(tab) && hasPanel(tab, id))
    const tab = node.panels[index]
    if (tab === undefined || isPanelTab(tab)) return node
    const inner = setActivePanel(tab, id)
    if (inner === tab && node.active === id) return node
    const panels = [...node.panels]
    panels[index] = inner
    return { kind: 'group', panels, active: id, ...spaceChrome(node) }
  }
  if (!hasPanel(node, id)) return node
  if (isFloat(node)) return mapFrames(node, (child) => setActivePanel(child, id))

  let changed = false
  const children = node.children.map((child) => {
    const next = setActivePanel(child, id)
    if (next !== child) changed = true
    return next
  })
  return changed ? { ...node, children } : node
}

/** Moves a panel's tab along its own strip, without leaving the group. */
export function moveTab(node: WindowNode, id: string, index: number): WindowNode {
  if (isGroup(node)) {
    if (!isTabOf(node, id)) return withSpaceTab(node, id, (tab) => moveTab(tab, id, index))
    const from = node.panels.indexOf(id)
    const to = Math.max(0, Math.min(index, node.panels.length - 1))
    if (from === to) return node
    const panels = [...node.panels]
    panels.splice(from, 1)
    panels.splice(to, 0, id)
    // Pinned rather than left to fall back to the first tab: reordering the
    // strip must not change which tab you are looking at.
    const active = frontPanel(node)
    return { kind: 'group', panels, ...(active ? { active } : {}), ...spaceChrome(node) }
  }
  if (!hasPanel(node, id)) return node
  if (isFloat(node)) return mapFrames(node, (child) => moveTab(child, id, index))
  return { ...node, children: node.children.map((child) => moveTab(child, id, index)) }
}

/** Trades two panels' places, leaving the shape of the grid untouched. */
export function swapPanels(node: WindowNode, a: string, b: string): WindowNode {
  if (a === b) return node
  if (isGroup(node)) {
    if (!hasPanel(node, a) && !hasPanel(node, b)) return node
    const swap = (panel: string) => (panel === a ? b : panel === b ? a : panel)
    const panels = node.panels.map((tab) => (isPanelTab(tab) ? swap(tab) : swapPanels(tab, a, b)))
    return { ...node, panels, ...(node.active ? { active: swap(node.active) } : {}) }
  }
  // Two floating panels trade places by trading ids: each frame keeps its own
  // position and size, so what moves is which panel is drawn where.
  if (isFloat(node)) return mapFrames(node, (child) => swapPanels(child, a, b))
  return { ...node, children: node.children.map((child) => swapPanels(child, a, b)) }
}

/**
 * The one operation a drag performs: lift a panel out and put it back down
 * against another. A drop on the middle of a group joins it as a tab; a drop
 * on the strip itself lands at `index`, which is also how a tab is reordered
 * without leaving the group it is already in.
 *
 * Anything that would be a no-op — dropping a panel on itself, naming a panel
 * that is not in the tree — returns the layout it was given, unchanged and
 * identical, so a caller can compare by reference.
 */
export function movePanel(
  layout: WindowNode,
  panel: string,
  target: string,
  edge: DropEdge,
  index?: number,
): WindowNode {
  // A float drop needs somewhere to put the window, which this does not take.
  if (edge === 'float') return layout
  if (!hasPanel(layout, panel) || !hasPanel(layout, target)) return layout

  const home = groupOf(layout, panel)
  if (edge === 'center' && home && isTabOf(home, target)) {
    // Already tabbed here, so this is a reorder rather than a move. `index` is
    // a gap between tabs, counted with the dragged one still in the strip:
    // dropping into a gap to its right lands it one place lower once it has
    // been lifted out.
    if (index === undefined) return layout
    const from = home.panels.indexOf(panel)
    const to = index > from ? index - 1 : index
    if (to === from) return layout
    return setActivePanel(moveTab(layout, panel, to), panel)
  }

  // An edge drop on the panel's own group, which had nothing else in it.
  if (panel === target) return layout

  const without = removePanel(layout, panel)
  if (!without) return layout
  return normalizeLayout(insertPanel(without, panel, target, edge, index))
}

/* -------------------------------------------------------------- containers */

/** Puts a different node in one place of a split, a float, or a strip of tabs. */
function replaceChild(node: WindowNode, index: number, child: WindowNode): WindowNode {
  if (isGroup(node)) {
    const tab = node.panels[index]
    // Never a panel tab: a panel is not a space, and nothing addresses one this
    // way — `childEntries` hands out the indices, and skips them.
    if (tab === undefined || isPanelTab(tab)) return node
    const panels = [...node.panels]
    panels[index] = child
    return { ...node, panels }
  }
  if (isFloat(node)) {
    const held = node.frames[index]
    if (!held) return node
    const frames = [...node.frames]
    frames[index] = { ...held, node: child }
    return { ...node, frames }
  }
  const children = [...node.children]
  children[index] = child
  return { ...node, children }
}

/**
 * Rewrites the container a panel's pane sits directly inside — the split or
 * float one of whose own children is the group holding it. That is the node
 * every "show these differently" operation acts on, because it is the one that
 * decides how the pane and its siblings are arranged.
 *
 * `null` means nothing to do: the pane is the whole layout and has no
 * container, or the rewrite handed back what it was given.
 */
function withContainer(
  node: WindowNode,
  id: string,
  rewrite: (container: WindowSplit | WindowFloat) => WindowNode,
): WindowNode | null {
  const children = childEntries(node)
  // A strip is not a container of panes: what shares it is not dividing it, and
  // the four modes it offers are `spreadTabs` and `floatTabs` instead. It is
  // still walked through, because a space sharing it is a container of its own.
  if (!isGroup(node) && children.some(({ node: child }) => isGroup(child) && isTabOf(child, id))) {
    const next = rewrite(node)
    return next === node ? null : next
  }

  for (const { node: child, index } of children) {
    if (!hasPanel(child, id)) continue
    const next = withContainer(child, id, rewrite)
    return next ? replaceChild(node, index, next) : null
  }
  return null
}

/**
 * Flips the split a pane sits in between a row and a column — appfr's
 * "display: row" and "display: column", as an operation on the tree.
 *
 * A column turned into a row inside a row is the same row, so it is flattened:
 * the arrangement it describes is the one already on screen.
 */
export function setSplitDirection(
  layout: WindowNode,
  id: string,
  direction: SplitDirection,
): WindowNode {
  const next = withContainer(layout, id, (container) =>
    isSplit(container) && container.direction !== direction
      ? { ...container, direction }
      : container,
  )
  return next ? normalizeLayout(next) : layout
}

/**
 * The tabs a node contributes to a strip the space around it is collapsed into.
 *
 * Tiled panes stop dividing their space and share it, however deep they were:
 * a row holding a column of panes is one strip of all of them, because none of
 * those panes was ever a space of its own — only an arrangement of the one they
 * are now sharing.
 *
 * A **desktop** is not one of those panes. Its windows are placed rather than
 * dividing anything, and where each of them sits is state a user put there, so
 * it shares the strip whole: one tab, named the way it names itself. Emptying
 * it into the strip would be the loss of the arrangement rather than another
 * way of showing it — and it is the loss "Tabs" alone would inflict, since a
 * row, a column and windows all keep every pane the space holds.
 *
 * The same is true of the two splits that are spaces in their own right: one
 * that remembers the desktop it was tiled from carries the way back in its
 * `places`, and one the host shaped — named, fixed, or without a bar at all —
 * has said something about *that* bar. Both become a tab rather than the panes
 * inside them.
 */
function tabsOf(node: WindowNode): WindowTab[] {
  if (isGroup(node)) return [...node.panels]
  if (isFloat(node) || placesOf(node) || hasChrome(node)) return [node]
  return node.children.flatMap(tabsOf)
}

/**
 * A space with everything in it sharing one strip: the panes as tabs, and the
 * desktops among them as tabs of their own. "Tabs", as a pure operation on a
 * space rather than on a pane inside it — `active` naming the panel the strip
 * should open on, if it is still in there.
 *
 * A strip of tabs is already this, so it comes back untouched.
 */
export function collapseSpace(node: WindowNode, active?: string): WindowNode {
  if (isGroup(node)) return node
  const panels = childrenOf(node).flatMap(tabsOf)
  const shown = active && panels.some((tab) => tabPanels(tab).includes(active)) ? active : undefined
  return normalizeLayout({
    kind: 'group',
    panels,
    ...(shown ? { active: shown } : {}),
    ...spaceChrome(node),
  })
}

/**
 * Puts everything in the container a pane sits in into one group, as tabs, with
 * this one on top. The panes stop dividing the space and share it; a desktop
 * among them shares it whole, as one tab — see `tabsOf`.
 */
export function collapseToTabs(layout: WindowNode, id: string): WindowNode {
  const next = withContainer(layout, id, (container) => collapseSpace(container, id))
  return next ? normalizeLayout(next) : layout
}

/*
 * A group of tabs is a space too.
 *
 * The four display modes act on a *container* — the split or float around a
 * pane's group — but a group holding more than one tab is a space in its own
 * right, one level below that: the panes in it have stopped dividing their
 * space and share it. The two operations here are how that space is shown
 * differently, and without them a set of tabs was a one-way door — every way
 * of saying "show these another way" was measured on the container the group
 * sat in, where it had nothing left to do.
 */

/**
 * Rewrites the group a panel is a tab of, wherever in the tree that is.
 *
 * `null` means nothing to do: the tree does not hold the panel, or the rewrite
 * handed back the group it was given.
 */
function withGroup(
  node: WindowNode,
  id: string,
  rewrite: (group: WindowGroup) => WindowNode,
): WindowNode | null {
  if (isGroup(node) && isTabOf(node, id)) {
    const next = rewrite(node)
    return next === node ? null : next
  }

  for (const { node: child, index } of childEntries(node)) {
    if (!hasPanel(child, id)) continue
    const next = withGroup(child, id, rewrite)
    return next ? replaceChild(node, index, next) : null
  }
  return null
}

/**
 * Spreads the tabs of a pane's group into panes of their own, dividing the
 * space the group held in the order the tabs were in.
 *
 * The inverse of `collapseToTabs`, a level further down: that one makes tabs of
 * a container's panes, this one makes panes of a group's tabs. A group of one
 * has no tabs to spread, so the layout comes back identical — and a row spread
 * inside a row is flattened into it, for the same reason `setSplitDirection`
 * flattens: the arrangement it describes is the one already on screen.
 */
export function spreadTabs(layout: WindowNode, id: string, direction: SplitDirection): WindowNode {
  const next = withGroup(layout, id, (tabs) =>
    tabs.panels.length > 1
      ? { ...split(direction, tabs.panels.map(tabNode)), ...spaceChrome(tabs) }
      : tabs,
  )
  return next ? normalizeLayout(next) : layout
}

/**
 * Replaces the window whose whole content is the group holding `id` with one
 * window per tab, keeping its place in the stack. Returns the tree it was
 * given when no window on any float in it is exactly that group.
 */
function spreadFrame(node: WindowNode, id: string): WindowNode {
  if (isGroup(node)) return node

  if (isFloat(node)) {
    const index = node.frames.findIndex(
      (held) => isGroup(held.node) && held.node.panels.includes(id),
    )
    const held = node.frames[index]
    const tabs = held && isGroup(held.node) ? held.node : null
    if (held && tabs && tabs.panels.length > 1) {
      // Cascading from the rect the window had, so its tabs come out where it
      // was rather than at the corner of the desktop. Maximized and minimized
      // go with it: the flag described that one window, not these.
      const spread = cascade(tabs.panels.map(tabNode), held.rect).frames
      return {
        ...node,
        frames: [...node.frames.slice(0, index), ...spread, ...node.frames.slice(index + 1)],
      }
    }
    return mapFrames(node, (child) => spreadFrame(child, id))
  }

  if (!hasPanel(node, id)) return node
  let changed = false
  const children = node.children.map((child) => {
    const next = spreadFrame(child, id)
    if (next !== child) changed = true
    return next
  })
  return changed ? { ...node, children } : node
}

/**
 * Turns the tabs of a pane's group into windows of their own.
 *
 * A group that *is* a window on a float becomes several windows on that same
 * float: a desktop nested inside one of its own windows would be a stranger
 * thing than the tabs it replaced. Anywhere else the group becomes a float in
 * its place, each tab a window on it — which is how a tiled set of tabs turns
 * into a desktop.
 */
export function floatTabs(layout: WindowNode, id: string, rect?: Partial<FloatRect>): WindowNode {
  const home = groupOf(layout, id)
  if (!home || home.panels.length < 2) return layout

  const held = frameOf(layout, id)
  if (held?.node === home) {
    const next = spreadFrame(layout, id)
    return next === layout ? layout : normalizeLayout(next)
  }

  const next = withGroup(layout, id, (tabs) => ({
    ...cascade(tabs.panels.map(tabNode), rect),
    ...spaceChrome(tabs),
  }))
  return next ? normalizeLayout(next) : layout
}

/**
 * The windows a split's panes were, put back where they were — or cascaded, if
 * this split never was a desktop and so has nowhere to put them back to.
 */
export function floatSplit(node: WindowSplit, rect?: Partial<FloatRect>): WindowFloat {
  const places = placesOf(node)
  const frames = places
    ? node.children.map((child, index) => ({ ...places[index]!, node: child }))
    : cascade(node.children, rect).frames
  return { ...float(frames, node.title), ...spaceChrome(node) }
}

/**
 * Turns the container a pane sits in into a float, its children becoming the
 * windows on it. A pane that *is* the whole layout has no container to turn,
 * so the layout becomes a float of one window — which is the only way a float
 * is made from a tree that has none.
 *
 * A container that was itself a desktop until it was tiled is put back exactly
 * as it was, down to the window that was maximized: the round trip through a
 * row or a column loses nothing, because the split kept every frame's place.
 */
export function toFloat(
  layout: WindowNode,
  id: string,
  rect?: Partial<FloatRect>,
): WindowNode {
  const next = withContainer(layout, id, (container) =>
    isFloat(container) ? container : floatSplit(container, rect),
  )
  if (next) return normalizeLayout(next)
  if (isGroup(layout) && isTabOf(layout, id)) return cascade([layout], rect)
  return layout
}

/**
 * The order a desktop's windows tile in: down the screen for a column, across
 * it for a row, ties broken by where they sit on the other axis and then by
 * the stack.
 *
 * Where they *are*, not where they are stacked. A user reads a desktop by
 * position, so tiling it should hand back the windows in the order they were
 * already being read in — and stacking order is the wrong answer twice over,
 * since merely opening a window's menu raises it and would silently send that
 * window to the end of the row it was about to make.
 */
function tiledOrder(frames: FloatFrame[], direction: SplitDirection): FloatFrame[] {
  const along = (held: FloatFrame) => (direction === 'column' ? held.rect.y : held.rect.x)
  const across = (held: FloatFrame) => (direction === 'column' ? held.rect.x : held.rect.y)
  return [...frames].sort((a, b) => along(a) - along(b) || across(a) - across(b))
}

/**
 * Turns the float a window is on back into a split, its frames becoming the
 * panes in the order they were laid out on it.
 *
 * The places are not dropped but kept on the split, so the desktop is one
 * choice of "Desktop" away rather than gone: a tiled arrangement has no use
 * for them, but the way back does. They are also what keeps this split a space
 * of its own — the panes beside the desktop were never on it, and flattening
 * would let them in.
 */
export function tileFloat(node: WindowFloat, direction: SplitDirection): WindowSplit {
  const order = tiledOrder(node.frames, direction)
  return {
    kind: 'split',
    direction,
    children: order.map((held) => held.node),
    ...(node.title ? { title: node.title } : {}),
    ...spaceChrome(node),
    places: order.map(({ node: _node, ...place }) => place),
  }
}

export function toTiled(
  layout: WindowNode,
  id: string,
  direction: SplitDirection = 'row',
): WindowNode {
  const next = withContainer(layout, id, (container) =>
    isFloat(container) ? tileFloat(container, direction) : container,
  )
  return next ? normalizeLayout(next) : layout
}

/**
 * What a node is called. A group is named after the tab on top; a split and a
 * float have no title of their own, so they borrow one from the descendant a
 * user would say they were looking at — the first pane of a split, the window
 * in front of a float.
 */
/**
 * What a *space* is called on the title bar it draws for itself.
 *
 * A container has no tab to take a name from, so it says how it is shown —
 * which is exactly what the menu beside the name switches between, and is
 * true of a space that was never given one rather than merely plausible. A
 * layout that names it wins; a group is not a space of this kind and has no
 * such name.
 */
export function spaceTitle(node: WindowNode): string {
  if (isGroup(node)) return ''
  if (node.title) return node.title
  if (isFloat(node)) return 'Desktop'
  return node.direction === 'row' ? 'Row' : 'Column'
}

export function nodeTitle(
  node: WindowNode,
  titleFor: (id: string) => string | undefined,
): string {
  if (isGroup(node)) {
    const tab = node.panels[activeTab(node)]
    if (tab === undefined) return ''
    // A space sharing the strip says what it is called for itself, the way it
    // would on a bar of its own — `Desktop` rather than the window in front.
    if (!isPanelTab(tab)) return spaceTitle(tab) || nodeTitle(tab, titleFor)
    return titleFor(tab) ?? tab
  }
  if (node.title) return node.title
  if (isFloat(node)) {
    const front = node.frames[node.frames.length - 1]
    return front ? (front.title ?? nodeTitle(front.node, titleFor)) : ''
  }
  const first = node.children[0]
  return first ? nodeTitle(first, titleFor) : ''
}

/* ------------------------------------------------------------------ sizing */

/**
 * The node at a path of child indices from the root, if there is one. A float
 * is addressed the same way a split is: its frames are its children, in order.
 */
export function nodeAt(node: WindowNode, path: readonly number[]): WindowNode | null {
  let current: WindowNode | undefined = node
  for (const index of path) {
    if (!current) return null
    if (isSplit(current)) current = current.children[index]
    else if (isFloat(current)) current = current.frames[index]?.node
    else {
      // A strip is addressed the same way: its tabs are its children, in strip
      // order — and a panel tab is not a space, so there is nothing there.
      const tab = current.panels[index]
      current = tab === undefined || isPanelTab(tab) ? undefined : tab
    }
  }
  return current ?? null
}

/** Replaces one split's sizes, leaving the rest of the tree as it was. */
/**
 * The tree with the node at a path replaced by another — how a space rewrites
 * *itself* rather than being found from a panel inside it.
 *
 * Every operation above addresses a space through one of its panels, which is
 * what a pane's own menu has to hand. A desktop's title bar has no panel to
 * speak through: it is the space, and it already knows where it is, so it says
 * so with the path it was rendered at.
 */
export function replaceAt(
  node: WindowNode,
  path: readonly number[],
  next: WindowNode,
): WindowNode {
  if (path.length === 0) return next
  const [index, ...rest] = path
  if (index === undefined) return node

  if (isFloat(node)) {
    const held = node.frames[index]
    if (!held) return node
    const child = replaceAt(held.node, rest, next)
    if (child === held.node) return node
    const frames = [...node.frames]
    frames[index] = { ...held, node: child }
    return { ...node, frames }
  }

  if (isGroup(node)) {
    const tab = node.panels[index]
    if (tab === undefined || isPanelTab(tab)) return node
    const child = replaceAt(tab, rest, next)
    if (child === tab) return node
    const panels = [...node.panels]
    panels[index] = child
    return { ...node, panels }
  }

  const child = node.children[index]
  if (!child) return node
  const replaced = replaceAt(child, rest, next)
  if (replaced === child) return node
  const children = [...node.children]
  children[index] = replaced
  return { ...node, children }
}

export function setSizesAt(node: WindowNode, path: readonly number[], sizes: number[]): WindowNode {
  if (path.length === 0) {
    if (!isSplit(node)) return node
    return { ...node, sizes: normalizeSizes(node.children.length, sizes) }
  }
  const [index, ...rest] = path
  if (index === undefined) return node

  // A float has no sizes of its own, but a split inside one of its frames does.
  if (isFloat(node)) {
    const held = node.frames[index]
    if (!held) return node
    const next = setSizesAt(held.node, rest, sizes)
    if (next === held.node) return node
    const frames = [...node.frames]
    frames[index] = { ...held, node: next }
    return { ...node, frames }
  }

  // Nor has a strip, but a space sharing it may hold a split that has.
  if (isGroup(node)) {
    const tab = node.panels[index]
    if (tab === undefined || isPanelTab(tab)) return node
    const next = setSizesAt(tab, rest, sizes)
    if (next === tab) return node
    const panels = [...node.panels]
    panels[index] = next
    return { ...node, panels }
  }

  const child = node.children[index]
  if (!child) return node

  const children = [...node.children]
  children[index] = setSizesAt(child, rest, sizes)
  return { ...node, children }
}

/**
 * Moves the boundary between two neighbouring children, taking from one and
 * giving to the other so the rest of the split stays exactly where it is.
 * `min` is the smallest share either may be squeezed to; when there is not
 * room for both to have it, the pair is left alone.
 */
export function resizeSplit(
  sizes: number[],
  index: number,
  delta: number,
  min = 0.02,
): number[] {
  const before = sizes[index]
  const after = sizes[index + 1]
  if (before === undefined || after === undefined) return sizes

  const pair = before + after
  if (pair < min * 2) return sizes

  const next = [...sizes]
  const clamped = Math.min(Math.max(before + delta, min), pair - min)
  next[index] = clamped
  next[index + 1] = pair - clamped
  return next
}

/* ------------------------------------------------------------- reconciling */

/** Every panel in a single row — what a window shows when given no layout. */
/**
 * A layout with a space around it when the root is a lone pane.
 *
 * Every panel has to sit in something that can say how it is shown, and the
 * four ways are a *space's* — a split or a float — because a pane holds
 * content rather than panels. A group of tabs is a space in its own right and
 * speaks for itself, so it is left alone; a group of *one* is not, and the
 * last panel in a window would otherwise have nowhere to be told to float
 * from, and no way back once it was.
 *
 * That state is not exotic: `normalizeLayout` collapses a split of one into
 * that one child, so an ordinary row is a lone pane as soon as everything but
 * the last panel has been closed. A row of one is the space it keeps.
 *
 * Idempotent, and identity-preserving: a layout that already has a space at
 * its root comes back exactly as it was.
 */
export function rootSpace(node: WindowNode): WindowNode {
  if (!isGroup(node) || node.panels.length >= 2) return node
  // What the pane said about its own bar is said by the space around it too:
  // a host that drew a panel without one did not ask for a row with one.
  return { ...row([node]), ...spaceChrome(node) }
}

export function defaultLayout(ids: readonly string[]): WindowNode | null {
  if (ids.length === 0) return null
  return row(ids.map(panelNode))
}

/**
 * Squares a layout with the panels that actually exist: tabs naming a panel
 * that has gone are dropped, panels the layout does not mention are appended
 * as a new pane at the end, and a panel appearing twice is rebuilt in one
 * place. A stored layout therefore survives the panel list changing under it
 * rather than rendering holes.
 */
export function reconcileLayout(
  layout: WindowNode | null,
  ids: readonly string[],
): WindowNode | null {
  if (!layout) return defaultLayout(ids)

  const wanted = new Set(ids)
  const seen = new Set<string>()
  const stale = new Set<string>()
  for (const id of panelIds(layout)) {
    if (!wanted.has(id) || seen.has(id)) stale.add(id)
    else seen.add(id)
  }

  let pruned: WindowNode | null = layout
  for (const id of stale) {
    pruned = pruned ? removePanel(pruned, id) : null
  }

  const present = new Set(pruned ? panelIds(pruned) : [])
  const missing = ids.filter((id) => !present.has(id))
  if (missing.length === 0) return pruned ? rootSpace(normalizeLayout(pruned)) : null
  if (!pruned) return defaultLayout(missing)

  // A new panel on a desktop is a new window on it, stepped clear of the last,
  // rather than a tiled pane wedged beside the desktop itself.
  if (isFloat(pruned)) {
    const from = pruned.frames.length
    return {
      ...pruned,
      frames: [
        ...pruned.frames,
        ...missing.map((id, offset) =>
          frame(panelNode(id), {
            x: DEFAULT_FRAME.x + (from + offset) * CASCADE_STEP,
            y: DEFAULT_FRAME.y + (from + offset) * CASCADE_STEP,
          }),
        ),
      ],
    }
  }

  return rootSpace(normalizeLayout(row([pruned, ...missing.map(panelNode)])))
}
