/**
 * The window model: panels arranged in a recursively split grid.
 *
 * A window is a tree. Every node is one of three things: a **split** — a row or
 * a column of further nodes — a **group**, one space shared by one or more
 * panels as tabs, or a **float**, a space whose children are placed over it at
 * a position and size of their own. Nesting a column inside a row (and so on)
 * is what makes an arbitrary grid expressible without the component knowing
 * anything about grids:
 *
 * ```
 * ┌──────────────┬───────────────┐   split(row)
 * │              │   sources     │   ├── group(items)
 * │    items     ├───────────────┤   └── split(column)
 * │              │ activity│log  │       ├── group(sources)
 * └──────────────┴───────────────┘       └── group(activity, log)
 * ```
 *
 * A lone panel is a group of one, so tabs are not a second kind of thing the
 * tree has to describe — they are what a group with more than one panel in it
 * looks like. A tab is a panel or, where a space shares the strip beside one,
 * whatever a node can be: see {@link WindowTab}.
 *
 * A float is the same tree turned loose: its frames overlap rather than divide
 * the space, each one carrying whatever a node can be — a group of tabs, or a
 * grid of its own.
 *
 * ```
 * ┌────────────────────────────┐   float
 * │  ┌────────┐                │   ├── frame(group(items), 16,16 340×220)
 * │  │ items  │  ┌──────────┐  │   └── frame(group(log), 200,90 260×180)
 * │  └────────┘  │   log    │  │       (last is on top)
 * │              └──────────┘  │
 * └────────────────────────────┘
 * ```
 *
 * The tree is data, so it round-trips through JSON, can be persisted per user,
 * and is the single thing a drag-move rewrites. Every operation in
 * `./layout` returns a new tree rather than mutating the one it was given.
 */

/** How a split lays its children out: `row` across, `column` down. */
export type SplitDirection = 'row' | 'column'

/**
 * What a space says about the bar it draws for itself.
 *
 * All three kinds of node are spaces, and each draws one bar: a pane's tab
 * strip, a row's or a column's own header, a desktop's title bar — and, when
 * a floating window holds a space rather than a pane, the bar that window
 * draws on its behalf. These three fields are what a host says about that bar:
 * what it is called, how much of it is offered, and whether it is drawn at all.
 */
export interface WindowSpace {
  /**
   * What this space is called on its own bar.
   *
   * Left out, a space says how it is shown — `Row`, `Column`, `Desktop` — which
   * is exactly what the menu beside the name switches between; a strip says
   * nothing, since its tabs already say what is on it.
   *
   * A name is something said about *that* space, so it survives every shape the
   * space is left in: a named desktop tiled across is a named row, collapsed is
   * a named strip, and back again. It is also why the space is neither
   * dissolved into the space around it nor collapsed into the pane inside it —
   * see `hasChrome` in `./layout`.
   */
  title?: string
  /**
   * Fixes how this space shows what it holds: a pane offers no choice of view
   * in its menu, and a container is offered no way to be shown as anything
   * else.
   *
   * What it shows is unchanged — `views` for a pane, the shape of the tree for
   * a container — and still the host's to set, from `v-model` and the
   * operations in `./layout`. It is only no longer the user's.
   */
  fixedView?: boolean
  /**
   * Draws no title bar at all.
   *
   * Everything that bar carried goes with it: the space's name, its tabs, its
   * `actions` slot, its menu — the choice of view among the items the content
   * registered and the window's own — its close, and, where the bar was a
   * floating window's, the maximize and minimize buttons and the grip the
   * window was carried by. Each of them stays the host's to set, from
   * `v-model:views`, `v-model:layout`, and the methods the window exposes.
   *
   * A window rolled up to a bar it does not have is no exception: it shows
   * nothing but its own frame, and is unrolled the way it was rolled up.
   */
  headless?: boolean
}

/**
 * One tab: a panel by {@link WindowPanelDef.id}, or a whole space sharing the
 * strip.
 *
 * A space is a tab the way a space is a pane. It is what makes "Tabs" the
 * fourth way of showing a space rather than a flattening of everything inside
 * it: the panes of a row stop dividing their space and share it, and a desktop
 * among them shares it as one tab — named `Desktop`, keeping its windows where
 * they were, and coming back out of the strip exactly as it went in.
 *
 * ```
 * ┌─────────┬───────────────┐        ┌──────────────────────────┐
 * │         │  ┌────────┐   │  Tabs  │ Items │ Desktop │        │
 * │  items  │  │  log   │   │  ───▶  ├──────────────────────────┤
 * │         │  └────────┘   │        │  the items pane, and the │
 * └─────────┴───────────────┘        │  desktop one tab along   │
 *   split(row)                       └──────────────────────────┘
 *   ├── group(items)                   group(items, float(log, …))
 *   └── float(log, …)
 * ```
 */
export type WindowTab = string | WindowNode

/**
 * One space, shared by one or more tabs. A group of one is a plain panel, and
 * reads as one: it shows a title rather than a tab.
 */
export interface WindowGroup extends WindowSpace {
  kind: 'group'
  /**
   * What shares this space, in tab order: a panel by id, or a whole space —
   * see {@link WindowTab}.
   */
  panels: WindowTab[]
  /**
   * The tab on top, named by a panel: a panel tab by its own id, a space tab
   * by any panel inside it. Omitted — or naming a panel that has since left
   * the group — means the first tab, so a hand-written layout need not say.
   */
  active?: string
  /**
   * Where these tabs sat as windows, one per tab in the same order, when this
   * strip was made by collapsing a desktop — or a split that remembered one.
   *
   * The same record {@link WindowSplit.places} keeps, kept through the third
   * of the four shapes so that the round trip loses nothing whichever way it
   * goes: a desktop shown as tabs and then as a desktop again puts every window
   * back exactly where it was.
   *
   * The wrong length means the tabs are no longer the windows it remembered, so
   * it is ignored — the same tolerance the other two lists have.
   */
  places?: FramePlace[]
}

/** A row or column of further nodes. */
export interface WindowSplit extends WindowSpace {
  kind: 'split'
  direction: SplitDirection
  children: WindowNode[]
  /**
   * Relative share of the split per child, in the same order. Omitted — or the
   * wrong length — means equal shares, so a hand-written layout can leave it
   * out entirely and only the sizes a user has dragged need storing.
   */
  sizes?: number[]
  /**
   * Where these panes sat as windows, one per child in the same order, when
   * this split was made by tiling a float.
   *
   * The same trick {@link FloatFrame.maximized} plays, a level up: the way
   * back is kept in the tree rather than remembered on the side, so showing
   * the space as windows again puts every one of them exactly where it was —
   * and a layout that was stored and read back restores just as well.
   *
   * It also says the split *is* a space rather than merely an arrangement, so
   * it keeps its children and is never flattened into a split around it: the
   * panes of a desktop stay the desktop's, and the panes beside it stay out.
   *
   * The wrong length means the children are no longer the windows it
   * remembered, so it is ignored — the same tolerance `sizes` has.
   */
  places?: FramePlace[]
}

/** Where a floating frame sits in its float, in pixels from its top-left. */
export interface FloatRect {
  x: number
  y: number
  /** Width and height. Never smaller than the window's `minPanelSize`. */
  w: number
  h: number
}

/** One frame of a float: what it holds, and where it sits. */
export interface FloatFrame {
  /** Whatever a node can be — a group of tabs, or a whole grid of its own. */
  node: WindowNode
  rect: FloatRect
  /**
   * What the window is called. A frame holding one group takes its title from
   * the tab on top and needs none; a frame holding a grid has no such tab, so
   * it borrows the title of the pane it is named after unless given this.
   */
  title?: string
  /**
   * Fills the float rather than sitting in `rect`. The rect is kept exactly as
   * it was while this is set — it is the place the window goes back to, so
   * restoring needs nothing remembered anywhere else.
   */
  maximized?: boolean
  /**
   * Rolled up to its title bar and docked along the bottom of the float. Like
   * `maximized` it leaves the rect alone, and the two are exclusive: a window
   * is filling its float, or rolled up out of the way, or neither.
   */
  minimized?: boolean
}

/** Everything a floating frame is but what it holds: where it sits, and how. */
export type FramePlace = Omit<FloatFrame, 'node'>

/**
 * A space its children float over rather than divide, each frame at a position
 * and size of its own. Frames overlap, so unlike a split their order is a
 * stacking order: the last one is on top, and clicking a frame puts it there.
 *
 * Unnamed it is called `Desktop`, which is how it is shown: it has no tab to
 * take a name from and no first pane to borrow one from, since the window in
 * front of it changes every time one is touched — and a space that renames
 * itself for being clicked on is no name at all.
 */
export interface WindowFloat extends WindowSpace {
  kind: 'float'
  /** Frames back to front — the last is the one on top. */
  frames: FloatFrame[]
}

export type WindowNode = WindowGroup | WindowSplit | WindowFloat

/**
 * Which part of a floating frame a drag has hold of: a compass point resizes
 * from that edge or corner, `move` carries the whole frame.
 */
export type FrameHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

export type FrameGrip = FrameHandle | 'move'

/**
 * Where a dragged panel lands. The four edges split the group it was dropped
 * on and take half of it; `center` joins that group, which is the move that
 * makes a tab; `float` is a drop on a float's bare desktop, which makes the
 * panel a window of its own.
 */
export type DropEdge = 'left' | 'right' | 'top' | 'bottom' | 'center' | 'float'

/** The edges that divide a group — every drop but the two that do not split. */
export type SplitEdge = Exclude<DropEdge, 'center' | 'float'>

/** One of the views a panel offers, as its menu names it. */
export interface WindowView {
  key: string
  label: string
}

/**
 * A panel's identity and chrome. What it *contains* is not described here: the
 * window renders whatever the matching slot puts inside it.
 */
export interface WindowPanelDef {
  id: string
  title: string
  /** Secondary line beside the title — a count, a scope, a status. */
  subtitle?: string
  /**
   * Views this panel offers, listed under *View* in its menu — two or more,
   * since one view is no choice. The chosen key is handed to the content slot;
   * the panel does not interpret it.
   */
  views?: WindowView[]
  /** View selected when the window is not told otherwise. Defaults to the first. */
  defaultView?: string
  /** Keeps this panel where it is while every other one stays movable. */
  fixed?: boolean
  /**
   * Whether this panel offers a close button, overriding the window's own
   * `closable`. Closing is a request: the window emits `panel-close` and the
   * host drops the panel from `panels`, which is what actually removes it.
   */
  closable?: boolean
}

/** A completed drag or keyboard move, reported by the window. */
export interface PanelMove {
  /** The panel that moved. */
  panel: string
  /** A panel of the group it was dropped on — `''` when `space` says where. */
  target: string
  /**
   * The space it was dropped into, by the path it is rendered at: set only for
   * a drop into a space that held nothing, which has no panel to name it by.
   */
  space?: readonly number[]
  edge: DropEdge
  /** Position in the target group's tabs, when it was dropped on the strip. */
  index?: number
  /** The window it became, when it was dropped on a float's bare desktop. */
  rect?: FloatRect
}

/** A floating frame that was moved, resized, or raised to the front. */
export interface FrameChange {
  /** A panel of the frame that changed — the one on top of its tabs. */
  panel: string
  rect: FloatRect
}
