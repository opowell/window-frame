import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { h } from 'vue'
import WindowFrame from '../src/components/WindowFrame.vue'
import {
  cascade,
  column,
  fixedView,
  float,
  frame,
  group,
  headless,
  panelNode,
  row,
} from '../src/window/layout'
import type { WindowPanelDef } from '../src/window/types'
import {
  ItemsPanel,
  paneList,
  paneLog,
  renderWindow,
  renderWorkbench,
  themeArgTypes,
} from './helpers'
import type { WindowStoryArgs, WorkbenchStoryArgs } from './helpers'

const meta = {
  title: 'Window / Panel Grid',
  component: WindowFrame,
  argTypes: {
    ...themeArgTypes,
  },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: [
          'Panels in a recursively split grid.',
          '',
          'The arrangement is a tree: every node is either a **split** — a row',
          'or a column of further nodes — or a **panel**. Nesting a column',
          'inside a row is what makes an arbitrary grid expressible without',
          'the component knowing anything about grids, and it means the whole',
          'layout is data a host can store and restore.',
          '',
          'A panel contains whatever the matching slot renders. When it',
          'declares views, they are offered under **View** in its own menu',
          'and the chosen one is handed to that slot — which is how the items',
          'panel below turns from a table into cards without the window',
          'knowing what either of those is.',
          '',
          'Panels can also share one space as **tabs**, which is all a group',
          'of more than one panel is. A group of one is a plain panel and',
          'reads as one.',
          '',
          'With `movable`, a panel can be dragged by its header onto any',
          'other: the four edges split that panel and take half of it, the',
          'middle joins it as a tab, and the tab strip itself takes a drop at',
          'a position. Keyboard users get the same reach from the grip —',
          'Enter picks the panel up, the arrow keys move it, and shift with an',
          'arrow makes it a tab of the panel that way.',
          '',
          'A **float** is the third kind of node: a space its frames are placed',
          'over rather than divide. Each frame carries its own position and',
          'size, drags by its title bar, resizes from any edge or corner, and',
          'comes to the front when it is touched — and holds whatever a node',
          'can hold, tabs and grids included. The desktop they float over is a',
          'panel too, with a title bar of its own.',
          '',
          'A drop on a float’s bare desktop makes the panel a window of its',
          'own, which is how one comes out of a tab strip and back onto the',
          'desktop without the host rewriting the layout.',
          '',
          'Anything that holds panels is a **panel itself**: a row, a column',
          'and a desktop each draw the same border and header a pane does, with',
          'a title bar saying what the space is.',
          '',
          'On that bar is a **menu** with the same four choices as a name: show',
          'these as a row, a column, one set of tabs, or a desktop they',
          'float over. Whichever is already true is ticked and cannot be',
          'taken, so the menu says the same thing wherever it is opened from.',
          '',
          'A pane of host content offers none of it — what is in it is content,',
          'not panels, so it has nothing to arrange and the space around it has',
          'a bar to say so from. A pane of **tabs** is the one exception, and',
          'hardly one: a strip of tabs is a container of panels, so its menu is',
          'about the tabs in it.',
          '',
          'A space can offer less. `fixedView` takes the choice of how it is',
          'shown away — the views on a pane, those four choices on a',
          'container — and `headless` takes its title bar entirely, with',
          'everything that was on it. Both leave what they took to the host,',
          'which is the only reason to say either.',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof WindowFrame>

export default meta

type Story = StoryObj<WindowStoryArgs>

const story = (args: WindowStoryArgs): Story => ({
  args,
  render: (storyArgs: WindowStoryArgs) => renderWindow(storyArgs),
})

/* ------------------------------------------------------------------ panels */

const ITEMS: WindowPanelDef = {
  id: 'items',
  title: 'Items',
  subtitle: 'entity:items',
  // The panel's own views, offered under *View* in its menu. What each key
  // means is the slot's business.
  views: [
    { key: 'table', label: 'Table' },
    { key: 'list', label: 'List' },
    { key: 'grid', label: 'Grid' },
    { key: 'cards', label: 'Cards' },
  ],
  defaultView: 'table',
}

/** The same panel declaring no views: its content offers the view type instead. */
const ITEMS_NO_VIEWS: WindowPanelDef = { id: 'items', title: 'Items', subtitle: 'entity:items' }

const SOURCES: WindowPanelDef = { id: 'sources', title: 'Sources', subtitle: '24 scrapers' }
const ACTIVITY: WindowPanelDef = { id: 'activity', title: 'Activity', subtitle: 'live' }
const NOTES: WindowPanelDef = { id: 'notes', title: 'Notes' }
const LOG: WindowPanelDef = { id: 'log', title: 'Log', subtitle: '184k lines' }

const CONTENT: WindowStoryArgs['content'] = {
  items: (view) => h(ItemsPanel, { view }),
  sources: () =>
    paneList([
      ['Hacker News', 'news.ycombinator.com', 'ok'],
      ['RSS bridge', 'rss.example.dev/feed', 'running'],
      ['Supplier directory', 'example.com/eu', 'queued'],
      ['Regulatory filings', 'sec.example.gov', 'review'],
      ['Recall notices', 'recalls.example.org', 'failed'],
    ]),
  activity: () =>
    paneLog([
      '09:14:02  index rebuilt in 4.2s',
      '09:14:44  scraper hacker-news → 38 new',
      '09:15:10  price rule matched 12 items',
      '09:15:11  digest queued for 17:00',
      '09:16:38  scraper rss-bridge → 0 new',
      '09:17:02  recall notice · rev 2 stored',
    ]),
  notes: () =>
    paneLog([
      'Anything can go in a panel.',
      'The window renders the slot and',
      'stays out of the way.',
    ]),
  log: () =>
    paneLog([
      'level=info   msg="index rebuilt"        took=4.2s',
      'level=info   msg="scraper finished"     new=38',
      'level=warn   msg="rule slow"            rule=price',
      'level=error  msg="fetch failed"         host=sec.example.gov',
      'level=info   msg="digest queued"        at=17:00',
    ]),
}

/* ----------------------------------------------------------------- stories */

/**
 * The default. Given no layout, every panel goes in one row — three panels,
 * three columns, and a boundary between each pair that can be dragged.
 */
export const Default = story({
  panels: [ITEMS, SOURCES, ACTIVITY],
  content: CONTENT,
})

/**
 * The worked case: a table of items, with the views the panel declares under
 * *View* in its own menu. Choosing one swaps the renderer inside that one
 * panel and touches nothing else in the window.
 *
 * In the menu rather than beside the name: a header carrying a switcher as
 * well as a name, a subtitle, tabs and its buttons spends most of a narrow
 * pane on chrome — and the views a panel's *content* offers with `usePaneMenu`
 * were menu items already, so one question had two shapes.
 */
export const ItemsTable = story({
  panels: [ITEMS, SOURCES, ACTIVITY],
  // A row whose second child is a column: the shape a tree gives you for free.
  layout: row([panelNode('items'), column([panelNode('sources'), panelNode('activity')])], [0.62, 0.38]),
  content: CONTENT,
})

/** The same window with the panel already on a different view. */
export const ItemsAsCards = story({
  panels: [{ ...ITEMS, defaultView: 'cards' }, SOURCES, ACTIVITY],
  layout: row([panelNode('items'), column([panelNode('sources'), panelNode('activity')])], [0.62, 0.38]),
  content: CONTENT,
})

/**
 * `movable`: drag a panel by its header onto another. The four edges split
 * that panel and take half of it; the middle joins it as a tab.
 */
export const Movable = story({
  panels: [ITEMS, SOURCES, ACTIVITY, NOTES],
  layout: row(
    [panelNode('items'), column([panelNode('sources'), panelNode('activity'), panelNode('notes')])],
    [0.6, 0.4],
  ),
  movable: true,
  content: CONTENT,
})

/**
 * Panels sharing one space as tabs — a group of more than one. The strip is a
 * tablist: click a tab, or use the arrow keys, and the menu follows whichever
 * panel is on top — items offers its views there, the others declare none.
 *
 * Drag a tab onto the strip to reorder it, into another panel's middle to move
 * it there, or out to an edge to split it back into its own pane.
 */
export const Tabs = story({
  panels: [ITEMS, SOURCES, ACTIVITY, LOG],
  layout: row(
    [panelNode('items'), group(['sources', 'activity', 'log'], 'activity')],
    [0.58, 0.42],
  ),
  movable: true,
  content: CONTENT,
})

/** Every panel in one pane: a window can be nothing but tabs. */
export const TabsOnly = story({
  panels: [ITEMS, SOURCES, ACTIVITY],
  layout: group(['items', 'sources', 'activity']),
  movable: true,
  content: CONTENT,
})

/** Tabs at any depth of the grid, mixed with panes that have none. */
export const TabsAndSplits = story({
  panels: [ITEMS, SOURCES, ACTIVITY, LOG, NOTES],
  layout: column(
    [
      row([group(['items', 'notes']), group(['sources', 'log'], 'log')], [0.62, 0.38]),
      panelNode('activity'),
    ],
    [0.68, 0.32],
  ),
  movable: true,
  content: CONTENT,
})

/**
 * A panel marked `fixed` stays where it is while everything around it moves —
 * for the one panel a screen is *about*. Sources here cannot be dragged and
 * cannot be traded places with.
 */
export const FixedPanel = story({
  panels: [ITEMS, { ...SOURCES, fixed: true }, ACTIVITY],
  movable: true,
  content: CONTENT,
})

/** Four levels of nesting, to show that the depth is not the component's business. */
export const DeepNesting = story({
  panels: [ITEMS, SOURCES, ACTIVITY, NOTES],
  layout: column(
    [
      row([panelNode('items'), column([panelNode('sources'), panelNode('activity')])], [0.7, 0.3]),
      panelNode('notes'),
    ],
    [0.72, 0.28],
  ),
  movable: true,
  content: CONTENT,
})

/** Uneven shares. Sizes are relative, so `[3, 1]` and `[0.75, 0.25]` are the same window. */
export const UnevenSplit = story({
  panels: [ITEMS, ACTIVITY],
  layout: row([panelNode('items'), panelNode('activity')], [3, 1]),
  content: CONTENT,
})

/**
 * A window of one panel: nothing to resize, and one boundary-free pane.
 *
 * It still sits in a **space** — the bar above it — because the four choices
 * are a space's, and a pane of host content offers none of them. Without one
 * the last panel in a window would have nowhere to be told to float from, and
 * that is not an exotic state: closing everything but the last panel of an
 * ordinary row arrives at it. Three of the four have nothing to do here and
 * say so; **Desktop** is the one that has somewhere to go.
 */
export const SinglePanel = story({
  panels: [ITEMS],
  content: CONTENT,
})

/** With `resizable` off the boundaries hold, and the panels are unreachable by drag. */
export const Fixed = story({
  panels: [ITEMS, SOURCES],
  resizable: false,
  content: CONTENT,
})

/** The light palette. The window takes the same tokens as the shell. */
export const Light = story({
  panels: [ITEMS, SOURCES, ACTIVITY],
  layout: row([panelNode('items'), column([panelNode('sources'), panelNode('activity')])], [0.62, 0.38]),
  theme: 'light',
  movable: true,
  content: CONTENT,
})

/** Themed with a single seed, exactly as the shell is. */
export const Accented = story({
  panels: [ITEMS, SOURCES, ACTIVITY],
  accent: 'oklch(0.8 0.16 340)',
  movable: true,
  content: CONTENT,
})

/** At less than the full page: the window fills the box it is given. */
export const Embedded = story({
  panels: [ITEMS, ACTIVITY],
  inset: true,
  movable: true,
  content: CONTENT,
})

/* ------------------------------------------------------------------ floats */

/**
 * The float: windows placed over a space rather than dividing it.
 *
 * Drag a window by its title bar to move it, or by any edge or corner to
 * resize it — it is kept inside the desktop and never squeezed below
 * `minPanelSize`. Touching a window brings it to the front, and that stacking
 * order is part of the layout, so it is stored and restored with everything
 * else.
 *
 * Without a pointer the grip does the same: Enter picks the window up, the
 * arrow keys move it, and shift with an arrow resizes it.
 */
export const Floating = story({
  panels: [ITEMS, SOURCES, ACTIVITY],
  layout: float([
    frame(panelNode('items'), { x: 24, y: 24, w: 460, h: 300 }),
    frame(panelNode('sources'), { x: 300, y: 150, w: 380, h: 260 }),
    frame(panelNode('activity'), { x: 150, y: 280, w: 420, h: 220 }),
  ]),
  movable: true,
  content: CONTENT,
})

/**
 * The same desktop wearing each operating system's window controls. A Mac's
 * are traffic lights at the left of the bar, led by close and carrying their
 * marks only while the pointer is over them; Fluent's are wide flat buttons
 * flush into the corner, with a close that reddens under the pointer. Both are
 * the same three buttons in the same markup — the theme decides where they sit
 * and what they look like.
 */
export const FloatingOnMacos = story({
  panels: [ITEMS, SOURCES, ACTIVITY],
  layout: float([
    frame(panelNode('items'), { x: 24, y: 24, w: 460, h: 300 }),
    frame(panelNode('sources'), { x: 300, y: 150, w: 380, h: 260 }),
    frame(panelNode('activity'), { x: 150, y: 280, w: 420, h: 220 }),
  ]),
  theme: 'macos',
  movable: true,
  closable: true,
  content: CONTENT,
})

export const FloatingOnWindows = story({
  panels: [ITEMS, SOURCES, ACTIVITY],
  layout: float([
    frame(panelNode('items'), { x: 24, y: 24, w: 460, h: 300 }),
    frame(panelNode('sources'), { x: 300, y: 150, w: 380, h: 260 }),
    frame(panelNode('activity'), { x: 150, y: 280, w: 420, h: 220 }),
  ]),
  theme: 'windows',
  movable: true,
  closable: true,
  content: CONTENT,
})

/**
 * `cascade` places a list of nodes stepping down and across from one another,
 * so a desktop can be written as what is on it rather than as a set of
 * coordinates.
 */
export const FloatingCascade = story({
  panels: [ITEMS, SOURCES, ACTIVITY, NOTES],
  layout: cascade(
    [panelNode('items'), panelNode('sources'), panelNode('activity'), panelNode('notes')],
    { w: 420, h: 260 },
  ),
  movable: true,
  content: CONTENT,
})

/**
 * A frame holds whatever a node can hold. Here one window is a group of tabs
 * and another is a split grid of its own — with its own draggable boundary,
 * inside a box that itself moves and resizes.
 */
export const FloatingTabsAndGrids = story({
  panels: [ITEMS, SOURCES, ACTIVITY, LOG, NOTES],
  layout: float([
    frame(group(['sources', 'log'], 'sources'), { x: 32, y: 32, w: 400, h: 280 }),
    frame(column([panelNode('items'), panelNode('activity')], [0.6, 0.4]), {
      x: 280,
      y: 180,
      w: 440,
      h: 340,
    }),
    frame(panelNode('notes'), { x: 120, y: 400, w: 320, h: 180 }),
  ]),
  movable: true,
  content: CONTENT,
})

/**
 * Floating and tiled in one window: a float is a node, so it sits in a split
 * beside panes that divide their space as usual. Dragging a window's *tab* out
 * of the desktop docks it into the grid; dragging a panel from the grid onto a
 * window tabs it in.
 *
 * Dropping a panel on the **bare desktop** — anywhere no window covers — makes
 * it a window of its own instead. That is how a tab comes back out of a group
 * as a floating window, keeping the size of the one it came from.
 *
 * Holding **Alt** mid-drag turns docking off, leaving the bare desktop as the
 * only thing there is to drop on: carry *Activity* over *Notes* with Alt down
 * and it moves about **Right** rather than joining the strip it is passing
 * over. The ghost goes dashed while it is held.
 *
 * Four panels here, at two depths, in two spaces this layout named: **Top**
 * is the row holding items and the desktop, **Right** the desktop holding the
 * three windows. Each draws a title bar of its own, and each carries the four
 * choices in a menu of its own. Left unnamed they would say how they are
 * shown — *Row* and *Desktop* — which is what the menu beside the name
 * switches between.
 *
 * A name is something said about *that* space, so it survives every shape the
 * space is left in: tile **Right** across and drag a window out of it and the
 * space is still there, named, holding what is left. An unnamed row would be
 * flattened into the row around it at that point, since the two would be
 * indistinguishable on screen.
 *
 * On the desktop's bar that is about the desktop only: showing it as a column
 * stacks its three windows in the desktop's half of the screen and leaves
 * items with the other half to itself. The desktop is not gone, just tiled —
 * the split it became keeps every window's place, so choosing **Desktop**
 * again puts all three back exactly where they were. On the row's bar it is
 * about the row, which is why tiling the desktop never sweeps items in.
 *
 * **Tabs** on the row's bar is the same promise kept a fourth way: the two
 * panes stop dividing the row and share one strip — *Items*, and *Right*.
 * The desktop is one tab rather than three, because its windows are the
 * desktop's rather than the row's, and they are exactly where they were when
 * its tab comes forward. That strip is then the desktop's only bar, so it is
 * the desktop's: the menu on it is the desktop's own four choices, and the way
 * back to a row is on the items tab beside it.
 *
 * None of the four panes offers anything but its own views — items declares
 * four, the other three declare none and so open no menu at all. Each holds
 * host content rather than panels of its own, so there is nothing for it to
 * arrange, and on the three windows maximize and minimize are already the two
 * buttons beside the name.
 */
export const FloatingBesideTiled = story({
  panels: [ITEMS, SOURCES, ACTIVITY, NOTES],
  layout: row(
    [
      panelNode('items'),
      float([
        frame(panelNode('sources'), { x: 20, y: 20, w: 300, h: 200 }),
        frame(panelNode('activity'), { x: 90, y: 170, w: 300, h: 220 }),
        frame(panelNode('notes'), { x: 40, y: 360, w: 260, h: 160 }),
      ],
      'Right'),
    ],
    [0.45, 0.55],
    'Top'
  ),
  movable: true,
  content: CONTENT,
})

/**
 * **Maximize and restore.** A window fills its float from the button in its
 * title bar, from a double-click on that bar, or from its menu — and goes back
 * where it was the same three ways.
 *
 * The rect is never overwritten while a window is maximized: it *is* the place
 * it restores to. So the state is one flag in the layout, it survives being
 * stored and read back, and there is nothing to remember on the side.
 *
 * A maximized window offers no resize grips and cannot be dragged: there is
 * nowhere for it to go, and a drag that did nothing would be worse than one
 * that is not offered at all.
 */
export const FloatingMaximize = story({
  panels: [ITEMS, SOURCES, ACTIVITY, NOTES, LOG],
  layout: float([
    frame(panelNode('items'), { x: 24, y: 24, w: 420, h: 280 }),
    frame(group(['sources', 'notes']), { x: 300, y: 140, w: 360, h: 240 }),
    // A window holding a grid has a title bar of its own to maximize from —
    // a grid of two, since a split of one is just that one.
    frame(column([panelNode('activity'), panelNode('log')]), { x: 120, y: 340, w: 400, h: 220 }),
  ]),
  movable: true,
  content: CONTENT,
})

/**
 * **Minimize.** A window rolls up to its title bar and docks along the bottom
 * of its float — no taskbar, because the bar itself is what you unroll it
 * from. Rolled-up windows sit left to right in a stable order and wrap onto a
 * second row when they run out of width.
 *
 * Like maximizing it leaves the rect alone, so unrolling puts the window back
 * exactly where it was, and the two states are exclusive: a window is filling
 * its float, or rolled up out of the way, or neither.
 *
 * What is rolled away stays in the DOM, so a window comes back with its scroll
 * position and anything else the host put in it.
 */
export const FloatingMinimize = story({
  panels: [ITEMS, SOURCES, ACTIVITY, NOTES, LOG],
  layout: float([
    frame(panelNode('items'), { x: 24, y: 24, w: 440, h: 300 }),
    frame(group(['sources', 'notes']), { x: 320, y: 90, w: 360, h: 240 }),
    frame(column([panelNode('activity'), panelNode('log')]), { x: 90, y: 200, w: 400, h: 220 }),
  ]),
  movable: true,
  closable: true,
  content: CONTENT,
})

/**
 * `resizable: false` holds every window at the size it was given while they
 * can still be moved and stacked; `movable: false` pins them entirely.
 */
export const FloatingFixedSize = story({
  panels: [ITEMS, SOURCES, ACTIVITY],
  layout: cascade([panelNode('items'), panelNode('sources'), panelNode('activity')], {
    w: 400,
    h: 260,
  }),
  movable: true,
  resizable: false,
  content: CONTENT,
})

/* ----------------------------------------------------- menus and closing */

const story2 = (args: WorkbenchStoryArgs) => ({
  args,
  render: (storyArgs: WorkbenchStoryArgs) => renderWorkbench(storyArgs),
})

/**
 * The space menu: how a space shows what is in it.
 *
 * Row, column, tabs and desktop are the four ways a set of sibling panes can
 * be arranged, and the menu switches between them at runtime. It is on the
 * title bar of the space it is about — the outer **Row** here, and the
 * **Column** holding sources and activity — because that space is a panel in
 * its own right, holding panels where a pane holds content.
 *
 * The one already true is ticked and cannot be taken, so the menu says the
 * same thing wherever it is opened from. Exactly one of the four is ever
 * ticked, since each space answers only for itself.
 *
 * None of the three panes offers any of it. Items, sources and activity each
 * hold host content rather than panels, so there is nothing for them to
 * arrange — items' menu is the four views it declares and nothing else, and
 * the two beside it declare none and open no menu at all. A pane of **tabs**
 * does have children, and keeps its own menu: see *Tabs*.
 */
export const PaneMenu = story({
  panels: [ITEMS, SOURCES, ACTIVITY],
  layout: row([panelNode('items'), column([panelNode('sources'), panelNode('activity')])], [0.62, 0.38]),
  movable: true,
  content: CONTENT,
})

/**
 * **The content puts items in the menu too.** The items panel here declares no
 * `views`, so the window puts no *View* in its menu — and the menu offers
 * *View type* all the same, because the table inside it asked for one with
 * `usePaneMenu`.
 *
 * That is the half of a pane's menu the window cannot write. Which view a
 * table is in is the table's state — held in that panel's own query, not in the
 * window's `views` — so the item that ticks it and the action that changes it
 * both come from the content. The window knows only that some items arrived
 * for a panel, and puts them above its own, since what someone opened the menu
 * for is far more often what is *in* the pane than the pane itself.
 *
 * The registration is read every time the menu is opened, so the tick follows
 * the view without anything being pushed back up. Outside a window the same
 * call does nothing, which is what lets a content component offer menu items
 * without that deciding where it may be rendered.
 */
export const ContentMenu = story({
  panels: [ITEMS_NO_VIEWS, SOURCES, ACTIVITY],
  layout: row([panelNode('items'), column([panelNode('sources'), panelNode('activity')])], [0.62, 0.38]),
  movable: true,
  content: { ...CONTENT, items: () => h(ItemsPanel, { ownMenu: true }) },
})

/**
 * `closable` gives every panel a close button — one per tab in a tabbed pane,
 * since a tab that is not on top is otherwise unreachable. The button and
 * nothing else: a *Close* item would sit in a menu opened from the very header
 * the cross is already in, which is the same reason maximize and minimize are
 * buttons rather than items.
 *
 * Closing is a *request*: the window emits `panel-close` and does nothing
 * else. Dropping the panel from `panels` is the host's — here a filter over
 * the list this story holds, which is why a reload brings every panel back.
 */
export const Closable = story({
  panels: [ITEMS, SOURCES, ACTIVITY, LOG],
  layout: row([panelNode('items'), group(['sources', 'activity', 'log'])], [0.6, 0.4]),
  movable: true,
  closable: true,
  content: CONTENT,
})

/**
 * `:menu="false"` takes every menu the window offers away, spaces included —
 * and with them the views a panel declares, which are the window's to offer.
 * Switching stays the host's, from `v-model:views`.
 */
export const NoPaneMenu = story({
  panels: [ITEMS, SOURCES, ACTIVITY],
  movable: true,
  menu: false,
  content: CONTENT,
})

/* --------------------------------------------------- fixed, and headless */

/**
 * **A space whose view is fixed.** The items panel declares all four views and
 * this one is on *Cards* — but the space holding it says the choice is not the
 * user's, so they are not offered. With them goes the whole of that pane's
 * menu, since its views were all of it, and the button that opened it.
 *
 * What it shows is unchanged: `views` still decides, from `v-model:views` or
 * the window's exposed `setView`. The panel beside it is an ordinary pane and
 * keeps its own header.
 */
export const FixedView = story({
  panels: [ITEMS, SOURCES, ACTIVITY],
  layout: row(
    [fixedView(panelNode('items')), column([panelNode('sources'), panelNode('activity')])],
    [0.62, 0.38],
  ),
  views: { items: 'cards' },
  movable: true,
  content: CONTENT,
})

/**
 * **A space shown one way, and only that way.** The row is `fixedView`, so its
 * title bar names it and offers nothing beside the name: no **Row**, **Column**,
 * **Tabs** or **Desktop**, and so no menu button at all, since those four
 * choices are the whole of a space's menu.
 *
 * The column inside it was not fixed and keeps its own, which is the point —
 * this is said per space rather than for the window, the way `:menu="false"`
 * would say it.
 */
export const FixedSpace = story({
  panels: [ITEMS, SOURCES, ACTIVITY],
  layout: fixedView(
    row([panelNode('items'), column([panelNode('sources'), panelNode('activity')])], [0.62, 0.38]),
  ),
  movable: true,
  content: CONTENT,
})

/**
 * **Tabs that stay tabs.** The same field on a group: the pane keeps its menu
 * — *Next tab* and *Previous tab* are about what is in it — and offers none of
 * the four, so these three cannot be spread into a row, a column or a desktop
 * from here.
 */
export const FixedTabs = story({
  panels: [ITEMS, SOURCES, ACTIVITY, LOG],
  layout: row(
    [panelNode('items'), fixedView(group(['sources', 'activity', 'log']))],
    [0.6, 0.4],
  ),
  movable: true,
  content: CONTENT,
})

/**
 * **A pane with no title bar.** `headless` takes the whole header away — the
 * name, the subtitle, the menu its views were chosen from, and the grip that
 * carried it — and leaves the content filling the pane.
 *
 * Everything that bar carried is set from outside now: the view from
 * `v-model:views`, where it sits from the layout. It is still a pane like any
 * other underneath, so a panel can still be dropped onto its edges.
 */
export const HeadlessPane = story({
  panels: [ITEMS, SOURCES, ACTIVITY],
  layout: row(
    [headless(panelNode('items')), column([panelNode('sources'), panelNode('activity')])],
    [0.62, 0.38],
  ),
  views: { items: 'cards' },
  movable: true,
  content: CONTENT,
})

/**
 * **A space with no title bar.** The same field on the row itself: the panes
 * inside keep their headers, and the space around them draws nothing — no
 * name, no menu, and none of the border a space usually draws around what it
 * holds.
 */
export const HeadlessSpace = story({
  panels: [ITEMS, SOURCES, ACTIVITY],
  layout: headless(
    row([panelNode('items'), column([panelNode('sources'), panelNode('activity')])], [0.62, 0.38]),
  ),
  movable: true,
  content: CONTENT,
})

/**
 * **A window with no title bar.** A floating frame's bar is the title bar of
 * whatever it holds, so a headless space held by one draws none — and the
 * maximize and minimize buttons, the menu and the drag handle go with it.
 *
 * That is what the field says: those are the host's to set, from
 * `toggleMaximize`, `toggleMinimize` and `v-model:layout`. The window can still
 * be resized from its edges and raised by clicking it, neither of which is
 * chrome. The log window beside it is ordinary, and keeps everything.
 */
export const HeadlessWindow = story({
  panels: [ITEMS, LOG],
  layout: float([
    frame(headless(panelNode('items')), { x: 24, y: 24, w: 400, h: 280 }),
    frame(panelNode('log'), { x: 452, y: 150, w: 300, h: 190 }),
  ]),
  views: { items: 'cards' },
  movable: true,
  content: CONTENT,
})

/* ------------------------------------------------------------- workbench */

/**
 * **Making panels.** The window never creates one: `panels` is the host's, and
 * the window only squares its layout against it.
 *
 * File ▸ New note pushes onto that array and nothing else — where the panel
 * lands is `reconcileLayout`'s doing. On a row it is appended as a pane; on a
 * desktop it opens as a window stepped clear of the last. Closing one filters
 * it back out in the `panel-close` handler, and the space it held is shared
 * out among what is left.
 *
 * The menu bar is `<MenuBar>` with the same data any menu here takes:
 * submenus, separators, disabled items, and a shortcut hint at the right.
 */
export const Workbench = story2({
  panels: [ITEMS, SOURCES],
  layout: row([panelNode('items'), panelNode('sources')], [0.6, 0.4]),
  content: CONTENT,
})

/**
 * The same workbench with a desktop instead of a grid. A panel made from the
 * menu opens as a new window, cascaded clear of the one before it.
 */
export const WorkbenchOnADesktop = story2({
  panels: [ITEMS, SOURCES],
  layout: cascade([panelNode('items'), panelNode('sources')], { w: 420, h: 280 }),
  content: CONTENT,
})

/** Every panel closed: a window with nothing in it says so rather than breaking. */
export const WorkbenchEmpty = story2({
  panels: [],
  content: CONTENT,
})
