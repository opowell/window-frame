import { describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, ref } from 'vue'
import type { WindowNode } from '../../src/window/types'
import { decodeLayout, encodeLayout } from '../../src/window/codec'
import {
  float,
  frame,
  group,
  headless,
  insertPanel,
  panelIds,
  panelNode,
  row,
  setActivePanel,
  setSizesAt,
  column,
} from '../../src/window/layout'
import { useLayoutRoute } from '../../src/composables/useLayoutRoute'
import { createMemoryAdapter } from '../../src/routing/memory'

const roundTrip = (node: WindowNode) => decodeLayout(encodeLayout(node))

describe('encodeLayout / decodeLayout', () => {
  it('writes a panel alone in a group as its bare id', () => {
    expect(encodeLayout(row([panelNode('a'), panelNode('b')]))).toBe('(r:!(a,b))')
  })

  it('round-trips splits, sizes, tabs and the tab on top', () => {
    const layout = setSizesAt(
      row([headless(panelNode('browse')), column([group(['x', 'y', 'z'], 'y'), panelNode('w')])]),
      [],
      [0.6, 0.4],
    )
    expect(roundTrip(layout)).toEqual(layout)
  })

  it('leaves out a tab on top that is the first, which is what none means', () => {
    expect(encodeLayout(group(['x', 'y'], 'x'))).toBe('(g:!(x,y))')
    expect(encodeLayout(group(['x', 'y'], 'y'))).toBe('(g:!(x,y),a:y)')
  })

  it('round-trips a space tabbed beside a panel, its title, and headless chrome', () => {
    const console_ = { ...headless(row([headless(panelNode('browse')), group(['rec:1', 'rec:2'], 'rec:2')])), title: 'Console' }
    const layout = group([console_, 'play:9'], 'play:9')
    expect(roundTrip(layout)).toEqual(layout)
  })

  it('round-trips a desktop of floating windows', () => {
    const layout = float([
      frame(panelNode('a'), { x: 10, y: 20, w: 300, h: 200 }),
      { ...frame(group(['b', 'c']), { x: 40, y: 50, w: 320, h: 240 }), title: 'Pair', maximized: true },
    ])
    expect(roundTrip(layout)).toEqual(layout)
  })

  it('quotes ids the notation would otherwise read as its own', () => {
    const ids = ["rec:games:civ1", 'files:civ1/ai.js', "it's", 'a!b', '12', '-x', '', 'two words', '(x)', 'a,b']
    const layout = group(ids)
    expect(panelIds(roundTrip(layout)!)).toEqual(ids)
  })

  it('keeps sizes to three places', () => {
    const layout = setSizesAt(row([panelNode('a'), panelNode('b')]), [], [1 / 3, 2 / 3])
    expect(encodeLayout(layout)).toBe('(r:!(a,b),z:!(0.333,0.667))')
  })

  it('writes a window of one panel as just its id', () => {
    expect(encodeLayout(panelNode('browse'))).toBe('browse')
    expect(decodeLayout('browse')).toEqual(panelNode('browse'))
  })

  it.each([
    '',
    '(r:!(a,b)',
    '(r:!(a,b)))',
    '(x:!(a))',
    '(g:!())',
    "(g:!('a))",
    '(f:!((b:!(1,2,3,4))))',
    '(f:!((n:a,b:!(1,2,3))))',
    '(r:!(a),z:!(x))',
    '!t',
  ])('reads %j as nothing rather than throwing', (text) => {
    expect(decodeLayout(text)).toBeNull()
  })
})

describe('useLayoutRoute', () => {
  const home = () => headless(row([headless(panelNode('browse'))]))

  function setup(search = '') {
    const adapter = createMemoryAdapter(search, '/console/')
    const layout = ref<WindowNode | null>(home())
    const scope = effectScope()
    const route = scope.run(() => useLayoutRoute(layout, { adapter, home, delay: 0 }))!
    return { adapter, layout, scope, route }
  }

  it('leaves the URL alone while the window is as it opens', () => {
    const { adapter } = setup('?q=game:"civ1"')
    expect(adapter.search.value).toBe('?q=game:"civ1"')
  })

  it('writes an opened panel beside the parameters already there', async () => {
    const { adapter, layout, route } = setup('?q=game:"civ1"&s=name')
    layout.value = insertPanel(layout.value!, 'rec:games:civ1', 'browse', 'right')
    await nextTick()
    route.flush()
    const [, raw] = adapter.search.value.match(/^\?q=game:"civ1"&s=name&w=(.+)$/)!
    // Readable: the notation's own characters are not percent-escaped.
    expect(raw).toBe("(r:!((g:!(browse),h:!t),'rec:games:civ1'),z:!(0.5,0.5),h:!t)")
    expect(decodeLayout(decodeURIComponent(raw!))).toEqual(layout.value)
  })

  it('replaces the history entry rather than adding one', async () => {
    const { adapter, layout, route } = setup()
    layout.value = insertPanel(layout.value!, 'a', 'browse', 'right')
    await nextTick()
    route.flush()
    layout.value = setActivePanel(layout.value!, 'browse')
    await nextTick()
    route.flush()
    expect(adapter.history).toHaveLength(1)
  })

  it('opens the window as the URL has it', () => {
    const saved = row([headless(panelNode('browse')), group(['rec:1', 'rec:2'], 'rec:2')])
    const { layout } = setup(`?w=${encodeURIComponent(encodeLayout(saved))}`)
    expect(layout.value).toEqual(saved)
  })

  it('takes the parameter out again when the window is back as it opens', async () => {
    const { adapter, layout, route } = setup('?q=x')
    layout.value = insertPanel(layout.value!, 'a', 'browse', 'right')
    await nextTick()
    route.flush()
    expect(adapter.search.value).toContain('w=')
    layout.value = home()
    await nextTick()
    route.flush()
    expect(adapter.search.value).toBe('?q=x')
  })

  it('follows the URL back and forward', async () => {
    const saved = row([headless(panelNode('browse')), panelNode('a')])
    const { adapter, layout } = setup()
    adapter.push(`?w=${encodeURIComponent(encodeLayout(saved))}`)
    await nextTick()
    expect(layout.value).toEqual(saved)
    adapter.push('')
    await nextTick()
    expect(layout.value).toEqual(home())
  })

  it('ignores changes to the parameters that are not its own', async () => {
    const { adapter, layout } = setup()
    const before = layout.value
    adapter.push('?q=other')
    await nextTick()
    expect(layout.value).toBe(before)
  })

  it('opens as it would with no parameter when the one in the URL is mangled', () => {
    const { layout } = setup('?w=(r:!(a')
    expect(layout.value).toEqual(home())
  })

  it('waits out a burst of changes and writes the last', async () => {
    vi.useFakeTimers()
    try {
      const adapter = createMemoryAdapter('', '/')
      const layout = ref<WindowNode | null>(home())
      const replace = vi.spyOn(adapter, 'replace')
      const scope = effectScope()
      scope.run(() => useLayoutRoute(layout, { adapter, home, delay: 200 }))
      const opened = insertPanel(layout.value!, 'a', 'browse', 'right')
      for (const share of [0.5, 0.55, 0.6, 0.65]) {
        layout.value = setSizesAt(opened, [], [share, 1 - share])
        await nextTick()
        vi.advanceTimersByTime(50)
      }
      expect(replace).not.toHaveBeenCalled()
      vi.advanceTimersByTime(200)
      expect(replace).toHaveBeenCalledTimes(1)
      expect(adapter.search.value).toContain('z:!(0.65,0.35)')
      scope.stop()
    } finally {
      vi.useRealTimers()
    }
  })

  it('writes a change still waiting when its scope ends', async () => {
    const adapter = createMemoryAdapter('', '/')
    const layout = ref<WindowNode | null>(home())
    const scope = effectScope()
    scope.run(() => useLayoutRoute(layout, { adapter, home, delay: 10_000 }))
    layout.value = insertPanel(layout.value!, 'a', 'browse', 'right')
    await nextTick()
    scope.stop()
    expect(adapter.search.value).toContain('w=')
  })
})
