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
import type { DropEdge, FloatFrame, FloatRect, FrameHandle, FramePlace, SplitDirection, SplitEdge, WindowFloat, WindowGroup, WindowNode, WindowSpace, WindowSplit, WindowTab } from './types';
export declare const isSplit: (node: WindowNode) => node is WindowSplit;
export declare const isGroup: (node: WindowNode) => node is WindowGroup;
export declare const isFloat: (node: WindowNode) => node is WindowFloat;
/** Where a frame goes when nothing says otherwise, and how far the next one is. */
export declare const DEFAULT_FRAME: FloatRect;
export declare const CASCADE_STEP = 28;
/** The smallest a floating frame may be dragged to, in pixels. */
export declare const MIN_FRAME = 120;
/**
 * A minimized window is rolled up to its title bar and docked along the bottom
 * of its float, so its size is the chrome's rather than anything it holds.
 */
export declare const MINIMIZED_WIDTH = 220;
export declare const MINIMIZED_HEIGHT = 38;
export declare const MINIMIZED_GAP = 6;
/** A group of one — a panel with no tabs beside it. */
export declare function panelNode(id: string): WindowGroup;
/** A group of tabs sharing one space — panels, and whole spaces beside them. */
export declare function group(panels: WindowTab[], active?: string, title?: string): WindowGroup;
/** True for a tab that is a panel rather than a whole space sharing the strip. */
export declare const isPanelTab: (tab: WindowTab) => tab is string;
/** A tab as a node: a panel tab is the group of one it already reads as. */
export declare const tabNode: (tab: WindowTab) => WindowNode;
/** The panels a tab holds — itself, or every panel in the space it is. */
export declare const tabPanels: (tab: WindowTab) => string[];
/** The panel tabs of a group, in strip order, spaces sharing it left out. */
export declare const panelTabs: (node: WindowGroup) => string[];
/**
 * True when a panel is a tab of this group itself, rather than a panel of a
 * space that shares its strip. The distinction is the whole of what a space tab
 * changes: a drop, a reorder and a close are about the strip, and a panel two
 * levels down inside one of its tabs is none of the strip's business.
 */
export declare const isTabOf: (node: WindowGroup, id: string) => boolean;
/** One frame of a float. Anything it is not told is taken from `DEFAULT_FRAME`. */
export declare function frame(node: WindowNode, rect?: Partial<FloatRect>): FloatFrame;
/** Frames overlapping one space, the last one on top. */
export declare function float(frames: FloatFrame[], title?: string): WindowFloat;
/**
 * Nodes as frames stepping down and across from one another, the way a desktop
 * opens windows — so a float can be written as a list of what is on it without
 * every frame having to be placed by hand.
 */
export declare function cascade(nodes: WindowNode[], start?: Partial<FloatRect>): WindowFloat;
export declare function split(direction: SplitDirection, children: WindowNode[], sizes?: number[], title?: string): WindowSplit;
/** Children laid out left to right. */
export declare const row: (children: WindowNode[], sizes?: number[], title?: string) => WindowSplit;
/** Children laid out top to bottom. */
export declare const column: (children: WindowNode[], sizes?: number[], title?: string) => WindowSplit;
/**
 * What a space says about its own bar, ready to be spread onto the node it
 * becomes.
 *
 * A space shown another way is the same space: a row a host drew without a
 * title bar is still without one once it is a desktop, one whose display was
 * fixed does not start offering to be changed for having changed, and a space
 * that was called something is called it in all four shapes — a named desktop
 * tiled across is a named row, collapsed is a named strip, and back again.
 */
export declare function spaceChrome(node: WindowNode): WindowSpace;
/**
 * The same space with no title bar of its own — everything that bar carried
 * being the host's to set instead. Composes with `fixedView`, and with any of
 * the builders above: `headless(row([...]))`.
 */
export declare const headless: <T extends WindowNode>(node: T) => T;
/**
 * The same space, shown the way it is shown, with nothing offered to change
 * it: no choice of view on a pane, no display choices on a container.
 */
export declare const fixedView: <T extends WindowNode>(node: T) => T;
/** The axis an edge drop splits along. */
export declare const axisOf: (edge: SplitEdge) => SplitDirection;
/** Panels in the order they are laid out, tabs included, depth first. */
export declare function panelIds(node: WindowNode): string[];
export declare function hasPanel(node: WindowNode, id: string): boolean;
/**
 * Which tab is on top, as a place in the strip.
 *
 * `active` names a panel — its own id for a panel tab, any panel inside it for
 * a space — rather than an index, so a strip that has been reordered still
 * shows what it was showing. Named rather than stored-and-trusted, because a
 * group whose active panel has been dragged out of it still has to show
 * something: the first tab, which is also what a layout that says nothing gets.
 */
export declare function activeTab(node: WindowGroup): number;
/**
 * The panel on top — `''` when the tab on top is a space rather than a panel,
 * which is a strip showing the desktop tabbed beside its panes. The panel a
 * *space* tab is showing is `frontPanel`'s answer, not this one's: what is on
 * top of this strip is not a panel at all.
 */
export declare function activePanel(node: WindowGroup): string;
/**
 * The panel a tab is showing: itself, or the one a space in it would be read
 * as — the tab on top of a group, the first pane of a split, the window in
 * front of a float. What a strip pins when it is rewritten, and what selecting
 * a space tab selects.
 */
export declare function frontPanel(tab: WindowTab): string;
/** The group a panel is a tab of, if the tree holds it at all. */
export declare function groupOf(node: WindowNode, id: string): WindowGroup | null;
/** Every group in the tree, in layout order. */
export declare function groups(node: WindowNode): WindowGroup[];
/** The floating frame a panel is in, or `null` when it is tiled rather than floating. */
export declare function frameOf(node: WindowNode, id: string): FloatFrame | null;
/**
 * Keeps a frame inside the space it floats over and no smaller than `min`,
 * rounded to whole pixels so a stored layout is not a drift of decimals.
 *
 * The size is settled before the position, so a frame too big for its float is
 * shrunk to fit rather than pushed off the far edge.
 */
export declare function clampRect(rect: FloatRect, bounds: {
    w: number;
    h: number;
}, min?: number): FloatRect;
/**
 * The rect a resize drag produces: the dragged edge follows the pointer and
 * the opposite one stays put, which is what makes a corner drag feel anchored.
 *
 * Dragging an edge past its opposite pins the frame at `min` rather than
 * turning it inside out — and pins it against the edge that was *not* moving,
 * so a frame squeezed from the left stops with its right edge where it was.
 */
export declare function resizeRect(rect: FloatRect, handle: FrameHandle, dx: number, dy: number, min?: number): FloatRect;
/**
 * Puts a floating frame somewhere else, or makes it another size. Returns the
 * tree it was given — identical — when the panel is not in a float at all, or
 * when the frame is already exactly there: a drag held against the edge of its
 * float then stops producing layouts rather than a new one per pointer move.
 */
export declare function setFrameRect(node: WindowNode, id: string, rect: FloatRect): WindowNode;
/** True when this frame fills its float rather than sitting in its rect. */
export declare const isMaximized: (held: FloatFrame) => boolean;
export declare function maximizeFrame(node: WindowNode, id: string, maximized?: boolean): WindowNode;
/** Maximizes a window, or restores it when it is maximized already. */
export declare function toggleMaximized(node: WindowNode, id: string): WindowNode;
/** True when this frame is rolled up to its title bar. */
export declare const isMinimized: (held: FloatFrame) => boolean;
export declare function minimizeFrame(node: WindowNode, id: string, minimized?: boolean): WindowNode;
/** Rolls a window up, or unrolls it when it is rolled up already. */
export declare function toggleMinimized(node: WindowNode, id: string): WindowNode;
/** The frame a path names, or `null` when no frame sits there. */
export declare function frameAt(layout: WindowNode, path: readonly number[]): FloatFrame | null;
/**
 * Where the frame a panel is in was rendered — the path of the innermost frame
 * holding it, which is the frame `frameOf` answers with. `null` when the panel
 * is tiled rather than floating, or is not in the tree at all.
 */
export declare function framePathOf(layout: WindowNode, id: string): number[] | null;
/** Puts the frame a path names somewhere else, or makes it another size. */
export declare function setFrameRectAt(layout: WindowNode, path: readonly number[], rect: FloatRect): WindowNode;
/** Fills the float with the frame a path names, or puts it back in its rect. */
export declare function maximizeFrameAt(layout: WindowNode, path: readonly number[], maximized?: boolean): WindowNode;
/** Rolls the frame a path names up to its title bar, or unrolls it. */
export declare function minimizeFrameAt(layout: WindowNode, path: readonly number[], minimized?: boolean): WindowNode;
/**
 * Brings the frame a path names to the front of the float it is on, and every
 * frame it sits inside to the front of theirs — touching a window brings the
 * pile it is in forward too.
 *
 * What is *inside* it is left alone, which is the difference from naming a
 * frame by a panel: raising a window that holds a desktop must not reorder the
 * windows on that desktop, since none of them was touched.
 */
export declare function raiseFrameAt(layout: WindowNode, path: readonly number[]): WindowNode;
/**
 * Where a path lands once the frame it names has been raised: last in every
 * pile along the way, because that is what raising a frame *is* — moving it to
 * the end of the list its path indexes. Taken from the tree before the raise,
 * so a drag can raise the window it has just picked up and go on addressing it.
 */
export declare function raisedPath(layout: WindowNode, path: readonly number[]): number[];
/**
 * Lifts a panel out of wherever it is and puts it on a float as a window of
 * its own — the move a drop on a float's bare desktop performs, and the one
 * way a panel becomes floating without the layout being rewritten wholesale.
 *
 * `near` is any panel already on that float, and names which desktop is meant.
 * Dropping a panel on the desktop it is already the only thing on is a no-op,
 * as is naming a panel that is not on a float.
 */
export declare function floatPanel(layout: WindowNode, panel: string, near: string, rect: FloatRect): WindowNode;
/**
 * Lifts a panel out of wherever it is and puts it into a space that holds
 * nothing — the one drop no panel can name, there being none in that space to
 * name it by, so the path it is rendered at names it instead.
 *
 * An empty space is one `staysEmpty` kept, and this is the way back into it:
 * the pane that emptied a named row can be dropped into that row again, and a
 * window onto the desktop it was dragged off. Without it the name would still
 * be there and be all that was left, which is half an answer.
 *
 * Taking the panel out and putting it down happen in one walk, because a path
 * is only true of the tree it was read from: lifting the panel out first can
 * collapse a space beside the one being dropped into, and every path past it
 * would then name something else.
 *
 * Anything that would be a no-op — a path naming no space, or one with a panel
 * in it already — hands back the layout it was given, identical.
 */
export declare function dropIntoSpace(layout: WindowNode, panel: string, path: readonly number[], rect?: FloatRect): WindowNode;
/**
 * Brings a panel's frame to the front of the float it is on. Returns the tree
 * it was given, identical, when it is already there — so a click on the frame
 * on top does not count as a change to the layout.
 */
export declare function raiseFrame(node: WindowNode, id: string): WindowNode;
/**
 * Shares that sum to 1, one per child. Anything unusable — missing, the wrong
 * length, negative, all zero — falls back to equal shares rather than throwing,
 * so a hand-written or hand-edited layout cannot reach an unrenderable state.
 */
export declare function normalizeSizes(count: number, sizes?: number[]): number[];
/** The normalized shares of a split's children. */
export declare const sizesOf: (node: WindowSplit) => number[];
/**
 * Where a space's children were as windows, when it still answers for them —
 * one place per child, or nothing at all. A split's children are its panes and
 * a strip's are its tabs, since both are shapes a desktop is shown in. A space
 * that was never a desktop has none, and one whose children have changed under
 * it has a list that no longer pairs with them, which is the same as having
 * none.
 */
export declare const placesOf: (node: WindowSplit | WindowGroup) => FramePlace[] | undefined;
/**
 * Collapses the shapes that are indistinguishable on screen: a split with one
 * child *is* that child, and a split nested inside a split of the same
 * direction is the same row — so it is flattened into its parent, its
 * children keeping their proportion of the share it held. A group that has
 * lost every tab is dropped, since there is nothing left to render — as is a
 * space of any kind that holds nothing, unless it is one `staysEmpty` keeps.
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
export declare function normalizeLayout(node: WindowNode): WindowNode;
/**
 * Takes a panel out of the tree. A group with other tabs keeps its space and
 * hands the top of the pile to the next tab along; a group that held nothing
 * else goes with it. Returns `null` when the last panel in the window goes —
 * an empty window is the caller's problem to render, not something to fake a
 * node for.
 *
 * A row, a column or a desktop the host said something about stays where it
 * is, empty: `staysEmpty` says why, and it is the same answer `normalizeLayout`
 * gives — the space a name is on outlives the panes that were in it.
 */
export declare function removePanel(node: WindowNode, id: string): WindowNode | null;
/**
 * Puts a panel beside an existing one, taking half of its group's space, or —
 * for a `center` drop — into that group as a tab.
 *
 * When the target already sits in a split running along the same axis as the
 * drop, the new panel joins it as a sibling; otherwise the target is replaced
 * by a two-child split of the new axis. That distinction is what stops a row
 * of panels from becoming a chain of nested pairs.
 */
export declare function insertPanel(node: WindowNode, id: string, targetId: string, edge: DropEdge, index?: number): WindowNode;
/**
 * Brings a panel's tab to the top of its group. Returns the tree it was given,
 * identical, when that tab is already on top — a caller comparing by reference
 * can tell a real change from a click on the tab already showing.
 */
export declare function setActivePanel(node: WindowNode, id: string): WindowNode;
/** Moves a panel's tab along its own strip, without leaving the group. */
export declare function moveTab(node: WindowNode, id: string, index: number): WindowNode;
/** Trades two panels' places, leaving the shape of the grid untouched. */
export declare function swapPanels(node: WindowNode, a: string, b: string): WindowNode;
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
export declare function movePanel(layout: WindowNode, panel: string, target: string, edge: DropEdge, index?: number): WindowNode;
/**
 * Flips the split a pane sits in between a row and a column — appfr's
 * "display: row" and "display: column", as an operation on the tree.
 *
 * A column turned into a row inside a row is the same row, so it is flattened:
 * the arrangement it describes is the one already on screen.
 */
export declare function setSplitDirection(layout: WindowNode, id: string, direction: SplitDirection): WindowNode;
/**
 * A space with everything in it sharing one strip: the panes as tabs, and the
 * desktops among them as tabs of their own. "Tabs", as a pure operation on a
 * space rather than on a pane inside it — `active` naming the panel the strip
 * should open on, if it is still in there.
 *
 * A strip of tabs is already this, so it comes back untouched.
 */
export declare function collapseSpace(node: WindowNode, active?: string): WindowNode;
/**
 * Puts everything in the container a pane sits in into one group, as tabs, with
 * this one on top. The panes stop dividing the space and share it; a desktop
 * among them shares it whole, as one tab — see `tabsOf`.
 */
export declare function collapseToTabs(layout: WindowNode, id: string): WindowNode;
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
export declare function spreadTabs(layout: WindowNode, id: string, direction: SplitDirection): WindowNode;
/**
 * `spreadTabs`, for the strip at a path rather than the one a panel is a tab of.
 *
 * A strip whose tabs are all spaces — windows, say, each a pane or a grid of its
 * own — has no panel tab to be found by: every panel on it is a tab of a pane
 * inside it. Its place in the tree still names it.
 */
export declare function spreadTabsAt(layout: WindowNode, path: readonly number[], direction: SplitDirection): WindowNode;
/**
 * Turns the tabs of a pane's group into windows of their own.
 *
 * A group that *is* a window on a float becomes several windows on that same
 * float: a desktop nested inside one of its own windows would be a stranger
 * thing than the tabs it replaced. Anywhere else the group becomes a float in
 * its place, each tab a window on it — which is how a tiled set of tabs turns
 * into a desktop.
 */
export declare function floatTabs(layout: WindowNode, id: string, rect?: Partial<FloatRect>): WindowNode;
/**
 * `floatTabs`, for the strip at a path rather than the one a panel is a tab of —
 * see `spreadTabsAt`. A strip that is a window's whole content becomes windows
 * on that same desktop, as there.
 */
export declare function floatTabsAt(layout: WindowNode, path: readonly number[], rect?: Partial<FloatRect>): WindowNode;
/**
 * The windows a split's panes were, put back where they were — or cascaded, if
 * this split never was a desktop and so has nowhere to put them back to.
 */
export declare function floatSplit(node: WindowSplit, rect?: Partial<FloatRect>): WindowFloat;
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
export declare function toFloat(layout: WindowNode, id: string, rect?: Partial<FloatRect>): WindowNode;
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
export declare function tileFloat(node: WindowFloat, direction: SplitDirection): WindowSplit;
export declare function toTiled(layout: WindowNode, id: string, direction?: SplitDirection): WindowNode;
/**
 * The one space a space holds, when what it holds is one space and nothing
 * else — or `null` when it holds panes, windows, or nothing of the kind.
 *
 * Two spaces arranged that way draw two bars over one content: the outer says
 * what it is called and offers its four choices, and the inner says what *it*
 * is called and offers the same four about the very same panes. Nothing else
 * in the model stays nested that way — `normalizeLayout` collapses a split of
 * one child into that child, and a strip whose only tab is a space into that
 * space — so a pair that survives is one the host meant: a space with a name,
 * a bar of its own to draw or not to, or the desktop it remembers being.
 *
 * A float is never either half of one. Its frames are windows placed over the
 * space rather than dividing it, so a desktop holding one window is a desktop
 * with a window on it, not a bar drawn twice.
 *
 * Nor is a lone *pane*, which is the same distinction `rootSpace` draws: what
 * is under a pane's header is content rather than panels, so a space holding
 * one is a space around a pane and not one wrapped around another. A group of
 * two or more tabs is a space in its own right and counts.
 */
export declare function onlySpace(node: WindowNode): WindowNode | null;
/**
 * Two nested spaces made one — `keep` saying which of the two bars is the one
 * that stays: `outer` for the space this is called on, `inner` for the space
 * it holds.
 *
 * What is *in* them is the same either way, because the inner space's children
 * were the only content the pair ever had between them. Only the chrome
 * differs, since chrome is the only thing the two of them said separately:
 * keep the outer and that content arrives under the outer's name, in the shape
 * the inner was holding it; keep the inner and the outer's bar goes, taking
 * what it said with it.
 *
 * ```
 * ┌─ Workspace ──────────────┐            ┌─ Workspace ──────────┐
 * │ ┌─ Column ─────────────┐ │  'outer'   │ ┌─ Sources ────────┐ │
 * │ │ ┌─ Sources ────────┐ │ │  ────────▶ │ ├─ Activity ───────┤ │
 * │ │ ├─ Activity ───────┤ │ │            │ └──────────────────┘ │
 * │ │ └──────────────────┘ │ │            └──────────────────────┘
 * │ └──────────────────────┘ │            ┌─ Column ─────────────┐
 * └──────────────────────────┘  'inner'   │ ┌─ Sources ────────┐ │
 *                               ────────▶ │ ├─ Activity ───────┤ │
 *                                         │ └──────────────────┘ │
 *                                         └──────────────────────┘
 * ```
 *
 * A space holding anything but one space comes back exactly as it was, the way
 * every operation here does when it has nothing to do.
 */
export declare function mergeSpace(node: WindowNode, keep: 'outer' | 'inner'): WindowNode;
/**
 * What a node is called. A group is named after the tab on top; a split and a
 * float have no title of their own, so they borrow one from the descendant a
 * user would say they were looking at — the first pane of a split, the window
 * in front of a float.
 */
/**
 * What a *space* is called on the bar it draws for itself.
 *
 * A container has no tab to take a name from, so it says how it is shown —
 * which is exactly what the menu beside the name switches between, and is
 * true of a space that was never given one rather than merely plausible. A
 * layout that names it wins.
 *
 * A strip is the one shape with nothing to say unnamed: its tabs already say
 * what is on it, and `Tabs` beside them would name the strip after the thing
 * the strip is. Named, it says the name — the same name it said as a row, as a
 * column and as a desktop.
 */
export declare function spaceTitle(node: WindowNode): string;
export declare function nodeTitle(node: WindowNode, titleFor: (id: string) => string | undefined): string;
/**
 * The node at a path of child indices from the root, if there is one. A float
 * is addressed the same way a split is: its frames are its children, in order.
 */
export declare function nodeAt(node: WindowNode, path: readonly number[]): WindowNode | null;
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
export declare function replaceAt(node: WindowNode, path: readonly number[], next: WindowNode): WindowNode;
export declare function setSizesAt(node: WindowNode, path: readonly number[], sizes: number[]): WindowNode;
/**
 * Moves the boundary between two neighbouring children, taking from one and
 * giving to the other so the rest of the split stays exactly where it is.
 * `min` is the smallest share either may be squeezed to; when there is not
 * room for both to have it, the pair is left alone.
 */
export declare function resizeSplit(sizes: number[], index: number, delta: number, min?: number): number[];
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
export declare function rootSpace(node: WindowNode): WindowNode;
export declare function defaultLayout(ids: readonly string[]): WindowNode | null;
/**
 * Squares a layout with the panels that actually exist: tabs naming a panel
 * that has gone are dropped, panels the layout does not mention are appended
 * as a new pane at the end, and a panel appearing twice is rebuilt in one
 * place. A stored layout therefore survives the panel list changing under it
 * rather than rendering holes.
 */
export declare function reconcileLayout(layout: WindowNode | null, ids: readonly string[]): WindowNode | null;
