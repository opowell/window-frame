import { computed, defineComponent, h, ref, watch } from 'vue'
import type { PropType } from 'vue'
import DataShell from '../src/components/DataShell.vue'
import FacetControl from '../src/components/FacetControl.vue'
import ResultsArea from '../src/components/ResultsArea.vue'
import StatusPill from '../src/components/StatusPill.vue'
import WindowFrame from '../src/components/WindowFrame.vue'
import MenuBar from '../src/components/MenuBar.vue'
import { provideShellContext } from '../src/composables/context'
import { usePaneMenu } from '../src/composables/paneMenu'
import { useQueryState } from '../src/composables/useQueryState'
import { useResults } from '../src/composables/useResults'
import { drillExpression } from '../src/query/drill'
import { isViewKind } from '../src/query/schema'
import { SHELL_THEMES, VIEW_KINDS } from '../src/types'
import { createMemoryAdapter } from '../src/routing/memory'
import { createHistoryAdapter } from '../src/routing/history'
import { createMockDataSource } from '../src/data/mock'
import { iRadarSchema } from '../src/fixtures/schemas'
import type {
  ColumnDef,
  DataSource,
  DomainSchema,
  EntitySchema,
  FacetDef,
  FacetValue,
  RecordStatus,
  ShellAlign,
  ShellQueryDefaults,
  ShellTheme,
  ShellWidthMatch,
  ViewKind,
} from '../src/types'
import type { WindowNode, WindowPanelDef } from '../src/window/types'
import type { MenuItemDef } from '../src/menu/types'
import { cascade, column, group, panelNode, row } from '../src/window/layout'
import SelectCell from './cells/SelectCell.vue'
import { selectedRows } from './selection'

export { selectedRows }

/**
 * `theme` is one of a fixed set, so the control is a picker rather than the
 * text field Storybook infers from a string arg — a typo in an open field just
 * falls through to the default and looks like the theme doing nothing.
 *
 * Spread into the meta of any story that renders a themed component.
 */
export const themeArgTypes = {
  theme: {
    control: { type: 'select' as const },
    options: [...SHELL_THEMES],
    description: 'Which shipped palette the component wears.',
    table: { defaultValue: { summary: 'minimal' } },
  },
}

export interface ShellStoryArgs {
  /** Initial query, as it would appear in the URL. */
  search?: string
  schema?: DomainSchema
  source?: DataSource
  defaults?: ShellQueryDefaults
  pinnable?: boolean
  open?: boolean
  theme?: ShellTheme
  /** Whether the panel grows to the bar, or the bar comes in to the panel. */
  matchWidth?: ShellWidthMatch
  /** Where the pair sits once `matchWidth: 'shrink'` has narrowed them. */
  headAlign?: ShellAlign
  accent?: string
  /** Token overrides passed straight to the shell. */
  tokens?: Record<string, string>
  limit?: number
  /** Rows inside each type's card on the home screen. */
  previewsPerType?: number
  /** Restricts the offered result views. Every one of them when unset. */
  views?: ViewKind[]
  /**
   * Drive the real address bar instead of an in-memory route. Off by default so
   * stories stay isolated from each other; the routing stories turn it on.
   */
  liveUrl?: boolean
  /** Render inside a fixed-size box rather than filling the frame. */
  inset?: boolean
  /**
   * Wrap the shell in a host with its own background, text colour and font —
   * what the `inherit` theme has to blend into.
   */
  host?: 'paper' | 'slate'
  /** Slot content, for the stories about what a host puts into the shell. */
  slots?: Record<string, () => unknown>
  /**
   * What the host does when a card's `create` button is pressed. The shell
   * makes nothing itself, so a story that offers the button needs one of
   * these for anything to come of it.
   */
  onCreate?: (entity: EntitySchema) => void
}

/**
 * Renders a shell for a story. Each story gets its own route adapter, so one
 * story's query cannot leak into the next.
 */
export function renderShell(args: ShellStoryArgs) {
  const schema = args.schema ?? iRadarSchema
  return {
    setup() {
      const adapter = args.liveUrl
        ? createHistoryAdapter()
        : createMemoryAdapter(args.search ?? '')

      const shell = () =>
        h(DataShell, {
          schema,
          route: adapter,
          source: args.source ?? createMockDataSource({ seed: schema.key }),
          limit: args.limit ?? 50,
          previewsPerType: args.previewsPerType ?? 3,
          pinnable: args.pinnable ?? false,
          theme: args.theme ?? 'minimal',
          matchWidth: args.matchWidth ?? 'grow',
          headAlign: args.headAlign ?? 'center',
          ...(args.views ? { views: args.views } : {}),
          ...(args.defaults ? { defaults: args.defaults } : {}),
          ...(args.accent ? { accent: args.accent } : {}),
          ...(args.tokens ? { tokens: args.tokens } : {}),
          ...(args.open ? { open: true } : {}),
          ...(args.onCreate ? { onCreate: args.onCreate } : {}),
        }, args.slots)

      const hosted = () =>
        args.host ? h('div', { class: `sb-host sb-host--${args.host}` }, [shell()]) : shell()

      return () =>
        args.inset
          ? h('div', { class: 'sb-inset' }, [hosted()])
          : h('div', { class: 'sb-frame' }, [hosted()])
    },
  }
}

/**
 * Wraps a bare part in the shell surface so its design tokens resolve. Parts
 * do not need the shell's context, only its `.dc-shell` scope.
 *
 * `extraStyle` lands on the shell element itself, which is a full-height flex
 * *column* — so a row of parts has to say `flex-direction:row` as well as
 * `display:flex`, and `align-items:flex-start` with it, or each part stretches
 * to the height of the page.
 */
export function partSurface(children: unknown[], extraStyle = '') {
  return h(
    'div',
    { class: 'dc-shell', style: `padding:24px; min-height:100%; ${extraStyle}` },
    children as never,
  )
}

/** A facet control bound to local state, for the facet stories. */
export function statefulFacet(facet: FacetDef, initial: FacetValue) {
  return {
    setup() {
      const value = ref(initial)
      return () =>
        partSurface([
          h(FacetControl, {
            facet,
            value: value.value,
            onUpdate: (next: FacetValue) => {
              value.value = next
            },
          }),
        ], 'max-width:320px')
    },
  }
}

/** A source that answers after a delay, for exercising the pending state. */
export function delayedSource(ms: number, seed = 'iRadar'): DataSource {
  const inner = createMockDataSource({ seed })
  return {
    query: (request) =>
      new Promise((resolve) => setTimeout(() => resolve(inner.query(request)), ms)),
  }
}

/**
 * The mock source with names and paths long enough to overrun any column.
 *
 * What a real corpus looks like once its records are files: a name that is a
 * sentence and a secondary that is the path it came from, both far past what a
 * column can hold. The views have to stay inside the shell's width regardless,
 * so this is what the ones with columns are tested against.
 */
export function longValueSource(seed = 'iRadar'): DataSource {
  const inner = createMockDataSource({ seed })
  const PREFIX = 'packages/test-tooling/record-test/.crawl-runs/2026-08-29T20-08-58'
  return {
    query: (request) => {
      const result = inner.query(request)
      return {
        ...result,
        rows: result.rows.map((row) => ({
          ...row,
          primary: `${row.primary} — every word of a name nobody thought would be shown in a column`,
          secondary: `${PREFIX}/${row.id}/${row.secondary}`,
        })),
      }
    },
  }
}

/** A source that always fails, for exercising the error state. */
export function failingSource(message = 'The results service is unavailable'): DataSource {
  return {
    query: () => {
      throw new Error(message)
    },
  }
}

/* ----------------------------------------------------------------- columns */

/**
 * iRadar's items with a column set of the host's own: a checkbox in front, the
 * kind and the rank the facets already carry, and the date and state behind —
 * nine columns where the labels describe four.
 */
export function selectableSchema(): DomainSchema {
  const columns: ColumnDef[] = [
    { key: 'select', kind: 'component', component: SelectCell, width: '36px' },
    { key: 'ordinal', kind: 'ordinal', label: '#', width: '48px' },
    { key: 'primary', label: 'Item', sort: 'name', activate: true, scope: true },
    { key: 'secondary', label: 'URL', mono: true, muted: true, hideBelow: 620 },
    { key: 'kind', label: 'Kind', width: '80px' },
    { key: 'rank', label: 'Rank', width: '72px', align: 'right', mono: true, hideBelow: 760 },
    {
      key: 'metric1',
      kind: 'number',
      label: 'Links',
      width: '80px',
      sort: 'metric1',
      hideBelow: 900,
    },
    { key: 'updatedAt', kind: 'date', label: 'Updated', sort: 'updated', width: '116px', mono: true, muted: true, hideBelow: 900 },
    { key: 'status', kind: 'status', label: 'State', width: '104px' },
  ]
  return {
    ...iRadarSchema,
    entities: iRadarSchema.entities.map((entity) =>
      entity.key === 'items' ? { ...entity, columns } : entity,
    ),
  }
}

/**
 * A type that has not said what its table is.
 *
 * The shell invents no columns, so this one has no table — it says so rather
 * than drawing an empty frame, which is what a silent `v-for` over nothing
 * gets you and reads as the data having gone missing.
 */
export function noColumnsSchema(): DomainSchema {
  return {
    ...iRadarSchema,
    entities: iRadarSchema.entities.map((entity) => {
      if (entity.key !== 'searches') return entity
      const bare = { ...entity }
      delete bare.columns
      return bare
    }),
  }
}

/**
 * Columns for the mixed result set: every entity at once, where no single
 * type's vocabulary applies and one set of headings has to serve rows of every
 * kind. Declared on the schema rather than on any entity — the type leads,
 * because across kinds it is the column that tells you most.
 */
export function everythingColumnsSchema(): DomainSchema {
  return {
    ...iRadarSchema,
    columns: [
      { key: 'ordinal', kind: 'ordinal', label: '#', width: '48px' },
      { key: 'entityLabel', label: 'Kind', width: '120px', mono: true, when: 'everything' },
      { key: 'primary', label: 'Record', sort: 'name', activate: true, scope: true },
      { key: 'secondary', label: 'Reference', mono: true, muted: true, hideBelow: 620 },
      { key: 'score', kind: 'score', label: 'Match', width: '72px', hideBelow: 760 },
      {
        key: 'updatedAt',
        kind: 'date',
        label: 'Updated',
        sort: 'updated',
        width: '116px',
        mono: true,
        muted: true,
        hideBelow: 900,
      },
      { key: 'status', kind: 'status', label: 'State', width: '104px' },
    ],
  }
}

/* ------------------------------------------------------------------ window */

/** What each view kind is called, where one has to be named in a menu. */
const VIEW_LABELS: Record<ViewKind, string> = {
  list: 'List',
  cards: 'Cards',
  grid: 'Grid',
  table: 'Table',
  links: 'Links',
  preview: 'Preview',
}

/**
 * The worked case: a panel whose content is a table of items, switched by the
 * panel's own header control.
 *
 * Nothing here is window-specific. It is the shell's query state and results
 * — both exported on their own — provided as a context for the view
 * components to read, with the window's chosen view pushed into the query.
 * A host with its own table would bind `view` to that instead.
 */
export const ItemsPanel = defineComponent({
  name: 'ItemsPanel',
  props: {
    /** The view the window's menu is on. */
    view: { type: String, default: 'table' },
    /** Initial query, as it would appear in the URL. */
    search: { type: String, default: '?e=items' },
    schema: { type: Object as PropType<DomainSchema>, default: () => iRadarSchema },
    /**
     * Offer the view type in the *pane's* menu, from in here, rather than
     * leaving it to the views the panel declared. The window is told nothing:
     * this panel has no `views`, and the item appears anyway.
     */
    ownMenu: { type: Boolean, default: false },
  },
  setup(props) {
    // In memory, so a panel in a story never writes to the address bar.
    const adapter = createMemoryAdapter(props.search)
    const schema = computed(() => props.schema)
    const query = useQueryState({ schema, adapter })
    const source = computed(() => createMockDataSource({ seed: props.schema.key }))
    const results = useResults({
      source,
      query: query.query,
      schema,
      entity: query.entity,
      limit: computed(() => 50),
    })

    provideShellContext({
      ...query,
      schema,
      entities: computed(() => props.schema.entities),
      rows: results.rows,
      total: results.total,
      limit: computed(() => 50),
      offset: results.offset,
      pageCount: results.pageCount,
      pending: results.pending,
      error: results.error,
      source,
      previewsPerType: computed(() => 3),
      pinnable: computed(() => false),
      isPinned: () => false,
      isPinnedId: () => false,
      togglePin: () => {},
      activate: () => {},
      create: () => {},
      /*
       * The reference host: a drill is an expression term plus, when the press
       * was a metric rather than the row, the entity to list afterwards. The
       * shell reports it and this decides what it meant — which is the whole
       * of what a host has to write.
       */
      drill: (row, entity) => {
        query.narrow(drillExpression(props.schema, query.query.value, row), entity?.key ?? null)
      },
    })

    watch(
      () => props.view,
      (view) => {
        if (isViewKind(view)) query.setView(view)
      },
      { immediate: true },
    )

    /*
     * The content's own contribution to the menu of whatever pane it is in.
     * Which view the results are in is the content's state — it is in this
     * panel's URL, not in the window's `views` — so the item that changes it
     * comes from here. Read as a getter, so the tick follows the view.
     */
    if (props.ownMenu) {
      usePaneMenu(() => [
        {
          id: 'view-type',
          label: 'View type',
          items: VIEW_KINDS.map((kind) => ({
            id: `view-${kind}`,
            label: VIEW_LABELS[kind],
            checked: query.query.value.view === kind,
            action: () => query.setView(kind),
          })),
        },
      ])
    }

    return () => h(ResultsArea)
  },
})

/** A plain list of records, for the panels that are not the worked case. */
export function paneList(rows: Array<[string, string, RecordStatus?]>) {
  return h(
    'ul',
    { class: 'sb-pane-list' },
    rows.map(([primary, secondary, status]) =>
      h('li', { class: 'sb-pane-list__row' }, [
        h('span', { class: 'sb-pane-list__primary dc-truncate' }, primary),
        h('span', { class: 'sb-pane-list__secondary dc-mono dc-truncate' }, secondary),
        status ? h(StatusPill, { status }) : null,
      ]),
    ),
  )
}

/** A stream of log lines. */
export function paneLog(lines: string[]) {
  return h(
    'pre',
    { class: 'sb-pane-log dc-mono' },
    lines.map((line) => h('div', { class: 'sb-pane-log__line' }, line)),
  )
}

export interface WindowStoryArgs {
  panels: WindowPanelDef[]
  /** Starting arrangement. Omitted lays every panel out in a row. */
  layout?: WindowNode | null
  movable?: boolean
  resizable?: boolean
  theme?: ShellTheme
  accent?: string
  /** Content per panel id, given the view that panel is showing. */
  content?: Record<string, (view: string) => unknown>
  /** The view each panel starts on, for a pane not offered the choice. */
  views?: Record<string, string>
  /** Render inside a fixed-size box rather than filling the frame. */
  inset?: boolean
  /** Gives every panel a close button, which asks the host to drop it. */
  closable?: boolean
  /** Whether a pane offers the menu that switches how its space is shown. */
  menu?: boolean
  /** Whether a strip that is a named space says that name beside its tabs. */
  spaceNames?: boolean
}

/**
 * Renders a window for a story. The layout and the panel list are held
 * locally, so dragging or closing a panel in one story cannot change what the
 * next one starts with.
 */
export function renderWindow(args: WindowStoryArgs) {
  return {
    setup() {
      const panels = ref<WindowPanelDef[]>([...args.panels])
      const layout = ref<WindowNode | null>(args.layout ?? null)
      const views = ref<Record<string, string>>({ ...args.views })

      /* Closing is a request the host answers: the window emits and nothing
         else, so a panel stays until it is filtered out of `panels` here. */
      function closePanel(id: string) {
        panels.value = panels.value.filter((panel) => panel.id !== id)
      }

      const slots: Record<string, (props: { panel: WindowPanelDef; view: string }) => unknown> = {}
      for (const [id, render] of Object.entries(args.content ?? {})) {
        slots[`panel-${id}`] = ({ view }) => render(view)
      }

      const win = () =>
        h(
          WindowFrame,
          {
            panels: panels.value,
            layout: layout.value,
            'onUpdate:layout': (next: WindowNode | null) => {
              layout.value = next
            },
            views: views.value,
            'onUpdate:views': (next: Record<string, string>) => {
              views.value = next
            },
            movable: args.movable ?? false,
            resizable: args.resizable ?? true,
            closable: args.closable ?? false,
            onPanelClose: closePanel,
            menu: args.menu ?? true,
            spaceNames: args.spaceNames ?? true,
            theme: args.theme ?? 'minimal',
            ...(args.accent ? { accent: args.accent } : {}),
          },
          slots,
        )

      return () =>
        args.inset
          ? h('div', { class: 'sb-inset' }, [win()])
          : h('div', { class: 'sb-frame' }, [win()])
    },
  }
}


/* --------------------------------------------------------------- workbench */

export interface WorkbenchStoryArgs {
  /** The panels the window starts with. More can be made from the menu. */
  panels: WindowPanelDef[]
  layout?: WindowNode | null
  /** Content per panel id. Panels made at runtime fall back to a generic one. */
  content?: Record<string, (view: string) => unknown>
  movable?: boolean
  /** Puts a menu bar over the window, the way an application has one. */
  menuBar?: boolean
  theme?: ShellTheme
}

/** What a panel made at runtime is: a name, and something to show in it. */
const MADE: Record<string, { title: string; lines: string[] }> = {
  note: {
    title: 'Note',
    lines: [
      'A panel made from the menu.',
      'It is in `panels` now, and the',
      'layout reconciled around it.',
    ],
  },
  log: {
    title: 'Log',
    lines: ['level=info  msg="panel opened"', 'level=info  msg="layout reconciled"'],
  },
  query: {
    title: 'Query',
    lines: ['SELECT * FROM items', 'WHERE score > 100', 'ORDER BY updated DESC'],
  },
}

/**
 * A window whose panel *list* is state, so panels can be made and closed while
 * it runs.
 *
 * This is the half the window deliberately does not do. `panels` belongs to
 * the host; the window only ever squares its layout against it. Making a panel
 * is a push onto that array, and closing one is a filter in the `panel-close`
 * handler — everything about where the new panel lands, and how the space it
 * left is shared out, is `reconcileLayout`'s doing.
 */
export function renderWorkbench(args: WorkbenchStoryArgs) {
  return {
    setup() {
      const panels = ref<WindowPanelDef[]>([...args.panels])
      const layout = ref<WindowNode | null>(args.layout ?? null)
      const views = ref<Record<string, string>>({})
      /** Which kind each made panel was, so its content can be rendered. */
      const made = ref<Record<string, string>>({})
      let count = 0

      function addPanel(kind: keyof typeof MADE) {
        count += 1
        const id = `${kind}-${count}`
        made.value = { ...made.value, [id]: kind }
        panels.value = [...panels.value, { id, title: `${MADE[kind]?.title ?? 'Panel'} ${count}` }]
      }

      function closePanel(id: string) {
        panels.value = panels.value.filter((panel) => panel.id !== id)
      }

      function reset() {
        panels.value = [...args.panels]
        layout.value = args.layout ?? null
        made.value = {}
        count = 0
      }

      const ids = () => panels.value.map((panel) => panel.id)

      const menus = computed<MenuItemDef[]>(() => [
        {
          label: 'File',
          items: [
            { id: 'new-note', label: 'New note', shortcut: 'N', action: () => addPanel('note') },
            { id: 'new-log', label: 'New log', shortcut: 'L', action: () => addPanel('log') },
            { id: 'new-query', label: 'New query', shortcut: 'Q', action: () => addPanel('query') },
            { separator: true },
            {
              id: 'recent',
              label: 'Open recent',
              items: [
                { label: 'items.json', disabled: true },
                { label: 'sources.yaml', disabled: true },
                { separator: true },
                { label: 'A submenu, to any depth', disabled: true },
              ],
            },
            { separator: true },
            { id: 'reset', label: 'Reset the window', action: reset },
            {
              id: 'close-all',
              label: 'Close every panel',
              disabled: panels.value.length === 0,
              action: () => {
                panels.value = []
              },
            },
          ],
        },
        {
          label: 'View',
          items: [
            {
              id: 'view-row',
              label: 'Everything in a row',
              action: () => {
                layout.value = row(ids().map(panelNode))
              },
            },
            {
              id: 'view-column',
              label: 'Everything in a column',
              action: () => {
                layout.value = column(ids().map(panelNode))
              },
            },
            {
              id: 'view-tabs',
              label: 'Everything in tabs',
              action: () => {
                layout.value = group(ids())
              },
            },
            {
              id: 'view-windows',
              label: 'Everything in windows',
              action: () => {
                layout.value = cascade(ids().map(panelNode), { w: 380, h: 250 })
              },
            },
          ],
        },
        { label: 'Help', items: [{ label: 'Every menu here is data', disabled: true }] },
      ])

      /* One generic slot serves every panel, declared or made, by switching on
         which panel it was handed. */
      const slots = {
        panel: ({ panel, view }: { panel: WindowPanelDef; view: string }) => {
          const own = args.content?.[panel.id]
          if (own) return own(view)
          const kind = made.value[panel.id] ?? ''
          return paneLog(MADE[kind]?.lines ?? ['Nothing to show.'])
        },
      }

      return () =>
        h('div', { class: 'sb-frame sb-workbench' }, [
          args.menuBar === false
            ? null
            : h(MenuBar, { menus: menus.value, label: 'Workbench menu' }),
          h(
            WindowFrame,
            {
              class: 'sb-workbench__window',
              panels: panels.value,
              layout: layout.value,
              'onUpdate:layout': (next: WindowNode | null) => {
                layout.value = next
              },
              views: views.value,
              'onUpdate:views': (next: Record<string, string>) => {
                views.value = next
              },
              movable: args.movable ?? true,
              closable: true,
              theme: args.theme ?? 'minimal',
              onPanelClose: closePanel,
            },
            slots,
          ),
        ])
    },
  }
}
