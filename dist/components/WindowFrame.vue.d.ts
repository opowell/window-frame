import '../style/window.css';
import type { ShellTheme } from 'themes';
import type { MenuItemDef } from 'menu-bar';
import type { DropEdge, FloatRect, FrameChange, PanelMove, WindowNode, WindowPanelDef } from '../window/types';
type __VLS_Props = {
    /** The panels this window can show, in the order a default layout uses. */
    panels: WindowPanelDef[];
    /** Lets the boundary between two panels be dragged. */
    resizable?: boolean;
    /** Smallest a panel may be resized to, in pixels. */
    minPanelSize?: number;
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
    menu?: boolean;
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
    spaceNames?: boolean;
    /**
     * Whether the space at the root of the window draws a bar and a border of
     * its own.
     *
     * The root is the whole window, so its bar names a thing the application
     * around it already names — and the border around it is a second frame
     * just inside the window's. Off, the panes sit straight in the window, and
     * how the root is shown is the host's to offer instead: `rootMenu`, exposed,
     * is the menu that bar would have had, for a menu bar to carry.
     */
    rootBar?: boolean;
    /**
     * Extends or replaces the menu a pane offers, given the items it would
     * have had: the content's own, then the window's. Return them with yours
     * appended, or something else entirely.
     */
    paneMenu?: (panel: WindowPanelDef, items: MenuItemDef[]) => MenuItemDef[];
    /**
     * Where a panel pops out to: the address of a page showing that panel and
     * nothing else (`useLayoutRoute`'s `popOutHref` is one). A panel it gives
     * an address for has *Pop out to new window* in its menu, which opens that
     * address in a browser window of its own, the size of the pane, and emits
     * `panel-pop-out`. `null` or nothing leaves a panel where it is.
     *
     * The window does not take the panel out of itself: a host that wants it
     * gone once it is open elsewhere — a panel in two windows is two copies of
     * it — drops it from `panels` in answer to the event.
     */
    popOut?: (panel: WindowPanelDef) => string | null | undefined;
    /**
     * Holds the panels the layout names and no others. A window ordinarily puts
     * every one of `panels` somewhere, adding any the layout leaves out; one
     * popped out of another for a single panel (`useLayoutRoute`'s `solo`)
     * would get back everything it was popped out *from*.
     */
    solo?: boolean;
    /** Overrides the `--dc-accent` token. Shorthand for `tokens`. */
    accent?: string;
    /** Design tokens set on the window element — `{ '--dc-surface': '#101418' }`. */
    tokens?: Record<string, string>;
    /**
     * `minimal`, the default, is paper, ink and hairlines with nothing else
     * on; `mono-size` is that theme with every word set at one size and one
     * weight; `auto` follows the system setting; `macos` and `windows` wear
     * that system's design language and follow its scheme; `inherit` brings
     * no palette at all.
     */
    theme?: ShellTheme;
};
declare function setView(id: string, view: string): void;
declare function raise(id: string): void;
declare function toggleMinimize(id: string): void;
declare function toggleMaximize(id: string): void;
type __VLS_PublicProps = __VLS_Props & {
    /**
     * Both optionally controlled, the way `DataShell` treats its panel and pins:
     * bind `v-model:layout` to own the arrangement — to persist it per user, say —
     * or leave it alone and the window keeps it. `update:layout` is emitted either
     * way, so a host can listen without also having to supply the value.
     *
     * `null` means "no layout given": every panel goes in a row, and the first
     * drag replaces that with a real tree.
     */
    'layout'?: WindowNode | null;
    /** Chosen view per panel id. Absent falls back to the panel's own default. */
    'views'?: Record<string, string>;
};
declare const _default: import("vue").DefineComponent<__VLS_PublicProps, {
    /** The layout as rendered, reconciled against the current panels. */
    layout: import("vue").ComputedRef<WindowNode | null>;
    /** Moves a panel programmatically — the same operation a drag performs. */
    move(panel: string, target: string, edge: DropEdge, index?: number): void;
    /** Brings a panel's tab to the top of its group. */
    select(panel: string): void;
    /** Lifts a panel onto the float holding `near`, as a window of its own. */
    float(panel: string, near: string, rect: FloatRect): void;
    /** Puts a floating frame somewhere else, or makes it another size. */
    setRect(panel: string, rect: FloatRect): void;
    /**
     * Puts a panel on one of its views, the way its menu would — the way a pane
     * whose space fixed its view, or took its bar away, is switched at all.
     */
    setView: typeof setView;
    /**
     * The menu of the space at the root: how the whole window is shown. For a
     * host's menu bar, when `rootBar` takes away the bar it was on.
     */
    rootMenu: import("vue").ComputedRef<MenuItemDef[]>;
    /** Brings a floating frame to the front of its stack. */
    raise: typeof raise;
    /** Fills the float with a window, or puts it back where it was. */
    toggleMaximize: typeof toggleMaximize;
    /** Rolls a window up to its title bar, or unrolls it. */
    toggleMinimize: typeof toggleMinimize;
}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    "panel-move": (move: PanelMove) => any;
    "view-change": (change: {
        panel: string;
        view: string;
    }) => any;
    "panel-activate": (panel: string) => any;
    "tab-select": (selection: {
        panel: string;
    }) => any;
    "frame-change": (change: FrameChange) => any;
    "frame-maximize": (change: {
        panel: string;
        maximized: boolean;
    }) => any;
    "frame-minimize": (change: {
        panel: string;
        minimized: boolean;
    }) => any;
    "panel-close": (panel: string) => any;
    "panel-pop-out": (popped: {
        panel: string;
        href: string;
    }) => any;
    "update:layout": (value: WindowNode | null) => any;
    "update:views": (value: Record<string, string>) => any;
}, string, import("vue").PublicProps, Readonly<__VLS_PublicProps> & Readonly<{
    "onPanel-move"?: ((move: PanelMove) => any) | undefined;
    "onView-change"?: ((change: {
        panel: string;
        view: string;
    }) => any) | undefined;
    "onPanel-activate"?: ((panel: string) => any) | undefined;
    "onTab-select"?: ((selection: {
        panel: string;
    }) => any) | undefined;
    "onFrame-change"?: ((change: FrameChange) => any) | undefined;
    "onFrame-maximize"?: ((change: {
        panel: string;
        maximized: boolean;
    }) => any) | undefined;
    "onFrame-minimize"?: ((change: {
        panel: string;
        minimized: boolean;
    }) => any) | undefined;
    "onPanel-close"?: ((panel: string) => any) | undefined;
    "onPanel-pop-out"?: ((popped: {
        panel: string;
        href: string;
    }) => any) | undefined;
    "onUpdate:layout"?: ((value: WindowNode | null) => any) | undefined;
    "onUpdate:views"?: ((value: Record<string, string>) => any) | undefined;
}>, {
    menu: boolean;
    resizable: boolean;
    minPanelSize: number;
    spaceNames: boolean;
    rootBar: boolean;
    solo: boolean;
    theme: ShellTheme;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
export default _default;
