import type { ComputedRef, InjectionKey, MaybeRefOrGetter } from 'vue';
import type { MenuItemDef } from 'menu-bar';
/** What the content of a pane is told about the pane it is rendered in. */
export interface PaneContext {
    /**
     * The panel this content belongs to. A pane renders only the tab on top, so
     * that is the panel — and it changes as the tabs do.
     */
    panel: ComputedRef<string>;
}
export declare const PANE_CONTEXT_KEY: InjectionKey<PaneContext>;
export declare function providePaneContext(context: PaneContext): PaneContext;
/**
 * The pane this content is rendered in, or `null` when it is not in one.
 * Unlike `useWindowContext` it returns rather than throws: the same component
 * serving a panel and a page is the ordinary case, not a wiring mistake.
 */
export declare function usePaneContext(): PaneContext | null;
/**
 * Adds items to the menu of the panel this content is in, for as long as the
 * content is on screen. Returns the function that takes them away again, for
 * content that wants to stop sooner; leaving the screen does it anyway.
 *
 * `items` is read each time the menu is built, so pass a getter or a computed
 * and the items say what is true *now* — a tick beside the view the content is
 * actually showing, a label that follows what is under it:
 *
 * ```ts
 * usePaneMenu(() => [
 *   {
 *     id: 'view-type',
 *     label: 'View type',
 *     items: VIEW_KINDS.map((kind) => ({
 *       id: `view-${kind}`,
 *       label: LABELS[kind],
 *       checked: view.value === kind,
 *       action: () => setView(kind),
 *     })),
 *   },
 * ])
 * ```
 *
 * Outside a window it does nothing rather than failing, so a content component
 * can offer its menu items without that deciding where it may be rendered.
 */
export declare function usePaneMenu(items: MaybeRefOrGetter<MenuItemDef[]>): () => void;
