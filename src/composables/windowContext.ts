import { inject, provide } from 'vue'
import type { ComputedRef, InjectionKey, Ref, VNode } from 'vue'
import type { MenuItemDef } from '../menu/types'
import type {
  DropEdge,
  FloatFrame,
  FloatRect,
  FrameGrip,
  WindowNode,
  WindowPanelDef,
} from '../window/types'

/** Where a dragged panel would land if it were released now. */
export interface DropTarget {
  /**
   * A panel of the group being dropped on — or, for a `float` drop, of the
   * float being dropped onto. Never the one being dragged.
   */
  panel: string
  edge: DropEdge
  /** The gap in that group's tab strip, when the strip is what is under the pointer. */
  index?: number
  /** The window it would become, when the drop is on a float's bare desktop. */
  rect?: FloatRect
}

/** The direction an arrow key moves a panel in keyboard move mode. */
export type MoveDirection = 'left' | 'right' | 'up' | 'down'

/**
 * What a pane and a split need from the window they are in.
 *
 * The layout is a tree, so the alternative is threading a dozen props and
 * callbacks down through however many splits deep a panel happens to sit —
 * which would make the depth of the tree part of every component's signature.
 * Provided once by `WindowFrame`.
 */
export interface WindowContext {
  /** The panel with this id, or `null` if the host no longer declares it. */
  panelFor(id: string): WindowPanelDef | null
  /** The view a panel is currently showing — `''` when it offers none. */
  viewFor(id: string): string
  setView(id: string, view: string): void

  movable: ComputedRef<boolean>
  resizable: ComputedRef<boolean>
  /** Smallest a pane may be dragged to, in pixels. */
  minPanelSize: ComputedRef<number>
  /** Whether a strip that is a named space says that name beside its tabs. */
  spaceNames: ComputedRef<boolean>

  /** The panel most recently focused or clicked into. */
  focused: Ref<string | null>
  /** The panel being dragged, or `null` when nothing is in flight. */
  dragging: Ref<string | null>
  dropTarget: Ref<DropTarget | null>
  /** The panel in keyboard move mode, moved with the arrow keys. */
  moving: Ref<string | null>
  /** The panel whose floating frame is being moved or resized. */
  framing: Ref<string | null>

  /** True when this panel can be picked up at all. */
  canMove(id: string): boolean
  focus(id: string): void
  /** Brings a panel's tab to the top of its group. */
  selectPanel(id: string): void
  /** Starts a drag from a pointer press on a pane's header. */
  beginDrag(id: string, event: PointerEvent): void
  /** Enters or leaves keyboard move mode. */
  toggleMoveMode(id: string): void
  /**
   * Moves a panel one place in a direction, in keyboard move mode. `join`
   * puts it into the neighbouring group as a tab instead of beside it.
   */
  nudge(id: string, direction: MoveDirection, join?: boolean): void

  /** Replaces the sizes of the split at this path. */
  setSizes(path: readonly number[], sizes: number[]): void

  /**
   * The floating frame this panel is in, or `null` when it is tiled. A pane
   * asks so it knows whether its header is a drag handle for the panel or a
   * title bar for the window around it.
   */
  frameOf(id: string): FloatFrame | null
  /** Moves or resizes the floating frame a panel is in, from a pointer press. */
  beginFrameDrag(id: string, event: PointerEvent, grip: FrameGrip): void
  /**
   * Moves a floating frame one step in a direction, in keyboard move mode.
   * `resize` makes it bigger or smaller from its bottom-right corner instead.
   */
  nudgeFrame(id: string, direction: MoveDirection, resize?: boolean): void
  /** Brings a floating frame to the front of the stack it is in. */
  raise(id: string): void
  /** True when this panel's floating frame is filling its float. */
  maximized(id: string): boolean
  /** Fills the float with this panel's window, or puts it back. */
  toggleMaximize(id: string): void
  /** True when this panel's floating frame is rolled up to its title bar. */
  minimized(id: string): boolean
  /** Rolls this panel's window up to its title bar, or unrolls it. */
  toggleMinimize(id: string): void

  /*
   * The same four, addressed by where a window is rather than by a panel in it.
   *
   * A window's own chrome asks this way, because a panel would name the wrong
   * frame: a window holding a desktop shares every panel with the windows on
   * that desktop, and the innermost frame holding one of them is one of *those*
   * windows. The path a frame was rendered at names it and nothing else — the
   * same reason `spaceMenu` and `setSizes` take one.
   */
  /** Moves or resizes the frame at this path, from a pointer press. */
  beginFrameDragAt(path: readonly number[], event: PointerEvent, grip: FrameGrip): void
  /** Brings the frame at this path to the front of the stack it is in. */
  raiseAt(path: readonly number[]): void
  /** Fills the float with the window at this path, or puts it back. */
  toggleMaximizeAt(path: readonly number[]): void
  /** Rolls the window at this path up to its title bar, or unrolls it. */
  toggleMinimizeAt(path: readonly number[]): void

  /**
   * The menu a pane offers: whatever the content inside it registered, then
   * how its space is shown, which tab is on top, and whether it can be closed.
   * The window's own half is built from what the layout actually allows, so an
   * option that would do nothing is offered as disabled rather than hidden.
   */
  menuFor(id: string): MenuItemDef[]
  /**
   * The menu the space at this path offers, rather than a panel's: a desktop's
   * four display modes, opened from the desktop's own title bar. Empty for
   * anything that is not a float, and while the window's own menu is off.
   */
  spaceMenu(path: readonly number[]): MenuItemDef[]
  /**
   * Adds items to a panel's menu on behalf of the content inside it, and
   * returns the function that takes them away again.
   *
   * Both arguments are read when the menu is built rather than stored, so the
   * panel a content sits in and the items it offers can each change without
   * registering again. `usePaneMenu` is how content calls this.
   */
  registerMenu(panel: () => string, items: () => MenuItemDef[]): () => void
  /** True when this panel offers a close button. */
  closable(id: string): boolean
  /** Asks the host to close this panel, by emitting `panel-close`. */
  close(id: string): void

  /** The host's content and header slots for a panel, already rendered. */
  renderContent(panel: WindowPanelDef, view: string, active: boolean): VNode[] | undefined
  renderActions(panel: WindowPanelDef, view: string, active: boolean): VNode[] | undefined

  /** The layout as rendered — reconciled against the panels that exist. */
  layout: ComputedRef<WindowNode | null>
}

export const WINDOW_CONTEXT_KEY: InjectionKey<WindowContext> = Symbol('dc.windowContext')

export function provideWindowContext(context: WindowContext): WindowContext {
  provide(WINDOW_CONTEXT_KEY, context)
  return context
}

/**
 * Reads the surrounding window. Throws rather than returning a hollow default,
 * because a pane rendered outside a window is a wiring mistake worth surfacing
 * where it happens.
 */
export function useWindowContext(): WindowContext {
  const context = inject(WINDOW_CONTEXT_KEY, null)
  if (!context) {
    throw new Error(
      '[header-content-layout] No window context found. Render this component inside <WindowFrame>.',
    )
  }
  return context
}
