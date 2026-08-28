/**
 * Items the *content* of a panel puts in that panel's own menu.
 *
 * A panel's chrome belongs to the window, but plenty of what belongs in its
 * menu does not: how a table is showing its rows is the table's business, and
 * the window has no name for it. So the content says what it offers and the
 * pane it happens to be in picks the items up — the window still knowing
 * nothing about view types, and the host still not threading a menu prop
 * through every panel it declares.
 *
 * The pane context lives here because it exists to make that possible: content
 * is rendered through a slot, an arbitrary number of splits below the window,
 * and being told which panel it is in is the one thing it cannot work out.
 */
import { getCurrentScope, inject, onScopeDispose, provide, toValue } from 'vue'
import type { ComputedRef, InjectionKey, MaybeRefOrGetter } from 'vue'
import type { MenuItemDef } from '../menu/types'
import { WINDOW_CONTEXT_KEY } from './windowContext'

/** What the content of a pane is told about the pane it is rendered in. */
export interface PaneContext {
  /**
   * The panel this content belongs to. A pane renders only the tab on top, so
   * that is the panel — and it changes as the tabs do.
   */
  panel: ComputedRef<string>
}

export const PANE_CONTEXT_KEY: InjectionKey<PaneContext> = Symbol('dc.paneContext')

export function providePaneContext(context: PaneContext): PaneContext {
  provide(PANE_CONTEXT_KEY, context)
  return context
}

/**
 * The pane this content is rendered in, or `null` when it is not in one.
 * Unlike `useWindowContext` it returns rather than throws: the same component
 * serving a panel and a page is the ordinary case, not a wiring mistake.
 */
export function usePaneContext(): PaneContext | null {
  return inject(PANE_CONTEXT_KEY, null)
}

/**
 * Adds items to the menu of the panel this content is in, for as long as the
 * content is on screen. Returns the function that takes them away again, for
 * content that wants to stop sooner; leaving the screen does it anyway.
 *
 * `items` is read each time the menu is built, so pass a getter or a computed
 * and the items say what is true *now* — a tick beside the view the content is
 * actually showing, an option disabled while it would do nothing:
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
export function usePaneMenu(items: MaybeRefOrGetter<MenuItemDef[]>): () => void {
  const win = inject(WINDOW_CONTEXT_KEY, null)
  const pane = inject(PANE_CONTEXT_KEY, null)
  if (!win || !pane) return () => {}

  const stop = win.registerMenu(
    () => pane.panel.value,
    () => toValue(items),
  )
  if (getCurrentScope()) onScopeDispose(stop)
  return stop
}
