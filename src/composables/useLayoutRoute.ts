import { getCurrentScope, onScopeDispose, toValue, watch } from 'vue'
import type { MaybeRefOrGetter, Ref } from 'vue'
import type { RouteAdapter } from '../routing/adapter'
import type { WindowNode } from '../window/types'
import { decodeLayout, encodeLayout } from '../window/codec'

export interface UseLayoutRouteOptions {
  /**
   * The route the layout is written to. Give it the same adapter as the
   * `DataShell` in the window — provided under `ROUTE_ADAPTER_KEY`, or passed
   * as its `route` — so each sees the other's parameters and keeps them: two
   * adapters over one address bar each write from a search the other has
   * since changed.
   */
  adapter: RouteAdapter
  /** The query parameter the layout is held in. `w` by default. */
  param?: string
  /**
   * The layout the window opens with. While the window is in it the parameter
   * is left out, so an untouched window has the URL it had before, and a URL
   * that loses the parameter — back to before anything was opened — goes back
   * to it.
   */
  home?: MaybeRefOrGetter<WindowNode | null | undefined>
  /**
   * Milliseconds a change waits before it is written. A splitter dragged
   * across the screen is a change per frame, and browsers refuse a page that
   * rewrites its address that fast.
   */
  delay?: number
}

export interface LayoutRoute {
  /** Writes a change still waiting out {@link UseLayoutRouteOptions.delay} now. */
  flush(): void
}

/** The raw value of one parameter of a search string, or `null` when it is absent. */
function readParam(search: string, key: string): string | null {
  for (const chunk of search.replace(/^[?]/, '').split('&')) {
    const eq = chunk.indexOf('=')
    const name = eq === -1 ? chunk : chunk.slice(0, eq)
    if (safeDecode(name) === key) return eq === -1 ? '' : chunk.slice(eq + 1)
  }
  return null
}

/**
 * A search string with one parameter set, or removed for `null`. Every other
 * parameter is kept exactly as written — in place, and escaped as whoever
 * wrote it chose to — so the shell's query reads the same either side of it.
 */
function writeParam(search: string, key: string, value: string | null): string {
  const chunks = search.replace(/^[?]/, '').split('&').filter(Boolean)
  const at = chunks.findIndex((chunk) => {
    const eq = chunk.indexOf('=')
    return safeDecode(eq === -1 ? chunk : chunk.slice(0, eq)) === key
  })
  const pair = value === null ? null : `${encodeURIComponent(key)}=${value}`
  if (at === -1) {
    if (pair) chunks.push(pair)
  } else if (pair) chunks[at] = pair
  else chunks.splice(at, 1)
  return chunks.length ? `?${chunks.join('&')}` : ''
}

function safeDecode(raw: string): string {
  try {
    return decodeURIComponent(raw.replace(/\+/g, ' '))
  } catch {
    return raw
  }
}

/**
 * Characters `encodeURIComponent` escapes that the layout's notation is made
 * of, and that a query value carries literally — so the address bar shows
 * `w=(r:!(browse,'rec:a'))` rather than a wall of percent signs.
 */
const READABLE: Array<[RegExp, string]> = [
  [/%2C/g, ','],
  [/%3A/g, ':'],
  [/%2F/g, '/'],
  [/%40/g, '@'],
  [/%24/g, '$'],
  [/%20/g, '+'],
]

const toParam = (text: string) => {
  let out = encodeURIComponent(text)
  for (const [pattern, literal] of READABLE) out = out.replace(pattern, literal)
  return out
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
export function useLayoutRoute(
  layout: Ref<WindowNode | null>,
  options: UseLayoutRouteOptions,
): LayoutRoute {
  const { adapter } = options
  const param = options.param ?? 'w'
  const delay = options.delay ?? 200
  const home = () => toValue(options.home) ?? null

  /** The parameter as the URL last had it when the layout and the URL agreed. */
  let written = readParam(adapter.search.value, param)
  let timer: ReturnType<typeof setTimeout> | null = null

  const cancel = () => {
    if (timer !== null) clearTimeout(timer)
    timer = null
  }

  /** The layout a value of the parameter stands for; `null` for none at all. */
  const fromParam = (raw: string | null): WindowNode | null => {
    if (raw === null) return home()
    return decodeLayout(safeDecode(raw)) ?? home()
  }

  const write = () => {
    cancel()
    const node = layout.value
    const start = home()
    const text = node ? encodeLayout(node) : null
    const raw = text === null || (start && text === encodeLayout(start)) ? null : toParam(text)
    written = raw
    const next = writeParam(adapter.search.value, param, raw)
    if (next !== adapter.search.value) adapter.replace(next)
  }

  const initial = fromParam(written)
  if (initial) layout.value = initial

  watch(layout, () => {
    cancel()
    timer = setTimeout(write, delay)
  })

  // Back, forward, or a host writing the parameter itself.
  watch(adapter.search, (search) => {
    const raw = readParam(search, param)
    if (raw === written) return
    cancel()
    written = raw
    const next = fromParam(raw)
    if (next) layout.value = next
  })

  // A change still waiting is still a change: write it on the way out.
  if (getCurrentScope()) onScopeDispose(() => (timer !== null ? write() : undefined))

  return { flush: () => (timer !== null ? write() : undefined) }
}
