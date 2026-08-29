import { describe, expect, it } from 'vitest'
import {
  activePanel,
  activeTab,
  cascade,
  CASCADE_STEP,
  clampRect,
  collapseSpace,
  collapseToTabs,
  column,
  DEFAULT_FRAME,
  defaultLayout,
  dropIntoSpace,
  fixedView,
  float,
  floatPanel,
  floatSplit,
  floatTabs,
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
  isMaximized,
  isMinimized,
  isPanelTab,
  isTabOf,
  maximizeFrame,
  maximizeFrameAt,
  mergeSpace,
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
  spreadTabs,
  swapPanels,
  tabPanels,
  tileFloat,
  toFloat,
  toggleMaximized,
  toggleMinimized,
  toTiled,
} from '../../src/window/layout'
import type {
  FloatRect,
  WindowFloat,
  WindowGroup,
  WindowNode,
  WindowSplit,
} from '../../src/window/types'

const asSplit = (node: WindowNode | null): WindowSplit => {
  if (!node || node.kind !== 'split') throw new Error('Expected a split')
  return node
}

const asGroup = (node: WindowNode | null): WindowGroup => {
  if (!node || node.kind !== 'group') throw new Error('Expected a group')
  return node
}

/**
 * A compact rendering of a tree's shape, sizes left out — `row(a, column(b,
 * c))`. Operations normalize sizes as they go, so asserting on whole objects
 * would mostly be asserting on arithmetic; shares are checked with `sizesOf`
 * where they are the point.
 */
const shape = (node: WindowNode | null): string => {
  if (!node) return 'empty'
  // A group of one is written as the panel itself; tabs are joined with `|`,
  // and the one on top is marked. A space sharing the strip is written in
  // brackets of its own, since a tab can hold a whole tree.
  if (node.kind === 'group') {
    const at = activeTab(node)
    return node.panels
      .map((tab, index) => {
        const drawn = isPanelTab(tab) ? tab : `(${shape(tab)})`
        return node.panels.length > 1 && index === at ? `[${drawn}]` : drawn
      })
      .join('|')
  }
  // A float is written back to front, each frame with where it sits.
  if (node.kind === 'float') {
    const frames = node.frames.map(
      ({ node: held, rect }) => `${shape(held)}@${rect.x},${rect.y} ${rect.w}x${rect.h}`,
    )
    return `float(${frames.join(', ')})`
  }
  return `${node.direction}(${node.children.map(shape).join(', ')})`
}

/** `row(a, column(b, c))` — the layout most of these cases start from. */
const grid = () => row([panelNode('a'), column([panelNode('b'), panelNode('c')])])

describe('panelIds', () => {
  it('lists panels in the order they are laid out', () => {
    expect(panelIds(grid())).toEqual(['a', 'b', 'c'])
  })

  it('finds a panel at any depth', () => {
    expect(hasPanel(grid(), 'c')).toBe(true)
    expect(hasPanel(grid(), 'd')).toBe(false)
  })
})

describe('normalizeSizes', () => {
  it('shares the space equally when told nothing', () => {
    expect(normalizeSizes(4)).toEqual([0.25, 0.25, 0.25, 0.25])
  })

  it('scales any set of weights to sum to one', () => {
    expect(normalizeSizes(2, [3, 1])).toEqual([0.75, 0.25])
  })

  it('falls back to equal shares rather than rendering nothing', () => {
    // Wrong length, all zero, and non-finite are each a hand-edited layout.
    expect(normalizeSizes(3, [1, 1])).toEqual([1 / 3, 1 / 3, 1 / 3])
    expect(normalizeSizes(2, [0, 0])).toEqual([0.5, 0.5])
    expect(normalizeSizes(2, [Number.NaN, Number.POSITIVE_INFINITY])).toEqual([0.5, 0.5])
    expect(normalizeSizes(2, [-4, -1])).toEqual([0.5, 0.5])
  })
})

describe('normalizeLayout', () => {
  it('collapses a split with a single child into that child', () => {
    expect(normalizeLayout(row([panelNode('a')]))).toEqual(panelNode('a'))
  })

  it('flattens a split nested in one of the same direction', () => {
    const nested = row([panelNode('a'), row([panelNode('b'), panelNode('c')])])
    expect(normalizeLayout(nested)).toEqual(
      row([panelNode('a'), panelNode('b'), panelNode('c')], [0.5, 0.25, 0.25]),
    )
  })

  it('keeps a nested split of the other direction', () => {
    expect(panelIds(normalizeLayout(grid()))).toEqual(['a', 'b', 'c'])
    expect(asSplit(normalizeLayout(grid())).children[1]).toMatchObject({ direction: 'column' })
  })

  it('leaves the panels themselves alone', () => {
    expect(normalizeLayout(panelNode('a'))).toEqual(panelNode('a'))
  })
})

describe('removePanel', () => {
  it('drops the leaf and gives its space to what is left', () => {
    const three = row([panelNode('a'), panelNode('b'), panelNode('c')], [0.5, 0.25, 0.25])
    const next = asSplit(removePanel(three, 'b'))
    expect(panelIds(next)).toEqual(['a', 'c'])
    // a kept twice what c had, so it keeps twice the share of what remains.
    expect(sizesOf(next)).toEqual([2 / 3, 1 / 3])
  })

  it('collapses the split when only one panel is left in it', () => {
    expect(shape(removePanel(grid(), 'b'))).toBe('row(a, c)')
  })

  it('returns null when the last panel goes', () => {
    expect(removePanel(panelNode('a'), 'a')).toBeNull()
  })

  it('ignores a panel that is not there', () => {
    expect(shape(removePanel(grid(), 'zz'))).toBe(shape(grid()))
  })
})

describe('insertPanel', () => {
  it('splits the whole window when the target is the only panel', () => {
    expect(insertPanel(panelNode('a'), 'b', 'a', 'right')).toEqual(
      row([panelNode('a'), panelNode('b')], [0.5, 0.5]),
    )
    expect(insertPanel(panelNode('a'), 'b', 'a', 'top')).toEqual(
      column([panelNode('b'), panelNode('a')], [0.5, 0.5]),
    )
  })

  it('joins the target as a sibling when the axis already matches', () => {
    const next = asSplit(insertPanel(row([panelNode('a'), panelNode('b')]), 'c', 'b', 'right'))
    expect(next.direction).toBe('row')
    // Three siblings, not a pair nested inside a pair.
    expect(next.children).toEqual([panelNode('a'), panelNode('b'), panelNode('c')])
    // c took half of what b had, and a is untouched.
    expect(sizesOf(next)).toEqual([0.5, 0.25, 0.25])
  })

  it('inserts on the near side for a left or top drop', () => {
    const next = asSplit(insertPanel(row([panelNode('a'), panelNode('b')]), 'c', 'b', 'left'))
    expect(next.children).toEqual([panelNode('a'), panelNode('c'), panelNode('b')])
  })

  it('nests a new split when the axis differs', () => {
    const next = asSplit(insertPanel(row([panelNode('a'), panelNode('b')]), 'c', 'b', 'bottom'))
    expect(next.children[0]).toEqual(panelNode('a'))
    expect(next.children[1]).toEqual(column([panelNode('b'), panelNode('c')], [0.5, 0.5]))
  })

  it('reaches a target nested any distance down', () => {
    const next = asSplit(insertPanel(grid(), 'd', 'c', 'bottom'))
    expect(panelIds(next)).toEqual(['a', 'b', 'c', 'd'])
    expect(asSplit(next.children[1] ?? null).direction).toBe('column')
  })

  it('leaves the tree alone when the target is not in it', () => {
    expect(shape(insertPanel(grid(), 'd', 'zz', 'right'))).toBe(shape(grid()))
  })
})

describe('movePanel', () => {
  it('lifts a panel out and puts it back down against another', () => {
    const next = movePanel(grid(), 'a', 'c', 'bottom')
    // a left the row, so the column it went into is now the whole window.
    expect(shape(next)).toBe('column(b, c, a)')
    expect(sizesOf(asSplit(next))).toEqual([0.5, 0.25, 0.25])
  })

  it('joins the group as a tab on a centre drop', () => {
    // a leaves the row entirely, so what is left of the row collapses.
    expect(shape(movePanel(grid(), 'a', 'c', 'center'))).toBe('column(b, c|[a])')
  })

  it('does nothing when a panel is dropped on itself', () => {
    const layout = grid()
    expect(movePanel(layout, 'a', 'a', 'right')).toBe(layout)
  })

  it('does nothing when either panel is unknown', () => {
    const layout = grid()
    expect(movePanel(layout, 'zz', 'a', 'right')).toBe(layout)
    expect(movePanel(layout, 'a', 'zz', 'right')).toBe(layout)
  })

  it('keeps every panel through a move', () => {
    expect(panelIds(movePanel(grid(), 'b', 'a', 'left')).sort()).toEqual(['a', 'b', 'c'])
  })

  it('flattens rather than nesting when a move lands on the same axis', () => {
    const three = row([panelNode('a'), panelNode('b'), panelNode('c')])
    expect(shape(movePanel(three, 'c', 'a', 'left'))).toBe('row(c, a, b)')
  })
})

describe('tabs', () => {
  /** `row(a, column(b|c))` — a pane of two tabs beside a plain one. */
  const tabbed = () => row([panelNode('a'), group(['b', 'c'])])

  it('counts every tab as a panel of the layout', () => {
    expect(panelIds(tabbed())).toEqual(['a', 'b', 'c'])
    expect(hasPanel(tabbed(), 'c')).toBe(true)
    expect(groupOf(tabbed(), 'c')?.panels).toEqual(['b', 'c'])
    expect(groupOf(tabbed(), 'zz')).toBeNull()
  })

  it('puts the first tab on top when the group does not say', () => {
    expect(activePanel(group(['b', 'c']))).toBe('b')
    expect(activePanel(group(['b', 'c'], 'c'))).toBe('c')
    // A group whose active panel has been dragged out still shows something.
    expect(activePanel(group(['b', 'c'], 'gone'))).toBe('b')
  })

  it('brings a tab to the top', () => {
    expect(shape(setActivePanel(tabbed(), 'c'))).toBe('row(a, b|[c])')
    // Already on top, and panels that are not there, leave the tree identical.
    const layout = tabbed()
    expect(setActivePanel(layout, 'b')).toBe(layout)
    expect(setActivePanel(layout, 'zz')).toBe(layout)
  })

  it('reorders a tab along its own strip', () => {
    expect(asGroup(moveTab(group(['b', 'c', 'd']), 'd', 0)).panels).toEqual(['d', 'b', 'c'])
    // Moving the strip about does not change which tab you are looking at,
    // even when that was only ever "the first one".
    expect(shape(moveTab(group(['b', 'c', 'd']), 'd', 0))).toBe('d|[b]|c')
    // Out-of-range lands at the end it was aimed at rather than throwing.
    expect(asGroup(moveTab(group(['b', 'c']), 'b', 9)).panels).toEqual(['c', 'b'])
  })

  it('a dropped tab lands in the gap it was dropped in', () => {
    const strip = group(['b', 'c'])
    expect(asGroup(insertPanel(strip, 'a', 'b', 'center', 0)).panels).toEqual(['a', 'b', 'c'])
    expect(asGroup(insertPanel(strip, 'a', 'b', 'center', 1)).panels).toEqual(['b', 'a', 'c'])
    // No gap named means the end of the strip.
    expect(asGroup(insertPanel(strip, 'a', 'b', 'center')).panels).toEqual(['b', 'c', 'a'])
    // And it arrives on top, since dropping a panel somewhere is asking to see it.
    expect(activePanel(asGroup(insertPanel(strip, 'a', 'b', 'center')))).toBe('a')
  })

  it('reorders rather than moves when the tab is already in that strip', () => {
    const layout = group(['b', 'c', 'd'])
    // The gap index counts with the dragged tab still in place, so dropping
    // into the gap after `d` leaves `b` in the middle.
    expect(asGroup(movePanel(layout, 'b', 'c', 'center', 2)).panels).toEqual(['c', 'b', 'd'])
    expect(asGroup(movePanel(layout, 'd', 'b', 'center', 0)).panels).toEqual(['d', 'b', 'c'])
    // A drop back into its own gap is not a move at all.
    expect(movePanel(layout, 'b', 'c', 'center', 0)).toBe(layout)
    expect(movePanel(layout, 'b', 'c', 'center')).toBe(layout)
  })

  it('splits a tab out of the group it shares', () => {
    expect(shape(movePanel(tabbed(), 'c', 'b', 'right'))).toBe('row(a, b, c)')
    expect(shape(movePanel(tabbed(), 'c', 'b', 'bottom'))).toBe('row(a, column(b, c))')
  })

  it('keeps the pane when a tab leaves, and closes it when the last one does', () => {
    expect(shape(removePanel(tabbed(), 'c'))).toBe('row(a, b)')
    expect(shape(removePanel(tabbed(), 'b'))).toBe('row(a, c)')
    expect(shape(removePanel(group(['b']), 'b'))).toBe('empty')
  })

  it('moves the top of the pile to the next tab when the visible one goes', () => {
    const strip = group(['b', 'c', 'd'], 'c')
    expect(activePanel(asGroup(removePanel(strip, 'c')))).toBe('d')
    // The last tab hands over to the one before it instead.
    expect(activePanel(asGroup(removePanel(group(['b', 'c'], 'c'), 'c')))).toBe('b')
    // Closing a tab nobody is looking at leaves the top of the pile alone.
    expect(activePanel(asGroup(removePanel(strip, 'b')))).toBe('c')
  })

  it('trades places with a tab as readily as with a panel', () => {
    // b was the tab on top of that pane, and still is.
    expect(shape(swapPanels(tabbed(), 'a', 'c'))).toBe('row(c, [b]|a)')
  })

  it('drops a tab whose panel has gone, and keeps the pane', () => {
    expect(shape(reconcileLayout(tabbed(), ['a', 'b']))).toBe('row(a, b)')
    expect(shape(reconcileLayout(group(['b', 'c'], 'c'), ['c']))).toBe('row(c)')
  })
})

describe('swapPanels', () => {
  it('exchanges two leaves wherever they are', () => {
    expect(shape(swapPanels(grid(), 'a', 'b'))).toBe('row(b, column(a, c))')
  })

  it('is a no-op for a panel with itself', () => {
    const layout = grid()
    expect(swapPanels(layout, 'a', 'a')).toBe(layout)
  })
})

describe('sizes', () => {
  it('addresses a node by its path of child indices', () => {
    expect(nodeAt(grid(), [])).toEqual(grid())
    expect(nodeAt(grid(), [0])).toEqual(panelNode('a'))
    expect(nodeAt(grid(), [1, 1])).toEqual(panelNode('c'))
    expect(nodeAt(grid(), [1, 9])).toBeNull()
    expect(nodeAt(grid(), [0, 0])).toBeNull()
  })

  it('replaces one split’s sizes and nothing else', () => {
    const next = setSizesAt(grid(), [1], [3, 1])
    expect(sizesOf(asSplit(nodeAt(next, [1])))).toEqual([0.75, 0.25])
    expect(sizesOf(asSplit(next))).toEqual([0.5, 0.5])
  })

  it('moves a boundary by taking from one neighbour and giving to the other', () => {
    expect(resizeSplit([0.5, 0.5], 0, 0.2)[0]).toBeCloseTo(0.7)
    // The pair keeps its total, so the third child does not move.
    const next = resizeSplit([0.25, 0.25, 0.5], 0, 0.1)
    expect(next[2]).toBe(0.5)
    expect((next[0] ?? 0) + (next[1] ?? 0)).toBeCloseTo(0.5)
  })

  it('will not squeeze a neighbour past the minimum', () => {
    const wide = resizeSplit([0.5, 0.5], 0, 5, 0.1)
    expect(wide[0]).toBeCloseTo(0.9)
    expect(wide[1]).toBeCloseTo(0.1)
    const narrow = resizeSplit([0.5, 0.5], 0, -5, 0.1)
    expect(narrow[0]).toBeCloseTo(0.1)
    expect(narrow[1]).toBeCloseTo(0.9)
  })

  it('leaves a pair with no room alone, and ignores a boundary that is not there', () => {
    expect(resizeSplit([0.05, 0.05], 0, 0.1, 0.1)).toEqual([0.05, 0.05])
    expect(resizeSplit([0.5, 0.5], 1, 0.1)).toEqual([0.5, 0.5])
  })
})

describe('reconcileLayout', () => {
  it('lays every panel out in a row when there is no stored layout', () => {
    expect(shape(defaultLayout(['a', 'b']))).toBe('row(a, b)')
    // One panel still gets a space of its own — see `rootSpace`.
    expect(shape(defaultLayout(['a']))).toBe('row(a)')
    expect(defaultLayout([])).toBeNull()
    expect(shape(reconcileLayout(null, ['a', 'b']))).toBe('row(a, b)')
  })

  it('drops leaves whose panel has gone', () => {
    expect(shape(reconcileLayout(grid(), ['a', 'c']))).toBe('row(a, c)')
  })

  it('appends panels the layout does not mention', () => {
    expect(shape(reconcileLayout(grid(), ['a', 'b', 'c', 'd']))).toBe('row(a, column(b, c), d)')
  })

  it('rebuilds a panel that appears twice in one place', () => {
    const duplicated = row([panelNode('a'), column([panelNode('a'), panelNode('b')])])
    expect(shape(reconcileLayout(duplicated, ['a', 'b']))).toBe('row(b, a)')
  })

  it('is null only when there are no panels at all', () => {
    expect(reconcileLayout(grid(), [])).toBeNull()
  })
})

/* ------------------------------------------------------------------ floats */

const asFloat = (node: WindowNode | null): WindowFloat => {
  if (!node || node.kind !== 'float') throw new Error('Expected a float')
  return node
}

const rect = (x: number, y: number, w = 200, h = 150): FloatRect => ({ x, y, w, h })

/** Two windows on a desktop, `b` in front of `a`. */
const desk = () =>
  float([frame(panelNode('a'), rect(0, 0)), frame(panelNode('b'), rect(240, 40))])

/** The rect of the frame a panel is in, for asserting on a move. */
const rectOf = (node: WindowNode, id: string) => frameOf(node, id)?.rect

describe('float constructors', () => {
  it('fills in what a frame is not told', () => {
    expect(frame(panelNode('a')).rect).toEqual(DEFAULT_FRAME)
    expect(frame(panelNode('a'), { w: 500 }).rect).toEqual({ ...DEFAULT_FRAME, w: 500 })
  })

  it('steps a cascade down and across from the frame before it', () => {
    const desktop = cascade([panelNode('a'), panelNode('b'), panelNode('c')])
    expect(desktop.frames.map((held) => [held.rect.x, held.rect.y])).toEqual([
      [DEFAULT_FRAME.x, DEFAULT_FRAME.y],
      [DEFAULT_FRAME.x + CASCADE_STEP, DEFAULT_FRAME.y + CASCADE_STEP],
      [DEFAULT_FRAME.x + 2 * CASCADE_STEP, DEFAULT_FRAME.y + 2 * CASCADE_STEP],
    ])
    // Every frame keeps the size it was given; only the position steps.
    expect(desktop.frames.every((held) => held.rect.w === DEFAULT_FRAME.w)).toBe(true)
  })

  it('walks a float like any other container', () => {
    const nested = float([frame(row([panelNode('a'), panelNode('b')])), frame(panelNode('c'))])
    expect(panelIds(nested)).toEqual(['a', 'b', 'c'])
    expect(hasPanel(nested, 'b')).toBe(true)
    expect(hasPanel(nested, 'zz')).toBe(false)
    expect(groups(nested).map((held) => held.panels)).toEqual([['a'], ['b'], ['c']])
    expect(groupOf(nested, 'b')?.panels).toEqual(['b'])
  })
})

describe('frameOf', () => {
  it('finds the frame a floating panel is in', () => {
    expect(rectOf(desk(), 'b')).toEqual(rect(240, 40))
  })

  it('is null for a panel that is tiled rather than floating', () => {
    expect(frameOf(grid(), 'a')).toBeNull()
  })

  it('finds a float nested inside a tiled grid', () => {
    expect(rectOf(row([panelNode('z'), desk()]), 'b')).toEqual(rect(240, 40))
  })

  it('answers with the innermost frame when floats are nested', () => {
    const inner = float([frame(panelNode('a'), rect(5, 5, 120, 120))])
    expect(rectOf(float([frame(inner, rect(0, 0, 400, 400))]), 'a')).toEqual(rect(5, 5, 120, 120))
  })
})

describe('clampRect', () => {
  const bounds = { w: 400, h: 300 }

  it('leaves a frame that already fits where it is', () => {
    expect(clampRect(rect(20, 30), bounds)).toEqual(rect(20, 30))
  })

  it('keeps a frame inside the space it floats over', () => {
    expect(clampRect(rect(-40, -40), bounds)).toEqual(rect(0, 0))
    expect(clampRect(rect(9999, 9999), bounds)).toEqual(rect(200, 150))
  })

  it('will not let a frame be smaller than the floor', () => {
    expect(clampRect(rect(0, 0, 10, 10), bounds, 120)).toEqual(rect(0, 0, 120, 120))
  })

  it('shrinks a frame too big for its float rather than pushing it off the edge', () => {
    expect(clampRect(rect(0, 0, 900, 900), bounds)).toEqual(rect(0, 0, 400, 300))
  })

  it('fits a float smaller than the floor rather than overflowing it', () => {
    expect(clampRect(rect(0, 0, 200, 200), { w: 60, h: 60 }, 120)).toEqual(rect(0, 0, 60, 60))
  })

  it('rounds to whole pixels, so a stored layout is not a drift of decimals', () => {
    expect(clampRect({ x: 10.4, y: 10.6, w: 200.5, h: 150.5 }, bounds)).toEqual(rect(10, 11, 201, 151))
  })
})

describe('resizeRect', () => {
  const base = rect(100, 100, 200, 200)

  it('moves the dragged edge and leaves the opposite one where it is', () => {
    expect(resizeRect(base, 'e', 40, 0)).toEqual(rect(100, 100, 240, 200))
    expect(resizeRect(base, 's', 0, 40)).toEqual(rect(100, 100, 200, 240))
    // A leading edge takes the position with it, so the trailing edge holds.
    expect(resizeRect(base, 'w', 40, 0)).toEqual(rect(140, 100, 160, 200))
    expect(resizeRect(base, 'n', 0, 40)).toEqual(rect(100, 140, 200, 160))
  })

  it('moves both axes from a corner', () => {
    expect(resizeRect(base, 'se', 40, 60)).toEqual(rect(100, 100, 240, 260))
    expect(resizeRect(base, 'nw', 40, 60)).toEqual(rect(140, 160, 160, 140))
    expect(resizeRect(base, 'ne', 40, 60)).toEqual(rect(100, 160, 240, 140))
    expect(resizeRect(base, 'sw', 40, 60)).toEqual(rect(140, 100, 160, 260))
  })

  it('ignores the axis a side handle does not have', () => {
    expect(resizeRect(base, 'e', 40, 999)).toEqual(rect(100, 100, 240, 200))
    expect(resizeRect(base, 'n', 999, 40)).toEqual(rect(100, 140, 200, 160))
  })

  it('pins at the floor rather than turning the frame inside out', () => {
    // Dragging the right edge past the left: the left edge is what holds.
    expect(resizeRect(base, 'e', -400, 0, 120)).toEqual(rect(100, 100, 120, 200))
    // Dragging the left edge past the right: the right edge is what holds, so
    // the frame stops with its far side still at 300.
    expect(resizeRect(base, 'w', 400, 0, 120)).toEqual(rect(180, 100, 120, 200))
    expect(resizeRect(base, 'n', 0, 400, 120)).toEqual(rect(100, 180, 200, 120))
  })
})

describe('setFrameRect', () => {
  it('puts a frame somewhere else, leaving the others alone', () => {
    const next = setFrameRect(desk(), 'b', rect(10, 10, 300, 300))
    expect(rectOf(next, 'b')).toEqual(rect(10, 10, 300, 300))
    expect(rectOf(next, 'a')).toEqual(rect(0, 0))
  })

  it('returns the same tree when the frame is already exactly there', () => {
    const desktop = desk()
    expect(setFrameRect(desktop, 'b', rect(240, 40))).toBe(desktop)
  })

  it('returns the same tree for a panel that is tiled rather than floating', () => {
    const tiled = grid()
    expect(setFrameRect(tiled, 'a', rect(0, 0))).toBe(tiled)
  })

  it('reaches a float nested in a grid', () => {
    const mixed = row([panelNode('z'), desk()])
    expect(rectOf(setFrameRect(mixed, 'a', rect(7, 7)), 'a')).toEqual(rect(7, 7))
  })

  it('moves the innermost frame when floats are nested', () => {
    const inner = float([frame(panelNode('a'), rect(5, 5, 120, 120))])
    const outer = float([frame(inner, rect(0, 0, 400, 400))])
    const next = asFloat(setFrameRect(outer, 'a', rect(50, 50, 120, 120)))
    // The inner frame moved; the window holding it stayed put.
    expect(next.frames[0]?.rect).toEqual(rect(0, 0, 400, 400))
    expect(rectOf(next, 'a')).toEqual(rect(50, 50, 120, 120))
  })
})

describe('raiseFrame', () => {
  it('brings a frame to the front of the stack', () => {
    const next = asFloat(raiseFrame(desk(), 'a'))
    expect(next.frames.map((held) => panelIds(held.node)[0])).toEqual(['b', 'a'])
  })

  it('carries the frame’s position with it', () => {
    expect(rectOf(raiseFrame(desk(), 'a'), 'a')).toEqual(rect(0, 0))
  })

  it('returns the same tree when the frame is already on top', () => {
    const desktop = desk()
    expect(raiseFrame(desktop, 'b')).toBe(desktop)
  })

  it('returns the same tree for a panel that is not floating', () => {
    const tiled = grid()
    expect(raiseFrame(tiled, 'a')).toBe(tiled)
  })

  it('raises both stacks when floats are nested', () => {
    const inner = float([frame(panelNode('a')), frame(panelNode('b'))])
    const outer = float([frame(inner, rect(0, 0, 400, 400)), frame(panelNode('c'))])
    const next = asFloat(raiseFrame(outer, 'a'))
    // The window holding a came forward, and a came forward inside it.
    expect(panelIds(next)).toEqual(['c', 'b', 'a'])
  })
})

describe('floats and the rest of the algebra', () => {
  it('does not flatten a float, however few frames it has', () => {
    const one = float([frame(panelNode('a'))])
    expect(shape(normalizeLayout(one))).toBe(shape(one))
  })

  it('drops a frame left holding nothing', () => {
    const desktop = float([frame(panelNode('a')), frame(group([]))])
    expect(panelIds(normalizeLayout(desktop))).toEqual(['a'])
  })

  it('takes the frame away with the panel, leaving the others where they are', () => {
    const next = asFloat(removePanel(desk(), 'a'))
    expect(panelIds(next)).toEqual(['b'])
    // No space was shared out: b never held a's, so it has not moved or grown.
    expect(next.frames[0]?.rect).toEqual(rect(240, 40))
  })

  it('is null when the last frame goes', () => {
    expect(removePanel(float([frame(panelNode('a'))]), 'a')).toBeNull()
  })

  it('tabs a panel into a floating frame on a centre drop', () => {
    const next = movePanel(row([panelNode('z'), desk()]), 'z', 'b', 'center')
    // No index, so it lands at the end of the strip and comes to the top.
    expect(shape(next)).toBe('float(a@0,0 200x150, b|[z]@240,40 200x150)')
  })

  it('splits within the frame on an edge drop, leaving the frame where it is', () => {
    const next = asFloat(movePanel(desk(), 'a', 'b', 'right'))
    expect(shape(next)).toBe('float(row(b, a)@240,40 200x150)')
  })

  it('docks a floating panel into the grid when it is dropped on a tiled pane', () => {
    const mixed = row([panelNode('z'), desk()])
    const next = movePanel(mixed, 'b', 'z', 'right')
    // b left the desktop for the grid; a stayed floating where it was.
    expect(shape(next)).toBe('row(z, b, float(a@0,0 200x150))')
  })

  it('trades two floating panels’ places, each frame keeping its own box', () => {
    const next = asFloat(swapPanels(desk(), 'a', 'b'))
    expect(panelIds(next)).toEqual(['b', 'a'])
    expect(next.frames[0]?.rect).toEqual(rect(0, 0))
    expect(next.frames[1]?.rect).toEqual(rect(240, 40))
  })

  it('addresses a split inside a frame by the frame’s place in the stack', () => {
    const desktop = float([frame(panelNode('a')), frame(row([panelNode('b'), panelNode('c')]))])
    expect(shape(nodeAt(desktop, [1]))).toBe('row(b, c)')
    const resized = setSizesAt(desktop, [1], [0.8, 0.2])
    expect(sizesOf(asSplit(nodeAt(resized, [1])))).toEqual([0.8, 0.2])
    // The frame it is in did not move.
    expect(asFloat(resized).frames[1]?.rect).toEqual(DEFAULT_FRAME)
  })

  it('selects a tab inside a floating frame', () => {
    const desktop = float([frame(group(['a', 'b']))])
    expect(shape(setActivePanel(desktop, 'b'))).toBe('float(a|[b]@16,16 360x260)')
  })

  it('opens a new panel as a new window on the desktop, not a pane beside it', () => {
    const next = asFloat(reconcileLayout(desk(), ['a', 'b', 'c']))
    expect(panelIds(next)).toEqual(['a', 'b', 'c'])
    expect(next.frames[2]?.rect.x).toBe(DEFAULT_FRAME.x + 2 * CASCADE_STEP)
  })

  it('drops a frame whose panel the host no longer declares', () => {
    expect(shape(reconcileLayout(desk(), ['b']))).toBe('float(b@240,40 200x150)')
  })
})

describe('floatPanel', () => {
  it('lifts a tab out of a floating window into a window of its own', () => {
    // The case a drop on bare desktop performs: notes is tabbed with sources
    // in one window, and comes out as a second window beside it.
    const desktop = float([
      frame(group(['sources', 'notes']), rect(20, 20)),
      frame(panelNode('activity'), rect(90, 170)),
    ])
    const next = asFloat(floatPanel(desktop, 'notes', 'activity', rect(300, 60, 260, 160)))

    expect(shape(next)).toBe(
      'float(sources@20,20 200x150, activity@90,170 200x150, notes@300,60 260x160)',
    )
  })

  it('puts the new window on top of the stack', () => {
    const next = asFloat(floatPanel(desk(), 'a', 'b', rect(400, 400)))
    expect(panelIds(next)).toEqual(['b', 'a'])
  })

  it('takes a tiled panel out of the grid and onto a desktop', () => {
    const mixed = row([panelNode('z'), desk()])
    const next = floatPanel(mixed, 'z', 'a', rect(500, 60))
    // The split collapsed to the float it was sharing the row with.
    expect(shape(next)).toBe(
      'float(a@0,0 200x150, b@240,40 200x150, z@500,60 200x150)',
    )
  })

  it('leaves the group it came from when there were other tabs in it', () => {
    const desktop = float([
      frame(group(['a', 'b', 'c'], 'b'), rect(0, 0)),
      frame(panelNode('d'), rect(300, 0)),
    ])
    const next = asFloat(floatPanel(desktop, 'b', 'd', rect(20, 200)))
    // b left; the group kept its space and handed the top to the next tab.
    expect(shape(next)).toBe('float(a|[c]@0,0 200x150, d@300,0 200x150, b@20,200 200x150)')
  })

  it('does nothing when the panel is the only thing on that desktop', () => {
    const alone = float([frame(panelNode('a'))])
    expect(floatPanel(alone, 'a', 'a', rect(50, 50))).toBe(alone)
  })

  it('does nothing when the panel named is not on a float at all', () => {
    const tiled = grid()
    expect(floatPanel(tiled, 'a', 'b', rect(50, 50))).toBe(tiled)
  })

  it('does nothing for a panel the tree does not hold', () => {
    const desktop = desk()
    expect(floatPanel(desktop, 'zz', 'a', rect(50, 50))).toBe(desktop)
    expect(floatPanel(desktop, 'a', 'zz', rect(50, 50))).toBe(desktop)
  })

  it('is not what movePanel does — that one has nowhere to put the window', () => {
    const desktop = desk()
    expect(movePanel(desktop, 'a', 'b', 'float')).toBe(desktop)
  })
})

/* -------------------------------------------------------------- containers */

/** Panel titles for `nodeTitle`, which asks for them one at a time. */
const titles: Record<string, string> = { a: 'Alpha', b: 'Bravo', c: 'Charlie', z: 'Zulu' }
const titleFor = (id: string) => titles[id]

describe('setSplitDirection', () => {
  it('flips the split the pane sits in', () => {
    expect(shape(setSplitDirection(row([panelNode('a'), panelNode('b')]), 'a', 'column'))).toBe(
      'column(a, b)',
    )
  })

  it('flattens when the flip makes it the same split as its parent', () => {
    // b's container is the inner column; turned into a row inside a row, it is
    // that row, so the arrangement it describes is the one already on screen.
    expect(shape(setSplitDirection(grid(), 'b', 'row'))).toBe('row(a, b, c)')
  })

  it('keeps the shares the split already had', () => {
    const uneven = row([panelNode('a'), panelNode('b')], [0.8, 0.2])
    expect(sizesOf(asSplit(setSplitDirection(uneven, 'a', 'column')))).toEqual([0.8, 0.2])
  })

  it('does nothing when it is already that way round', () => {
    const tiled = grid()
    expect(setSplitDirection(tiled, 'b', 'column')).toBe(tiled)
  })

  it('does nothing for a pane with no split above it', () => {
    const alone = panelNode('a')
    expect(setSplitDirection(alone, 'a', 'row')).toBe(alone)
    const desktop = desk()
    expect(setSplitDirection(desktop, 'a', 'column')).toBe(desktop)
  })
})

describe('collapseToTabs', () => {
  it('puts the panes of the container into one group, this one on top', () => {
    // The strip keeps the order the panes were in; only which is on top moves.
    expect(shape(collapseToTabs(grid(), 'c'))).toBe('row(a, b|[c])')
  })

  it('takes the whole layout when the container is the root', () => {
    expect(shape(collapseToTabs(row([panelNode('a'), panelNode('b')]), 'a'))).toBe('[a]|b')
  })

  it('gathers panels from any depth of the container', () => {
    const deep = row([
      panelNode('z'),
      column([panelNode('a'), row([panelNode('b'), panelNode('c')])]),
    ])
    // z's container is the root, so every panel under it comes together.
    expect(shape(collapseToTabs(deep, 'z'))).toBe('[z]|a|b|c')
  })

  it('un-floats a float of one window', () => {
    expect(shape(collapseToTabs(float([frame(group(['a', 'b']))]), 'a'))).toBe('[a]|b')
  })
})

/*
 * A tab can be a space.
 *
 * "Tabs" is the fourth way of showing a space, so — like the other three — it
 * keeps what that space holds. The panes stop dividing it and share one strip;
 * a *desktop* among them shares the strip whole, as one tab, because where each
 * of its windows sits is state a user put there rather than an arrangement the
 * space was merely being drawn in.
 */
describe('a space sharing a strip', () => {
  /** `row(items, desktop)` — the shape the floating-beside-tiled story has. */
  const beside = () =>
    row(
      [
        panelNode('items'),
        float([frame(panelNode('a'), rect(20, 20)), frame(panelNode('b'), rect(90, 170))]),
      ],
      [0.45, 0.55],
    )

  /** The strip that story's row becomes: two tabs, one of them a desktop. */
  const tabbed = () => asGroup(collapseSpace(beside(), 'items'))

  it('collapses a space into a tab per pane, the desktop kept whole', () => {
    expect(shape(tabbed())).toBe('[items]|(float(a@20,20 200x150, b@90,170 200x150))')
    // Two tabs, not four: the windows on the desktop are the desktop's.
    expect(tabbed().panels).toHaveLength(2)
    expect(panelTabs(tabbed())).toEqual(['items'])
  })

  it('is what the menu on the space above the panes offers', () => {
    // Reached from a pane rather than from the space's own bar, which is the
    // same operation named by a panel inside it.
    expect(shape(collapseToTabs(beside(), 'items'))).toBe(shape(tabbed()))
    // And from a panel on the desktop: its container is the desktop, so the
    // windows on that desktop are the panes being collapsed.
    expect(shape(collapseToTabs(beside(), 'a'))).toBe('row(items, [a]|b)')
  })

  it('keeps a split that is a space of its own whole too', () => {
    // Tiled from a desktop: its `places` are the way back, and one strip of
    // panels would be the loss of them.
    const tiled = toTiled(beside(), 'a', 'column')
    expect(shape(collapseToTabs(tiled, 'items'))).toBe('[items]|(column(a, b))')
    // Shaped by the host: what it said about its own bar is why it stays a space.
    const shaped = row([panelNode('items'), headless(column([panelNode('a'), panelNode('b')]))])
    expect(shape(collapseToTabs(shaped, 'items'))).toBe('[items]|(column(a, b))')
    // Plain panes, though, are only ever an arrangement of the space they are
    // in, so they flatten however deep they were.
    const plain = row([panelNode('items'), column([panelNode('a'), panelNode('b')])])
    expect(shape(collapseToTabs(plain, 'items'))).toBe('[items]|a|b')
  })

  it('counts the panels of a space in it as panels of the strip', () => {
    const strip = tabbed()
    expect(panelIds(strip)).toEqual(['items', 'a', 'b'])
    expect(hasPanel(strip, 'b')).toBe(true)
    expect(hasPanel(strip, 'zz')).toBe(false)
    // But they are not tabs of it: the pane inside the space speaks for them.
    expect(isTabOf(strip, 'items')).toBe(true)
    expect(isTabOf(strip, 'b')).toBe(false)
    expect(groupOf(strip, 'b')).toEqual(panelNode('b'))
    expect(groups(strip)).toHaveLength(3)
    expect(tabPanels(strip.panels[1]!)).toEqual(['a', 'b'])
  })

  it('names the tab on top by a panel, wherever in it that panel is', () => {
    const strip = tabbed()
    expect(activeTab(strip)).toBe(0)
    expect(activePanel(strip)).toBe('items')
    // A panel of the desktop names the desktop's tab, and `activePanel` says
    // there is no panel on top: what is on top is a space.
    const onDesktop = asGroup(setActivePanel(strip, 'a'))
    expect(activeTab(onDesktop)).toBe(1)
    expect(activePanel(onDesktop)).toBe('')
    // Which panel it is showing is `frontPanel`: the window in front of it.
    expect(frontPanel(onDesktop)).toBe('b')
    // A space says what it is called for itself; a panel tab is named by the
    // host, falling back to its id — which is all `titles` knows about here.
    expect(nodeTitle(onDesktop, titleFor)).toBe('Desktop')
    expect(nodeTitle(strip, titleFor)).toBe('items')
  })

  it('spreads back into the space it was collapsed from', () => {
    const back = spreadTabs(tabbed(), 'items', 'row')
    expect(shape(back)).toBe('row(items, float(a@20,20 200x150, b@90,170 200x150))')
    // Every window exactly where it was: the desktop was never taken apart.
    expect(rectOf(back, 'b')).toEqual(rect(90, 170))
  })

  it('becomes a window of its own when the strip becomes windows', () => {
    // A desktop inside a window on a desktop, which is what the tab held.
    expect(shape(floatTabs(tabbed(), 'items', { w: 300, h: 200 }))).toBe(
      'float(items@16,16 300x200, float(a@20,20 200x150, b@90,170 200x150)@44,44 300x200)',
    )
  })

  it('the windows in it are still windows', () => {
    const strip = tabbed()
    expect(frameOf(strip, 'b')?.rect).toEqual(rect(90, 170))
    expect(rectOf(setFrameRect(strip, 'b', rect(120, 200)), 'b')).toEqual(rect(120, 200))
    expect(isMaximized(frameOf(toggleMaximized(strip, 'a'), 'a')!)).toBe(true)
    // Raising one inside the tab reorders that desktop, not the strip.
    expect(panelIds(raiseFrame(strip, 'a'))).toEqual(['items', 'b', 'a'])
  })

  it('a panel of it leaves the space rather than the strip', () => {
    const strip = tabbed()
    expect(shape(removePanel(strip, 'a'))).toBe('[items]|(float(b@90,170 200x150))')
    // The last one takes the tab with it — and the strip of one space left is
    // that space, the way a split of one child is that child.
    const empty = removePanel(removePanel(strip, 'a')!, 'b')
    expect(shape(normalizeLayout(empty!))).toBe('items')
    expect(shape(normalizeLayout(removePanel(strip, 'items')!))).toBe(
      'float(a@20,20 200x150, b@90,170 200x150)',
    )
  })

  it('two strips in one place are one strip', () => {
    // Nothing makes a group a tab of a group, and if anything did it would be
    // a set of tabs beside tabs — which is the set they are already in.
    const nested = group(['items', group(['a', 'b'])])
    expect(shape(normalizeLayout(nested))).toBe('[items]|a|b')
  })

  it('reorders along the strip without reaching into the space', () => {
    const strip = tabbed()
    expect(shape(moveTab(strip, 'items', 1))).toBe(
      '(float(a@20,20 200x150, b@90,170 200x150))|[items]',
    )
    // Reordering the strip does not change which tab you are looking at, and
    // a space is looked at by the panel it is showing.
    const inside = asGroup(collapseSpace(beside(), 'a'))
    expect(shape(moveTab(inside, 'items', 1))).toBe(
      '[(float(a@20,20 200x150, b@90,170 200x150))]|items',
    )
  })

  it('a drop on a pane inside it is that pane\'s drop', () => {
    const strip = tabbed()
    // Tabbed into the window on the desktop, not into the strip around it.
    expect(shape(insertPanel(strip, 'z', 'b', 'center'))).toBe(
      '[items]|(float(a@20,20 200x150, b|[z]@90,170 200x150))',
    )
    // And an edge drop divides that window rather than the strip.
    expect(shape(insertPanel(strip, 'z', 'b', 'bottom'))).toBe(
      '[items]|(float(a@20,20 200x150, column(b, z)@90,170 200x150))',
    )
    // A drop on the strip's own tab is the strip's: `items` is a tab of it.
    expect(shape(insertPanel(strip, 'z', 'items', 'center', 0))).toBe(
      '[z]|items|(float(a@20,20 200x150, b@90,170 200x150))',
    )
  })

  it('a panel dragged out of the space joins the strip', () => {
    expect(shape(movePanel(tabbed(), 'b', 'items', 'center', 1))).toBe(
      'items|[b]|(float(a@20,20 200x150))',
    )
  })

  it('is addressed by where it sits in the strip', () => {
    const strip = tabbed()
    expect(spaceTitle(nodeAt(strip, [1])!)).toBe('Desktop')
    // A panel tab is not a space, so there is nothing at its index.
    expect(nodeAt(strip, [0])).toBeNull()
    // A pane put in a tab's place is not a set of tabs beside tabs for long:
    // normalizing merges it into the strip it was put in.
    expect(shape(replaceAt(strip, [1], panelNode('z')))).toBe('[items]|(z)')
    expect(shape(normalizeLayout(replaceAt(strip, [1], panelNode('z'))))).toBe('[items]|z')
    // A split inside the tab is resized through the same path.
    const split = asGroup(collapseSpace(row([panelNode('items'), toTiled(desk(), 'a', 'row')]), 'items'))
    expect(sizesOf(asSplit(nodeAt(setSizesAt(split, [1], [0.8, 0.2]), [1])!))).toEqual([0.8, 0.2])
  })

  it('drops a panel the host no longer declares, wherever it was', () => {
    expect(shape(reconcileLayout(tabbed(), ['items', 'b']))).toBe(
      '[items]|(float(b@90,170 200x150))',
    )
  })
})

describe('toFloat', () => {
  it('turns the split a pane sits in into a float of its panes', () => {
    const next = asFloat(toFloat(row([panelNode('a'), panelNode('b')]), 'a', { w: 200, h: 150 }))
    expect(next.frames.map((held) => panelIds(held.node)[0])).toEqual(['a', 'b'])
    // Cascaded, so the windows do not sit exactly on top of one another the
    // moment they appear.
    expect(next.frames[1]?.rect.x).toBe(DEFAULT_FRAME.x + CASCADE_STEP)
  })

  it('makes a float from a layout that has none, when the pane is the root', () => {
    expect(shape(toFloat(panelNode('a'), 'a', { w: 200, h: 150 }))).toBe('float(a@16,16 200x150)')
    expect(shape(toFloat(group(['a', 'b']), 'a', { w: 200, h: 150 }))).toBe(
      'float([a]|b@16,16 200x150)',
    )
  })

  it('keeps whole grids together as one window each', () => {
    const tiled = row([panelNode('z'), column([panelNode('a'), panelNode('b')])])
    const next = asFloat(toFloat(tiled, 'z'))
    expect(shape(next.frames[1]?.node ?? panelNode('x'))).toBe('column(a, b)')
  })

  it('does nothing for a pane already on a float', () => {
    const desktop = desk()
    expect(toFloat(desktop, 'a')).toBe(desktop)
  })
})

describe('toTiled', () => {
  it('turns the float a window is on back into a split', () => {
    expect(shape(toTiled(desk(), 'a'))).toBe('row(a, b)')
    expect(shape(toTiled(desk(), 'a', 'column'))).toBe('column(a, b)')
  })

  it('lays the windows out where they were, not where they were stacked', () => {
    // Raising a window leaves it exactly where it is on screen — and merely
    // opening its menu raises it, so reading the order off the stack would let
    // opening the menu decide where the window it was opened on tiles to.
    expect(shape(toTiled(raiseFrame(desk(), 'a'), 'a'))).toBe('row(a, b)')
    // Across the desktop for a row, down it for a column.
    const stacked = float([frame(panelNode('a'), rect(240, 40)), frame(panelNode('b'), rect(0, 0))])
    expect(shape(toTiled(stacked, 'a'))).toBe('row(b, a)')
    expect(shape(toTiled(stacked, 'a', 'column'))).toBe('column(b, a)')
  })

  it('keeps whatever each window held, as one pane each', () => {
    const desktop = float([frame(group(['a', 'b'])), frame(row([panelNode('c'), panelNode('z')]))])
    // The grid the second window held stays that window's own. Flattening it
    // into the row would make two panes of what is one window, and there
    // would be no way back to the window it was.
    expect(shape(toTiled(desktop, 'a'))).toBe('row([a]|b, row(c, z))')
  })

  it('leaves the panes beside the desktop out of it', () => {
    const mixed = row([panelNode('z'), desk()])
    // The desktop's panes divide the desktop's half of the screen; z never
    // was on it, and a row inside a row that let it in would say it was.
    expect(shape(toTiled(mixed, 'a'))).toBe('row(z, row(a, b))')
    expect(shape(toTiled(mixed, 'a', 'column'))).toBe('row(z, column(a, b))')
  })

  it('does nothing for a pane that is tiled already', () => {
    const tiled = grid()
    expect(toTiled(tiled, 'b')).toBe(tiled)
  })
})

describe('a tiled desktop is one choice away from being a desktop again', () => {
  it('puts every window back exactly where it was', () => {
    const desktop = desk()
    expect(shape(toFloat(toTiled(desktop, 'a', 'column'), 'a'))).toBe(shape(desktop))
    expect(shape(toFloat(toTiled(desktop, 'a', 'row'), 'b'))).toBe(shape(desktop))
  })

  it('leaves the panes beside it where they were through the round trip', () => {
    const mixed = row([panelNode('z'), desk()], [0.45, 0.55])
    const back = toFloat(toTiled(mixed, 'a', 'column'), 'a')
    expect(shape(back)).toBe(`row(z, ${shape(desk())})`)
    expect(sizesOf(asSplit(back))).toEqual([0.45, 0.55])
  })

  it('brings back the window that was filling the desktop, or rolled up', () => {
    const desktop = minimizeFrame(maximizeFrame(desk(), 'a'), 'b')
    const back = asFloat(toFloat(toTiled(desktop, 'a'), 'a'))
    expect(isMaximized(back.frames[0]!)).toBe(true)
    expect(isMinimized(back.frames[1]!)).toBe(true)
  })

  it('survives the layout being stored and read back', () => {
    const tiled = toTiled(desk(), 'a', 'column')
    const stored = JSON.parse(JSON.stringify(tiled)) as WindowNode
    expect(shape(toFloat(stored, 'a'))).toBe(shape(desk()))
  })

  it('flips between a row and a column without forgetting', () => {
    const tiled = setSplitDirection(toTiled(desk(), 'a', 'column'), 'a', 'row')
    expect(shape(tiled)).toBe('row(a, b)')
    expect(shape(toFloat(tiled, 'a'))).toBe(shape(desk()))
  })

  it('cascades afresh once the panes are no longer the windows it remembers', () => {
    const tiled = toTiled(row([panelNode('z'), desk()]), 'a', 'column')
    // z dropped in among them is not a window this split ever had, so the
    // places no longer pair with the panes and the desktop is made afresh.
    const back = asFloat(toFloat(movePanel(tiled, 'z', 'a', 'bottom'), 'a'))
    expect(back.frames.map((held) => panelIds(held.node)[0])).toEqual(['a', 'z', 'b'])
    expect(back.frames[0]?.rect).toEqual(DEFAULT_FRAME)
  })
})

describe('spreadTabs', () => {
  it('makes panes of a group\'s tabs, in the order they were in', () => {
    const tabbed = row([panelNode('a'), group(['b', 'c'], 'c')], [0.6, 0.4])
    expect(shape(spreadTabs(tabbed, 'c', 'column'))).toBe('row(a, column(b, c))')
  })

  it('keeps the share the group held', () => {
    const tabbed = row([panelNode('a'), group(['b', 'c'])], [0.75, 0.25])
    expect(sizesOf(asSplit(spreadTabs(tabbed, 'c', 'column')))).toEqual([0.75, 0.25])
  })

  it('flattens into the split above when it is the same direction', () => {
    // A row spread inside a row is that row: the arrangement it describes is
    // the one already on screen.
    const tabbed = row([panelNode('a'), group(['b', 'c'])])
    expect(shape(spreadTabs(tabbed, 'b', 'row'))).toBe('row(a, b, c)')
  })

  it('spreads the tabs a window holds within that window', () => {
    const desktop = float([frame(group(['a', 'b']), rect(30, 30))])
    expect(shape(spreadTabs(desktop, 'a', 'row'))).toBe('float(row(a, b)@30,30 200x150)')
  })

  it('takes the whole layout when the group is the root', () => {
    expect(shape(spreadTabs(group(['a', 'b', 'c']), 'a', 'row'))).toBe('row(a, b, c)')
  })

  it('does nothing for a pane with no tabs beside it', () => {
    const tiled = grid()
    expect(spreadTabs(tiled, 'b', 'column')).toBe(tiled)
    expect(spreadTabs(tiled, 'zz', 'row')).toBe(tiled)
  })
})

describe('floatTabs', () => {
  it('turns a tiled group of tabs into a desktop in its place', () => {
    const tabbed = row([panelNode('a'), group(['b', 'c'])])
    const next = asSplit(floatTabs(tabbed, 'b', { w: 200, h: 150 }))
    expect(shape(next.children[1] ?? panelNode('x'))).toBe(
      'float(b@16,16 200x150, c@44,44 200x150)',
    )
  })

  it('spreads a window of tabs across the desktop it is already on', () => {
    // Not a desktop nested inside one of its own windows: the tabs become
    // windows beside the one they were in, cascading from where it sat.
    const desktop = float([frame(panelNode('a'), rect(0, 0)), frame(group(['b', 'c']), rect(60, 60))])
    expect(shape(floatTabs(desktop, 'b'))).toBe(
      'float(a@0,0 200x150, b@60,60 200x150, c@88,88 200x150)',
    )
  })

  it('keeps the place in the stack the window it replaces had', () => {
    const desktop = float([frame(group(['b', 'c']), rect(0, 0)), frame(panelNode('a'), rect(60, 60))])
    expect(panelIds(floatTabs(desktop, 'c'))).toEqual(['b', 'c', 'a'])
  })

  it('leaves a window that holds more than the group alone to nest', () => {
    // The group is not the window itself, so it becomes a desktop where it is,
    // inside the grid that window holds.
    const desktop = float([frame(column([panelNode('a'), group(['b', 'c'])]), rect(0, 0))])
    expect(shape(floatTabs(desktop, 'b'))).toBe(
      'float(column(a, float(b@16,16 360x260, c@44,44 360x260))@0,0 200x150)',
    )
  })

  it('takes the whole layout when the group is the root', () => {
    expect(shape(floatTabs(group(['a', 'b']), 'a', { w: 200, h: 150 }))).toBe(
      'float(a@16,16 200x150, b@44,44 200x150)',
    )
  })

  it('does nothing for a pane with no tabs beside it', () => {
    const tiled = grid()
    expect(floatTabs(tiled, 'b')).toBe(tiled)
    const desktop = desk()
    expect(floatTabs(desktop, 'a')).toBe(desktop)
    expect(floatTabs(desktop, 'zz')).toBe(desktop)
  })
})

/*
 * A frame named by where it is, rather than by a panel in it.
 *
 * A window holding a desktop is the one frame a panel cannot name: every panel
 * on that desktop is a panel of the window around it too, and the innermost
 * frame holding one is one of the windows *on* it. Its own chrome says where it
 * is instead — the path it was rendered at.
 */
describe('frames by path', () => {
  /** `float(items, float(a, b))` — a window beside a window holding a desktop. */
  const nested = () =>
    float([
      frame(panelNode('items'), rect(0, 0)),
      frame(float([frame(panelNode('a'), rect(20, 20)), frame(panelNode('b'), rect(90, 90))]), rect(40, 40, 400, 300)),
    ])

  it('names the frame at a path, and nothing inside it', () => {
    const desktop = nested()
    expect(frameAt(desktop, [1])?.rect).toEqual(rect(40, 40, 400, 300))
    expect(frameAt(desktop, [1, 0])?.rect).toEqual(rect(20, 20))
    // Nothing sits there: a path through a pane, or past the end of a float.
    expect(frameAt(desktop, [0, 0])).toBeNull()
    expect(frameAt(desktop, [9])).toBeNull()
    expect(frameAt(desktop, [])).toBeNull()
  })

  it('turns a panel into the path of the frame it names', () => {
    const desktop = nested()
    // The innermost frame holding it, which is the one `frameOf` answers with.
    expect(framePathOf(desktop, 'a')).toEqual([1, 0])
    expect(frameAt(desktop, framePathOf(desktop, 'a')!)).toBe(frameOf(desktop, 'a'))
    expect(framePathOf(desktop, 'items')).toEqual([0])
    // Tiled rather than floating, and not in the tree at all.
    expect(framePathOf(row([panelNode('a')]), 'a')).toBeNull()
    expect(framePathOf(desktop, 'zz')).toBeNull()
  })

  it('moves the window rather than a window on it', () => {
    const desktop = nested()
    const moved = setFrameRectAt(desktop, [1], rect(140, 120, 400, 300))
    expect(frameAt(moved, [1])?.rect).toEqual(rect(140, 120, 400, 300))
    // The windows it holds are carried along: each is placed on the desktop
    // inside it, so neither of their rects has anything to say about this.
    expect(frameAt(moved, [1, 0])?.rect).toEqual(rect(20, 20))
    expect(frameAt(moved, [1, 1])?.rect).toEqual(rect(90, 90))
    // Which is exactly what naming it by a panel cannot do.
    expect(rectOf(setFrameRect(desktop, 'a', rect(140, 120)), 'a')).toEqual(rect(140, 120))
    expect(frameAt(setFrameRect(desktop, 'a', rect(140, 120)), [1])?.rect).toEqual(
      rect(40, 40, 400, 300),
    )
  })

  it('fills the float with the window, and rolls it up', () => {
    const desktop = nested()
    expect(isMaximized(frameAt(maximizeFrameAt(desktop, [1]), [1])!)).toBe(true)
    // Only the window: what is on the desktop it holds is untouched.
    expect(isMaximized(frameAt(maximizeFrameAt(desktop, [1]), [1, 0])!)).toBe(false)
    expect(isMinimized(frameAt(minimizeFrameAt(desktop, [1]), [1])!)).toBe(true)
    // The two are exclusive here as everywhere.
    const rolled = minimizeFrameAt(maximizeFrameAt(desktop, [1]), [1])
    expect(isMaximized(frameAt(rolled, [1])!)).toBe(false)
    // Nothing sitting at that path is nothing to do.
    expect(maximizeFrameAt(desktop, [0, 0])).toBe(desktop)
    expect(setFrameRectAt(desktop, [1], rect(40, 40, 400, 300))).toBe(desktop)
  })

  it('raises the window and the piles it is in, never the pile inside it', () => {
    const desktop = nested()
    const raised = raiseFrameAt(desktop, [0])
    // Items to the front of the float it is on.
    expect(panelIds(raised)).toEqual(['a', 'b', 'items'])

    // The window holding the desktop, brought forward: the two windows on that
    // desktop keep the order they were in, since neither of them was touched.
    const front = raiseFrameAt(raiseFrameAt(desktop, [0]), [0])
    expect(panelIds(front)).toEqual(['items', 'a', 'b'])
    // Where naming it by a panel differs: the innermost frame comes forward too.
    expect(panelIds(raiseFrame(desktop, 'a'))).toEqual(['items', 'b', 'a'])
    // Already in front, with nothing inside to raise, is nothing to do.
    expect(raiseFrameAt(desktop, [1])).toBe(desktop)
  })

  it('says where a path lands once the frame it names is raised', () => {
    const desktop = nested()
    // Last in every pile along the way, which is what raising one does.
    expect(raisedPath(desktop, [0])).toEqual([1])
    expect(raisedPath(desktop, [1])).toEqual([1])
    expect(raisedPath(desktop, [1, 0])).toEqual([1, 1])
    // A step that is not a float keeps its index: a pane is not a stack.
    expect(raisedPath(row([panelNode('z'), desktop]), [1, 0])).toEqual([1, 1])
  })

  it('reaches a window inside a desktop that shares a strip', () => {
    // The desktop tabbed beside a pane: its windows are still windows, and the
    // path to one of them runs through the strip.
    const strip = group(['items', float([frame(panelNode('a'), rect(20, 20))])])
    expect(framePathOf(strip, 'a')).toEqual([1, 0])
    expect(frameAt(strip, [1, 0])?.rect).toEqual(rect(20, 20))
    expect(frameAt(setFrameRectAt(strip, [1, 0], rect(60, 60)), [1, 0])?.rect).toEqual(
      rect(60, 60),
    )
  })
})

describe('nodeTitle', () => {
  it('names a group after the tab on top', () => {
    expect(nodeTitle(group(['a', 'b'], 'b'), titleFor)).toBe('Bravo')
  })

  it('names a split after its first pane', () => {
    expect(nodeTitle(grid(), titleFor)).toBe('Alpha')
    expect(nodeTitle(column([grid(), panelNode('z')]), titleFor)).toBe('Alpha')
  })

  it('names a float after the window in front', () => {
    expect(nodeTitle(desk(), titleFor)).toBe('Bravo')
    expect(nodeTitle(raiseFrame(desk(), 'a'), titleFor)).toBe('Alpha')
  })

  it('prefers a frame’s own title when it has one', () => {
    const named = float([{ ...frame(grid()), title: 'Workbench' }])
    expect(nodeTitle(named, titleFor)).toBe('Workbench')
  })

  it('falls back to the panel id when the host declares no title', () => {
    expect(nodeTitle(panelNode('unknown'), titleFor)).toBe('unknown')
  })
})

/* ------------------------------------------------------------ maximizing */

describe('maximizeFrame', () => {
  it('fills the float with the window, keeping the rect to go back to', () => {
    const next = asFloat(maximizeFrame(desk(), 'a'))
    const held = frameOf(next, 'a')
    expect(held && isMaximized(held)).toBe(true)
    // Untouched: it is the place it restores to, not a stale copy of one.
    expect(held?.rect).toEqual(rect(0, 0))
    // And its neighbour is left exactly as it was.
    expect(isMaximized(next.frames[1] as never)).toBe(false)
  })

  it('restores it to the rect it kept', () => {
    const maxed = maximizeFrame(desk(), 'a')
    const restored = maximizeFrame(maxed, 'a', false)
    expect(shape(restored)).toBe(shape(desk()))
    // The flag is dropped rather than set false, so nothing is left behind.
    expect(frameOf(restored, 'a')).not.toHaveProperty('maximized')
  })

  it('toggles between the two', () => {
    const maxed = toggleMaximized(desk(), 'a')
    expect(isMaximized(frameOf(maxed, 'a') as never)).toBe(true)
    expect(isMaximized(frameOf(toggleMaximized(maxed, 'a'), 'a') as never)).toBe(false)
  })

  it('returns the same tree when it is already that way', () => {
    const desktop = desk()
    expect(maximizeFrame(desktop, 'a', false)).toBe(desktop)
    const maxed = maximizeFrame(desktop, 'a')
    expect(maximizeFrame(maxed, 'a')).toBe(maxed)
  })

  it('does nothing for a panel that is not floating', () => {
    const tiled = grid()
    expect(maximizeFrame(tiled, 'a')).toBe(tiled)
    expect(toggleMaximized(tiled, 'a')).toBe(tiled)
  })

  it('maximizes the innermost window when floats are nested', () => {
    const inner = float([frame(panelNode('a')), frame(panelNode('b'))])
    const outer = float([frame(inner, rect(0, 0, 400, 400)), frame(panelNode('c'))])
    const next = asFloat(maximizeFrame(outer, 'a'))
    // The window holding the inner float was not the one maximized.
    expect(isMaximized(next.frames[0] as never)).toBe(false)
    expect(isMaximized(frameOf(next, 'a') as never)).toBe(true)
  })
})

describe('a frame keeps what it is not asked about', () => {
  const named = (): WindowFloat =>
    float([
      { ...frame(row([panelNode('a'), panelNode('b')]), rect(0, 0)), title: 'Workbench' },
      frame(panelNode('c'), rect(300, 0)),
    ])

  it('keeps its title when it is moved', () => {
    const next = setFrameRect(named(), 'a', rect(40, 40))
    expect(frameOf(next, 'a')?.title).toBe('Workbench')
  })

  it('keeps its title and its size when it is maximized and restored', () => {
    const maxed = maximizeFrame(named(), 'a')
    expect(frameOf(maxed, 'a')?.title).toBe('Workbench')
    const restored = maximizeFrame(maxed, 'a', false)
    expect(frameOf(restored, 'a')).toEqual(frameOf(named(), 'a'))
  })

  it('keeps both when what it holds changes underneath it', () => {
    // Every operation that rewrites a frame's node goes through one traversal,
    // so none of them can drop the rest of the frame on the way.
    const maxed = maximizeFrame(named(), 'a')
    for (const next of [
      removePanel(maxed, 'b'),
      setActivePanel(maxed, 'a'),
      raiseFrame(maxed, 'c'),
      movePanel(maxed, 'c', 'a', 'center'),
    ]) {
      const held = next && frameOf(next, 'a')
      expect(held?.title).toBe('Workbench')
      expect(held && isMaximized(held)).toBe(true)
    }
  })
})

describe('minimizeFrame', () => {
  it('rolls a window up, keeping the rect to unroll into', () => {
    const next = minimizeFrame(desk(), 'a')
    const held = frameOf(next, 'a')
    expect(held && isMinimized(held)).toBe(true)
    expect(held?.rect).toEqual(rect(0, 0))
  })

  it('unrolls it to exactly the frame it was', () => {
    const rolled = minimizeFrame(desk(), 'a')
    expect(shape(minimizeFrame(rolled, 'a', false))).toBe(shape(desk()))
    expect(frameOf(minimizeFrame(rolled, 'a', false), 'a')).not.toHaveProperty('minimized')
  })

  it('toggles between the two', () => {
    const rolled = toggleMinimized(desk(), 'a')
    expect(isMinimized(frameOf(rolled, 'a') as never)).toBe(true)
    expect(isMinimized(frameOf(toggleMinimized(rolled, 'a'), 'a') as never)).toBe(false)
  })

  it('leaves the windows beside it alone', () => {
    const next = asFloat(minimizeFrame(desk(), 'a'))
    expect(isMinimized(next.frames[1] as never)).toBe(false)
    expect(next.frames[1]?.rect).toEqual(rect(240, 40))
  })

  it('returns the same tree when it is already that way', () => {
    const desktop = desk()
    expect(minimizeFrame(desktop, 'a', false)).toBe(desktop)
    const rolled = minimizeFrame(desktop, 'a')
    expect(minimizeFrame(rolled, 'a')).toBe(rolled)
  })

  it('does nothing for a panel that is not floating', () => {
    const tiled = grid()
    expect(minimizeFrame(tiled, 'a')).toBe(tiled)
    expect(toggleMinimized(tiled, 'a')).toBe(tiled)
  })
})

describe('minimized and maximized are exclusive', () => {
  it('maximizing a rolled-up window unrolls it', () => {
    const rolled = minimizeFrame(desk(), 'a')
    const held = frameOf(maximizeFrame(rolled, 'a'), 'a')
    expect(held && isMaximized(held)).toBe(true)
    expect(held && isMinimized(held)).toBe(false)
    expect(held).not.toHaveProperty('minimized')
  })

  it('rolling up a maximized window stops it filling the float', () => {
    const maxed = maximizeFrame(desk(), 'a')
    const held = frameOf(minimizeFrame(maxed, 'a'), 'a')
    expect(held && isMinimized(held)).toBe(true)
    expect(held && isMaximized(held)).toBe(false)
    expect(held).not.toHaveProperty('maximized')
  })

  it('and either way the rect it goes back to survives both', () => {
    let next: WindowNode = desk()
    next = minimizeFrame(next, 'a')
    next = maximizeFrame(next, 'a')
    next = minimizeFrame(next, 'a')
    next = minimizeFrame(next, 'a', false)
    expect(frameOf(next, 'a')?.rect).toEqual(rect(0, 0))
  })
})

describe('spaces', () => {
  const desk = () =>
    float(
      [
        { node: panelNode('a'), rect: { x: 40, y: 10, w: 200, h: 120 } },
        { node: panelNode('b'), rect: { x: 10, y: 90, w: 200, h: 120 } },
      ],
      'Workspace',
    )

  it('names a space after how it is shown, unless it was given a name', () => {
    expect(spaceTitle(row([panelNode('a'), panelNode('b')]))).toBe('Row')
    expect(spaceTitle(column([panelNode('a'), panelNode('b')]))).toBe('Column')
    expect(spaceTitle(float([frame(panelNode('a'))]))).toBe('Desktop')
    expect(spaceTitle(desk())).toBe('Workspace')
    // A group is a pane rather than a space of this kind, and has no such name.
    expect(spaceTitle(panelNode('a'))).toBe('')
  })

  it('tiles a desktop in the order its windows were laid out', () => {
    const tiled = tileFloat(desk(), 'row')
    expect(tiled.direction).toBe('row')
    // Across the desktop: b sits at x 10, a at x 40.
    expect(tiled.children.map(panelIds).flat()).toEqual(['b', 'a'])
    // The way back is kept on the split, and so is the name.
    expect(tiled.places?.map((place) => place.rect.x)).toEqual([10, 40])
    expect(tiled.title).toBe('Workspace')
  })

  it('floats a tiled space back to exactly where its windows were', () => {
    const back = floatSplit(tileFloat(desk(), 'column'))
    expect(back.title).toBe('Workspace')
    expect(back.frames.map((held) => held.rect)).toEqual([
      { x: 40, y: 10, w: 200, h: 120 },
      { x: 10, y: 90, w: 200, h: 120 },
    ])
  })

  it('cascades a split that never was a desktop', () => {
    const made = floatSplit(row([panelNode('a'), panelNode('b')]))
    expect(made.frames).toHaveLength(2)
    expect(made.frames[1]!.rect.x).toBeGreaterThan(made.frames[0]!.rect.x)
  })

  it('replaces the node at a path, and leaves the tree alone when nothing moved', () => {
    const tree = row([panelNode('a'), column([panelNode('b'), panelNode('c')])])
    const next = replaceAt(tree, [1], panelNode('b'))
    expect(panelIds(next)).toEqual(['a', 'b'])
    // The untouched half is the same object, so nothing above it re-renders.
    expect((next as WindowSplit).children[0]).toBe(tree.children[0])

    const inner = tree.children[1]!
    expect(replaceAt(tree, [1], inner)).toBe(tree)
    expect(replaceAt(tree, [9], panelNode('z'))).toBe(tree)
    expect(replaceAt(tree, [], panelNode('z'))).toEqual(panelNode('z'))
  })

  it('reaches into a float the same way it reaches into a split', () => {
    const tree = row([panelNode('a'), desk()])
    const next = replaceAt(tree, [1, 0], panelNode('z'))
    expect(panelIds(next)).toEqual(['a', 'z', 'b'])
    // The frame keeps its place and its name.
    const held = (next as WindowSplit).children[1] as WindowFloat
    expect(held.title).toBe('Workspace')
    expect(held.frames[0]!.rect).toEqual({ x: 40, y: 10, w: 200, h: 120 })
  })

  it('keeps a space around the last pane in a window', () => {
    // A row that loses everything but one panel would otherwise collapse into
    // that panel, leaving nothing to say how it is shown — and no way back to
    // a desktop from the last panel there is.
    const three = row([panelNode('a'), panelNode('b'), panelNode('c')])
    expect(shape(reconcileLayout(three, ['a', 'b']))).toBe('row(a, b)')
    expect(shape(reconcileLayout(three, ['a']))).toBe('row(a)')

    // A group of tabs is a space of its own and speaks for itself, so it is
    // left exactly as it is.
    const tabs = group(['a', 'b'])
    expect(rootSpace(tabs)).toBe(tabs)
    // And so is anything that is already a space — identity, not a copy.
    const desktop = float([frame(panelNode('a'))])
    expect(rootSpace(desktop)).toBe(desktop)
    expect(rootSpace(three)).toBe(three)

    // Idempotent: wrapping what is already wrapped changes nothing.
    const wrapped = rootSpace(panelNode('a'))
    expect(rootSpace(wrapped)).toBe(wrapped)
  })

  it('carries a row\'s name through a close and a drop', () => {
    // The split is rebuilt around what is left of its children either way, and
    // a space rebuilt is the same space: it is not renamed by being used.
    const named = row([panelNode('a'), panelNode('b'), panelNode('c')], undefined, 'Workspace')
    expect(removePanel(named, 'c')).toMatchObject({ title: 'Workspace' })
    // A drop along the same axis, which joins the split...
    expect(insertPanel(named, 'd', 'b', 'right')).toMatchObject({ title: 'Workspace' })
    // ...and one across it, which divides the pane it landed on.
    expect(insertPanel(named, 'd', 'b', 'bottom')).toMatchObject({ title: 'Workspace' })
    // The pair a cross-axis drop makes is a new space, and has no name to keep.
    expect(asSplit(insertPanel(named, 'd', 'b', 'bottom')).children[1]).not.toMatchObject({
      title: 'Workspace',
    })
  })

  it('keeps a named space whole rather than dissolving it into its parent', () => {
    // A row named by the host inside a row of the same direction is not
    // flattened into it: the name is something said about *that* space, and a
    // space that is dissolved says it no longer.
    const tree = row([panelNode('a'), row([panelNode('b'), panelNode('c')], undefined, 'Right')])
    const flat = normalizeLayout(tree)
    expect(shape(flat)).toBe('row(a, row(b, c))')
    expect(asSplit(flat).children[1]).toMatchObject({ title: 'Right' })

    // Nor collapsed into its only child when a panel is dragged out of it —
    // which is the shape a named space is otherwise lost in, one drag at a
    // time, with nothing on screen to say why the name went.
    const moved = movePanel(tree, 'b', 'a', 'center')
    expect(shape(moved)).toBe('row(a|[b], row(c))')
    expect(asSplit(moved).children[1]).toMatchObject({ title: 'Right' })

    // And it shares a strip as one tab, keeping its own panes, the way a
    // desktop does — see `tabsOf`.
    expect(shape(collapseToTabs(tree, 'a'))).toBe('[a]|(row(b, c))')
  })

  it('carries a desktop\'s name through a store and a rebuild', () => {
    const stored = JSON.parse(JSON.stringify(desk())) as WindowFloat
    expect(normalizeLayout(stored)).toMatchObject({ title: 'Workspace' })
    expect(removePanel(stored, 'a')).toMatchObject({ title: 'Workspace' })
    expect(raiseFrame(stored, 'a')).toMatchObject({ title: 'Workspace' })
  })
})

/*
 * A name is said in all four shapes.
 *
 * A row, a column and a desktop each draw a header of their own to say it on;
 * the fourth shape is a strip, which has none — its tabs already say what is on
 * it. So a named space shown as tabs keeps the name on the strip, and keeps the
 * places of the windows it was, or "Tabs" would be the one of the four that
 * loses what the space was: the name first, and then the space itself, since a
 * space with nothing said about it is dissolved into the one around it.
 */
describe('a named space through all four shapes', () => {
  /** A desktop called `Right`, beside a pane, in a row called `Top`. */
  const mixed = () =>
    row(
      [
        panelNode('items'),
        float(
          [
            { node: panelNode('sources'), rect: { x: 20, y: 20, w: 300, h: 200 } },
            { node: panelNode('activity'), rect: { x: 90, y: 170, w: 300, h: 220 } },
          ],
          'Right',
        ),
      ],
      [0.45, 0.55],
      'Top',
    )

  const rightOf = (node: WindowNode) => nodeAt(node, [1])

  it('names a strip the layout named, and nothing else', () => {
    expect(spaceTitle(group(['a', 'b'], undefined, 'Right'))).toBe('Right')
    // A strip with no name says nothing rather than `Tabs`: its tabs already
    // say what is on it, and naming it after itself is no name.
    expect(spaceTitle(group(['a', 'b']))).toBe('')
    expect(spaceChrome(group(['a', 'b'], undefined, 'Right'))).toEqual({ title: 'Right' })
  })

  it('keeps the name and the places when a desktop is shown as tabs', () => {
    const strip = asGroup(collapseSpace(rightOf(mixed())!))
    expect(strip.title).toBe('Right')
    expect(strip.panels).toEqual(['sources', 'activity'])
    expect(strip.places?.map((place) => place.rect)).toEqual([
      { x: 20, y: 20, w: 300, h: 200 },
      { x: 90, y: 170, w: 300, h: 220 },
    ])
  })

  it('puts the windows back where they were when the strip is a desktop again', () => {
    const strip = collapseSpace(rightOf(mixed())!)
    const back = floatTabs(strip, 'sources')
    expect(shape(back)).toBe('float(sources@20,20 300x200, activity@90,170 300x220)')
    expect(back).toMatchObject({ title: 'Right' })
  })

  it('hands the way back on to the row the strip is spread into', () => {
    // Through the third shape and into the second: the record is the space's
    // rather than the shape's, so it survives being read from either.
    const strip = collapseSpace(rightOf(mixed())!)
    const spread = spreadTabs(strip, 'sources', 'column')
    expect(spread).toMatchObject({ title: 'Right', direction: 'column' })
    expect(shape(floatSplit(asSplit(spread)))).toBe(
      'float(sources@20,20 300x200, activity@90,170 300x220)',
    )
  })

  it('is still a space of its own after the round trip, inside the row it sits in', () => {
    // The shape that dissolved it: a row spread inside a row is that row —
    // unless it is a space someone named, which this one is at every step.
    const tiled = normalizeLayout(replaceAt(mixed(), [1], tileFloat(rightOf(mixed()) as never, 'row')))
    const tabbed = normalizeLayout(replaceAt(tiled, [1], collapseSpace(nodeAt(tiled, [1])!)))
    const again = normalizeLayout(spreadTabs(tabbed, 'sources', 'row'))

    expect(shape(tabbed)).toBe('row(items, [sources]|activity)')
    expect(nodeAt(tabbed, [1])).toMatchObject({ title: 'Right' })
    expect(shape(again)).toBe('row(items, row(sources, activity))')
    expect(nodeAt(again, [1])).toMatchObject({ title: 'Right' })
  })

  it('shares a strip as one tab rather than being emptied into it', () => {
    // Two strips in one place are one strip, unless one of them is a space
    // someone said something about — the rule a desktop and a tiled row have.
    const named = row([panelNode('items'), group(['sources', 'activity'], undefined, 'Right')])
    expect(shape(collapseSpace(named))).toBe('[items]|([sources]|activity)')
    expect(shape(collapseSpace(row([panelNode('items'), group(['sources', 'activity'])])))).toBe(
      '[items]|sources|activity',
    )
  })

  it('keeps the name when the tabs change under it, and drops only the places', () => {
    const strip = asGroup(collapseSpace(rightOf(mixed())!))
    const left = removePanel(strip, 'activity')
    expect(left).toMatchObject({ title: 'Right' })
    // The list no longer pairs with the tabs, so it is not a record of
    // anything — the same tolerance a split's places and sizes have.
    expect(asGroup(left).places).toBeUndefined()
  })

  it('keeps the places through a click on a tab, and carries one along the strip', () => {
    const strip = asGroup(collapseSpace(rightOf(mixed())!))
    // Looking at another tab is not a rearrangement of anything.
    expect(asGroup(setActivePanel(strip, 'activity')).places).toEqual(strip.places)

    // Dragging a tab along the strip takes its place with it, since the place
    // is that window's rather than that position's.
    const moved = asGroup(moveTab(strip, 'activity', 0))
    expect(moved.panels).toEqual(['activity', 'sources'])
    expect(moved.places?.map((place) => place.rect.x)).toEqual([90, 20])
    expect(shape(floatTabs(moved, 'sources'))).toBe(
      'float(activity@90,170 300x220, sources@20,20 300x200)',
    )
  })

  it('says the name once when the last pane is wrapped in a space of its own', () => {
    // A single pane is given a row to hold it, so the four choices have a bar
    // to be offered from — and the name goes up to that bar rather than being
    // said twice, once by each.
    const wrapped = asSplit(rootSpace(group(['a'], undefined, 'Right')))
    expect(wrapped.title).toBe('Right')
    expect(asGroup(wrapped.children[0] ?? null).title).toBeUndefined()

    // A strip sharing itself with a space needs no such row: the space in it
    // speaks for itself, from this very strip.
    const holding = group([desk()], undefined, 'Top')
    expect(rootSpace(holding)).toBe(holding)
  })
})

describe('fixed and headless spaces', () => {
  const desk = () =>
    float(
      [
        { node: panelNode('a'), rect: { x: 40, y: 10, w: 200, h: 120 } },
        { node: panelNode('b'), rect: { x: 10, y: 90, w: 200, h: 120 } },
      ],
      'Workspace',
    )

  it('says what a space asks for without touching the one it was given', () => {
    const plain = row([panelNode('a'), panelNode('b')])
    const bare = headless(plain)
    expect(plain.headless).toBeUndefined()
    expect(bare.headless).toBe(true)
    expect(shape(bare)).toBe(shape(plain))

    // Composable, in either order, and on any kind of node.
    expect(fixedView(bare)).toMatchObject({ headless: true, fixedView: true })
    expect(headless(fixedView(panelNode('a')))).toMatchObject({
      kind: 'group',
      panels: ['a'],
      headless: true,
      fixedView: true,
    })

    expect(spaceChrome(plain)).toEqual({})
    expect(spaceChrome(fixedView(bare))).toEqual({ headless: true, fixedView: true })
  })

  it('keeps what a split said about its bar through a rebuild', () => {
    const stored = JSON.parse(JSON.stringify(headless(grid()))) as WindowSplit
    expect(normalizeLayout(stored)).toMatchObject({ headless: true })
    expect(removePanel(stored, 'c')).toMatchObject({ headless: true })
    expect(normalizeLayout(fixedView(grid()))).toMatchObject({ fixedView: true })
  })

  it('does not dissolve a space the host shaped', () => {
    // An ordinary row of one collapses into that one child, and an ordinary
    // row inside a row of the same direction is flattened into it.
    expect(shape(normalizeLayout(row([panelNode('a')])))).toBe('a')
    expect(
      shape(normalizeLayout(row([row([panelNode('a'), panelNode('b')]), panelNode('c')]))),
    ).toBe('row(a, b, c)')

    // Both are things said about *that* space, so it is kept whole.
    const alone = normalizeLayout(headless(row([panelNode('a')])))
    expect(shape(alone)).toBe('row(a)')
    expect(alone).toMatchObject({ headless: true })

    const nested = normalizeLayout(
      row([fixedView(row([panelNode('a'), panelNode('b')])), panelNode('c')]),
    )
    expect(shape(nested)).toBe('row(row(a, b), c)')
    expect(asSplit(nested).children[0]).toMatchObject({ fixedView: true })
  })

  it('keeps a headless pane in a headless space', () => {
    // The row `rootSpace` puts around the last pane says what the pane said:
    // a host that drew a panel without a bar did not ask for a row with one.
    const wrapped = asSplit(reconcileLayout(headless(panelNode('a')), ['a']))
    expect(shape(wrapped)).toBe('row(a)')
    expect(wrapped).toMatchObject({ headless: true })
    expect(wrapped.children[0]).toMatchObject({ headless: true })

    // An ordinary pane is wrapped in an ordinary row, as it always was.
    expect(rootSpace(panelNode('a'))).not.toMatchObject({ headless: true })
  })

  it('keeps it through a drop, a close and a tab switch', () => {
    // A space is not restated every time something is dropped into it or
    // closed out of it, so what it said has to survive both.
    const space = headless(row([panelNode('a'), panelNode('b')]))
    expect(insertPanel(space, 'c', 'b', 'right')).toMatchObject({ headless: true })
    expect(removePanel(space, 'b')).toMatchObject({ headless: true })

    const tabs = fixedView(group(['a', 'b']))
    expect(insertPanel(tabs, 'c', 'a', 'center')).toMatchObject({ fixedView: true })
    expect(setActivePanel(tabs, 'b')).toMatchObject({ fixedView: true })
    expect(moveTab(tabs, 'a', 1)).toMatchObject({ fixedView: true })
    expect(removePanel(tabs, 'a')).toMatchObject({ fixedView: true })
  })

  it('carries what a space said across a change of shape', () => {
    // A desktop tiled is the same space shown differently, and so is the row
    // floated back — the bar it does not draw is not drawn either way.
    const tiled = tileFloat(headless(desk()), 'row')
    expect(tiled).toMatchObject({ headless: true, title: 'Workspace' })
    expect(floatSplit(tiled)).toMatchObject({ headless: true })
    expect(floatSplit(fixedView(row([panelNode('a'), panelNode('b')])))).toMatchObject({
      fixedView: true,
    })

    // The same, a level down: a group of tabs is a space too.
    expect(collapseToTabs(headless(row([panelNode('a'), panelNode('b')])), 'a')).toMatchObject({
      kind: 'group',
      headless: true,
    })
    expect(spreadTabs(fixedView(group(['a', 'b'])), 'a', 'column')).toMatchObject({
      kind: 'split',
      direction: 'column',
      fixedView: true,
    })
    expect(floatTabs(headless(group(['a', 'b'])), 'a')).toMatchObject({
      kind: 'float',
      headless: true,
    })
  })
})

describe('two bars over one content', () => {
  /** A named space holding one space: the pair either bar can be left out of. */
  const nested = () => row([column([panelNode('b'), panelNode('c')])], undefined, 'Workspace')

  it('finds the one space a space holds', () => {
    const pair = nested()
    expect(onlySpace(pair)).toBe(pair.children[0])

    // A strip is one half as readily as a split is: its only tab is a space.
    const strip = group([column([panelNode('b'), panelNode('c')])], undefined, 'Workspace')
    expect(onlySpace(strip)).toBe(strip.panels[0])

    // Tabs are a space in their own right, so a space holding a strip of them
    // is a pair too.
    expect(onlySpace(headless(row([group(['b', 'c'])])))).toMatchObject({
      kind: 'group',
      panels: ['b', 'c'],
    })
  })

  it('says no to everything that is not a pair', () => {
    // More than one child is an arrangement rather than a bar drawn twice.
    expect(onlySpace(grid())).toBeNull()
    expect(onlySpace(group(['a', 'b']))).toBeNull()
    // A lone pane is not a space: what is under its header is content.
    expect(onlySpace(row([panelNode('a')]))).toBeNull()
    expect(onlySpace(panelNode('a'))).toBeNull()
    // A window is placed over a desktop rather than dividing it, so a desktop
    // of one window is a desktop with a window on it.
    expect(onlySpace(float([frame(column([panelNode('b'), panelNode('c')]))]))).toBeNull()
  })

  it('keeps the outer bar, and the content arrives under its name', () => {
    const merged = mergeSpace(nested(), 'outer')
    expect(shape(merged)).toBe('column(b, c)')
    expect(merged).toMatchObject({ title: 'Workspace' })

    // The shape is the inner space's, whatever the outer was showing: a strip
    // stays a strip, and the name is said in front of its tabs instead.
    const tabs = mergeSpace(row([group(['b', 'c'])], undefined, 'Workspace'), 'outer')
    expect(tabs).toMatchObject({ kind: 'group', panels: ['b', 'c'], title: 'Workspace' })
  })

  it('drops what the inner said about a bar that is no longer drawn', () => {
    const merged = mergeSpace(
      row([fixedView(headless(column([panelNode('b'), panelNode('c')])))], undefined, 'Workspace'),
      'outer',
    )
    // One bar is left and it is the outer's, so what it says is the outer's
    // too — all three of the things a space says about the bar it draws.
    expect(merged).toEqual(column([panelNode('b'), panelNode('c')], undefined, 'Workspace'))
  })

  it('keeps the inner bar, exactly as it was', () => {
    const pair = headless(nested())
    // Nothing is rebuilt: the space that stays is the one that was there.
    expect(mergeSpace(pair, 'inner')).toBe(pair.children[0])
    expect(mergeSpace(pair, 'inner')).not.toMatchObject({ title: 'Workspace' })
  })

  it('leaves a space it has nothing to merge exactly as it was', () => {
    const tree = grid()
    expect(mergeSpace(tree, 'outer')).toBe(tree)
    expect(mergeSpace(tree, 'inner')).toBe(tree)
  })

  it('leaves the same content behind whichever bar is kept', () => {
    const tree = row([panelNode('a'), nested()])
    const held = tree.children[1]!
    const outer = normalizeLayout(replaceAt(tree, [1], mergeSpace(held, 'outer')))
    const inner = normalizeLayout(replaceAt(tree, [1], mergeSpace(held, 'inner')))

    expect(shape(outer)).toBe('row(a, column(b, c))')
    expect(shape(inner)).toBe(shape(outer))
    // Only the name tells them apart — which is the whole of the choice.
    expect(asSplit(outer).children[1]).toMatchObject({ title: 'Workspace' })
    expect(asSplit(inner).children[1]!.title).toBeUndefined()
  })

  it('is one space afterwards, and offers no second merge', () => {
    expect(onlySpace(mergeSpace(nested(), 'outer'))).toBeNull()
    expect(onlySpace(mergeSpace(nested(), 'inner'))).toBeNull()
  })
})

describe('a space with nothing left in it', () => {
  /** A desktop called `Right` beside a pane, the pair of them in a row. */
  const beside = () =>
    row([panelNode('a'), float([frame(panelNode('b'), { x: 20, y: 20 })], 'Right')], [0.4, 0.6])

  it('keeps a named space its last pane was dragged out of', () => {
    const left = removePanel(beside(), 'b')
    expect(shape(left)).toBe('row(a, float())')
    expect(nodeAt(left!, [1])).toMatchObject({ kind: 'float', frames: [], title: 'Right' })
    // Its share of the row is its own too: what emptied is the space, not the
    // room it was given.
    expect(sizesOf(asSplit(left)).map((size) => Math.round(size * 100))).toEqual([40, 60])
  })

  it('drops the same space where the host said nothing about it', () => {
    const plain = row([panelNode('a'), float([frame(panelNode('b'))])])
    expect(shape(removePanel(plain, 'b'))).toBe('a')
    // The three things a space says about its bar each keep it, a name being
    // only the loudest of them.
    expect(shape(removePanel(row([panelNode('a'), headless(float([frame(panelNode('b'))]))]), 'b')))
      .toBe('row(a, float())')
    expect(
      shape(removePanel(row([panelNode('a'), fixedView(column([panelNode('b')]))]), 'b')),
    ).toBe('row(a, column())')
  })

  it('keeps it through a tidy-up as well as through the move that emptied it', () => {
    const emptied = row([panelNode('a'), float([], 'Right')], [0.4, 0.6])
    expect(shape(normalizeLayout(emptied))).toBe('row(a, float())')
    expect(nodeAt(normalizeLayout(emptied), [1])).toMatchObject({ title: 'Right' })
    // And drops one that says nothing, which is what it always did.
    expect(shape(normalizeLayout(row([panelNode('a'), float([])])))).toBe('a')
  })

  it('lets a strip go all the same, having no bar left to be named on', () => {
    // What says a strip's name is its tabs: with none there is nothing to draw.
    expect(removePanel(group(['b'], undefined, 'Right'), 'b')).toBeNull()
    expect(shape(removePanel(row([panelNode('a'), group(['b'], undefined, 'Right')]), 'b'))).toBe('a')
  })

  it('is the last space in the window as readily as any other', () => {
    expect(removePanel(float([frame(panelNode('a'))], 'Right'), 'a')).toMatchObject({
      kind: 'float',
      frames: [],
      title: 'Right',
    })
    // Nothing said about it, and nothing in it: there is no window left.
    expect(removePanel(float([frame(panelNode('a'))]), 'a')).toBeNull()
  })
})

describe('dropIntoSpace', () => {
  const emptied = () => row([panelNode('a'), float([], 'Right')], [0.4, 0.6])

  it('puts a panel onto a desktop that has nothing on it', () => {
    const next = dropIntoSpace(emptied(), 'a', [1], { x: 30, y: 40, w: 200, h: 160 })
    // The row went with the pane that left it, leaving the desktop it was
    // beside — with the panel on it as a window at the rect the drop worked out.
    expect(shape(next)).toBe('float(a@30,40 200x160)')
    expect(next).toMatchObject({ title: 'Right' })
  })

  it('reads the path from the tree it was given, not the one it leaves', () => {
    // Lifting `a` out first shifts every child of the row along one, so a path
    // read before the move and used after it would name the desktop beside the
    // one meant. Both halves happen in one walk, which is what keeps `[1]` true.
    const tree = row([panelNode('a'), float([], 'Right'), float([], 'Other')])
    const next = asSplit(dropIntoSpace(tree, 'a', [1], { x: 8, y: 8, w: 120, h: 90 }))
    expect(shape(next)).toBe('row(float(a@8,8 120x90), float())')
    expect(next.children[0]).toMatchObject({ title: 'Right' })
    expect(next.children[1]).toMatchObject({ title: 'Other' })
  })

  it('gives a tiled space the one pane it has not got', () => {
    const tree = row([panelNode('a'), panelNode('b'), column([], undefined, 'Right')])
    const next = dropIntoSpace(tree, 'b', [2])
    expect(shape(next)).toBe('row(a, column(b))')
    expect(nodeAt(next, [1])).toMatchObject({ title: 'Right' })
  })

  it('is added to what is there, never put in its place', () => {
    // A space with no panel in it can still hold a space with none — and that
    // one has a name of its own, which the pane arriving does not write over.
    const nested = row([panelNode('a'), row([float([], 'Right')], undefined, 'Top')])
    const next = dropIntoSpace(nested, 'a', [1])
    expect(shape(next)).toBe('row(float(), a)')
    expect(nodeAt(next, [0])).toMatchObject({ title: 'Right' })
    expect(next).toMatchObject({ title: 'Top' })
  })

  it('leaves the layout alone where the drop has nowhere to land', () => {
    const tree = emptied()
    // A path naming no space at all, and one naming a space with a pane in it:
    // a drop into a space is the way back into an empty one and nothing else.
    expect(dropIntoSpace(tree, 'a', [4])).toBe(tree)
    expect(dropIntoSpace(tree, 'a', [0])).toBe(tree)
    expect(dropIntoSpace(tree, 'z', [1])).toBe(tree)
  })
})
