/*
 * The window controls' stylesheet is pulled in by `WindowFrame.vue` itself
 * rather than here: a CSS import from the type-bearing entry point ends up in
 * the emitted `.d.ts` as a module consumers cannot resolve. Built output
 * collects every rule into a single `style.css`.
 */

/* Components */
export { default as WindowFrame } from './components/WindowFrame.vue'
/* `WindowNode.vue`, the recursive node renderer, `WindowFloat.vue`, one frame
   of a float, and `WindowGlyph.vue`, the mark inside a window control, are
   implementation details of the frame — and their names belong to the tree
   types below. */
export { default as WindowPane } from './components/WindowPane.vue'

/* Window model */
export {
  activePanel,
  activeTab,
  axisOf,
  cascade,
  CASCADE_STEP,
  clampRect,
  collapseSpace,
  collapseToTabs,
  column,
  defaultLayout,
  DEFAULT_FRAME,
  dropIntoSpace,
  fixedView,
  float,
  floatPanel,
  floatSplit,
  floatTabs,
  floatTabsAt,
  frame,
  frameAt,
  frameOf,
  framePathOf,
  frontPanel,
  group,
  groupOf,
  groups,
  hasPanel,
  headless,
  insertPanel,
  isFloat,
  isGroup,
  isMaximized,
  isMinimized,
  isPanelTab,
  isSplit,
  isTabOf,
  maximizeFrame,
  maximizeFrameAt,
  mergeSpace,
  MIN_FRAME,
  MINIMIZED_GAP,
  MINIMIZED_HEIGHT,
  MINIMIZED_WIDTH,
  minimizeFrame,
  minimizeFrameAt,
  movePanel,
  moveTab,
  nodeAt,
  nodeTitle,
  normalizeLayout,
  normalizeSizes,
  onlySpace,
  panelIds,
  panelNode,
  panelTabs,
  raisedPath,
  raiseFrame,
  raiseFrameAt,
  reconcileLayout,
  removePanel,
  replaceAt,
  resizeRect,
  resizeSplit,
  rootSpace,
  row,
  setActivePanel,
  setFrameRect,
  setFrameRectAt,
  setSizesAt,
  setSplitDirection,
  sizesOf,
  spaceChrome,
  spaceTitle,
  split,
  spreadTabs,
  spreadTabsAt,
  swapPanels,
  tabNode,
  tabPanels,
  tileFloat,
  toFloat,
  toggleMaximized,
  toggleMinimized,
  toTiled,
} from './window/layout'
export type {
  DropEdge,
  FloatFrame,
  FloatRect,
  FrameChange,
  FrameGrip,
  FrameHandle,
  PanelMove,
  SplitDirection,
  SplitEdge,
  WindowFloat,
  WindowGroup,
  WindowNode,
  WindowPanelDef,
  WindowSpace,
  WindowSplit,
  WindowTab,
  WindowView,
} from './window/types'
export {
  provideWindowContext,
  useWindowContext,
  WINDOW_CONTEXT_KEY,
} from './composables/windowContext'
export type { DropTarget, MoveDirection, WindowContext } from './composables/windowContext'
export {
  PANE_CONTEXT_KEY,
  providePaneContext,
  usePaneContext,
  usePaneMenu,
} from './composables/paneMenu'
export type { PaneContext } from './composables/paneMenu'
export { useLayoutRoute } from './composables/useLayoutRoute'
export type {
  LayoutRoute,
  LayoutRouteAdapter,
  UseLayoutRouteOptions,
} from './composables/useLayoutRoute'
export { decodeLayout, encodeLayout } from './window/codec'
export { openPopOut, popOutRect } from './window/popOut'
export type { PopOutRect } from './window/popOut'
