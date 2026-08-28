import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import {
  boxOf,
  chooseMenu,
  choosePaneMenu,
  chooseSpaceMenu,
  closeButton,
  desktopBox,
  desktopDrop,
  doubleClickTitleBar,
  dragFrame,
  dragFrameAt,
  dragFrameGrip,
  dragFrameGripAt,
  dragOntoDesktop,
  dragPanel,
  dragToTab,
  dropPanel,
  floatFrame,
  frameAtPath,
  frameBarAt,
  frameBox,
  frameBoxAt,
  frameOrder,
  gotoStory,
  grip,
  gutters,
  frameBar,
  frameMenuButton,
  maximizeButton,
  menuGroup,
  menuHeadings,
  menuItem,
  minimizeButton,
  menubarItem,
  menus,
  openPaneMenu,
  pane,
  paneMenuButton,
  paneHead,
  panelOrder,
  pickUpFrame,
  pickUpOntoDesktop,
  pickUpPanel,
  space,
  spaceMenuButton,
  spaceMode,
  spaceTab,
  stripName,
  tab,
  tabNames,
  tabOrder,
} from './story'

const ROW = 'window-panel-grid--default'
const GRID = 'window-panel-grid--items-table'
const MOVABLE = 'window-panel-grid--movable'
const NESTED = 'window-panel-grid--deep-nesting'
const FIXED_PANEL = 'window-panel-grid--fixed-panel'
const NO_RESIZE = 'window-panel-grid--fixed'
const SINGLE = 'window-panel-grid--single-panel'
const TABS = 'window-panel-grid--tabs'
const TABS_ONLY = 'window-panel-grid--tabs-only'

test.describe('Window — the grid', () => {
  test('lays every panel out in a row when given no layout', async ({ page }) => {
    await gotoStory(page, ROW)
    expect(await panelOrder(page)).toEqual(['items', 'sources', 'activity'])

    const [items, sources, activity] = await Promise.all([
      boxOf(page, 'items'),
      boxOf(page, 'sources'),
      boxOf(page, 'activity'),
    ])
    // Side by side, and level with each other.
    expect(items.x).toBeLessThan(sources.x)
    expect(sources.x).toBeLessThan(activity.x)
    expect(sources.y).toBeCloseTo(items.y, 0)
  })

  test('nests a column inside a row', async ({ page }) => {
    await gotoStory(page, GRID)
    const [items, sources, activity] = await Promise.all([
      boxOf(page, 'items'),
      boxOf(page, 'sources'),
      boxOf(page, 'activity'),
    ])

    // Both of the column's panels are to the right of the row's first child…
    expect(sources.x).toBeGreaterThan(items.x + items.width - 1)
    expect(activity.x).toBeCloseTo(sources.x, 0)
    // …and stacked on each other rather than beside.
    expect(activity.y).toBeGreaterThan(sources.y + sources.height - 1)
  })

  test('honours the shares a split is given', async ({ page }) => {
    await gotoStory(page, 'window-panel-grid--uneven-split')
    const [items, activity] = await Promise.all([boxOf(page, 'items'), boxOf(page, 'activity')])
    // Three to one, less the gutter between them.
    expect(items.width / activity.width).toBeGreaterThan(2.6)
    expect(items.width / activity.width).toBeLessThan(3.4)
  })

  test('renders a grid of any depth', async ({ page }) => {
    await gotoStory(page, NESTED)
    expect((await panelOrder(page)).sort()).toEqual(['activity', 'items', 'notes', 'sources'])

    const [items, notes] = await Promise.all([boxOf(page, 'items'), boxOf(page, 'notes')])
    // The outermost split is a column: the notes panel is below the whole row.
    expect(notes.y).toBeGreaterThan(items.y + items.height - 1)
    expect(page.locator('.dc-window__split[data-dc-direction="row"]')).toHaveCount(1)
    expect(page.locator('.dc-window__split[data-dc-direction="column"]')).toHaveCount(2)
  })

  test('a window of one panel is that panel, in a space of its own', async ({ page }) => {
    await gotoStory(page, SINGLE)
    expect(await panelOrder(page)).toEqual(['items'])
    await expect(gutters(page)).toHaveCount(0)
    // A space around it, because the four choices are a space's and a pane of
    // host content offers none of them — without one there would be no way to
    // float the last panel in a window. The pane's own menu is its views.
    await expect(space(page, '')).toHaveCount(1)
    await openPaneMenu(page, 'items')
    await expect(menuItem(page, 'show-row')).toHaveCount(0)
    await page.keyboard.press('Escape')

    await chooseSpaceMenu(page, '')
    // A row of one is already a column of one and one set of tabs.
    await expect(menuItem(page, 'show-row')).toBeDisabled()
    await expect(menuItem(page, 'show-column')).toBeDisabled()
    await expect(menuItem(page, 'show-tabs')).toBeDisabled()
    await expect(menuItem(page, 'show-desktop')).toBeEnabled()

    await menuItem(page, 'show-desktop').click()
    await expect(floatFrame(page, 'items')).toHaveCount(1)
  })
})

test.describe('Window — what a panel contains', () => {
  test('renders the host’s content in the panel body', async ({ page }) => {
    await gotoStory(page, GRID)
    await expect(pane(page, 'activity').locator('.dc-pane__body')).toContainText('index rebuilt')
    await expect(pane(page, 'sources')).toContainText('Hacker News')
  })

  test('names the panel, and says what it is showing', async ({ page }) => {
    await gotoStory(page, GRID)
    await expect(paneHead(page, 'items')).toContainText('Items')
    await expect(paneHead(page, 'items')).toContainText('entity:items')
    await expect(pane(page, 'items')).toHaveAttribute('aria-label', 'Items')
  })

  test('offers the views a panel declares under View, in its menu', async ({ page }) => {
    await gotoStory(page, GRID)
    // In the menu rather than beside the name: a header carrying a switcher as
    // well as a name, a subtitle and its buttons spends most of a narrow pane
    // on chrome, and the views content registers are menu items already.
    await expect(paneHead(page, 'items').locator('.dc-segmented')).toHaveCount(0)

    await choosePaneMenu(page, 'items', 'view')
    await expect(menuItem(page, 'view-table')).toHaveAttribute('aria-checked', 'true')
    await expect(menuItem(page, 'view-cards')).toHaveAttribute('aria-checked', 'false')
    await page.keyboard.press('Escape')

    // Sources declares none, so there is nothing in a menu for it to open.
    await expect(paneMenuButton(page, 'sources')).toHaveCount(0)
  })

  test('choosing a view swaps what that panel renders, and nothing else', async ({ page }) => {
    await gotoStory(page, GRID)
    const items = pane(page, 'items')
    await expect(items.locator('.dc-table')).toBeVisible()

    await choosePaneMenu(page, 'items', 'view', 'view-cards')
    await expect(items.locator('.dc-cards')).toBeVisible()
    await expect(items.locator('.dc-table')).toHaveCount(0)
    // The panel beside it is untouched.
    await expect(pane(page, 'sources')).toContainText('Hacker News')

    await choosePaneMenu(page, 'items', 'view', 'view-list')
    await expect(items.locator('.dc-list')).toBeVisible()
  })

  test('starts on the view the panel names as its default', async ({ page }) => {
    await gotoStory(page, 'window-panel-grid--items-as-cards')
    await expect(pane(page, 'items').locator('.dc-cards')).toBeVisible()

    await choosePaneMenu(page, 'items', 'view')
    await expect(menuItem(page, 'view-cards')).toHaveAttribute('aria-checked', 'true')
  })
})

test.describe('Window — resizing', () => {
  test('puts a splitter between each neighbouring pair', async ({ page }) => {
    await gotoStory(page, GRID)
    // One between the row's two children, one between the column's.
    await expect(gutters(page)).toHaveCount(2)
    await expect(gutters(page).first()).toHaveAttribute('aria-orientation', 'vertical')
    await expect(gutters(page).last()).toHaveAttribute('aria-orientation', 'horizontal')
    await expect(gutters(page).first()).toHaveAccessibleName('Resize Items and Sources')
  })

  test('dragging a splitter moves the boundary', async ({ page }) => {
    await gotoStory(page, GRID)
    const before = await boxOf(page, 'items')
    const gutter = gutters(page).first()
    const box = await gutter.boundingBox()
    if (!box) throw new Error('No splitter on screen')

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 - 200, box.y + box.height / 2, { steps: 10 })
    await page.mouse.up()

    const after = await boxOf(page, 'items')
    expect(after.width).toBeCloseTo(before.width - 200, -1)
    await expect(gutter).toHaveAttribute('aria-valuenow', /\d+/)
  })

  test('a splitter is reachable from the keyboard', async ({ page }) => {
    await gotoStory(page, GRID)
    const before = await boxOf(page, 'items')
    const gutter = gutters(page).first()

    await gutter.focus()
    await page.keyboard.press('ArrowRight')
    const wider = await boxOf(page, 'items')
    expect(wider.width).toBeGreaterThan(before.width)

    await page.keyboard.press('ArrowLeft')
    expect((await boxOf(page, 'items')).width).toBeCloseTo(before.width, -1)
  })

  test('will not squeeze a panel away entirely', async ({ page }) => {
    await gotoStory(page, GRID)
    const gutter = gutters(page).first()
    const box = await gutter.boundingBox()
    if (!box) throw new Error('No splitter on screen')

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x - 4000, box.y + box.height / 2, { steps: 10 })
    await page.mouse.up()

    // The minimum is a pixel floor, not zero.
    expect((await boxOf(page, 'items')).width).toBeGreaterThanOrEqual(100)
  })

  test('escape during a drag puts the boundary back', async ({ page }) => {
    await gotoStory(page, GRID)
    const before = await boxOf(page, 'items')
    const box = await gutters(page).first().boundingBox()
    if (!box) throw new Error('No splitter on screen')

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x - 150, box.y + box.height / 2, { steps: 8 })
    await page.keyboard.press('Escape')
    await page.mouse.up()

    expect((await boxOf(page, 'items')).width).toBeCloseTo(before.width, -1)
  })

  test('holds the boundary when resizing is off', async ({ page }) => {
    await gotoStory(page, NO_RESIZE)
    const before = await boxOf(page, 'items')
    const gutter = gutters(page).first()
    await expect(gutter).toHaveAttribute('aria-disabled', 'true')
    await expect(gutter).toHaveAttribute('tabindex', '-1')

    const box = await gutter.boundingBox()
    if (!box) throw new Error('No splitter on screen')
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x - 200, box.y + box.height / 2, { steps: 8 })
    await page.mouse.up()

    expect((await boxOf(page, 'items')).width).toBeCloseTo(before.width, -1)
  })
})

test.describe('Window — moving a panel', () => {
  test('offers no grip, and no drag, when moving is off', async ({ page }) => {
    await gotoStory(page, ROW)
    await expect(page.locator('.dc-pane__grip')).toHaveCount(0)

    await dragPanel(page, 'items', 'activity', 'right')
    expect(await panelOrder(page)).toEqual(['items', 'sources', 'activity'])
  })

  test('previews where the panel would land before it is let go', async ({ page }) => {
    await gotoStory(page, MOVABLE)
    await pickUpPanel(page, 'items', 'activity', 'right')

    await expect(page.locator('.dc-window__ghost')).toHaveText('Items')
    const preview = pane(page, 'activity').locator('.dc-pane__drop')
    await expect(preview).toHaveAttribute('data-dc-edge', 'right')

    // The preview covers the half of the target the panel would take.
    const [target, box] = await Promise.all([
      boxOf(page, 'activity'),
      preview.boundingBox(),
    ])
    if (!box) throw new Error('No drop preview')
    expect(box.width).toBeCloseTo(target.width / 2, -1)
    expect(box.x).toBeGreaterThan(target.x + target.width / 4)

    await dropPanel(page)
  })

  test('an edge drop puts the panel beside the one it was dropped on', async ({ page }) => {
    await gotoStory(page, MOVABLE)
    await dragPanel(page, 'items', 'activity', 'right')

    const [items, activity] = await Promise.all([boxOf(page, 'items'), boxOf(page, 'activity')])
    expect(items.x).toBeGreaterThan(activity.x)
    expect(items.y).toBeCloseTo(activity.y, 0)
    expect((await panelOrder(page)).sort()).toEqual(['activity', 'items', 'notes', 'sources'])
  })

  test('a drop on the bottom edge splits that panel into a column', async ({ page }) => {
    await gotoStory(page, MOVABLE)
    await dragPanel(page, 'notes', 'items', 'bottom')

    const [items, notes] = await Promise.all([boxOf(page, 'items'), boxOf(page, 'notes')])
    expect(notes.y).toBeGreaterThan(items.y + items.height - 1)
    // Directly under it, sharing its column.
    expect(notes.x).toBeCloseTo(items.x, 0)
    expect(notes.width).toBeCloseTo(items.width, 0)
  })

  test('a drop in the middle makes the panel a tab of the one it lands on', async ({ page }) => {
    await gotoStory(page, MOVABLE)
    await dragPanel(page, 'items', 'notes', 'center')

    // One pane fewer: the two share a strip where Notes was on its own.
    expect(await panelOrder(page)).toEqual(['sources', 'activity', 'items'])
    expect(await tabOrder(page, 'items')).toEqual(['notes', 'items'])
    // The panel that arrived is the one on show.
    await expect(tab(page, 'items')).toHaveAttribute('aria-selected', 'true')
    await expect(pane(page, 'items').locator('.dc-table')).toBeVisible()
    await expect(pane(page, 'items')).not.toContainText('Anything can go in a panel')
  })

  test('escape cancels a drag in flight', async ({ page }) => {
    await gotoStory(page, MOVABLE)
    const before = await panelOrder(page)

    await pickUpPanel(page, 'items', 'activity', 'right')
    await page.keyboard.press('Escape')
    await expect(page.locator('.dc-window__ghost')).toHaveCount(0)
    await dropPanel(page)

    expect(await panelOrder(page)).toEqual(before)
  })

  test('dropping a panel back on itself changes nothing', async ({ page }) => {
    await gotoStory(page, MOVABLE)
    const before = await panelOrder(page)
    await dragPanel(page, 'items', 'items', 'right')
    expect(await panelOrder(page)).toEqual(before)
  })

  test('a fixed panel stays where it is', async ({ page }) => {
    await gotoStory(page, FIXED_PANEL)
    await expect(grip(page, 'sources')).toHaveCount(0)
    await expect(grip(page, 'items')).toBeVisible()

    const before = await boxOf(page, 'sources')
    await dragPanel(page, 'sources', 'items', 'left')
    expect((await boxOf(page, 'sources')).x).toBeCloseTo(before.x, 0)
  })
})

test.describe('Window — moving a panel from the keyboard', () => {
  test('the grip picks the panel up and puts it down again', async ({ page }) => {
    await gotoStory(page, MOVABLE)
    const handle = grip(page, 'sources')
    await expect(handle).toHaveAccessibleName('Move Sources')

    await handle.focus()
    await page.keyboard.press('Enter')
    await expect(handle).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('.dc-window__live')).toContainText('move mode on')

    await page.keyboard.press('Escape')
    await expect(grip(page, 'sources')).toHaveAttribute('aria-pressed', 'false')
  })

  test('an arrow key trades places with the neighbour that way', async ({ page }) => {
    await gotoStory(page, MOVABLE)
    const [sources, activity] = await Promise.all([boxOf(page, 'sources'), boxOf(page, 'activity')])

    await grip(page, 'sources').focus()
    await page.keyboard.press('Enter')
    await page.keyboard.press('ArrowDown')

    await expect(page.locator('.dc-window__live')).toContainText('Sources moved down')
    expect((await boxOf(page, 'sources')).y).toBeCloseTo(activity.y, 0)
    expect((await boxOf(page, 'activity')).y).toBeCloseTo(sources.y, 0)
  })

  test('keeps the focus on the panel that moved, so moves can be chained', async ({ page }) => {
    await gotoStory(page, MOVABLE)
    await grip(page, 'sources').focus()
    await page.keyboard.press('Enter')
    await page.keyboard.press('ArrowDown')

    await expect(grip(page, 'sources')).toBeFocused()
    await page.keyboard.press('ArrowUp')
    // Back where it started.
    expect((await panelOrder(page))[1]).toBe('sources')
  })

  test('says so rather than moving when there is nowhere to go', async ({ page }) => {
    await gotoStory(page, MOVABLE)
    const before = await panelOrder(page)

    await grip(page, 'sources').focus()
    await page.keyboard.press('Enter')
    await page.keyboard.press('ArrowUp')

    await expect(page.locator('.dc-window__live')).toContainText('cannot move up')
    expect(await panelOrder(page)).toEqual(before)
  })

  test('the arrow keys are the panel’s only while it is picked up', async ({ page }) => {
    await gotoStory(page, MOVABLE)
    const before = await panelOrder(page)

    await grip(page, 'sources').focus()
    await page.keyboard.press('ArrowDown')
    expect(await panelOrder(page)).toEqual(before)
  })
})

test.describe('Window — tabs', () => {
  test('a pane of several panels is a strip of tabs, one of them showing', async ({ page }) => {
    await gotoStory(page, TABS)
    // Three panels in one pane, and the pane is named by the tab on top.
    expect(await tabOrder(page, 'activity')).toEqual(['sources', 'activity', 'log'])
    await expect(pane(page, 'activity')).toHaveAttribute('data-dc-tabbed', 'true')
    await expect(tab(page, 'activity')).toHaveAttribute('aria-selected', 'true')
    await expect(tab(page, 'sources')).toHaveAttribute('aria-selected', 'false')

    // Only the tab on top is rendered.
    await expect(pane(page, 'activity')).toContainText('index rebuilt')
    await expect(pane(page, 'activity')).not.toContainText('Hacker News')
  })

  test('a pane of one panel is a title, not a tab', async ({ page }) => {
    await gotoStory(page, TABS)
    await expect(pane(page, 'items')).toHaveAttribute('data-dc-tabbed', 'false')
    await expect(paneHead(page, 'items')).toContainText('Items')
    // Its subtitle is room the strip of a tabbed pane does not have.
    await expect(paneHead(page, 'items')).toContainText('entity:items')
    await expect(paneHead(page, 'activity').locator('.dc-pane__sub').first()).toBeHidden()
  })

  test('the strip is a tablist over the body it controls', async ({ page }) => {
    await gotoStory(page, TABS)
    const strip = paneHead(page, 'activity').locator('[role="tablist"]')
    await expect(strip).toBeVisible()

    const body = pane(page, 'activity').locator('[role="tabpanel"]')
    await expect(tab(page, 'activity')).toHaveAttribute(
      'aria-controls',
      (await body.getAttribute('id')) ?? '',
    )
    await expect(body).toHaveAttribute(
      'aria-labelledby',
      (await tab(page, 'activity').getAttribute('id')) ?? '',
    )
  })

  test('clicking a tab brings its panel to the top', async ({ page }) => {
    await gotoStory(page, TABS)
    await tab(page, 'sources').click()

    await expect(tab(page, 'sources')).toHaveAttribute('aria-selected', 'true')
    await expect(tab(page, 'activity')).toHaveAttribute('aria-selected', 'false')
    await expect(pane(page, 'sources')).toContainText('Hacker News')
    await expect(pane(page, 'sources')).not.toContainText('index rebuilt')
    // The strip itself has not moved.
    expect(await tabOrder(page, 'sources')).toEqual(['sources', 'activity', 'log'])
  })

  test('the strip is one tab stop, and the arrow keys move along it', async ({ page }) => {
    await gotoStory(page, TABS)
    await expect(tab(page, 'activity')).toHaveAttribute('tabindex', '0')
    await expect(tab(page, 'sources')).toHaveAttribute('tabindex', '-1')

    await tab(page, 'activity').focus()
    await page.keyboard.press('ArrowRight')
    await expect(tab(page, 'log')).toHaveAttribute('aria-selected', 'true')
    await page.keyboard.press('Home')
    await expect(tab(page, 'sources')).toHaveAttribute('aria-selected', 'true')
    await page.keyboard.press('End')
    await expect(tab(page, 'log')).toHaveAttribute('aria-selected', 'true')
  })

  test('the choice of view follows whichever panel is on top', async ({ page }) => {
    await gotoStory(page, TABS_ONLY)
    // Items declares views; the other two do not, so the strip offers the
    // choice only while items is the tab on top.
    await openPaneMenu(page, 'items')
    await expect(menuItem(page, 'view')).toHaveCount(1)
    await page.keyboard.press('Escape')

    await tab(page, 'sources').click()
    await openPaneMenu(page, 'sources')
    await expect(menuItem(page, 'view')).toHaveCount(0)
    await page.keyboard.press('Escape')

    await tab(page, 'items').click()
    await choosePaneMenu(page, 'items', 'view', 'view-cards')
    await expect(pane(page, 'items').locator('.dc-cards')).toBeVisible()
  })
})

test.describe('Window — moving tabs', () => {
  test('a drop on the strip lands in the gap it was dropped in', async ({ page }) => {
    await gotoStory(page, TABS)
    await dragToTab(page, 'items', 'sources', 'before')

    expect(await tabOrder(page, 'items')).toEqual(['items', 'sources', 'activity', 'log'])
    await expect(tab(page, 'items')).toHaveAttribute('aria-selected', 'true')
  })

  test('shows the gap a tab would land in before it is let go', async ({ page }) => {
    await gotoStory(page, TABS)
    const strip = paneHead(page, 'activity')
    const target = await tab(page, 'log').boundingBox()
    if (!target) throw new Error('No tab on screen')

    await pickUpPanel(page, 'items', 'activity', 'center')
    await page.mouse.move(target.x + target.width * 0.8, target.y + target.height / 2, { steps: 6 })
    // The insertion mark sits in the strip rather than over the body.
    await expect(strip.locator('.dc-pane__insert')).toBeVisible()
    await expect(pane(page, 'activity').locator('.dc-pane__drop')).toHaveCount(0)

    await dropPanel(page)
    expect(await tabOrder(page, 'items')).toEqual(['sources', 'activity', 'log', 'items'])
  })

  test('a tab dragged along its own strip is reordered', async ({ page }) => {
    await gotoStory(page, TABS)
    await dragToTab(page, 'log', 'sources', 'before')

    expect(await tabOrder(page, 'log')).toEqual(['log', 'sources', 'activity'])
    // Picking a tab up is also picking it, as clicking one would be.
    await expect(tab(page, 'log')).toHaveAttribute('aria-selected', 'true')
  })

  test('a tab dragged to an edge splits back out of the group', async ({ page }) => {
    await gotoStory(page, TABS)
    await dragPanel(page, 'activity', 'items', 'bottom')

    // It has left the strip, and has a pane of its own again.
    expect(await tabOrder(page, 'sources')).toEqual(['sources', 'log'])
    await expect(pane(page, 'activity')).toHaveAttribute('data-dc-tabbed', 'false')
    const [items, activity] = await Promise.all([boxOf(page, 'items'), boxOf(page, 'activity')])
    expect(activity.y).toBeGreaterThan(items.y + items.height - 1)
  })

  test('the last tab out closes the pane', async ({ page }) => {
    await gotoStory(page, TABS_ONLY)
    expect(await panelOrder(page)).toEqual(['items'])

    await dragPanel(page, 'sources', 'items', 'right')
    expect(await panelOrder(page)).toEqual(['items', 'sources'])
    await dragPanel(page, 'activity', 'sources', 'bottom')
    // Three panes, no tabs left anywhere.
    expect((await panelOrder(page)).sort()).toEqual(['activity', 'items', 'sources'])
    await expect(page.locator('.dc-pane[data-dc-tabbed="true"]')).toHaveCount(0)
  })

  test('shift and an arrow key makes the panel a tab of the neighbour', async ({ page }) => {
    await gotoStory(page, MOVABLE)
    await grip(page, 'items').focus()
    await page.keyboard.press('Enter')
    await page.keyboard.press('Shift+ArrowRight')

    await expect(page.locator('.dc-window__live')).toContainText('joined Sources as a tab')
    expect(await tabOrder(page, 'items')).toEqual(['sources', 'items'])
  })

  test('an arrow key moves a tab along its own strip first', async ({ page }) => {
    await gotoStory(page, TABS)
    await grip(page, 'activity').focus()
    await page.keyboard.press('Enter')
    await page.keyboard.press('ArrowLeft')

    await expect(page.locator('.dc-window__live')).toContainText('now tab 1 of 3')
    expect(await tabOrder(page, 'activity')).toEqual(['activity', 'sources', 'log'])
    // Still the panel on top, and still the one the arrows are moving.
    await expect(tab(page, 'activity')).toHaveAttribute('aria-selected', 'true')
    await expect(grip(page, 'activity')).toBeFocused()
  })

  test('and takes it out of the group once it is at the end', async ({ page }) => {
    await gotoStory(page, TABS)
    await grip(page, 'activity').focus()
    await page.keyboard.press('Enter')
    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('ArrowLeft')

    // Left of the strip's start is out of the pane altogether.
    await expect(page.locator('.dc-window__live')).toContainText('beside Items')
    expect(await tabOrder(page, 'sources')).toEqual(['sources', 'log'])
    await expect(pane(page, 'activity')).toHaveAttribute('data-dc-tabbed', 'false')
  })
})

const FLOATING = 'window-panel-grid--floating'
const FLOATING_MIXED = 'window-panel-grid--floating-beside-tiled'
/** A row called `Top` holding items and a strip called `Right`. */
const NAMED_STRIP = 'window-panel-grid--named-strip'
/** The same, with `space-names` off. */
const NAMED_STRIP_PLAIN = 'window-panel-grid--named-strip-plain'
const FLOATING_NESTED = 'window-panel-grid--floating-tabs-and-grids'
const FLOATING_NO_RESIZE = 'window-panel-grid--floating-fixed-size'

test.describe('Window — floating frames', () => {
  test('places every window where the layout puts it, overlapping', async ({ page }) => {
    await gotoStory(page, FLOATING)
    expect(await frameOrder(page)).toEqual(['items', 'sources', 'activity'])

    const [items, sources] = await Promise.all([frameBox(page, 'items'), frameBox(page, 'sources')])
    // Placed rather than tiled: the second starts inside the first.
    expect(sources.x).toBeGreaterThan(items.x)
    expect(sources.x).toBeLessThan(items.x + items.width)
    expect(sources.y).toBeGreaterThan(items.y)
    // And each is the size it was given, not a share of the space.
    expect(items.width).toBeCloseTo(460, 0)
    expect(sources.width).toBeCloseTo(380, 0)
  })

  test('dragging the title bar moves the window', async ({ page }) => {
    await gotoStory(page, FLOATING)
    const before = await frameBox(page, 'sources')

    await dragFrame(page, 'sources', 90, 60)

    const after = await frameBox(page, 'sources')
    expect(after.x).toBeCloseTo(before.x + 90, 0)
    expect(after.y).toBeCloseTo(before.y + 60, 0)
    // Moving is not resizing.
    expect(after.width).toBeCloseTo(before.width, 0)
    expect(after.height).toBeCloseTo(before.height, 0)
  })

  test('keeps a window inside the space it floats over', async ({ page }) => {
    await gotoStory(page, FLOATING)
    const desktop = await page.locator('.dc-window__desktop').boundingBox()
    if (!desktop) throw new Error('No desktop')

    await dragFrame(page, 'sources', -4000, -4000)
    const topLeft = await frameBox(page, 'sources')
    expect(topLeft.x).toBeCloseTo(desktop.x, 0)
    expect(topLeft.y).toBeCloseTo(desktop.y, 0)

    await dragFrame(page, 'sources', 4000, 4000)
    const bottomRight = await frameBox(page, 'sources')
    expect(bottomRight.x + bottomRight.width).toBeCloseTo(desktop.x + desktop.width, 0)
    expect(bottomRight.y + bottomRight.height).toBeCloseTo(desktop.y + desktop.height, 0)
  })

  test('dragging a corner resizes it, holding the opposite corner still', async ({ page }) => {
    await gotoStory(page, FLOATING)
    const before = await frameBox(page, 'activity')

    await dragFrameGrip(page, 'activity', 'se', 70, 50)

    const after = await frameBox(page, 'activity')
    expect(after.width).toBeCloseTo(before.width + 70, 0)
    expect(after.height).toBeCloseTo(before.height + 50, 0)
    // The corner that was not dragged did not move.
    expect(after.x).toBeCloseTo(before.x, 0)
    expect(after.y).toBeCloseTo(before.y, 0)
  })

  test('a leading edge takes the window’s position with it', async ({ page }) => {
    await gotoStory(page, FLOATING)
    const before = await frameBox(page, 'activity')

    await dragFrameGrip(page, 'activity', 'w', 60, 0)

    const after = await frameBox(page, 'activity')
    expect(after.x).toBeCloseTo(before.x + 60, 0)
    expect(after.width).toBeCloseTo(before.width - 60, 0)
    // A side grip moves one axis only.
    expect(after.y).toBeCloseTo(before.y, 0)
    expect(after.height).toBeCloseTo(before.height, 0)
  })

  test('will not squeeze a window below the floor', async ({ page }) => {
    await gotoStory(page, FLOATING)
    const before = await frameBox(page, 'activity')

    await dragFrameGrip(page, 'activity', 'se', -4000, -4000)

    const after = await frameBox(page, 'activity')
    expect(after.width).toBeCloseTo(120, 0)
    expect(after.height).toBeCloseTo(120, 0)
    // Squeezed from the bottom-right, so the top-left is what held.
    expect(after.x).toBeCloseTo(before.x, 0)
    expect(after.y).toBeCloseTo(before.y, 0)
  })

  test('touching a window brings it to the front', async ({ page }) => {
    await gotoStory(page, FLOATING)
    expect(await frameOrder(page)).toEqual(['items', 'sources', 'activity'])

    /*
     * Clicked at a point of each window that the ones in front of it do not
     * cover — which is the whole difficulty a stacking order exists to settle,
     * and why these are raw clicks rather than clicks on a locator: a locator
     * click refuses to reach through a window that is genuinely on top.
     */
    const items = await frameBox(page, 'items')
    await page.mouse.click(items.x + 40, items.y + 100)
    expect(await frameOrder(page)).toEqual(['sources', 'activity', 'items'])

    const sources = await frameBox(page, 'sources')
    await page.mouse.click(sources.x + sources.width - 40, sources.y + 60)
    expect(await frameOrder(page)).toEqual(['activity', 'items', 'sources'])
  })

  test('escape during a drag puts the window back', async ({ page }) => {
    await gotoStory(page, FLOATING)
    const before = await frameBox(page, 'sources')

    await pickUpFrame(page, 'sources', 120, 90)
    expect((await frameBox(page, 'sources')).x).toBeCloseTo(before.x + 120, 0)

    await page.keyboard.press('Escape')
    await page.mouse.up()

    const after = await frameBox(page, 'sources')
    expect(after.x).toBeCloseTo(before.x, 0)
    expect(after.y).toBeCloseTo(before.y, 0)
  })

  test('offers no resize grips when resizing is off, and still moves', async ({ page }) => {
    await gotoStory(page, FLOATING_NO_RESIZE)
    await expect(page.locator('.dc-float__grip')).toHaveCount(0)

    const before = await frameBox(page, 'sources')
    await dragFrame(page, 'sources', 60, 40)

    const after = await frameBox(page, 'sources')
    expect(after.x).toBeCloseTo(before.x + 60, 0)
    expect(after.width).toBeCloseTo(before.width, 0)
  })
})

test.describe('Window — raising a window keeps what is in it', () => {
  /*
   * Stacking is `z-index` over a stable order, and a node's key ignores the
   * order a float's panels are in. Both exist for this: matching the DOM to
   * the stack, or keying a node by its stacking order, would have Vue rebuild
   * the subtree of every window that came forward.
   */
  test('keeps the scroll position of what is inside', async ({ page }) => {
    await gotoStory(page, FLOATING)
    const body = pane(page, 'items').locator('.dc-pane__body')
    await body.evaluate((element) => {
      element.scrollTop = 120
    })

    // items is the back window; clicking it brings it forward.
    const box = await frameBox(page, 'items')
    await page.mouse.click(box.x + 40, box.y + 100)
    expect(await frameOrder(page)).toEqual(['sources', 'activity', 'items'])

    expect(await body.evaluate((element) => element.scrollTop)).toBe(120)
  })

  test('one click both raises a window and opens the menu it was aimed at', async ({ page }) => {
    // A window of tabs is the one that carries a menu of its own — a window
    // holding a single panel of content has nothing to put in one.
    await gotoStory(page, FLOATING_NESTED)
    expect(await frameOrder(page)).toEqual(['sources', 'items', 'notes'])

    await paneMenuButton(page, 'sources').click()

    await expect(menus(page)).toHaveCount(1)
    expect(await frameOrder(page)).toEqual(['items', 'notes', 'sources'])
  })
})

test.describe('Window — moving a floating frame from the keyboard', () => {
  test('the arrow keys move the window, and shift resizes it', async ({ page }) => {
    await gotoStory(page, FLOATING)
    const before = await frameBox(page, 'sources')

    await grip(page, 'sources').click()
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowDown')

    const moved = await frameBox(page, 'sources')
    expect(moved.x).toBeCloseTo(before.x + 16, 0)
    expect(moved.y).toBeCloseTo(before.y + 16, 0)
    expect(moved.width).toBeCloseTo(before.width, 0)

    await page.keyboard.press('Shift+ArrowRight')
    const resized = await frameBox(page, 'sources')
    expect(resized.width).toBeCloseTo(before.width + 16, 0)
    // Resizing from the bottom-right leaves the window where it is.
    expect(resized.x).toBeCloseTo(moved.x, 0)
  })

  test('the arrow keys are the window’s only while it is picked up', async ({ page }) => {
    await gotoStory(page, FLOATING)
    const before = await frameBox(page, 'sources')

    await grip(page, 'sources').focus()
    await page.keyboard.press('ArrowRight')
    expect((await frameBox(page, 'sources')).x).toBeCloseTo(before.x, 0)

    await grip(page, 'sources').click()
    await page.keyboard.press('ArrowRight')
    expect((await frameBox(page, 'sources')).x).toBeCloseTo(before.x + 16, 0)

    // Escape hands them back.
    await page.keyboard.press('Escape')
    await page.keyboard.press('ArrowRight')
    expect((await frameBox(page, 'sources')).x).toBeCloseTo(before.x + 16, 0)
  })
})

test.describe('Window — floating and tiled together', () => {
  test('a frame holds a grid of its own, with its own splitter', async ({ page }) => {
    await gotoStory(page, FLOATING_NESTED)
    const frame = floatFrame(page, 'items')
    await expect(frame.locator('.dc-window__gutter')).toHaveCount(1)

    const [items, activity] = await Promise.all([boxOf(page, 'items'), boxOf(page, 'activity')])
    // Stacked inside the one window, not spread across the desktop.
    expect(activity.y).toBeGreaterThan(items.y + items.height - 1)
    expect(activity.x).toBeCloseTo(items.x, 0)
  })

  test('dragging a window’s tab onto the grid docks it', async ({ page }) => {
    await gotoStory(page, FLOATING_MIXED)
    await expect(floatFrame(page, 'sources')).toHaveCount(1)

    await dragPanel(page, 'sources', 'items', 'bottom')

    // It left the desktop for the grid, and the windows beside it stayed put.
    await expect(floatFrame(page, 'sources')).toHaveCount(0)
    expect(await frameOrder(page)).toEqual(['activity', 'notes'])
    const [items, sources] = await Promise.all([boxOf(page, 'items'), boxOf(page, 'sources')])
    expect(sources.y).toBeGreaterThan(items.y + items.height - 1)
  })

  test('dragging a tiled panel onto a window tabs it in', async ({ page }) => {
    await gotoStory(page, FLOATING_MIXED)

    await dragPanel(page, 'items', 'notes', 'center')

    await expect(floatFrame(page, 'items')).toHaveCount(1)
    expect(await tabOrder(page, 'items')).toEqual(['notes', 'items'])
  })
})

test.describe('Window — dropping a panel onto bare desktop', () => {
  test('a tab dragged out of a window becomes a window of its own', async ({ page }) => {
    await gotoStory(page, FLOATING_MIXED)

    // The reported case: tab Notes into Sources, then take it back out and
    // drop it on the desktop rather than on another pane.
    await dragPanel(page, 'notes', 'sources', 'center')
    expect(await tabOrder(page, 'sources')).toEqual(['sources', 'notes'])

    await dragOntoDesktop(page, 'notes', 460, 60)

    // Out of the group, and a window in its own right again.
    expect(await tabOrder(page, 'sources')).toEqual(['sources'])
    await expect(floatFrame(page, 'notes')).toHaveCount(1)
    // Sources came forward on the way: grabbing the tab touched that window,
    // which is what raises one. Notes then lands on top of the stack.
    expect(await frameOrder(page)).toEqual(['activity', 'sources', 'notes'])
  })

  test('it keeps the size of the window it came out of', async ({ page }) => {
    await gotoStory(page, FLOATING_MIXED)
    const host = await frameBox(page, 'sources')

    await dragPanel(page, 'notes', 'sources', 'center')
    await dragOntoDesktop(page, 'notes', 460, 60)

    const made = await frameBox(page, 'notes')
    expect(made.width).toBeCloseTo(host.width, 0)
    expect(made.height).toBeCloseTo(host.height, 0)
  })

  test('lands where it was dropped, with the pointer in its title bar', async ({ page }) => {
    await gotoStory(page, FLOATING_MIXED)
    const box = await desktopBox(page)

    await dragOntoDesktop(page, 'notes', 420, 80)

    const made = await frameBox(page, 'notes')
    // Placed so the point it was let go of is just inside the title bar.
    expect(made.x).toBeCloseTo(box.x + 420 - 24, 0)
    expect(made.y).toBeCloseTo(box.y + 80 - 12, 0)
  })

  test('previews the window before the button comes up', async ({ page }) => {
    await gotoStory(page, FLOATING_MIXED)
    await expect(desktopDrop(page)).toHaveCount(0)

    await pickUpOntoDesktop(page, 'notes', 440, 70)
    await expect(desktopDrop(page)).toHaveCount(1)
    // The desktop is what previews it, not any of the panes.
    await expect(page.locator('.dc-pane__drop')).toHaveCount(0)

    await dropPanel(page)
    await expect(desktopDrop(page)).toHaveCount(0)
  })

  test('escape leaves the panel where it was', async ({ page }) => {
    await gotoStory(page, FLOATING_MIXED)
    const before = await frameBox(page, 'notes')

    await pickUpOntoDesktop(page, 'notes', 440, 70)
    await page.keyboard.press('Escape')
    await page.mouse.up()

    const after = await frameBox(page, 'notes')
    expect(after.x).toBeCloseTo(before.x, 0)
    expect(after.y).toBeCloseTo(before.y, 0)
  })

  test('a tiled panel dropped on the desktop floats', async ({ page }) => {
    await gotoStory(page, FLOATING_MIXED)
    expect(await floatFrame(page, 'items').count()).toBe(0)

    await dragOntoDesktop(page, 'items', 480, 90)

    await expect(floatFrame(page, 'items')).toHaveCount(1)
    // The grid it left had nothing else in it, so the float is the whole window.
    expect(await frameOrder(page)).toEqual(['sources', 'activity', 'notes', 'items'])
  })
})

/*
 * Alt turns docking off for as long as it is held: no edge, no middle and no
 * strip of tabs is a target, so the one thing left to drop on is a float's
 * bare desktop — which is how a window is carried across the windows it shares
 * a desktop with without joining any of them.
 */
test.describe('Window — holding a panel off the grid', () => {
  test('the modifier takes away the pane a window is being carried over', async ({ page }) => {
    await gotoStory(page, FLOATING_MIXED)

    // Activity onto the middle of Notes: without the modifier that is a tab.
    await pickUpPanel(page, 'activity', 'notes', 'center')
    await expect(pane(page, 'notes').locator('.dc-pane__drop')).toHaveCount(1)

    await page.keyboard.down('Alt')
    await expect(page.locator('.dc-window')).toHaveAttribute('data-dc-docking', 'false')
    // Nothing to join, and the desktop under it offers itself instead.
    await expect(page.locator('.dc-pane__drop')).toHaveCount(0)
    await expect(desktopDrop(page)).toHaveCount(1)

    // Let go of the modifier and the pane is a target again, from the same
    // point: a modifier moves no pointer, so the drop is re-aimed where it is.
    await page.keyboard.up('Alt')
    await expect(page.locator('.dc-window')).toHaveAttribute('data-dc-docking', 'true')
    await expect(pane(page, 'notes').locator('.dc-pane__drop')).toHaveCount(1)
    await expect(desktopDrop(page)).toHaveCount(0)

    await dropPanel(page)
  })

  test('a window dropped over another with it held moves rather than tabs in', async ({
    page,
  }) => {
    await gotoStory(page, FLOATING_MIXED)
    const [before, over, room] = await Promise.all([
      frameBox(page, 'activity'),
      frameBox(page, 'notes'),
      desktopBox(page),
    ])

    await page.keyboard.down('Alt')
    await pickUpPanel(page, 'activity', 'notes', 'center')
    await dropPanel(page)
    await page.keyboard.up('Alt')

    // Still a window of its own, and Notes still has its strip to itself.
    await expect(floatFrame(page, 'activity')).toHaveCount(1)
    expect(await tabOrder(page, 'notes')).toEqual(['notes'])

    // It went to where it was let go of, keeping the size it was and staying
    // inside the desktop — which is what pulls it back up off the bottom.
    const after = await frameBox(page, 'activity')
    expect(after.width).toBeCloseTo(before.width, 0)
    expect(after.height).toBeCloseTo(before.height, 0)
    expect(after.x).toBeCloseTo(over.x + over.width / 2 - 24, 0)
    expect(after.y).toBeGreaterThan(before.y)
    expect(after.y + after.height).toBeLessThanOrEqual(room.y + room.height + 1)
  })

  test('without it, the same drag tabs the window in', async ({ page }) => {
    await gotoStory(page, FLOATING_MIXED)

    await dragPanel(page, 'activity', 'notes', 'center')

    expect(await tabOrder(page, 'notes')).toEqual(['notes', 'activity'])
  })

  test('held over the grid there is nowhere to drop, and the release does nothing', async ({
    page,
  }) => {
    await gotoStory(page, FLOATING_MIXED)
    const before = await frameBox(page, 'sources')

    await page.keyboard.down('Alt')
    // Items is tiled, so no desktop covers it: the drag has no target at all.
    await pickUpPanel(page, 'sources', 'items', 'center')
    await expect(page.locator('.dc-pane__drop')).toHaveCount(0)
    await expect(desktopDrop(page)).toHaveCount(0)

    await dropPanel(page)
    await page.keyboard.up('Alt')

    expect(await tabOrder(page, 'items')).toEqual(['items'])
    await expect(floatFrame(page, 'sources')).toHaveCount(1)
    const after = await frameBox(page, 'sources')
    expect(after.x).toBeCloseTo(before.x, 0)
    expect(after.y).toBeCloseTo(before.y, 0)
  })

  test('a tiled panel held off the grid still floats on the desktop', async ({ page }) => {
    await gotoStory(page, FLOATING_MIXED)

    await page.keyboard.down('Alt')
    await pickUpOntoDesktop(page, 'items', 480, 90)
    await expect(desktopDrop(page)).toHaveCount(1)
    await dropPanel(page)
    await page.keyboard.up('Alt')

    await expect(floatFrame(page, 'items')).toHaveCount(1)
  })

  test('the drag ends with docking back on', async ({ page }) => {
    await gotoStory(page, FLOATING_MIXED)

    await page.keyboard.down('Alt')
    await pickUpPanel(page, 'activity', 'notes', 'center')
    await dropPanel(page)
    await page.keyboard.up('Alt')

    await expect(page.locator('.dc-window')).toHaveAttribute('data-dc-docking', 'true')
  })
})

const PANE_MENU = 'window-panel-grid--pane-menu'
const CLOSABLE = 'window-panel-grid--closable'
const NO_PANE_MENU = 'window-panel-grid--no-pane-menu'
const CONTENT_MENU = 'window-panel-grid--content-menu'
const WORKBENCH = 'window-panel-grid--workbench'
const WORKBENCH_DESKTOP = 'window-panel-grid--workbench-on-a-desktop'

/*
 * The menu of a *space* rather than of a pane. A pane holding one panel holds
 * host content, so it has nothing to arrange and says nothing about how it is
 * shown; the row, column or desktop around it draws a title bar of its own,
 * and that is where the four choices are.
 *
 * `PANE_MENU` is `row([items, column([sources, activity])])`, so the column is
 * the space at path `1`.
 */
test.describe('Window — the space menu', () => {
  test('a space is a panel of its own, with a bar naming how it is shown', async ({ page }) => {
    await gotoStory(page, PANE_MENU)

    await expect(space(page, '')).toHaveAttribute('data-dc-space', 'row')
    await expect(space(page, '1')).toHaveAttribute('data-dc-space', 'column')
    await expect(space(page, '').locator('> .dc-space__head .dc-space__title')).toHaveText('Row')
    await expect(space(page, '1').locator('> .dc-space__head .dc-space__title')).toHaveText(
      'Column',
    )
  })

  test('a pane of host content offers nothing but its own views', async ({ page }) => {
    await gotoStory(page, PANE_MENU)
    // Sources and activity declare no views either, so there is nothing at all
    // for them to offer — no button, rather than one that opens an empty menu.
    for (const id of ['sources', 'activity']) {
      await expect(paneMenuButton(page, id)).toHaveCount(0)
    }

    // Items declares four views, and they are the whole of its menu: what is
    // in it is content rather than panels, so it has nothing to arrange.
    await openPaneMenu(page, 'items')
    const own = menus(page).first().locator('.dc-menu__item')
    expect(await own.evaluateAll((all) => all.map((item) => item.dataset.dcItem))).toEqual(['view'])
  })

  test('names the four ways a space can be shown, ticking the one in force', async ({ page }) => {
    await gotoStory(page, PANE_MENU)
    await chooseSpaceMenu(page, '1')

    await expect(menuItem(page, 'show-column')).toHaveAttribute('aria-checked', 'true')
    await expect(menuItem(page, 'show-row')).toHaveAttribute('aria-checked', 'false')
    await expect(menuItem(page, 'show-desktop')).toHaveAttribute('aria-checked', 'false')
  })

  test('an option that would change nothing cannot be taken', async ({ page }) => {
    await gotoStory(page, PANE_MENU)
    await chooseSpaceMenu(page, '1')
    // Already a column: choosing "Column" has nothing to do.
    await expect(menuItem(page, 'show-column')).toBeDisabled()
    await expect(menuItem(page, 'show-row')).toBeEnabled()
  })

  test('flips the split between a row and a column', async ({ page }) => {
    await gotoStory(page, PANE_MENU)
    const before = await Promise.all([boxOf(page, 'sources'), boxOf(page, 'activity')])
    expect(before[1].y).toBeGreaterThan(before[0].y + before[0].height - 1)

    await chooseSpaceMenu(page, '1', 'show-row')

    const [sources, activity] = await Promise.all([boxOf(page, 'sources'), boxOf(page, 'activity')])
    // Side by side now, and level with each other.
    expect(activity.x).toBeGreaterThan(sources.x + sources.width - 1)
    expect(activity.y).toBeCloseTo(sources.y, 0)
  })

  test('collapses a space into tabs', async ({ page }) => {
    await gotoStory(page, PANE_MENU)
    await expect(tab(page, 'sources')).toHaveCount(1)

    await chooseSpaceMenu(page, '1', 'show-tabs')

    expect(await tabOrder(page, 'sources')).toEqual(['sources', 'activity'])
    // One pane where there were two, and items is untouched beside it.
    expect(await panelOrder(page)).toEqual(['items', 'sources'])
  })

  test('turns a space into floating windows, and back again', async ({ page }) => {
    await gotoStory(page, PANE_MENU)
    await expect(page.locator('.dc-window__desktop')).toHaveCount(0)

    await chooseSpaceMenu(page, '1', 'show-desktop')

    await expect(page.locator('.dc-window__desktop')).toHaveCount(1)
    await expect(floatFrame(page, 'sources')).toHaveCount(1)
    await expect(floatFrame(page, 'activity')).toHaveCount(1)
    // Cascaded, so the two windows do not land exactly on top of each other.
    const [sources, activity] = await Promise.all([
      frameBox(page, 'sources'),
      frameBox(page, 'activity'),
    ])
    expect(activity.x).toBeGreaterThan(sources.x)

    // The desktop it became is the same space, at the same path, and its own
    // bar is what shows it as a row again.
    await expect(space(page, '1')).toHaveAttribute('data-dc-space', 'desktop')
    await chooseSpaceMenu(page, '1', 'show-row')
    await expect(page.locator('.dc-window__desktop')).toHaveCount(0)
  })

  /*
   * A group of tabs is a space too, so it is the one a tab's menu describes —
   * the tabs beside it are its siblings, and the split around the group is a
   * space this pane is not in. Reading the arrangements off that outer split
   * while reading the tick on "Tabs" off the group put ticks on two of the
   * four at once.
   */
  test('a tabbed pane is about its tabs, not the split around them', async ({ page }) => {
    await gotoStory(page, TABS)
    await openPaneMenu(page, 'sources')

    // Tabs inside a row: the row is what the group does among its siblings.
    await expect(menuItem(page, 'show-tabs')).toHaveAttribute('aria-checked', 'true')
    await expect(menuItem(page, 'show-row')).toHaveAttribute('aria-checked', 'false')
    await expect(menuItem(page, 'show-column')).toHaveAttribute('aria-checked', 'false')
    await expect(menuItem(page, 'show-desktop')).toHaveAttribute('aria-checked', 'false')
    // Already tabs, so there is nothing to collapse — and every way out of
    // them can be taken.
    await expect(menuItem(page, 'show-tabs')).toBeDisabled()
    await expect(menuItem(page, 'show-row')).toBeEnabled()
    await expect(menuItem(page, 'show-column')).toBeEnabled()
    await expect(menuItem(page, 'show-desktop')).toBeEnabled()
  })

  test('spreads a group of tabs back into panes', async ({ page }) => {
    await gotoStory(page, TABS)
    expect(await tabOrder(page, 'sources')).toEqual(['sources', 'activity', 'log'])

    await choosePaneMenu(page, 'sources', 'show-column')

    // Three panes where there was one, in the order the tabs were in, and the
    // items pane beside them is untouched.
    expect(await panelOrder(page)).toEqual(['items', 'sources', 'activity', 'log'])
    // A tab each, in a strip of its own: nothing shares a pane any more.
    expect(await tabOrder(page, 'sources')).toEqual(['sources'])
    const [items, sources, activity] = await Promise.all([
      boxOf(page, 'items'),
      boxOf(page, 'sources'),
      boxOf(page, 'activity'),
    ])
    expect(sources.x).toBeGreaterThan(items.x + items.width - 1)
    expect(activity.y).toBeGreaterThan(sources.y + sources.height - 1)
  })

  test('a window of tabs becomes windows on the desktop it is already on', async ({ page }) => {
    await gotoStory(page, FLOATING_NESTED)
    expect(await frameOrder(page)).toEqual(['sources', 'items', 'notes'])

    await choosePaneMenu(page, 'sources', 'show-desktop')

    // One window each, where in the stack the window they replace was — which
    // is the front, since opening its menu raised it — and one desktop still,
    // not a desktop inside a window of its own.
    expect(await frameOrder(page)).toEqual(['items', 'notes', 'sources', 'log'])
    await expect(page.locator('.dc-window__desktop')).toHaveCount(1)
    const [sources, log] = await Promise.all([frameBox(page, 'sources'), frameBox(page, 'log')])
    // Cascaded from where the window they came out of sat.
    expect(log.x).toBeGreaterThan(sources.x)
    expect(log.y).toBeGreaterThan(sources.y)
  })

  /*
   * A pane tiled inside a floating window has a space of its own — the split
   * within the frame — and the menu is about that space, not the desktop the
   * window it happens to sit in is on.
   */
  /*
   * A desktop beside a tiled pane is a space of its own, and stays one when it
   * is shown as a row or a column: the pane beside it was never a window on
   * it. Reading the tiled panes back off the split that replaced the desktop
   * is what makes "Desktop" the way back, so the round trip has to keep them
   * apart — a row of the desktop's panes inlined into the row around it would
   * have swept the pane beside them in, and floated it on the way back.
   */
  test('tiling a desktop leaves the pane beside it out of it', async ({ page }) => {
    await gotoStory(page, FLOATING_MIXED)

    await chooseSpaceMenu(page, '1', 'show-row')

    // Items still has the screen to itself, top to bottom, beside the three.
    const [items, sources, activity, notes] = await Promise.all([
      boxOf(page, 'items'),
      boxOf(page, 'sources'),
      boxOf(page, 'activity'),
      boxOf(page, 'notes'),
    ])
    expect(items.height).toBeGreaterThan(sources.height - 1)
    // Left to right in the order they sat across the desktop — sources at 20,
    // notes at 40, activity at 90 — and all of them beside items.
    expect(sources.x).toBeGreaterThan(items.x + items.width - 1)
    expect(notes.x).toBeGreaterThan(sources.x + sources.width - 1)
    expect(activity.x).toBeGreaterThan(notes.x + notes.width - 1)

    // And the way back floats those three only — items stays where it is.
    await chooseSpaceMenu(page, '1', 'show-desktop')
    expect(await frameOrder(page)).toEqual(['sources', 'notes', 'activity'])
    expect(await boxOf(page, 'items')).toEqual(items)
  })

  test('shows a desktop as a column, and puts every window back where it was', async ({ page }) => {
    await gotoStory(page, FLOATING_MIXED)
    const before = await Promise.all([
      frameBox(page, 'sources'),
      frameBox(page, 'activity'),
      frameBox(page, 'notes'),
    ])

    await chooseSpaceMenu(page, '1', 'show-column')

    await expect(page.locator('.dc-window__desktop')).toHaveCount(0)
    // Down the column in the order they came down the desktop — not in the
    // order they were stacked.
    const [sources, activity, notes] = await Promise.all([
      boxOf(page, 'sources'),
      boxOf(page, 'activity'),
      boxOf(page, 'notes'),
    ])
    expect(activity.y).toBeGreaterThan(sources.y + sources.height - 1)
    expect(notes.y).toBeGreaterThan(activity.y + activity.height - 1)

    await chooseSpaceMenu(page, '1', 'show-desktop')

    await expect(page.locator('.dc-window__desktop')).toHaveCount(1)
    const after = await Promise.all([
      frameBox(page, 'sources'),
      frameBox(page, 'activity'),
      frameBox(page, 'notes'),
    ])
    expect(after).toEqual(before)
  })

  /*
   * A window holding a space *is* that space's chrome: the space draws no
   * second bar inside the window, so its four choices are on the window's own
   * title bar — and they are about the split in there, not the desktop the
   * window sits on.
   */
  test('a space inside a window speaks from that window\'s title bar', async ({ page }) => {
    await gotoStory(page, FLOATING_NESTED)
    await expect(frameBar(page, 'items')).toHaveText(/Column/)

    await frameMenuButton(page, 'items').click()

    // Items divides its window with activity, top and bottom.
    await expect(menuItem(page, 'show-column')).toHaveAttribute('aria-checked', 'true')
    await expect(menuItem(page, 'show-desktop')).toHaveAttribute('aria-checked', 'false')
    await expect(menuItem(page, 'show-column')).toBeDisabled()
    await expect(menuItem(page, 'show-row')).toBeEnabled()

    await menuItem(page, 'show-row').click()

    // The split inside the window flipped, and the desktop is still a desktop.
    const [items, activity] = await Promise.all([boxOf(page, 'items'), boxOf(page, 'activity')])
    expect(activity.x).toBeGreaterThan(items.x + items.width - 1)
    await expect(page.locator('.dc-window__desktop')).toHaveCount(1)
  })

  test('is reachable from the keyboard, and Escape gives the focus back', async ({ page }) => {
    await gotoStory(page, PANE_MENU)
    const button = spaceMenuButton(page, '1')

    await button.focus()
    await page.keyboard.press('ArrowDown')
    await expect(menus(page).first()).toBeVisible()
    // The first item takes the focus when a key opened the menu.
    await expect(menuItem(page, 'show-row')).toBeFocused()
    // Down skips "Column", which is disabled because it is already a column.
    await page.keyboard.press('ArrowDown')
    await expect(menuItem(page, 'show-tabs')).toBeFocused()

    await page.keyboard.press('Escape')
    await expect(menus(page)).toHaveCount(0)
    await expect(button).toBeFocused()
  })

  test('a press anywhere else takes the menu down', async ({ page }) => {
    await gotoStory(page, PANE_MENU)
    await spaceMenuButton(page, '1').click()
    await expect(menus(page)).toHaveCount(1)

    await pane(page, 'items').locator('.dc-pane__body').click({ position: { x: 20, y: 20 } })
    await expect(menus(page)).toHaveCount(0)
  })

  test('opening one menu takes another down', async ({ page }) => {
    await gotoStory(page, PANE_MENU)
    await chooseSpaceMenu(page, '1')
    await expect(menus(page)).toHaveCount(1)

    // Only one menu belongs on screen at a time, however many spaces offer one.
    await spaceMenuButton(page, '').click()
    await expect(menus(page)).toHaveCount(1)
    await expect(spaceMenuButton(page, '1')).toHaveAttribute('aria-expanded', 'false')
    await expect(spaceMenuButton(page, '')).toHaveAttribute('aria-expanded', 'true')
  })

  test('opening a space menu takes the menu bar\'s menu down', async ({ page }) => {
    await gotoStory(page, WORKBENCH)
    await menubarItem(page, 'File').click()
    await expect(menus(page)).toHaveCount(1)

    await spaceMenuButton(page, '').click()
    await expect(menus(page)).toHaveCount(1)
    await expect(menubarItem(page, 'File')).toHaveAttribute('aria-expanded', 'false')
  })

  test('offers no menu at all when the window is told not to', async ({ page }) => {
    await gotoStory(page, NO_PANE_MENU)
    await expect(page.locator('.dc-menu-button')).toHaveCount(0)
  })
})

/*
 * A desktop tabbed beside a pane.
 *
 * "Tabs" is the fourth way of showing a space, and the other three all keep
 * every pane the space holds: a row shown as a column is the same panes running
 * the other way, and shown as windows it is the same panes placed rather than
 * dividing. So the panes of this row stop dividing it and share one strip — and
 * the *desktop* among them shares the strip whole, as one tab, because where
 * each of its windows sits is something a user put there rather than an
 * arrangement the space was merely being drawn in.
 */
/*
 * A window that holds a desktop.
 *
 * "Desktop" on a row holding a pane and a desktop makes a window of each, so
 * one of them is a window with a desktop inside it. That window is the one
 * thing in the model a panel cannot name: every panel on the desktop is a panel
 * of the window around it too, and the innermost frame holding one is one of the
 * windows *on* it. So its own chrome names it by where it was rendered — the
 * same way a desktop's title bar names itself for its menu.
 */
/*
 * What a menu item is about.
 *
 * A pane's menu answers two questions at once: what the panel on top is
 * showing, and how the tabs it is one of are arranged. Both answers are a
 * short list of names with one of them ticked, so nothing in the shape of
 * either says which is which — and a submenu holding one of them only sets it
 * beside the other. A heading over each says it, and is left out where there
 * is only one thing to be about.
 */
test.describe('Window — what a menu item is about', () => {
  test('names the panel and the tabs, and puts each group under its own', async ({ page }) => {
    await gotoStory(page, TABS_ONLY)
    await openPaneMenu(page, 'items')

    expect(await menuHeadings(page).allInnerTexts()).toEqual(['Items', 'These tabs'])

    // The view is under the panel's name, since it is that panel's view; the
    // four shapes and the two steps are under the tabs', since every one of
    // them is about the strip rather than the tab it was opened from.
    expect(
      await menuGroup(page, 'Items').evaluateAll((all) => all.map((item) => item.dataset.dcItem)),
    ).toEqual(['view'])
    expect(
      await menuGroup(page, 'These tabs').evaluateAll((all) =>
        all.map((item) => item.dataset.dcItem),
      ),
    ).toEqual(['show-row', 'show-column', 'show-tabs', 'show-desktop', 'next-tab', 'previous-tab'])
  })

  test('a heading is a name and not a choice', async ({ page }) => {
    await gotoStory(page, TABS_ONLY)
    await paneMenuButton(page, 'items').focus()

    // The first heading is the first thing in the menu, and the keyboard opens
    // onto the item under it: a name is not somewhere to land.
    await page.keyboard.press('ArrowDown')
    await expect(menuItem(page, 'view')).toBeFocused()
    await expect(menuHeadings(page).first()).not.toHaveClass(/dc-menu__item/)

    // Nor is it read twice: the group it opens says the name, and the heading
    // itself is drawn for the eye.
    await expect(menuHeadings(page).first()).toHaveAttribute('aria-hidden', 'true')
  })

  test('names nothing when the whole menu is about one thing', async ({ page }) => {
    // A pane of host content offers its views and nothing else.
    await gotoStory(page, PANE_MENU)
    await openPaneMenu(page, 'items')
    await expect(menuHeadings(page)).toHaveCount(0)
    await page.keyboard.press('Escape')

    // And a space with a bar of its own offers the four shapes and nothing
    // else, since nothing shares its strip.
    await spaceMenuButton(page, '1').click()
    await expect(menuHeadings(page)).toHaveCount(0)
  })

  test('says the name the layout gave the tabs', async ({ page }) => {
    await gotoStory(page, FLOATING_MIXED)
    await chooseSpaceMenu(page, '', 'show-tabs')

    // `Top` is what the strip is called, so it is what its own items are
    // under — the generic name is for a strip that has none.
    await openPaneMenu(page, 'items')
    expect(await menuHeadings(page).allInnerTexts()).toEqual(['Items', 'Top'])
  })

  test("a space's own menu names the space and the strip it is a tab of", async ({ page }) => {
    await gotoStory(page, FLOATING_MIXED)
    await chooseSpaceMenu(page, '', 'show-tabs')
    await spaceTab(page, 'Right').click()

    // The strip speaks for the desktop while its tab is on top, so this menu
    // is the desktop's four choices and the strip's two steps: two spaces, one
    // inside the other, and a name over each.
    await paneMenuButton(page, 'items').click()
    expect(await menuHeadings(page).allInnerTexts()).toEqual(['Right', 'Top'])
    expect(
      await menuGroup(page, 'Right').evaluateAll((all) => all.map((item) => item.dataset.dcItem)),
    ).toEqual(['show-row', 'show-column', 'show-tabs', 'show-desktop'])
    expect(
      await menuGroup(page, 'Top').evaluateAll((all) => all.map((item) => item.dataset.dcItem)),
    ).toEqual(['next-tab', 'previous-tab'])
  })
})

/*
 * A space the layout named.
 *
 * `FLOATING_MIXED` is a row called `Top` holding items and a desktop called
 * `Right`, so both bars say what they were called rather than how they are
 * shown. A name is something said about *that* space, so the space keeps it
 * whatever shape it is left in — the same way `headless` and `fixedView` are
 * kept. Without that it would hold only while the shape happened to stay
 * distinguishable from its parent's: one pane dragged out and the space would
 * be dissolved into the row around it, name and bar and all.
 */
test.describe('Window — a space the layout named', () => {
  test('says its name on its own bar rather than how it is shown', async ({ page }) => {
    await gotoStory(page, FLOATING_MIXED)
    await expect(space(page, '').locator('> .dc-space__head .dc-space__title')).toHaveText('Top')
    await expect(space(page, '1').locator('> .dc-space__head .dc-space__title')).toHaveText('Right')
  })

  test('keeps its name and its bar when a panel is dragged out of it', async ({ page }) => {
    await gotoStory(page, FLOATING_MIXED)
    // Tiled across, which is the shape the row around it already has — what an
    // unnamed space would be flattened into.
    await chooseSpaceMenu(page, '1', 'show-row')
    await expect(space(page, '1').locator('> .dc-space__head .dc-space__title')).toHaveText('Right')

    // One of its three panes joins items, leaving two.
    await dragPanel(page, 'sources', 'items', 'center')

    expect(await tabOrder(page, 'items')).toEqual(['items', 'sources'])
    expect(await panelOrder(page)).toEqual(['sources', 'notes', 'activity'])
    await expect(space(page, '1').locator('> .dc-space__head .dc-space__title')).toHaveText('Right')

    // And down to its last pane, which an unnamed row of one would collapse
    // into — leaving nothing on screen to say the space had ever been there.
    await dragPanel(page, 'notes', 'items', 'center')

    expect(await panelOrder(page)).toEqual(['notes', 'activity'])
    await expect(space(page, '1').locator('> .dc-space__head .dc-space__title')).toHaveText('Right')
  })

  /*
   * The fourth shape, which is the one with no header of its own to say a name
   * on: a strip's tabs say what is in it, so a named one says the name in front
   * of them. Without that the name would die on the way through — and with it
   * the space, since the row it would be spread back into is the row around it.
   */
  test('says its name on the strip it becomes, and is still named coming back', async ({
    page,
  }) => {
    await gotoStory(page, FLOATING_MIXED)
    await chooseSpaceMenu(page, '1', 'show-tabs')

    // One strip of the desktop's three windows, called what the desktop was.
    expect(await tabOrder(page, 'sources')).toEqual(['sources', 'activity', 'notes'])
    await expect(stripName(page).first()).toHaveText('Right')

    // Back to a row from the strip's own menu: the space is still `Right`,
    // still a space of its own inside the row `Top` rather than flattened into
    // it, and its bar carries the four choices again.
    await choosePaneMenu(page, 'sources', 'show-row')
    expect(await spaceMode(page, '1')).toBe('row')
    await expect(space(page, '1').locator('> .dc-space__head .dc-space__title')).toHaveText('Right')
    await expect(spaceMenuButton(page, '1')).toHaveCount(1)
  })

  test('brings its windows back to where they were from the strip', async ({ page }) => {
    await gotoStory(page, FLOATING_MIXED)
    const before = await frameBox(page, 'notes')

    // Through the third shape and out the other side, which is the round trip
    // the places on the strip are for.
    await chooseSpaceMenu(page, '1', 'show-tabs')
    await choosePaneMenu(page, 'sources', 'show-desktop')

    expect(await spaceMode(page, '1')).toBe('desktop')
    await expect(space(page, '1').locator('> .dc-space__head .dc-space__title')).toHaveText('Right')
    const after = await frameBox(page, 'notes')
    expect(after.x).toBeCloseTo(before.x, 0)
    expect(after.y).toBeCloseTo(before.y, 0)
    expect(after.width).toBeCloseTo(before.width, 0)
    expect(after.height).toBeCloseTo(before.height, 0)
  })

  test('and the same trip by way of a row, which remembers them too', async ({ page }) => {
    await gotoStory(page, FLOATING_MIXED)
    const before = await frameBox(page, 'notes')

    // Desktop, row, tabs, row, desktop: the name and the places are the
    // space's rather than any one shape's, so neither is spent on the way.
    await chooseSpaceMenu(page, '1', 'show-row')
    await chooseSpaceMenu(page, '1', 'show-tabs')
    await expect(stripName(page).first()).toHaveText('Right')
    await choosePaneMenu(page, 'sources', 'show-row')
    await chooseSpaceMenu(page, '1', 'show-desktop')

    expect(await spaceMode(page, '1')).toBe('desktop')
    const after = await frameBox(page, 'notes')
    expect(after.x).toBeCloseTo(before.x, 0)
    expect(after.y).toBeCloseTo(before.y, 0)
  })

  test('says it in front of the tabs, and not at all when the host says not to', async ({
    page,
  }) => {
    await gotoStory(page, NAMED_STRIP)
    const name = await stripName(page).first().boundingBox()
    const first = await tab(page, 'sources').boundingBox()
    if (!name || !first) throw new Error('The named strip is not on screen')
    expect(name.x + name.width).toBeLessThanOrEqual(first.x + 1)

    // Off, the strip is tabs and nothing else — and the space is still named
    // underneath, so it is still a space of its own in the row around it.
    await gotoStory(page, NAMED_STRIP_PLAIN)
    await expect(stripName(page)).toHaveCount(0)
    await choosePaneMenu(page, 'sources', 'show-row')
    await expect(space(page, '1').locator('> .dc-space__head .dc-space__title')).toHaveText('Right')
  })
})

test.describe('Window — a window holding a desktop', () => {
  /** The row shown as a desktop: items at `0`, the desktop's window at `1`. */
  const asWindows = async (page: Page) => {
    await gotoStory(page, FLOATING_MIXED)
    await chooseSpaceMenu(page, '', 'show-desktop')
    await expect(frameAtPath(page, '1')).toHaveCount(1)
    await expect(frameBarAt(page, '1')).toHaveText(/Right/)
  }

  test('moves when its own title bar is dragged', async ({ page }) => {
    await asWindows(page)
    const before = await frameBoxAt(page, '1')
    // Sources is the first window on the desktop it holds, so `1/0` — a panel
    // would name both this window and that one, which is the whole point.
    const inside = await frameBoxAt(page, '1/0')

    await dragFrameAt(page, '1', 80, 60)

    const after = await frameBoxAt(page, '1')
    expect(after.x).toBeCloseTo(before.x + 80, 0)
    expect(after.y).toBeCloseTo(before.y + 60, 0)
    // The windows on it are carried along rather than moved: each is still
    // exactly where it was on the desktop it is on.
    const carried = await frameBoxAt(page, '1/0')
    expect(carried.x).toBeCloseTo(inside.x + 80, 0)
    expect(carried.y).toBeCloseTo(inside.y + 60, 0)
  })

  test('resizes from its own grips', async ({ page }) => {
    await asWindows(page)
    const before = await frameBoxAt(page, '1')

    await dragFrameGripAt(page, '1', 'se', 70, 40)

    const after = await frameBoxAt(page, '1')
    expect(after.width).toBeCloseTo(before.width + 70, 0)
    expect(after.height).toBeCloseTo(before.height + 40, 0)
  })

  test('fills its float, and rolls up, from the buttons on its own bar', async ({ page }) => {
    await asWindows(page)
    const desktop = await desktopBox(page)
    const bar = frameBarAt(page, '1')

    await bar.locator('[data-dc-maximize]').click()
    const filled = await frameBoxAt(page, '1')
    expect(filled.width).toBeCloseTo(desktop.width, 0)
    expect(filled.height).toBeCloseTo(desktop.height, 0)
    // The windows inside it are not maximized — only the window they are on.
    await expect(frameAtPath(page, '1/0')).toHaveAttribute('data-dc-maximized', 'false')

    await bar.locator('[data-dc-maximize]').click()
    await bar.locator('[data-dc-minimize]').click()
    await expect(frameAtPath(page, '1')).toHaveAttribute('data-dc-minimized', 'true')
    const rolled = await frameBoxAt(page, '1')
    expect(rolled.height).toBeLessThan(filled.height)
  })

  /*
   * Raising it brings the pile it is in forward and leaves the pile inside it
   * alone: none of the windows on the desktop it holds was touched.
   */
  test('comes forward without reordering the desktop it holds', async ({ page }) => {
    await asWindows(page)

    // Clear of items, so there is bar to press rather than the pane covering it.
    await dragFrameAt(page, '1', 240, 200)
    // Items to the front, which puts the window holding the desktop behind it —
    // and a raise is exactly what renumbers the paths, so it is `0` now.
    await tab(page, 'items').click()
    await expect(frameBarAt(page, '0')).toHaveText(/Right/)
    await expect(frameAtPath(page, '0')).toHaveAttribute('data-dc-order', '0')

    await frameBarAt(page, '0').click()

    // In front of items now, and the three windows on it are in the order they
    // always were: none of them was touched, so none of them came forward.
    await expect(frameBarAt(page, '1')).toHaveText(/Right/)
    await expect(frameAtPath(page, '1')).toHaveAttribute('data-dc-order', '1')
    await expect(frameAtPath(page, '1/0')).toHaveAttribute('data-dc-order', '0')
    await expect(frameAtPath(page, '1/1')).toHaveAttribute('data-dc-order', '1')
    await expect(frameAtPath(page, '1/2')).toHaveAttribute('data-dc-order', '2')
  })
})

test.describe('Window — a desktop as a tab', () => {
  test('collapses a row of a pane and a desktop into two tabs', async ({ page }) => {
    await gotoStory(page, FLOATING_MIXED)

    await chooseSpaceMenu(page, '', 'show-tabs')

    // Two tabs, not four: the three windows are the desktop's, and the desktop
    // is one tab named the way it names itself — `Right` here, because the
    // story named it, and `Desktop` on a desktop that was left unnamed.
    expect(await tabNames(page, 'items')).toEqual(['Items', 'Right'])
    expect(await tabOrder(page, 'items')).toEqual(['items', ''])
    await expect(spaceTab(page, 'Right')).toHaveCount(1)
    // None of the windows on it is a tab of the strip.
    await expect(tab(page, 'sources')).toHaveCount(0)
    await expect(tab(page, 'activity')).toHaveCount(0)
    await expect(tab(page, 'notes')).toHaveCount(0)
  })

  test('shows the desktop, windows and all, when its tab is on top', async ({ page }) => {
    await gotoStory(page, FLOATING_MIXED)
    const before = await Promise.all([
      frameBox(page, 'sources'),
      frameBox(page, 'activity'),
      frameBox(page, 'notes'),
    ])

    await chooseSpaceMenu(page, '', 'show-tabs')
    // Only the tab on top is rendered, and the desktop is behind items.
    await expect(page.locator('.dc-window__desktop')).toHaveCount(0)

    await spaceTab(page, 'Right').click()

    await expect(page.locator('.dc-window__desktop')).toHaveCount(1)
    expect(await frameOrder(page)).toEqual(['sources', 'activity', 'notes'])
    // Every window exactly where it was: the desktop was never taken apart, so
    // it is the same desktop in a tab rather than a new one.
    const after = await Promise.all([
      frameBox(page, 'sources'),
      frameBox(page, 'activity'),
      frameBox(page, 'notes'),
    ])
    expect(after.map((box) => box.width)).toEqual(before.map((box) => box.width))
    expect(after.map((box) => box.height)).toEqual(before.map((box) => box.height))
  })

  /*
   * The strip is the only bar the desktop has while it is a tab, so it is the
   * desktop's bar: it says the desktop's name, and the menu on it is its own
   * four choices rather than the strip's — the same trick a floating window's
   * title bar plays for a space inside it.
   */
  test('the strip speaks for the desktop while its tab is on top', async ({ page }) => {
    await gotoStory(page, FLOATING_MIXED)
    await chooseSpaceMenu(page, '', 'show-tabs')

    // From the items tab, the menu is about the strip: these panes are tabs.
    await openPaneMenu(page, 'items')
    await expect(menuItem(page, 'show-tabs')).toHaveAttribute('aria-checked', 'true')
    await expect(menuItem(page, 'show-tabs')).toBeDisabled()
    await page.keyboard.press('Escape')

    await spaceTab(page, 'Right').click()

    // From the desktop's tab it is about the desktop: windows is what it is.
    await paneMenuButton(page, 'items').click()
    await expect(menuItem(page, 'show-desktop')).toHaveAttribute('aria-checked', 'true')
    await expect(menuItem(page, 'show-desktop')).toBeDisabled()
    await expect(menuItem(page, 'show-row')).toBeEnabled()
    // And the two ways back along the strip are on it either way.
    await expect(menuItem(page, 'next-tab')).toBeEnabled()
  })

  test('tiles the desktop inside its own tab', async ({ page }) => {
    await gotoStory(page, FLOATING_MIXED)
    await chooseSpaceMenu(page, '', 'show-tabs')
    await spaceTab(page, 'Right').click()

    await choosePaneMenu(page, 'items', 'show-column')

    // The tab is now the column the desktop became, and a space shown another
    // way is the same space: it keeps the name the layout gave it.
    await expect(spaceTab(page, 'Right')).toHaveCount(1)
    const [sources, activity] = await Promise.all([boxOf(page, 'sources'), boxOf(page, 'activity')])
    expect(activity.y).toBeGreaterThan(sources.y + sources.height - 1)
    // Items is still the tab beside it, and still has the strip to come back to.
    expect(await tabNames(page, 'items')).toEqual(['Items', 'Right'])
  })

  test('spreads back into the row it was collapsed from', async ({ page }) => {
    await gotoStory(page, FLOATING_MIXED)
    const before = await frameBox(page, 'notes')

    await chooseSpaceMenu(page, '', 'show-tabs')
    await choosePaneMenu(page, 'items', 'show-row')

    // A pane and a desktop side by side again, and every window where it was.
    expect(await spaceMode(page, '')).toBe('row')
    await expect(page.locator('.dc-window__desktop')).toHaveCount(1)
    expect(await frameOrder(page)).toEqual(['sources', 'activity', 'notes'])
    const after = await frameBox(page, 'notes')
    expect(after.width).toBeCloseTo(before.width, 0)
    expect(after.height).toBeCloseTo(before.height, 0)
  })

  test('the windows in it are still windows', async ({ page }) => {
    await gotoStory(page, FLOATING_MIXED)
    await chooseSpaceMenu(page, '', 'show-tabs')
    await spaceTab(page, 'Right').click()
    const before = await frameBox(page, 'notes')

    await dragFrame(page, 'notes', 60, 30)

    const after = await frameBox(page, 'notes')
    expect(after.x).toBeCloseTo(before.x + 60, 0)
    expect(after.y).toBeCloseTo(before.y + 30, 0)
  })

  /*
   * What is inside the tab is the desktop's, drop targets included: the pane
   * around it answers for its own strip and for nothing else, or a window could
   * never be dropped on the desktop a tab is showing.
   */
  test('a tab dropped on the desktop inside it becomes a window there', async ({ page }) => {
    await gotoStory(page, FLOATING_MIXED)
    await chooseSpaceMenu(page, '', 'show-tabs')
    await spaceTab(page, 'Right').click()

    const box = await desktopBox(page)
    const handle = await tab(page, 'items').boundingBox()
    if (!handle) throw new Error('Items has no tab on screen')
    await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.75, { steps: 12 })
    // Previewed by the desktop in the tab, which is whose drop it is.
    await expect(desktopDrop(page)).toHaveCount(1)
    await dropPanel(page)

    await expect(floatFrame(page, 'items')).toHaveCount(1)
    expect(await frameOrder(page)).toEqual(['sources', 'activity', 'notes', 'items'])
    // Nothing is left in the strip but the desktop — and the strip is `Top`,
    // which the layout named, so it stays and says so: a set of tabs of one
    // space is that space only while nothing was said about the strip itself.
    await expect(stripName(page).first()).toHaveText('Top')
    expect(await spaceMode(page, '0')).toBe('desktop')
    await expect(spaceTab(page, 'Right')).toHaveCount(1)
  })

  test('steps along the strip, desktop and all', async ({ page }) => {
    await gotoStory(page, FLOATING_MIXED)
    await chooseSpaceMenu(page, '', 'show-tabs')

    await choosePaneMenu(page, 'items', 'next-tab')

    await expect(spaceTab(page, 'Right')).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator('.dc-window__desktop')).toHaveCount(1)
  })
})

test.describe('Window — the items a panel\'s content registers', () => {
  test('offers them above the window\'s own', async ({ page }) => {
    await gotoStory(page, CONTENT_MENU)
    // The panel declares no views, so the window puts none in its menu — and
    // the menu offers the view type all the same, from the table inside it.

    await openPaneMenu(page, 'items')
    const items = menus(page).first().locator('.dc-menu__item')
    // The window contributes nothing to a pane of host content, so what the
    // content registered is the whole of this menu.
    expect(await items.evaluateAll((all) => all.map((item) => item.dataset.dcItem))).toEqual([
      'view-type',
    ])
  })

  test('ticks what the content is showing, and changes it when chosen', async ({ page }) => {
    await gotoStory(page, CONTENT_MENU)
    const body = pane(page, 'items').locator('.dc-pane__body')
    await expect(body.locator('.dc-table')).toHaveCount(1)

    await choosePaneMenu(page, 'items', 'view-type')
    await expect(menuItem(page, 'view-table')).toHaveAttribute('aria-checked', 'true')
    await expect(menuItem(page, 'view-cards')).toHaveAttribute('aria-checked', 'false')

    await menuItem(page, 'view-cards').click()
    await expect(body.locator('.dc-cards')).toHaveCount(1)
    await expect(body.locator('.dc-table')).toHaveCount(0)

    // Read again when the menu is next opened, so the tick followed the view.
    await choosePaneMenu(page, 'items', 'view-type')
    await expect(menuItem(page, 'view-cards')).toHaveAttribute('aria-checked', 'true')
    await expect(menuItem(page, 'view-table')).toHaveAttribute('aria-checked', 'false')
  })

  test('offers them in the menu of that panel only', async ({ page }) => {
    await gotoStory(page, CONTENT_MENU)
    // Sources registered nothing, so it has no menu to open — and the space
    // around it offers how it is shown rather than any panel's own items.
    await expect(paneMenuButton(page, 'items')).toHaveCount(1)
    await expect(paneMenuButton(page, 'sources')).toHaveCount(0)

    await chooseSpaceMenu(page, '1')
    await expect(menuItem(page, 'view-type')).toHaveCount(0)
  })
})

test.describe('Window — closing a panel', () => {
  test('gives every tab of a tabbed pane its own close', async ({ page }) => {
    await gotoStory(page, CLOSABLE)
    for (const id of ['sources', 'activity', 'log']) {
      await expect(closeButton(page, id)).toHaveCount(1)
    }
    // Held back until the tab is hovered, so a long strip reads as names.
    await expect(closeButton(page, 'activity')).toBeHidden()
    await tab(page, 'activity').hover()
    await expect(closeButton(page, 'activity')).toBeVisible()
    // A pane of one carries a single close in its tools instead.
    await expect(closeButton(page, 'items')).toHaveCount(1)
    await expect(pane(page, 'items').locator('.dc-pane__close')).toHaveCount(1)
  })

  test('asks the host, which drops the panel from the list', async ({ page }) => {
    await gotoStory(page, CLOSABLE)
    await tab(page, 'activity').hover()
    await closeButton(page, 'activity').click()
    // The window removes nothing itself: the panel goes because the story
    // filtered it out of `panels` in the `panel-close` handler.
    await expect(pane(page, 'activity')).toHaveCount(0)
    await expect(pane(page, 'sources')).toHaveCount(1)
  })

  test('offers no close when the window is not closable', async ({ page }) => {
    await gotoStory(page, PANE_MENU)
    await expect(page.locator('[data-dc-close]')).toHaveCount(0)
  })

  /*
   * The cross and nothing else. A `Close` item would sit in a menu opened from
   * the very header the cross is in — and taking it out is part of what leaves
   * a pane of host content with nothing but its own views to offer.
   */
  test('is a button rather than an item in a menu', async ({ page }) => {
    await gotoStory(page, CLOSABLE)
    await expect(closeButton(page, 'items')).toHaveCount(1)

    // Items' menu is the views it declares, and nothing else.
    await openPaneMenu(page, 'items')
    const own = menus(page).first().locator('.dc-menu__item')
    expect(await own.evaluateAll((all) => all.map((item) => item.dataset.dcItem))).toEqual(['view'])
    await page.keyboard.press('Escape')

    // The tabbed pane beside it still has a menu — about its tabs — and no
    // close in it either.
    await openPaneMenu(page, 'sources')
    await expect(menuItem(page, 'close')).toHaveCount(0)
  })

  test('closing a tab does not also select it', async ({ page }) => {
    await gotoStory(page, CLOSABLE)
    // sources is on top; closing log's tab must leave sources on top.
    await tab(page, 'log').hover()
    await closeButton(page, 'log').click()
    await expect(tab(page, 'sources')).toHaveAttribute('aria-selected', 'true')
  })
})

test.describe('Window — making and closing panels', () => {
  test('a panel made from the menu joins the grid', async ({ page }) => {
    await gotoStory(page, WORKBENCH)
    expect(await panelOrder(page)).toEqual(['items', 'sources'])

    await chooseMenu(page, 'File', 'new-note')

    expect(await panelOrder(page)).toEqual(['items', 'sources', 'note-1'])
    await expect(pane(page, 'note-1')).toContainText('A panel made from the menu')
  })

  test('a panel made on a desktop opens as a window, clear of the last', async ({ page }) => {
    await gotoStory(page, WORKBENCH_DESKTOP)
    expect(await frameOrder(page)).toEqual(['items', 'sources'])

    await chooseMenu(page, 'File', 'new-note')
    await chooseMenu(page, 'File', 'new-log')

    expect(await frameOrder(page)).toEqual(['items', 'sources', 'note-1', 'log-2'])
    const [note, log] = await Promise.all([frameBox(page, 'note-1'), frameBox(page, 'log-2')])
    expect(log.x).toBeGreaterThan(note.x)
    expect(log.y).toBeGreaterThan(note.y)
  })

  test('closing a panel removes it, and its space goes to what is left', async ({ page }) => {
    await gotoStory(page, WORKBENCH)
    const before = await boxOf(page, 'items')

    await closeButton(page, 'sources').click()

    await expect(pane(page, 'sources')).toHaveCount(0)
    expect(await panelOrder(page)).toEqual(['items'])
    const after = await boxOf(page, 'items')
    expect(after.width).toBeGreaterThan(before.width)

    // The row it was in does not collapse into the panel that is left: the
    // four choices are the space's, so the last panel in a window would
    // otherwise have nowhere to be told to float from.
    await expect(space(page, '')).toHaveCount(1)
    await chooseSpaceMenu(page, '')
    await expect(menuItem(page, 'show-desktop')).toBeEnabled()
  })

  test('a window with nothing left in it says so', async ({ page }) => {
    await gotoStory(page, WORKBENCH)
    await chooseMenu(page, 'File', 'close-all')

    await expect(page.locator('.dc-pane')).toHaveCount(0)
    await expect(page.locator('.dc-window__empty')).toBeVisible()

    // And it comes back to life when a panel is made again.
    await chooseMenu(page, 'File', 'new-note')
    await expect(pane(page, 'note-1')).toHaveCount(1)
  })

  test('the menu relays out everything that is there', async ({ page }) => {
    await gotoStory(page, WORKBENCH)
    await chooseMenu(page, 'File', 'new-note')

    await chooseMenu(page, 'View', 'view-tabs')
    expect(await tabOrder(page, 'items')).toEqual(['items', 'sources', 'note-1'])

    await chooseMenu(page, 'View', 'view-windows')
    expect(await frameOrder(page)).toEqual(['items', 'sources', 'note-1'])
  })
})

test.describe('Window — the menu bar', () => {
  test('one menu open, the pointer alone moves between them', async ({ page }) => {
    await gotoStory(page, WORKBENCH)
    await menubarItem(page, 'File').click()
    await expect(menuItem(page, 'new-note')).toBeVisible()

    // Hovering another top-level name swaps to it without a second click.
    await menubarItem(page, 'View').hover()
    await expect(menuItem(page, 'view-row')).toBeVisible()
    await expect(menuItem(page, 'new-note')).toHaveCount(0)
  })

  test('the arrow keys walk the bar and open a menu', async ({ page }) => {
    await gotoStory(page, WORKBENCH)
    await menubarItem(page, 'File').focus()

    await page.keyboard.press('ArrowDown')
    await expect(menuItem(page, 'new-note')).toBeFocused()

    // With one open, left and right belong to the bar at any depth.
    await page.keyboard.press('ArrowRight')
    await expect(menuItem(page, 'view-row')).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(menus(page)).toHaveCount(0)
  })

  test('opens a submenu, and marks a disabled item unusable', async ({ page }) => {
    await gotoStory(page, WORKBENCH)
    await menubarItem(page, 'File').click()
    await menuItem(page, 'recent').hover()

    await expect(menus(page)).toHaveCount(2)
    await expect(page.locator('.dc-menu__item', { hasText: 'items.json' })).toBeDisabled()
  })
})

const MAXIMIZE = 'window-panel-grid--floating-maximize'

test.describe('Window — maximizing a floating window', () => {
  test('fills the float, and puts it back exactly where it was', async ({ page }) => {
    await gotoStory(page, MAXIMIZE)
    const desk = await desktopBox(page)
    const before = await frameBox(page, 'items')

    await maximizeButton(page, 'items').click()

    const maxed = await frameBox(page, 'items')
    expect(maxed.x).toBeCloseTo(desk.x, 0)
    expect(maxed.y).toBeCloseTo(desk.y, 0)
    expect(maxed.width).toBeCloseTo(desk.width, 0)
    expect(maxed.height).toBeCloseTo(desk.height, 0)

    await maximizeButton(page, 'items').click()

    const after = await frameBox(page, 'items')
    expect(after.x).toBeCloseTo(before.x, 0)
    expect(after.y).toBeCloseTo(before.y, 0)
    expect(after.width).toBeCloseTo(before.width, 0)
    expect(after.height).toBeCloseTo(before.height, 0)
  })

  test('a double-click on the title bar does the same', async ({ page }) => {
    await gotoStory(page, MAXIMIZE)
    const desk = await desktopBox(page)

    // A window holding one group is titled by its own tab strip, so the strip
    // is what takes the double-click — clear of the tabs and the controls on it.
    await doubleClickTitleBar(page, 'sources')
    expect((await frameBox(page, 'sources')).width).toBeCloseTo(desk.width, 0)

    await doubleClickTitleBar(page, 'sources')
    expect((await frameBox(page, 'sources')).width).toBeLessThan(desk.width)
  })

  test('a double-click on a tab does not maximize', async ({ page }) => {
    await gotoStory(page, MAXIMIZE)
    const before = await frameBox(page, 'sources')
    await tab(page, 'notes').dblclick()
    expect((await frameBox(page, 'sources')).width).toBeCloseTo(before.width, 0)
  })

  test('a window holding a grid maximizes from its own title bar', async ({ page }) => {
    await gotoStory(page, MAXIMIZE)
    const desk = await desktopBox(page)
    await expect(frameBar(page, 'activity')).toHaveCount(1)

    await frameBar(page, 'activity').dblclick({ position: { x: 100, y: 10 } })
    expect((await frameBox(page, 'activity')).width).toBeCloseTo(desk.width, 0)
  })

  test('offers no resize grips, and will not be dragged', async ({ page }) => {
    await gotoStory(page, MAXIMIZE)
    await maximizeButton(page, 'items').click()
    const maxed = await frameBox(page, 'items')

    await expect(floatFrame(page, 'items').locator('.dc-float__grip')).toHaveCount(0)

    await dragFrame(page, 'items', 120, 80)
    const after = await frameBox(page, 'items')
    expect(after.x).toBeCloseTo(maxed.x, 0)
    expect(after.y).toBeCloseTo(maxed.y, 0)
  })

  test('the arrow keys say so rather than moving it', async ({ page }) => {
    await gotoStory(page, MAXIMIZE)
    await maximizeButton(page, 'items').click()
    const maxed = await frameBox(page, 'items')

    await grip(page, 'items').click()
    await page.keyboard.press('ArrowRight')

    expect((await frameBox(page, 'items')).x).toBeCloseTo(maxed.x, 0)
    await expect(page.locator('.dc-window__live')).toContainText('maximized')
  })

  /*
   * The button and nothing else. Both live in the very header a menu would
   * open from, so repeating them as items only made the menu longer — and
   * taking them out is what leaves a plain floating window with nothing in its
   * menu but the views its panel declares, rather than a button that opens two
   * things already beside it.
   */
  test('is a button in the title bar rather than an item in a menu', async ({ page }) => {
    await gotoStory(page, MAXIMIZE)
    await expect(maximizeButton(page, 'items')).toHaveAttribute('aria-label', /Maximize/)
    await openPaneMenu(page, 'items')
    const own = menus(page).first().locator('.dc-menu__item')
    expect(await own.evaluateAll((all) => all.map((item) => item.dataset.dcItem))).toEqual(['view'])
    await page.keyboard.press('Escape')

    await maximizeButton(page, 'items').click()

    const desk = await desktopBox(page)
    expect((await frameBox(page, 'items')).width).toBeCloseTo(desk.width, 0)
    await expect(maximizeButton(page, 'items')).toHaveAttribute('aria-label', /Restore/)
    await expect(maximizeButton(page, 'items')).toHaveAttribute('aria-pressed', 'true')
  })

  test('a tiled pane is offered none of it', async ({ page }) => {
    await gotoStory(page, PANE_MENU)
    await expect(page.locator('[data-dc-maximize]')).toHaveCount(0)
  })

  test('the windows behind it are still there when it is restored', async ({ page }) => {
    await gotoStory(page, MAXIMIZE)
    const before = await frameBox(page, 'sources')

    await maximizeButton(page, 'items').click()
    // Maximizing raises it, so it covers the rest rather than hiding under them.
    expect(await frameOrder(page)).toEqual(['sources', 'activity', 'items'])

    await maximizeButton(page, 'items').click()
    const after = await frameBox(page, 'sources')
    expect(after.x).toBeCloseTo(before.x, 0)
    expect(after.width).toBeCloseTo(before.width, 0)
  })
})

const MINIMIZE = 'window-panel-grid--floating-minimize'

test.describe('Window — minimizing a floating window', () => {
  test('rolls up to its title bar and docks at the bottom', async ({ page }) => {
    await gotoStory(page, MINIMIZE)
    const desk = await desktopBox(page)
    const before = await frameBox(page, 'items')

    await minimizeButton(page, 'items').click()

    const rolled = await frameBox(page, 'items')
    expect(rolled.height).toBeLessThan(60)
    expect(rolled.height).toBeLessThan(before.height)
    // Along the bottom edge, not where it used to be.
    expect(rolled.y + rolled.height).toBeCloseTo(desk.y + desk.height - 6, 0)
    expect(rolled.x).toBeCloseTo(desk.x + 6, 0)
  })

  test('keeps its name, and unrolls to exactly where it was', async ({ page }) => {
    await gotoStory(page, MINIMIZE)
    const before = await frameBox(page, 'items')

    await minimizeButton(page, 'items').click()
    // Rolled up, every window shows a bar — the tab strip that was its title
    // has gone with the rest of it.
    await expect(frameBar(page, 'items')).toContainText('Items')

    await minimizeButton(page, 'items').click()

    const after = await frameBox(page, 'items')
    expect(after.x).toBeCloseTo(before.x, 0)
    expect(after.y).toBeCloseTo(before.y, 0)
    expect(after.width).toBeCloseTo(before.width, 0)
    expect(after.height).toBeCloseTo(before.height, 0)
  })

  test('several dock side by side, in an order that does not shuffle', async ({ page }) => {
    await gotoStory(page, MINIMIZE)
    await minimizeButton(page, 'items').click()
    await minimizeButton(page, 'sources').click()

    const [items, sources] = await Promise.all([frameBox(page, 'items'), frameBox(page, 'sources')])
    // Level with each other along the bottom, and not overlapping.
    expect(sources.y).toBeCloseTo(items.y, 0)
    expect(sources.x).toBeGreaterThan(items.x + items.width - 1)

    // Raising one moves it up the stack but not along the dock.
    await frameBar(page, 'items').click()
    expect((await frameBox(page, 'items')).x).toBeCloseTo(items.x, 0)
  })

  test('keeps what is inside it, rolled up and back', async ({ page }) => {
    await gotoStory(page, MINIMIZE)
    const body = pane(page, 'items').locator('.dc-pane__body')
    await body.evaluate((element) => {
      element.scrollTop = 120
    })

    await minimizeButton(page, 'items').click()
    await minimizeButton(page, 'items').click()

    expect(await body.evaluate((element) => element.scrollTop)).toBe(120)
  })

  test('a double-click on the bar unrolls it', async ({ page }) => {
    await gotoStory(page, MINIMIZE)
    const before = await frameBox(page, 'items')

    await minimizeButton(page, 'items').click()
    await frameBar(page, 'items').dblclick({ position: { x: 60, y: 10 } })

    expect((await frameBox(page, 'items')).height).toBeCloseTo(before.height, 0)
  })

  test('offers no grips, and will not be dragged', async ({ page }) => {
    await gotoStory(page, MINIMIZE)
    await minimizeButton(page, 'items').click()
    const rolled = await frameBox(page, 'items')

    await expect(floatFrame(page, 'items').locator('.dc-float__grip')).toHaveCount(0)

    await grip(page, 'items').click({ force: true }).catch(() => undefined)
    expect((await frameBox(page, 'items')).x).toBeCloseTo(rolled.x, 0)
  })

  test('is exclusive with maximizing, either way round', async ({ page }) => {
    await gotoStory(page, MINIMIZE)
    const desk = await desktopBox(page)

    await minimizeButton(page, 'items').click()
    await maximizeButton(page, 'items').click()
    // Maximizing unrolls it on the way.
    expect((await frameBox(page, 'items')).width).toBeCloseTo(desk.width, 0)

    await minimizeButton(page, 'items').click()
    const rolled = await frameBox(page, 'items')
    expect(rolled.width).toBeLessThan(desk.width)
    expect(rolled.height).toBeLessThan(60)
  })

  test('can still be closed while rolled up', async ({ page }) => {
    await gotoStory(page, MINIMIZE)
    await minimizeButton(page, 'items').click()
    // The pane's own close went with the rest of it, so the bar carries one.
    await expect(frameBar(page, 'items').locator('[data-dc-close="items"]')).toHaveCount(1)
  })

  test('the button says Minimize, then Unroll', async ({ page }) => {
    await gotoStory(page, MINIMIZE)
    await expect(minimizeButton(page, 'items')).toHaveAttribute('aria-label', /Minimize/)
    await minimizeButton(page, 'items').click()

    expect((await frameBox(page, 'items')).height).toBeLessThan(60)
    await expect(minimizeButton(page, 'items')).toHaveAttribute('aria-label', /Unroll/)
  })
})

/*
 * A space says what its own bar offers, and whether it draws one at all.
 *
 * `fixedView` takes the choice of how it is shown away — the views on a pane,
 * the four display modes on a container — and `headless` takes the bar
 * itself, with everything that was on it. Both leave what they took to the
 * host, which is the only reason to say either.
 */
const FIXED_VIEW = 'window-panel-grid--fixed-view'
const FIXED_SPACE = 'window-panel-grid--fixed-space'
const FIXED_TABS = 'window-panel-grid--fixed-tabs'
const HEADLESS_PANE = 'window-panel-grid--headless-pane'
const HEADLESS_SPACE = 'window-panel-grid--headless-space'
const HEADLESS_WINDOW = 'window-panel-grid--headless-window'

test.describe('Window — a space whose view is fixed', () => {
  test('shows the view it was set to, and offers no way to change it', async ({ page }) => {
    await gotoStory(page, FIXED_VIEW)
    // The panel declares four views and the window is on one of them — what is
    // withheld is the choice, not the view. With the choice goes the whole of
    // this pane's menu, since its views were all of it.
    await expect(pane(page, 'items').locator('.dc-cards')).toBeVisible()
    await expect(paneMenuButton(page, 'items')).toHaveCount(0)
    // The pane is otherwise a pane: it still names what is in it.
    await expect(paneHead(page, 'items')).toContainText('Items')
  })

  test('a container offers no menu, since those four choices are all it had', async ({ page }) => {
    await gotoStory(page, FIXED_SPACE)
    await expect(space(page, '').locator('> .dc-space__head .dc-space__title')).toHaveText('Row')
    await expect(spaceMenuButton(page, '')).toHaveCount(0)
    // Said per space, not for the window: the column inside it keeps its own.
    await expect(spaceMenuButton(page, '1')).toHaveCount(1)
  })

  test('a pane of tabs keeps the items that are about its tabs', async ({ page }) => {
    await gotoStory(page, FIXED_TABS)
    await openPaneMenu(page, 'sources')
    const items = menus(page).first().locator('.dc-menu__item')
    expect(await items.evaluateAll((all) => all.map((item) => item.dataset.dcItem))).toEqual([
      'next-tab',
      'previous-tab',
    ])
  })
})

test.describe('Window — a space with no title bar', () => {
  test('draws no header, and gives the room to the content', async ({ page }) => {
    await gotoStory(page, HEADLESS_PANE)
    const items = pane(page, 'items')
    await expect(items).toHaveAttribute('data-dc-headless', 'true')
    await expect(items.locator('.dc-pane__head')).toHaveCount(0)
    // With the bar go the name, the menu its views were chosen from, and the
    // grip that carried it.
    await expect(items.locator('.dc-menu-button')).toHaveCount(0)
    await expect(grip(page, 'items')).toHaveCount(0)
    // What the host set is still what it shows.
    await expect(items.locator('.dc-cards')).toBeVisible()

    // The panes beside it are ordinary, and keep theirs.
    await expect(paneHead(page, 'sources')).toBeVisible()
  })

  test('is a pane like any other underneath, so a panel can still be dropped on it', async ({
    page,
  }) => {
    await gotoStory(page, HEADLESS_PANE)
    await dragPanel(page, 'sources', 'items', 'left')
    expect(await panelOrder(page)).toEqual(['sources', 'items', 'activity'])
    // And it is still headless where it landed.
    await expect(pane(page, 'items').locator('.dc-pane__head')).toHaveCount(0)
  })

  test('a container draws none either, and the panes in it keep theirs', async ({ page }) => {
    await gotoStory(page, HEADLESS_SPACE)
    await expect(space(page, '')).toBeVisible()
    await expect(space(page, '').locator('> .dc-space__head')).toHaveCount(0)
    // Only this space: the column inside it is named and has its menu.
    await expect(space(page, '1').locator('> .dc-space__head')).toBeVisible()
    await expect(paneHead(page, 'items')).toBeVisible()
  })

  test('a floating window loses its bar, and with it maximize and minimize', async ({ page }) => {
    await gotoStory(page, HEADLESS_WINDOW)
    const window = floatFrame(page, 'items')
    await expect(window.locator('.dc-float__bar')).toHaveCount(0)
    await expect(window.locator('.dc-pane__head')).toHaveCount(0)
    await expect(page.locator('[data-dc-maximize="items"]')).toHaveCount(0)
    await expect(page.locator('[data-dc-minimize="items"]')).toHaveCount(0)

    // The window beside it is ordinary, and keeps both.
    await expect(maximizeButton(page, 'log')).toBeVisible()
    await expect(minimizeButton(page, 'log')).toBeVisible()
  })

  test('can still be resized and raised, neither of which was on the bar', async ({ page }) => {
    await gotoStory(page, HEADLESS_WINDOW)
    await expect(floatFrame(page, 'items').locator('.dc-float__grip')).toHaveCount(8)
    expect(await frameOrder(page)).toEqual(['items', 'log'])

    const before = await frameBox(page, 'items')
    await dragFrameGrip(page, 'items', 'se', 60, 40)
    const after = await frameBox(page, 'items')
    expect(after.width).toBeCloseTo(before.width + 60, 0)
    expect(after.height).toBeCloseTo(before.height + 40, 0)

    // Touching a window brings it forward, which is the frame's doing and not
    // the title bar's.
    await floatFrame(page, 'items').click({ position: { x: 40, y: 40 } })
    expect(await frameOrder(page)).toEqual(['log', 'items'])
  })
})
