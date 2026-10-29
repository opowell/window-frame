/**
 * Popping a panel out: opening it in a browser window of its own.
 *
 * What the new window shows is the host's — it is a page, and only the host
 * knows the address of a page showing one of its panels (`useLayoutRoute`'s
 * `popOutHref` builds one for a window whose layout is in the URL). What this
 * does is the part every host would otherwise write the same way: open that
 * address as a *window* rather than as a tab, the size of the pane it came out
 * of, standing where that pane stood on the screen.
 */
/** Where the new window goes and how big it is, in screen pixels. */
export interface PopOutRect {
    width: number;
    height: number;
    /** From the left of the screen. Left out, the browser places it. */
    left?: number;
    /** From the top of the screen. Left out, the browser places it. */
    top?: number;
}
/**
 * The window a pane would pop out to: the pane's own size and place, carried
 * from the page onto the screen. The page's offset on the screen is the
 * browser window's position plus whatever chrome is above the page, which is
 * the difference between its outer and inner height.
 */
export declare function popOutRect(element: Element | null | undefined): PopOutRect | undefined;
/**
 * Opens `href` in a new browser window — a window, not a tab: the `popup`
 * feature is what asks for one — sized and placed as `rect` says, or as large
 * as this one when it says nothing.
 *
 * Returns the new window, or `null` when the browser refused to open one (a
 * popup blocker, a call that was not in answer to a press). A host that takes
 * the panel out of this window once it is open in the other should check: a
 * refused popup leaves the panel nowhere.
 *
 * The new page is given no handle back on this one, as `rel="noopener"` would
 * — but by clearing it rather than by the `noopener` feature, which makes
 * `window.open` answer `null` whether or not it opened anything.
 */
export declare function openPopOut(href: string, rect?: PopOutRect): Window | null;
