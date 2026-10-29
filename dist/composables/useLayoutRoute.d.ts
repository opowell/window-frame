import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue';
import type { WindowNode } from '../window/types';
/**
 * What the layout needs of a route: the search it reads and rewrites, the path
 * a pop-out's link is built on, and the router's own `href` for one where it
 * has it. Any route adapter with these members can be passed as it is.
 */
export interface LayoutRouteAdapter {
    /** Current search string including the leading `?`, or `''` when empty. */
    readonly search: Ref<string>;
    /** Current path, which a pop-out's link keeps. */
    readonly path: Ref<string>;
    /** Navigate, replacing the current history entry. */
    replace(search: string): void;
    /** The `href` the browser would load for a search, where the router knows better than the path. */
    href?(search: string): string;
}
export interface UseLayoutRouteOptions {
    /**
     * The route the layout is written to. Give it the same adapter as the
     * `DataShell` in the window — provided under `ROUTE_ADAPTER_KEY`, or passed
     * as its `route` — so each sees the other's parameters and keeps them: two
     * adapters over one address bar each write from a search the other has
     * since changed.
     */
    adapter: LayoutRouteAdapter;
    /** The query parameter the layout is held in. `w` by default. */
    param?: string;
    /**
     * The layout the window opens with. While the window is in it the parameter
     * is left out, so an untouched window has the URL it had before, and a URL
     * that loses the parameter — back to before anything was opened — goes back
     * to it.
     */
    home?: MaybeRefOrGetter<WindowNode | null | undefined>;
    /**
     * Milliseconds a change waits before it is written. A splitter dragged
     * across the screen is a change per frame, and browsers refuse a page that
     * rewrites its address that fast.
     */
    delay?: number;
    /**
     * The query parameter that marks a window popped out of another, holding
     * nothing but the panel it was popped out for. `solo` by default.
     */
    soloParam?: string;
}
export interface LayoutRoute {
    /** Writes a change still waiting out {@link UseLayoutRouteOptions.delay} now. */
    flush(): void;
    /**
     * The address of this page opened on one panel and nothing else: no panels
     * beside it, no space around it, and no bar over it — the browser window it
     * opens in is what names it. The rest of the URL is kept as it is, so what
     * the panel was showing it shows there too.
     *
     * It is the URL for {@link openPopOut}, or for `WindowFrame`'s `popOut`, and
     * the window it opens is {@link solo}.
     */
    popOutHref(panel: string): string;
    /**
     * Whether this window was popped out of another — opened at a
     * {@link popOutHref} — and so holds only the panels its layout names. Pass it
     * to `WindowFrame`'s `solo`: a window that adds the host's other panels back
     * beside the one it was opened for is the whole window again.
     */
    solo: ComputedRef<boolean>;
}
/**
 * Holds a window's layout in the URL: which panels are open, how they are
 * arranged and which tab is on top, so a reload — or a link someone was sent —
 * opens the window as it was.
 *
 * The layout is read from the URL once, now, and again whenever the parameter
 * changes under it (back and forward); every change to the layout is written
 * back, replacing the current history entry rather than adding one — moving a
 * splitter is not somewhere to go back to. Call it before the window renders,
 * so the first layout drawn is the URL's.
 *
 * The URL names panels, not what is in them: a host whose panels come and go
 * (a record opened beside a list) re-creates them from the ids in the layout,
 * which `panelIds(layout.value)` lists once this has run.
 */
export declare function useLayoutRoute(layout: Ref<WindowNode | null>, options: UseLayoutRouteOptions): LayoutRoute;
