import type {
  FloatFrame,
  FloatRect,
  FramePlace,
  WindowFloat,
  WindowGroup,
  WindowNode,
  WindowSplit,
  WindowTab,
} from './types'

/**
 * A layout as text short enough for an address bar, so a window's arrangement
 * — which panels are open, where, and which tab is on top — can live in the
 * URL beside the shell's query and come back on reload or from a pasted link.
 *
 * The notation is Rison: JSON's shapes in characters a query value can carry
 * literally. An object is `(key:value,…)`, a list `!(…)`, `true` is `!t`, and a
 * string is bare when it is a plain word and `'quoted'` otherwise (`!'` and
 * `!!` escape inside the quotes). The layout is first put in a compact form of
 * its own, with one-letter keys and nothing written that is a default:
 *
 *   group   (g:!(tab,…),a:active)        a tab is a panel id or a node
 *   split   (r:!(node,…),z:!(sizes))     `c:` instead of `r:` for a column
 *   float   (f:!(frame,…))               frame  (n:node,b:!(x,y,w,h),M:!t,m:!t)
 *   any     t:title  h:!t headless  v:!t fixed view  p:!(place,…) remembered frames
 *
 * and a panel alone in a group with nothing else to say is written as its id,
 * so the common window is mostly names: `(r:!(browse,'rec:a'),z:!(0.6,0.4))`.
 */

type Value = string | number | boolean | null | Value[] | { [key: string]: Value }
type Record_ = { [key: string]: Value }

// ── the compact form ─────────────────────────────────────────

/** Shares of a split are relative; three places are more than a drag can tell apart. */
const share = (n: number) => Math.round(n * 1000) / 1000

function chrome(node: WindowNode, out: Record_): Record_ {
  if (node.title) out.t = node.title
  if (node.headless) out.h = true
  if (node.fixedView) out.v = true
  return out
}

function rect(r: FloatRect): Value[] {
  return [Math.round(r.x), Math.round(r.y), Math.round(r.w), Math.round(r.h)]
}

function place(held: FramePlace): Record_ {
  const out: Record_ = { b: rect(held.rect) }
  if (held.title) out.t = held.title
  if (held.maximized) out.M = true
  if (held.minimized) out.m = true
  return out
}

/** A panel alone in a group that says nothing else: written as just its id. */
function bare(node: WindowNode): string | null {
  if (node.kind !== 'group' || node.panels.length !== 1) return null
  const only = node.panels[0]
  if (typeof only !== 'string') return null
  if (node.title || node.headless || node.fixedView || node.places) return null
  return only
}

function compact(node: WindowNode): Value {
  const id = bare(node)
  if (id !== null) return id
  return compactNode(node)
}

function compactNode(node: WindowNode): Record_ {
  if (node.kind === 'group') {
    const out: Record_ = { g: node.panels.map((tab: WindowTab) => (typeof tab === 'string' ? tab : compactNode(tab))) }
    // The first tab is on top when nothing says otherwise.
    if (node.active !== undefined && node.active !== node.panels[0]) out.a = node.active
    if (node.places) out.p = node.places.map(place)
    return chrome(node, out)
  }
  if (node.kind === 'split') {
    const out: Record_ = { [node.direction === 'row' ? 'r' : 'c']: node.children.map(compact) }
    if (node.sizes) out.z = node.sizes.map(share)
    if (node.places) out.p = node.places.map(place)
    return chrome(node, out)
  }
  const out: Record_ = {
    f: node.frames.map((held) => ({ n: compact(held.node), ...place(held) })),
  }
  return chrome(node, out)
}

// ── and back ─────────────────────────────────────────────────

class Malformed extends Error {}

const fail = (): never => {
  throw new Malformed()
}

const isRecord = (value: Value): value is Record_ =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const list = (value: Value | undefined): Value[] => (Array.isArray(value) ? value : fail())

const text = (value: Value | undefined): string | undefined =>
  value === undefined ? undefined : typeof value === 'string' ? value : fail()

const numbers = (value: Value | undefined): number[] =>
  list(value).map((n) => (typeof n === 'number' && Number.isFinite(n) ? n : fail()))

function readRect(value: Value | undefined): FloatRect {
  const [x, y, w, h] = numbers(value)
  if (h === undefined) fail()
  return { x: x!, y: y!, w: w!, h: h! }
}

function readPlace(value: Value): FramePlace {
  if (!isRecord(value)) return fail()
  const out: FramePlace = { rect: readRect(value.b) }
  const title = text(value.t)
  if (title) out.title = title
  if (value.M === true) out.maximized = true
  if (value.m === true) out.minimized = true
  return out
}

function readChrome<T extends WindowNode>(value: Record_, node: T): T {
  const title = text(value.t)
  if (title) node.title = title
  if (value.h === true) node.headless = true
  if (value.v === true) node.fixedView = true
  return node
}

function expand(value: Value): WindowNode {
  if (typeof value === 'string') return { kind: 'group', panels: [value] }
  if (!isRecord(value)) return fail()

  if (value.g !== undefined) {
    const panels = list(value.g).map((tab): WindowTab => (typeof tab === 'string' ? tab : expand(tab)))
    if (panels.length === 0) fail()
    const node: WindowGroup = { kind: 'group', panels }
    const active = text(value.a)
    if (active !== undefined) node.active = active
    if (value.p !== undefined) node.places = list(value.p).map(readPlace)
    return readChrome(value, node)
  }

  const direction = value.r !== undefined ? 'row' : value.c !== undefined ? 'column' : null
  if (direction) {
    const children = list(direction === 'row' ? value.r : value.c).map(expand)
    const node: WindowSplit = { kind: 'split', direction, children }
    if (value.z !== undefined) node.sizes = numbers(value.z)
    if (value.p !== undefined) node.places = list(value.p).map(readPlace)
    return readChrome(value, node)
  }

  if (value.f !== undefined) {
    const frames = list(value.f).map((held): FloatFrame => {
      if (!isRecord(held) || held.n === undefined) return fail()
      return { node: expand(held.n), ...readPlace(held) }
    })
    const node: WindowFloat = { kind: 'float', frames }
    return readChrome(value, node)
  }

  return fail()
}

// ── Rison ────────────────────────────────────────────────────

/** Characters that end a bare word, or would be mistaken for one of the notation's own. */
const NOT_BARE = /[ '!:(),*@$]/
const BARE_NUMBER = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][-+]?\d+)?$/

function quote(value: string): string {
  const plain = value !== '' && !NOT_BARE.test(value) && !/^[-\d]/.test(value)
  return plain ? value : `'${value.replace(/[!']/g, (c) => `!${c}`)}'`
}

function stringify(value: Value): string {
  if (value === null) return '!n'
  if (value === true) return '!t'
  if (value === false) return '!f'
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '!n'
  if (typeof value === 'string') return quote(value)
  if (Array.isArray(value)) return `!(${value.map(stringify).join(',')})`
  return `(${Object.entries(value)
    .map(([key, inner]) => `${quote(key)}:${stringify(inner)}`)
    .join(',')})`
}

function parse(source: string): Value {
  let at = 0
  const peek = () => source[at]
  const expect = (c: string) => (source[at++] === c ? undefined : fail())

  const word = (): string => {
    if (peek() === "'") {
      at++
      let out = ''
      for (;;) {
        const c = source[at++]
        if (c === undefined) return fail()
        if (c === "'") return out
        if (c === '!') {
          const escaped = source[at++]
          if (escaped !== '!' && escaped !== "'") fail()
          out += escaped
        } else out += c
      }
    }
    const start = at
    while (at < source.length && !NOT_BARE.test(source[at]!)) at++
    if (at === start) fail()
    return source.slice(start, at)
  }

  const value = (): Value => {
    const c = peek()
    if (c === '(') {
      at++
      const out: Record_ = {}
      if (peek() === ')') {
        at++
        return out
      }
      for (;;) {
        const key = word()
        expect(':')
        out[key] = value()
        const next = source[at++]
        if (next === ')') return out
        if (next !== ',') fail()
      }
    }
    if (c === '!') {
      at++
      const kind = source[at++]
      if (kind === 't') return true
      if (kind === 'f') return false
      if (kind === 'n') return null
      if (kind !== '(') return fail()
      const out: Value[] = []
      if (peek() === ')') {
        at++
        return out
      }
      for (;;) {
        out.push(value())
        const next = source[at++]
        if (next === ')') return out
        if (next !== ',') fail()
      }
    }
    if (c === "'") return word()
    const raw = word()
    return BARE_NUMBER.test(raw) ? Number(raw) : raw
  }

  const out = value()
  if (at !== source.length) fail()
  return out
}

// ── the two directions ───────────────────────────────────────

/** A layout as one line of text, for an address bar or anywhere else that keeps text. */
export function encodeLayout(node: WindowNode): string {
  return stringify(compact(node))
}

/**
 * The layout {@link encodeLayout} wrote, or `null` for anything it could not
 * have — a URL is typed into and pasted from, and a mangled one should open
 * the window as it would with none rather than throw. What comes back is
 * well-formed but not reconciled: it may name panels the host no longer has,
 * which `WindowFrame` squares with its panels the way it does any layout.
 */
export function decodeLayout(source: string): WindowNode | null {
  try {
    return expand(parse(source))
  } catch (error) {
    if (error instanceof Malformed) return null
    throw error
  }
}
