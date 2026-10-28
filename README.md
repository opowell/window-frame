# window-frame

> **Pre-alpha.** Breaking changes go out freely, in any release, with no
> deprecation period and no migration path. Pin an exact tag, and read the
> diff before moving to the next one.

Panels in a recursively split grid for Vue 3 — tabbed, floating and draggable
where you want them, with the whole layout held as data.

Some screens are several things at once. `<WindowFrame>` arranges panels in a
grid you can nest as deep as you like, and — if you let it — rearrange by
dragging, the way an editor does.

```
┌───────────────────────────────┬──────────────────────────────┐
│ ⠿ Items  entity:items      ⋯ │ ⠿ Sources │Activity│ Log     │
│                               ├──────────────────────────────┤
│  01  Supplier directory   476 │  09:14:02 index rebuilt      │
│  02  Recall notice · rev 8 311│  09:14:44 scraper → 38 new   │
└───────────────────────────────┴──────────────────────────────┘
```

The arrangement is a tree. Every node is one of three things: a **split** — a
row or a column of further nodes — a **group**, one space shared by one or more
panels as tabs, or a **float**, a space its frames are placed over rather than
divide. Nesting a column inside a row is what makes an arbitrary grid
expressible without the component knowing anything about grids, and it means
the whole layout is data: it round-trips through JSON, can be stored per user,
and is the single thing a drag rewrites.

A lone panel is a group of one, so tabs are not a second thing the tree has to
describe — they are what a group of more than one looks like. A tab is usually
a panel; it can also be a whole space, which is what lets a desktop be tabbed
beside a pane without losing the windows on it (see **Tabs**).

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { WindowFrame, group, panelNode, row } from 'window-frame'
import type { WindowNode, WindowPanelDef } from 'window-frame'

const panels: WindowPanelDef[] = [
  {
    id: 'items',
    title: 'Items',
    subtitle: 'entity:items',
    // Declaring views puts them under *View* in this panel's menu.
    views: [
      { key: 'table', label: 'Table' },
      { key: 'cards', label: 'Cards' },
    ],
  },
  { id: 'sources', title: 'Sources' },
  { id: 'activity', title: 'Activity', subtitle: 'live' },
  { id: 'log', title: 'Log' },
]

const layout = ref<WindowNode>(
  // `panelNode` is a group of one; `group` gives several panels one space.
  row([panelNode('items'), group(['sources', 'activity', 'log'], 'activity')], [0.62, 0.38]),
)
</script>

<template>
  <!-- Like the shell, the window fills the box it is given. -->
  <div style="height: 100vh">
    <WindowFrame v-model:layout="layout" :panels="panels">
      <template #panel-items="{ view }">
        <ItemsTable :view="view" />
      </template>
      <template #panel-sources><SourceList /></template>
      <template #panel-activity><ActivityLog /></template>
      <template #panel-log><LogStream /></template>
    </WindowFrame>
  </div>
</template>
```

Leave `layout` out entirely and every panel goes in one row, which the first
drag replaces with a real tree.

## Install

```bash
npm install github:opowell/window-frame#v0.1.0
```

`vue` is a peer dependency. [`menu-bar`](https://github.com/opowell/menu-bar),
whose menus the panes open, and [`themes`](https://github.com/opowell/themes),
whose tokens everything resolves against, come with it.

## Stylesheets

Each package ships its own stylesheet and none carries another's, so a page
loads the tokens once and then the sheet of every package on it:

```ts
import 'themes/tokens.css'
import 'menu-bar/style.css'
import 'window-frame/style.css'
```

A window whose panels hold [appfr](https://github.com/opowell/appfr)'s shell
adds `appfr/style.css` beside them.

The window sets `container-type: inline-size` on itself, like every
`.dc-shell`, and fills the box it is given: give its container a height.


## What a panel contains

Anything. A panel is a title, some optional chrome, and a slot:

| Slot | Renders |
| --- | --- |
| `panel-<id>` | that panel's content |
| `panel` | content for any panel without a slot of its own |
| `actions-<id>` | extra controls at the right of that panel's header |
| `actions` | the same, for any panel without one |

Each receives `panel`, `view` and `active`, so one generic `#panel` slot can
serve every panel by switching on `panel.id`.

The header is one height — 36px — whichever tab is on top. Actions are
centred in it and have to fit it: a page-sized button there spills over the
strip's edge rather than growing the strip, which would make every switch to
or from that tab jump.

Only the panel on top of its group is rendered. A panel that needs to keep
something across tab switches — a scroll position, a half-typed filter — holds
it outside the slot, in the store or composable the slot reads from.

Some content cannot be held anywhere else: a page in an iframe, a live
connection, a form a person is halfway through. A panel can ask to be **kept
alive** instead:

```ts
{ id: 'preview', title: 'Preview', keepAlive: true }
```

It is then rendered once and stays mounted while another tab of its pane is on
top — hidden rather than torn down — and comes back with its scroll position.
Its slot is told `active: false` while it is hidden, and the items it put in
its menu stay in its own menu rather than the tab on top's. What it is kept by
is its pane: moved to another pane, or closed, it is rendered afresh there.

## Tabs

`group(['sources', 'activity', 'log'], 'activity')` puts three panels in one
space and shows the third; a third argument names that space, which the strip
then says in front of its tabs. The strip is an ARIA tablist: click a tab, or use
the arrow keys and Home/End, and the header's menu follows whichever panel is
on top. Which tab that is lives in the tree, so it is persisted and
restored with everything else.

A group of one has no tabs to switch between, so it does not draw any: it shows
the panel's title and subtitle, exactly as a window with no tabs anywhere
always did.

Dragging is how a group gains and loses tabs — the middle of a pane, or its
strip, joins it; an edge splits back out (see below).

**A tab can be a space.** `Tabs` is one of the four ways of showing a space,
and the other three all keep every pane that space holds: shown as a column, a
row is the same panes running the other way; shown as a desktop, the same
panes placed rather than dividing. So the panes of a space stop dividing it and share
one strip — and a **desktop** among them shares the strip whole, as one tab
named `Desktop`, because where each of its windows sits is something a user put
there rather than an arrangement the space was merely being drawn in.

```ts
group(['items', float(frames)])   // two tabs: Items, and the desktop
```

```
┌─────────┬───────────────┐        ┌──────────────────────── ⋯ ─┐
│         │  ┌────────┐   │  Tabs  │ Items │ Desktop │          │
│  items  │  │  log   │   │  ───▶  ├────────────────────────────┤
│         │  └────────┘   │        │  the desktop, its windows  │
└─────────┴───────────────┘        │  exactly where they were   │
  row(items, desktop)              └────────────────────────────┘
```

The strip is that space's only bar while its tab is on top, so it is that
space's bar: it says the space's name, and the menu on it is the space's own
four choices — the same thing a floating window's title bar does for a space
inside it. Choosing `Row` there tiles the desktop *within* its tab; choosing
`Tabs` empties it into the strip, which is the one way its windows become tabs
beside the panes. Everything else inside the tab belongs to the space: its
windows still move, resize, maximize and take drops, and a panel dropped on its
bare desktop becomes a window there.

Panes are only ever an arrangement of the space they are in, so they flatten
however deep they were — a row holding a column of panes is one strip of all of
them. The two splits that are spaces in their own right are not: one that
remembers the desktop it was tiled from carries the way back in its `places`,
and one the host named, or drew `headless` or `fixedView`, has said something
about *that* bar. Each becomes a tab, like a desktop.

A space tab is not a panel, so it is not dragged out of the strip and has no
close: what closes is a panel, and closing the last panel of a space is what
takes its tab away. A strip left holding one space is that space, exactly as a
split of one child is that child.

## Floating windows

A **float** is the third kind of node: its children are not divided out of a
space, they are placed over it. Each frame carries its own position and size,
and their order is a stacking order — the last one is on top.

```
┌─ Desktop ──────────────────────────────── ⋯ ─┐
│  ┌── Items ─────────────┐                    │
│  │ 01  Supplier direct… │── Activity ──────┐ │
│  │ 02  Recall notice  ─┼┤ 09:14:02 index   │ │
│  └─────────────────────┘│ 09:14:44 scraper │ │
│                         └──────────────────┘ │
└──────────────────────────────────────────────┘
```

The desktop is a **panel** in its own right: the same border and header a pane
has, because it is the same kind of thing — [a space that holds
panels](#spaces-and-the-menu-on-them). Its bar is where its menu is, and it
says `Desktop` unless the float is given a `title` of its own. A float has no
tab to take a name from, and the window in front of it is the wrong one to
borrow: it changes every time one is touched.

```ts
import { cascade, float, frame, group, panelNode } from 'window-frame'

const layout = ref<WindowNode>(
  float(
    [
      frame(panelNode('items'), { x: 24, y: 24, w: 460, h: 300 }),
      // A frame holds whatever a node can hold — tabs, or a grid of its own.
      frame(group(['sources', 'log']), { x: 300, y: 150, w: 380, h: 260 }),
    ],
    'Workspace', // what its title bar says; `Desktop` when left out
  ),
)

// Or, for a desktop written as what is on it rather than as coordinates:
const stepped = cascade([panelNode('items'), panelNode('sources')], { w: 420, h: 260 })
```

`frame` fills in anything it is not told from `DEFAULT_FRAME`, so a position or
a size alone is enough.

A window drags by its title bar — the part of the tab strip that is not a
tab. With `resizable`, it resizes from any of its eight edges and
corners: the dragged edge follows the pointer and the opposite one stays put.
Both keep the window inside the space it floats over and no smaller than
`minPanelSize`, and Escape mid-drag puts it back. Touching a window anywhere
brings it to the front.

The keyboard gets there too, through the same grip a tiled pane has:

| Key | In a floating window |
| --- | --- |
| an arrow | moves the window 16px that way |
| shift and an arrow | resizes it from the bottom-right corner |
| Escape | puts it down |

A window holding a single group takes its title from the tab on top. One
holding a *grid* has no such tab, so it gets a title bar of its own — which is
also the unambiguous place to take hold of it. What that bar says comes from
`nodeTitle`: a group is named after the tab on top, a split after its first
pane, a float after the window in front. A frame can override it with a `title`
of its own.

## Maximizing

A window fills its float from the button in its title bar or from a
double-click on that bar, and goes back the same two ways. Neither is in a
menu: both are buttons in the very header a menu would open from.

The rect is never overwritten while a window is maximized: it *is* the place it
restores to. So the whole state is one flag in the layout, it survives being
stored and read back, and there is nothing to remember on the side.

```ts
const maxed = maximizeFrame(layout, 'items')   // fills its float
isMaximized(frameOf(maxed, 'items')!)          // true
maximizeFrame(maxed, 'items', false)           // exactly the frame it was
toggleMaximized(layout, 'items')               // whichever it is not
```

Maximizing raises the window too, since one filling its float has to be in
front of what it covers. While it is maximized it offers no resize grips and
will not be dragged — there is nowhere for it to go, and a drag that did
nothing would be worse than one that is not offered. The arrow keys say so
rather than moving it.

`frame-maximize({ panel, maximized })` is emitted either way.

## Minimizing

A window rolls up to its title bar and docks along the bottom of its float —
there is no taskbar, because the bar it rolls up to *is* what you unroll it
from.

```
┌──────────────────────────────────────────────┐
│              ┌── Activity ───────┐           │
│              │ 09:14:02  index   │           │
│              └───────────────────┘           │
│  ┌─ Items ─────── — ▢ ┐┌─ Sources ── — ▢ ┐   │
└──┴────────────────────┴┴─────────────────┴───┘
```

Rolled-up windows sit left to right in the stable order the float renders in —
so raising one moves it up the stack without shuffling the dock — and wrap onto
a second row when they run out of width.

Like maximizing, it leaves the rect alone, so unrolling puts the window back
exactly where it was. The two are exclusive: a window is filling its float, or
rolled up out of the way, or neither, and asking for one clears the other.

```ts
minimizeFrame(layout, 'items')          // rolled up
toggleMinimized(layout, 'items')        // whichever it is not
isMinimized(frameOf(layout, 'items')!)
```

Every window grows a title bar while it is rolled up, since the tab strip that
would otherwise have been its title has rolled away with the rest — and that
bar carries the buttons to unroll it, maximize it, and close it. What rolled
away stays in the DOM, so a window comes back with its scroll position and
whatever else the host put in it.

`frame-minimize({ panel, minimized })` is emitted either way.

Raising a window keeps everything inside it — scroll positions, open menus,
whatever the host rendered. The stack is `z-index` over a render order that
never changes, rather than a DOM order that matches it.

Because a float is a node, floating and tiled arrangements mix: put one in a
split and half the window tiles while the other half is a desktop. Dragging a
window's *tab* out onto a tiled pane docks it into the grid; dragging a tiled
panel onto a window tabs it in. An edge drop inside a window splits that
window, which keeps its place on the desktop.

Dropping a panel on a float's **bare desktop** — anywhere no window covers —
makes it a window of its own, which is the fifth thing a drop can mean:

| Dropped on | Result |
| --- | --- |
| an edge of a pane | splits that pane and takes half of it |
| the middle of a pane | joins that pane as a tab, on top |
| a tab strip | joins it at that position in the strip |
| bare desktop | becomes a floating window there |
| a space with nothing in it | fills it — a window on a desktop, the one pane in a row or a column |

That is how a panel becomes floating without the host rewriting the layout:
drag a tab out of a window and drop it on the desktop beside it, and it keeps
the size of the window it came from. A tiled panel dropped there floats too.
Holding **Alt** mid-drag leaves this as the only drop there is, which is what
moves a window about its desktop without it docking into whatever it passes
over — see [Moving panels](#moving-panels).
The pure operation behind it is `floatPanel(layout, panel, near, rect)`, where
`near` is any panel already on the float — a drop names the desktop by
something on it. A desktop with *nothing* on it has nothing to be named by, so
that drop names the space by where it is instead: `dropIntoSpace(layout, panel,
path, rect?)` — see [a space with nothing in it](#a-space-with-nothing-in-it).

A float has to exist for there to be a desktop to drop on: a host supplies one
in the layout, or builds one with the exported operations. The panel menu that
would switch a pane into a float from nothing is not built yet.

## Spaces, and the menu on them

A node that holds panels is a **panel itself**: a row, a column and a desktop
each draw the same border and the same header a pane does, with a title bar
saying what the space is and a menu of its own on it.

```
┌─ Row ─────────────────────────────────────────────────── ⋯ ─┐
│ ┌─ Items  entity:items ────── ⋯ ─┐┌─ Column ───────── ⋯ ─┐  │
│ │  01  Supplier directory    476 ││ ┌─ Sources ───────┐  │  │
│ │  02  Recall notice · rev 8 311 ││ ├─ Activity ──────┤  │  │
│ └────────────────────────────────┘└──────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

That menu is the one appfr called *display*: how this space shows what is in
it. The four choices are the menu itself rather than an item that opens them —
short enough to read at a glance, and nothing in front of any one of them.

| Shown as | What it does |
| --- | --- |
| Row | the panes in this space run across |
| Column | they run down |
| Tabs | they stop dividing the space and share it — a desktop among them as one tab of its own |
| Desktop | they float over it instead, on a desktop of their own |

Whichever is already true is ticked, and that tick is the whole of the answer:
none of the four is ever hidden, and none of them is ever greyed out. A display
mode greyed out reads as one the space is not allowed to be shown in, which is
the opposite of what a ticked one says — so all four stay where they are, and
choosing one that is already true does nothing.

**A pane of host content offers none of this.** What is in it is content, not
panels, so it has nothing to arrange and nothing to say about the space around
it — that space has a bar of its own to say it from. A pane with **tabs** is
the exception, and not really an exception: a strip of tabs *is* a container of
panels, so its menu is about the tabs in it.

A space held by a floating window draws no second bar inside it: the window's
own title bar is that space's, menu and all.

**A window is named by where it is.** A pane names the frame it is in with a
panel of its own, and the innermost frame holding that panel is the answer — a
float nested inside a frame owns the panels on it more closely than the frame
around them does. A window holding a *desktop* cannot speak that way: every
panel on that desktop is a panel of the window too, so a panel would name one of
the windows inside it, and dragging the bar would move one of them instead. Its
own chrome says where it is — the path it was rendered at, exactly as a space's
bar does for its menu. `frameAt`, `setFrameRectAt`, `maximizeFrameAt`,
`minimizeFrameAt` and `raiseFrameAt` are the path-addressed operations behind
it; `framePathOf` turns a panel into the path of the frame it names, and
`raisedPath` says where a path lands once that frame has been raised, since
raising one is what moves it in the list a path indexes.

Maximize, minimize and close are buttons rather than menu items, for the same
reason: each would sit in a menu opened from the header the button is already
in. With those gone a pane of host content has nothing left to put in a menu
but the views its panel declares — and one that declares none shows no menu
button at all, which is the point: a button that opens nothing but what is next
to it is worse than none.

The three sit together in a group of their own — `.dc-controls`, each button
`.dc-control` — written in one order and drawn wherever the theme wants them.
The marks inside are SVG paths on a shared grid rather than characters, so
their weight does not follow whatever typeface the theme is wearing. That is
what lets `theme="macos"` put traffic lights at the left of the bar, in the
order a Mac uses, and `theme="windows"` run flat buttons into the top right
corner — out of exactly the same markup.

**Every panel sits in a space, the last one included.** A split of one child is
collapsed into that child everywhere else in the model — so an ordinary row is
a lone pane as soon as everything but the last panel has been closed, and that
pane would have nowhere left to be told to float from. `rootSpace` is the one
exception: a lone pane at the root of the layout keeps a row of one around it.
A group of *tabs* is a space already and is left exactly as it is.

```ts
rootSpace(panelNode('items'))       // row([panelNode('items')])
rootSpace(group(['a', 'b']))        // the group it was given, untouched
```

On a space of one pane, "Row", "Column" and "Tabs" all describe what is already
on screen — which is exactly why none of them greys out. Three of the four
going dim at once would read as a menu with one choice left in it, while every
one of the four was perfectly true of that space; the tick says which, and
"Desktop" is the only one that moves anything.

What a space is called is `Row`, `Column` or `Desktop` — how it is shown, which
is what the menu beside the name switches between — unless the node carries a
`title` of its own:

```ts
row([panelNode('items'), sidebar], [0.6, 0.4], 'Workspace')
float(frames, 'Workspace')
group(['sources', 'activity'], undefined, 'Workspace')
```

A name is something said about *that* space, so a named one is kept whole: it
is neither flattened into a space of the same direction around it nor collapsed
into its only child, the way `headless` and `fixedView` are kept. Otherwise a
name would hold only while the shape happened to stay distinguishable from its
parent's — one pane dragged out of `Workspace` and the space would be gone,
name and bar and all, with nothing on screen to say why.

### A space with nothing in it

Down to the last pane. Drag everything out of a named space and the space is
still there: an empty desktop, or an empty row, with its name on its bar and
its share of the room around it. A space the host named is a place rather than
a container, so it outlives what was in it — and a name that lasted exactly as
long as the last pane in it would be the same disappearing act one step later.

The way back is the other half of that. A drop into a space holding nothing has
no panel there to land against, so it names the space by the path it is
rendered at:

```ts
dropIntoSpace(layout, 'notes', [1])                        // the one pane of a row or column
dropIntoSpace(layout, 'notes', [1], { x: 24, y: 24, w: 320, h: 240 })  // a window on a desktop
```

The drag does it for you — carry a panel over an empty space and the whole of
it lights up, there being no edge in it to land on one side of. `removePanel`
and `normalizeLayout` both keep the space, so a layout that round-trips through
storage comes back with it.

A **strip** is the one shape this does not apply to: what says a strip's name
is its tabs, so a strip with none has no bar left to say anything on and
nothing to drop into. An empty group goes, as it always did — which makes
"Tabs" the one of the four an empty space cannot be shown in, so choosing it
leaves the space as it was rather than taking it away.

**And it survives all four shapes.** A row, a column and a desktop each draw a
header of their own to say the name on; a strip has none — its tabs already say
what is on it — so a named strip says the name in front of them, with a rule
between the two. Without that, "Tabs" would be the one of the four that lost
what the space was: the name first, and the space with it, since a space with
nothing said about it is dissolved into the one around it as soon as it is
spread back out.

```
┌─────────────────────────────────────────────────────────┐
│ Workspace │ Sources │ Activity │                    ⋯   │
├─────────────────────────────────────────────────────────┤
│  the tab on top                                         │
```

A strip carries `places` for the same reason a tiled row does: a desktop shown
as tabs and then as a desktop again puts every window back exactly where it
was. `space-names="false"` keeps the name out of the strip on a window too
narrow to spend width on it — the name is still in the layout, still what makes
that space a space of its own, and still said on the bar the moment it is shown
as a row, a column or a desktop.

Each of the four is a pure operation a host can call directly —
`setSplitDirection`, `collapseToTabs`, `toFloat`, `toTiled`, and `collapseSpace`
/ `tileFloat` / `floatSplit` for a space it already has in hand — so the same
four choices can come from a command palette or a keyboard shortcut instead. `:menu="false"`
takes them away, from a space's bar as well as a pane's; `paneMenu` extends
what a pane offers:

```vue
<WindowFrame
  :panels="panels"
  :pane-menu="(panel, items) => [...items, { separator: true }, { label: `Reload ${panel.title}`, action: () => reload(panel.id) }]"
/>
```

## A space inside a space

A space holding one space is a bar drawn twice. Both are spaces, so both say
what they are called and both offer the same four choices — about the same
panes, since the content under the two of them was only ever the inner one's.

```
┌─ Workspace ──────────────────────┐
│ ┌─ Column ─────────────────────┐ │
│ │ ┌─ Sources ────────────────┐ │ │
│ │ ├─ Activity ───────────────┤ │ │
│ │ └──────────────────────────┘ │ │
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```

That pair is the only nesting the model keeps: a split of one child is
collapsed into that child, and a strip whose only tab is a space into that
space, so one that is still there is one the host meant — a space with a name,
a space that draws no bar, or one that remembers the desktop it was tiled from,
each of which is something collapsing it would lose.

Which leaves one question, and the menu on **either** bar asks it: which of the
two stays.

| Item | What it does |
| --- | --- |
| Keep *Workspace* | the outer bar stays, and the content arrives under its name, in the shape the inner space was holding it |

Nothing moves. The panes are the same panes, in the same order, at the same
sizes — the choice is only which of the two bars they are left under, which is
the only thing the two spaces ever said separately.

Only ever the merge that keeps every name there was. Keeping *Column* here
would leave the column and take *Workspace* with the bar that goes, and a name
is the one thing a space is proof against losing everywhere else in the model —
so that item is not offered, and a pair with a name on **both** bars offers
neither and stays a pair. `mergeSpace` still takes either half: a host that
means to drop a name can say so.

The items are headed by *which* pair they are about — *Around Column* on the
outer bar, *Inside Workspace* on the inner one — because a space can be the
inside of one pair and the outside of another, and "keep this space" means a
different thing in each.

`mergeSpace` is the operation and `onlySpace` the pair it acts on, so the same
choice can come from a palette or a shortcut:

```ts
const pair = row([column([panelNode('sources'), panelNode('activity')])], undefined, 'Workspace')

onlySpace(pair)            // the column
mergeSpace(pair, 'outer')  // that column, named Workspace
mergeSpace(pair, 'inner')  // that column, exactly as it was

onlySpace(row([a, b]))     // null — more than one child is an arrangement
```

Neither half is ever a **desktop**: its frames are windows placed over the
space rather than dividing it, so a desktop holding one window is a desktop
with a window on it and not a bar drawn twice. Nor is a lone **pane**, which is
content under a header rather than a space — the same distinction `rootSpace`
draws. A strip of two or more tabs is a space in its own right and counts.

## A space that offers less

`:menu="false"` says it for the whole window. Two fields say it per space, and
they are fields on the *node*, so they are part of the layout: they round-trip
through JSON with everything else, and survive a drop, a close and a change of
shape.

**`fixedView`** takes away the choice of how a space is shown. On a row, a
column or a desktop that is those four choices, and they are the whole of a
space's menu, so its bar keeps the name and shows no button at all. On a pane
it is the views it declares — and they are the whole of that pane's menu, so
its button goes too; on a pane of tabs it is the four again, and the items
about the tabs stay.

```ts
import { fixedView, headless } from 'window-frame'

fixedView(row([panelNode('items'), sidebar])) // a row, and only ever a row
fixedView(panelNode('items'))                 // on one view, and no choice
fixedView(group(['sources', 'log']))          // tabs that stay tabs
```

**`headless`** takes the bar itself. Everything on it goes with it: the name,
the tabs, the `actions` slot, the menu — the choice of view, the items the
content registered and the window's own — the close, and, where that bar was a
floating window's, the maximize and minimize buttons and the handle the window
was dragged by.

```ts
headless(panelNode('items'))                  // content, and nothing around it
headless(row([panelNode('items'), sidebar]))  // a space that draws nothing
```

Neither withholds anything the host cannot then do itself, which is the only
reason to say either:

| What was on the bar | How to set it instead |
| --- | --- |
| the view | `v-model:views`, or the exposed `setView(panel, view)` |
| how the space is shown | `setSplitDirection`, `collapseToTabs`, `collapseSpace`, `toFloat`, `toTiled` on `v-model:layout` |
| maximize, minimize | the exposed `toggleMaximize(panel)`, `toggleMinimize(panel)` |
| which tab is on top | the exposed `select(panel)` |
| close | dropping the panel from `panels`, as ever |

A headless space is a space like any other underneath: a panel can still be
dropped on its edges, a floating one still resizes from its edges and comes
forward when it is touched, and what it says survives every operation that
rewrites it — a row drawn without a bar is still without one once it is a
desktop. Two things follow from taking the bar away rather than hiding part of
it. A headless pane has no handle, so only the host moves it; and a headless
window rolled up has nothing left to read, so the host that rolled it up is
what unrolls it.

Both compose, with each other and with the builders:

```ts
headless(fixedView(panelNode('items')))
```

A strip drawn without a bar draws no tabs, so it keeps a pane of tabs put in
it as a pane, drawing its own strip, where an ordinary strip takes that pane's
tabs as its own; and a row, a column or a desktop on top of it draws its own
bar. That is how a host keeps *windows* apart and switches between them itself:
a headless strip whose tabs are each a window — a pane of tabs, a pane of one,
a grid — with the host's menu stepping between them.

```ts
headless(group([group(['browse', 'app']), panelNode('session')], 'session'))
```

## The root in a menu bar

The space at the root is the whole window, so its bar names what the
application around it already names, and its border is a second frame just
inside the window's. `:root-bar="false"` draws neither: the panes sit straight
in the window. That is a prop rather than `headless` on the node because the
root is rebuilt as panels come and go — a lone pane gets a row around it, a row
of one becomes its pane — and the prop holds through every one of them.

How the root is shown is then the host's to offer, and the window hands over
the menu that bar would have had: the exposed `rootMenu`, the four ways the
root can be shown with the one in force ticked — or, when the root is a strip of
tabs, the items its tabs' heading offers in a pane's menu, a strip of windows
whose tabs are all spaces included. It is a list of
`MenuItemDef`s, ready for a `<MenuBar>`:

```vue
<script setup lang="ts">
const frame = ref<InstanceType<typeof WindowFrame> | null>(null)
const menus = computed(() => [
  { label: 'Window', items: [{ label: 'Arrange', items: frame.value?.rootMenu ?? [] }] },
])
</script>

<template>
  <MenuBar :menus="menus" />
  <WindowFrame ref="frame" :panels="panels" :root-bar="false" />
</template>
```

## Items the content registers

Not everything that belongs in a pane's menu is the window's to know. How a
table is showing its rows is the table's business; the window has no name for
it, and the host would have to thread a menu prop through every panel it
declares to say so on its behalf. So the content says it itself:

```vue
<script setup lang="ts">
import { VIEW_KINDS } from 'appfr'
import { usePaneMenu } from 'window-frame'

const LABELS = { list: 'List', cards: 'Cards', grid: 'Grid', images: 'Images', table: 'Table', links: 'Links', preview: 'Preview' }
const view = ref('table')

usePaneMenu(() => [
  {
    id: 'view-type',
    label: 'View type',
    items: VIEW_KINDS.map((kind) => ({
      id: `view-${kind}`,
      label: LABELS[kind],
      checked: view.value === kind,
      action: () => (view.value = kind),
    })),
  },
])
</script>
```

The items land in the menu of whichever panel this content is rendered in —
the pane says which, so nothing has to be handed an id it has no way to know —
and leave again when it does. On a pane of host content that declares no
`views` they are the *whole* menu, since the window contributes nothing else to
one; anywhere else they come above the window's own, because what someone
opened the menu for is far more often what is in the pane than the pane
itself. `:menu="false"` does not take
them away either way: they were never the window's to withhold.

`items` is read every time the menu is built, so a getter or a computed says
what is true at that moment — the tick beside the view actually showing, a
label that follows what is under it. Nothing is pushed back up when it
changes.

Called outside a window it does nothing rather than failing, which is what lets
a component offer menu items without that deciding where it may be rendered:
the same table serves a panel and a page.

This is the other half of the views a panel declares in `views`. A panel whose
views the *window* should own says so in its definition and gets them under
**View** in its menu; a panel whose content owns them registers an item
instead, and needs no `views` at all. Both at once is two items in one menu for
the same thing, which is worth avoiding.

## Closing panels

Every panel has a close button — one per tab in a tabbed pane,
since a tab that is not on top is otherwise unreachable. The button and nothing
else: a `Close` item would sit in a menu opened from the header the cross is
already in. A panel that must stay says `closable: false` in its definition.

A pane of tabs has **Close all** in its menu, under the tabs' heading, since no
button does that. It sends `panel-close` once for each panel on the strip that
may be closed, and is left out when none may.

Closing is a **request**. The window emits `panel-close` and does nothing else:
`panels` belongs to the host, so dropping the panel from it is what actually
removes it, after which the layout reconciles around the gap.

```vue
<WindowFrame
  :panels="panels"
  @panel-close="(id) => (panels = panels.filter((panel) => panel.id !== id))"
/>
```

## Making panels

The window never creates a panel either, for the same reason. Adding one to
`panels` is the whole of it:

```ts
panels.value = [...panels.value, { id: 'note-1', title: 'Note' }]
```

Where it lands is `reconcileLayout`'s doing: on a grid it is appended as a
pane, and on a desktop it opens as a window stepped clear of the last. Neither
needs the layout to be rewritten, and a `v-model:layout` that was persisted
before the panel existed still renders.

The **Workbench** story is this end to end — a menu bar that makes and closes
panels while the window rearranges around them.

## The views a panel declares

A panel that declares `views` offers them under **View** in its own menu, and
the chosen key is handed to its content slot. The window never interprets it —
which is what lets the same choice drive a table, a chart, or something it has
never heard of.

They are in the menu rather than beside the name for two reasons: a header
carrying a switcher as well as a name, a subtitle, tabs and its buttons spends
most of a narrow pane on chrome, and the views a panel's *content* offers with
[`usePaneMenu`](#items-the-content-registers) were menu items already — one
question with two shapes. A submenu rather than items on the menu itself,
because the four ways of showing a space are already there, and two flat groups
of ticked choices read as one list of eight.

**The menu says which is which by naming them.** A pane's menu is about two
things at once — the panel on top, and the tabs it is one of — so each group
sits under a heading: the panel's own title over its views, and what the tabs
are called over the four shapes and the two steps along them. A strip the
layout named says that name; one it did not is *These tabs*. A space's own menu
names its two the same way, a level up: the space over the four shapes, and the
strip it is a tab of over the steps. A menu with one thing to be about — a pane
of host content offering nothing but its views — is named nothing at all, since
naming the only group there is says nothing the items under it did not.

```vue
<WindowFrame :panels="panels" v-model:views="views" @view-change="remember" />
```

`views` is a map of panel id to view key; a panel not in it shows its
`defaultView`, or the first view it declares. A space marked
[`fixedView`](#a-space-that-offers-less) shows the view it was set to and
offers no choice of it, which is how a host keeps the choice for itself without
taking the views away.

Content that already owns its view — held in its own query, say — can offer the
choice in the pane's menu instead of declaring `views` at all. See [items the
content registers](#items-the-content-registers).

The worked case is a table of items, driven from the panel's menu. Nothing
about it is window-specific — it is `useQueryState` and `useResults` provided
as a context for the bundled views to read, with the panel's chosen view
pushed into the query:

```ts
const adapter = createMemoryAdapter('?e=items')
const query = useQueryState({ schema, adapter })
const results = useResults({ source, query: query.query, schema, entity: query.entity, limit })

provideShellContext({ ...query, schema, rows: results.rows, /* … */ })

// The view the window is on is the query's view.
watch(() => props.view, (view) => query.setView(view), { immediate: true })
```

`<ResultsArea>` then renders whichever of the seven views that is. The full
version is in `stories/helpers.ts`, as `ItemsPanel`.

## Moving panels

A panel can be dragged by its header onto any other — any panel not marked
`fixed`. Where it lands is decided by which part of the target it is dropped on:

| Dropped on | Result |
| --- | --- |
| an edge | splits that pane and takes half of it |
| the middle | joins that pane as a tab, on top |
| the tab strip | joins it at that position in the strip |
| a float's bare desktop | becomes a floating window there |

A preview covers the space the panel would take before the button comes up —
over the strip it becomes an insertion mark between two tabs, over bare desktop
the outline of the window it would make — and Escape mid-drag calls it off. A panel marked `fixed` stays where it is while
everything around it moves.

**Alt** turns docking off for as long as it is held: no edge, no middle and no
tab strip is a target while it is down, so the only thing left to drop on is a
float's bare desktop. That is how a window is carried across the windows it
shares a desktop with without joining any of them — hold Alt and the pane under
the pointer stops offering itself, and let go of Alt and it offers again from
the same point, since a modifier moves no pointer. Held over the tiled half of
a window there is nothing to drop on at all, and the release puts the panel
back. The ghost being carried goes dashed to say so, and the window says it as
`data-dc-docking="false"` for a host that wants to say it some other way.

Alt rather than shift, which already means "into the pane that way, as a tab"
on the keyboard — the opposite of this; ctrl and a press is a secondary click on
macOS, and meta belongs to the platform.

Tabs move by the same three rules, which is what makes a tab and a pane the
same thing: drag a tab along its own strip to reorder it, into another pane to
move it there, or out to an edge to give it a pane of its own again. When the
last tab leaves a group, the group goes with it.

The same reach is available from the keyboard: each movable pane has a grip
that picks the panel on top up (`aria-pressed` says so), after which

| Key | Moves the panel |
| --- | --- |
| an arrow | one place that way — along its own tab strip first, then out of the group |
| shift and an arrow | into the pane that way, as a tab |
| Escape | nowhere; it puts the panel down |

Between two panes of one panel each, an arrow trades their places rather than
lifting the panel out and putting it back: that is the same order an edge drop
would give, while leaving every size in the window untouched — otherwise a
panel walked across the grid would leave a trail of resized panes behind it.
Every move is announced.

A [space with nothing in it](#a-space-with-nothing-in-it) is a place that way
like any other, and the one where both arrows mean the same thing: *beside*
what is there and *with* what is there are the same place when there is nothing
there, so shift is not refused — it has nothing extra to say. The move is
announced against the space, since there is no panel in it to announce it
against. A pane exactly as far away wins over an empty space, being the more
particular answer: an edge of it is somewhere to land, where the space is only
itself.

Dropping a panel where it already is, or on itself, is a no-op rather than a
history entry.

## Sizing

Every neighbouring pair gets a splitter: drag it, or focus it and use the arrow
keys (`role="separator"`, so a screen reader calls it what it is). `sizes` on a
split are relative, so `[3, 1]` and `[0.75, 0.25]` are the same window, and
anything unusable — the wrong length, all zeros — falls back to equal shares
rather than rendering nothing. `minPanelSize` is the pixel floor a drag stops
at; `:resizable="false"` holds every boundary where it is.

A floating frame reads the same two: `minPanelSize` is the smallest it may be
dragged to, and `:resizable="false"` takes its grips away while leaving it
movable. `clampRect` and `resizeRect` are the pure functions behind that, so
the arithmetic is testable without a DOM.

## The layout as data

`update:layout` is emitted whether or not you bind `:layout`, so persisting the
arrangement takes one handler:

```vue
<WindowFrame :panels="panels" @update:layout="(next) => save(JSON.stringify(next))" />
```

A stored layout is squared with the panels that actually exist before it is
rendered: leaves naming a panel that has gone are dropped, panels the layout
does not mention are appended, and one appearing twice is rebuilt in one place.
A layout saved last release cannot leave a hole in this one.

A layout whose root is a float gains new panels as new windows on it, stepped
clear of the last, rather than as a tiled pane wedged beside the desktop.

## The layout in the URL

`useLayoutRoute` holds a layout in one query parameter, so a reload — or a
link someone was sent — opens the window as it was left: which panels are
open, how they are split and sized, and which tab is on top.

```ts
import { createHistoryAdapter, ROUTE_ADAPTER_KEY } from 'appfr'
import { panelNode, row, useLayoutRoute } from 'window-frame'

const route = createHistoryAdapter()
provide(ROUTE_ADAPTER_KEY, route) // the DataShell in the window shares it
const home = () => row([panelNode('browse')])
const layout = ref(home())
useLayoutRoute(layout, { adapter: route, home })
```

```vue
<WindowFrame v-model:layout="layout" :panels="panels" />
```

- **One adapter for the page.** The shell's query and the layout are written
  through the same `RouteAdapter`, so each keeps the other's parameters. Two
  adapters over one address bar each write from a search the other has since
  changed, and drop what it wrote.
- **`home`** is the layout the window opens with. While the window is in it the
  parameter is left out, so an untouched window has the URL it always had, and
  Back to a URL without one goes back to it.
- **Replace, not push.** Moving a splitter is not somewhere to come back to, so
  changes replace the history entry, after `delay` ms (200 by default) — a
  splitter dragged across the screen is one write, not one per frame.
  Back and forward still move the layout when the URL they land on has one.
- **The URL names panels, not what is in them.** A host whose panels come and
  go — a record opened beside a list — has to declare them again from the ids
  the layout names: read `panelIds(layout.value)` after the call and rebuild
  `panels` from them. A panel the host no longer has is dropped as it is from
  any stored layout.
- **A mangled parameter is ignored**, not thrown: the window opens at `home`.

The parameter is `w` unless `param` says otherwise. Its value is
`encodeLayout(layout)`, a [Rison](https://github.com/Nanonid/rison)-style
notation that a query value carries without percent-escaping, and whose
compact form leaves out every default — a panel alone in its group is just
its id:

```
w=(r:!((g:!(browse),h:!t),(g:!('rec:1','rec:2'),a:'rec:2')),z:!(0.6,0.4))
```

`encodeLayout` and `decodeLayout` are exported for a host that keeps layouts
somewhere other than the URL; `decodeLayout` returns `null` for anything it
could not have written.

The operations behind all of this are exported and pure — `movePanel`,
`insertPanel`, `removePanel`, `swapPanels`, `moveTab`, `setActivePanel`,
`floatPanel`, `dropIntoSpace`, `setFrameRect`, `raiseFrame`, `frameOf`,
`clampRect`, `resizeRect`,
`setSplitDirection`, `collapseToTabs`, `collapseSpace`, `toFloat`, `toTiled`,
`spreadTabs`, `floatTabs`, and `spreadTabsAt`, `floatTabsAt` for a strip named
by its path (one whose tabs are all spaces has no panel tab to be named by),
`nodeTitle`, `frontPanel`, `activeTab`, `isPanelTab`, `panelTabs`, `tabPanels`,
`headless`, `fixedView`, `spaceChrome`,
`maximizeFrame`, `toggleMaximized`, `isMaximized`, `minimizeFrame`,
`toggleMinimized`, `isMinimized`,
`frameAt`, `framePathOf`, `setFrameRectAt`, `maximizeFrameAt`,
`minimizeFrameAt`, `raiseFrameAt`, `raisedPath`,
`normalizeLayout`, `reconcileLayout`, `resizeSplit` — so a host can rearrange a
window, move a floating frame, or switch a tab from a command palette, a menu,
or a test without going near the DOM.

## `<WindowFrame>`

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `panels` | `WindowPanelDef[]` | — | Required. Id, title, and optional subtitle, views, `fixed`, `closable` and `keepAlive`. |
| `layout` | `WindowNode \| null` | one row of every panel | `v-model:layout` to own the arrangement, tabs and their order included. |
| `views` | `Record<string, string>` | each panel's default | `v-model:views` — panel id to view key. |
| `resizable` | `boolean` | `true` | Lets the boundary between two panels be dragged, and floating windows be resized. |
| `minPanelSize` | `number` | `120` | Smallest a panel or a floating window may be resized to, in pixels. |
| `menu` | `boolean` | `true` | Whether the *window's* own menu items are offered — how a space is shown, a pane's tabs, its close. Items the content registered stay either way. |
| `spaceNames` | `boolean` | `true` | Whether a strip that *is* a named space says that name beside its tabs. Off, the name is kept in the layout and said on the bar of every other shape. |
| `rootBar` | `boolean` | `true` | Whether the space at the root draws a bar and a border. Off, the panes sit straight in the window and the root's menu is the exposed `rootMenu`, for a menu bar. |
| `paneMenu` | `(panel, items) => items` | — | Extends or replaces that menu, given the items it would have had: the content's own, then the window's. |
| `accent`, `tokens`, `theme` | | | The same three every `.dc-shell` component takes — see [themes](https://github.com/opowell/themes). |

**Events** — `panel-move({ panel, target, edge, index, rect })` after a panel
has been moved — `edge: 'float'` with a `rect` when it was dropped on bare
desktop, and a `space` path with no `target` when it was dropped into a space
that held nothing — `frame-change({ panel, rect })` after a floating window has been
moved or resized, `frame-maximize({ panel, maximized })`,
`frame-minimize({ panel, minimized })`, `panel-close(id)`
when a close button is pressed — the window has *not* removed it — `tab-select({ panel })`, `view-change({ panel, view })`,
`panel-activate(id)`, plus `update:layout` and `update:views`.

**Exposed** — `layout` (as rendered), `move(panel, target, edge, index?)` to
perform the same move a drag would, `select(panel)` to bring a tab to the top,
`float(panel, near, rect)` to lift a panel onto a float as a window,
`setRect(panel, rect)` to place a floating window, `setView(panel, view)` to put
a panel on one of its views, `raise(panel)` to bring one to the front,
`toggleMaximize(panel)` to fill the float with it, `toggleMinimize(panel)`
to roll it up, and `rootMenu`, the menu of the space at the root, for a host's
menu bar when `rootBar` is off.

## No build step

`dist/` is plain ES modules and one plain stylesheet. A working page is in
[`stories/no-build/`](stories/no-build): one `index.html` with an import map,
and a host written as SFCs — `WindowApp.vue` and two panels of its own — that
[vue3-sfc-loader](https://github.com/FranckFreiburger/vue3-sfc-loader)
compiles in the tab. The page checks itself and states the verdict across the
top; the **No Build** stories frame it.

## Development

```bash
npm install
npm run typecheck      # vue-tsc
npm run test:unit      # Vitest — the layout tree, and the layout in the URL
npm run test:e2e       # Playwright in Chrome Beta, against the real stories
npm run test           # both
npm run storybook      # http://localhost:6012
npm run build          # dist/ + declarations
```

**Vitest** covers the pure logic — the layout tree's every operation, and its
round trip through the URL. **Playwright** drives the real Storybook stories in
Chrome Beta: dragging, docking, floating, the menus, and the themes' window
controls. The stories fill their panels with appfr's shell, which is a
development dependency only.

The **No Build** stories load `dist/` over HTTP, so run `npm run build` first or
they cover the build before this one. Storybook runs on **6012**, beside
appfr's 6011.

## Releasing

There is no registry in the middle: a consumer names a tag of this repository
and gets `dist/` out of the tarball, which is why `dist/` is committed. So a
release is a tag, and `npm version` cuts it; `npm run release` publishes it:

```bash
git commit -m 'What changed'   # the work, without dist/
npm version minor              # lint, typecheck, build, test, commit, tag
npm run release                # git push origin main --follow-tags
```

`npm version` refuses a dirty tree, so the change lands as its own commit first
and the version commit carries only the bump and the artifacts it implies. The
push is its own command, run on purpose: everything before it can be undone
with a `git reset` and `git tag -d`, and a consumer can only name the tag once
it is on the remote.

Versions are pre-1.0 and the minor is where breaking goes. CI rebuilds on every
push and fails if the committed `dist/` is not what `src/` builds.
