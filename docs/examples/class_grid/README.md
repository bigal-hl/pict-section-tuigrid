# Class Grid - The Minimum-Viable TuiGrid

<!-- docuserve:example-launch:start -->
> **[Launch the live app](examples/class%5Fgrid/index.html)** - runs in your browser, opens in a new tab.
<!-- docuserve:example-launch:end -->

The Class Grid is the smallest interesting `pict-section-tuigrid` application:
ten student records rendered as an editable spreadsheet. It demonstrates every
mechanism the framework gives you out of the box - column schemas, the four
built-in editor flavors (text, select, number, date picker), the currency
formatter, hidden tracking columns, and the `ColumnsToSolveOnChange` hook that
wires cell edits back into the Pict solver - and it does all of it with **zero
custom view logic**. The grid view is a one-line subclass of the framework's
base view; the whole behavior comes out of the configuration object.

It is the natural starting point before you reach for the
[Inventory Grid](../inventory_grid/README.md) (which adds frozen columns,
HTML5-validated text editors, and an AppData-resolved dropdown) or the
[Invoice Grid](../invoice_grid/README.md) (which overrides the data
marshaling methods for computed columns and live totals).

## What it demonstrates

| Capability | Where you see it |
|------------|------------------|
| One-line grid view subclass | `class ExampleGridView extends libPictSectionTuiGrid` - empty constructor |
| Address-based data binding | `GridDataAddress: "AppData.StudentData"` resolved against AppData on first render |
| Column schema as configuration | `TuiColumnSchema` - eight columns, no JS column construction |
| Hidden tracking columns | `idrecord` and `entity` columns with `"hidden": true` |
| Text editor shorthand | `"editor": "text"` on the Student Name column |
| Inline select editor with literal options | Reading Level column - `listItems` defined inline as an array of `{value, text}` |
| Number editor with per-column decimal precision | Overall Tuition (2 dp), Monthly Tuition Hike (4 dp), Height (3 dp) |
| Currency formatter | `"formatter": "FormatterCurrencyNumber"` on monetary columns |
| Date picker editor | Birthday column - `"type": "datePicker"`, ISO date format |
| Right-aligned numeric columns | `"align": "right"` on every numeric column |
| Fixed column widths | `"width": 100` on the wide numeric columns |
| Solver-triggered columns | `ColumnsToSolveOnChange` declared at the view level |
| Seeded sample data | Ten students inline in `DefaultAppData.StudentData` |

## Key files

- `Simple-Grid-Application.js` - the entire app. Defines an empty
  `ExampleGridView` subclass, the `ExampleGridConfiguration` object that drives
  every column, and a `PostcardApplication` class that registers the view.
- `html/index.html` - the HTML shell. Loads `pict.min.js`, the Toast UI Grid
  bundle, and the date picker bundle, then bootstraps the application via
  `Pict.safeLoadPictApplication(SimpleGrid, 1)`.
- `package.json` - declares the `pict` / `pict-application` / `pict-view` /
  `tui-grid` dependencies and the `copyFiles` rules that pull the third-party
  CSS/JS into `dist/`.

## The data model

The grid binds to a single array: `AppData.StudentData`. Each record is a flat
object with the same keys as the column schema:

```js
{ idrecord: 1, entity: "Student", name: "John Doe", readinglevel: "3", height: 1.75 }
```

The two hidden columns - `idrecord` and `entity` - are the framework's
recommended row-identity convention. They are never shown to the user but ride
along on every row so that any future code (a custom `changeHandler`, a solver,
a save-to-server hook) can identify which row produced an edit without
fragile row-key heuristics.

`overalltuition`, `monthlytuitionhike`, and `birthday` are intentionally absent
from most records - the grid renders empty cells for them and lets the user
fill them in. This matches how a real-world data set arrives: sparse, with
holes the editor is expected to close.

---

## Feature 1 - A one-line subclass

The view class is the absolute minimum the framework requires: a constructor
that forwards its arguments to `super`. There is no `onBeforeRender`, no
`onAfterRender`, no `customConfigureGridSettings` override - everything else
is driven from the configuration object.

```js
const libPictSectionTuiGrid = require('../../source/Pict-Section-TuiGrid.js');

class ExampleGridView extends libPictSectionTuiGrid
{
    constructor(pFable, pOptions, pServiceHash)
    {
        super(pFable, pOptions, pServiceHash);
    }
}
```

This is the pattern you reach for when the grid is a passive data display with
standard cell editors. As soon as you need cross-column math, server
round-trips, or DOM updates outside the grid, you start overriding methods -
see the [Invoice Grid](../invoice_grid/README.md) for that case.

---

## Feature 2 - Address-based data binding

The grid does not take an inline `data` array. It takes a string address that
resolves against the Pict address space on the first render:

```js
"ViewIdentifier": "ExampleGrid",
"TargetElementAddress": "#ExampleGridContainer",
"GridDataAddress": "AppData.StudentData"
```

When `onAfterInitialRender()` fires, the framework looks up `StudentData` on
`AppData`, **deep-clones** the result, and hands it to Toast UI Grid as the
`data` option. Two consequences worth knowing:

1. **The grid mutates its own copy.** Edits in the UI do not write back to
   `AppData.StudentData` automatically - they live inside the grid. If you
   want to persist changes, hook `changeHandler()` or read the data back via
   `this.tuiGrid.getData()` on save.
2. **The address is resolved exactly once.** Replacing `AppData.StudentData`
   wholesale after the grid is initialized does **not** repopulate the grid.
   For dynamic data you call `this.tuiGrid.resetData(newArray)` explicitly.

`TargetElementAddress` is the CSS selector for the mount point. The HTML shell
ships an `<div id="ExampleGridContainer">` exactly to match this address.

---

## Feature 3 - Hidden tracking columns

The first two columns in the schema are not visible to the user. They carry
the row's stable identity so downstream logic always knows which student a
given row is:

```js
{
    "header": "IDRecord",
    "name": "idrecord",
    "hidden": true
},
{
    "header": "Entity",
    "name": "entity",
    "hidden": true
},
```

`hidden: true` is a passthrough to Toast UI Grid - the column is fully part of
the data model, just not painted. Any code that calls
`tuiGrid.getValue(rowKey, 'idrecord')` (for example inside a `changeHandler`)
gets the right answer. The `entity` column is a Retold convention - when the
same grid is later used to feed a Meadow save, the entity name tells the
persistence layer which schema to write the row through.

---

## Feature 4 - Editor selection per column

Every column declares (or omits) an editor. The Class Grid uses four flavors,
each demonstrating one option style:

**Text editor - shorthand.** When you just need a basic text input, the string
`"text"` short-circuits the full editor object:

```js
{
    "header": "Student Name",
    "name": "name",
    "editor": "text"
}
```

This is Toast UI Grid's built-in text editor - no validation attributes, no
placeholder, no constraints. Reach for `EditorText` (see the Inventory Grid)
when you need any of those.

**Select editor - inline literal options.** The `listItems` array is supplied
directly in the schema, not via an address:

```js
{
    "header": "Reading Level",
    "name": "readinglevel",
    "editor": {
        "type": "select",
        "options": {
            "listItems": [
                {value: "1", text: "Level 1"},
                {value: "2", text: "Level 2"},
                {value: "3", text: "Level 3"},
                {value: "4", text: "Level 4"},
                {value: "5", text: "Level 5"},
                {value: "6", text: "Level 6"},
                {value: "7", text: "Level 7"}
            ]
        }
    }
}
```

This is the right shape when the option set is fixed at design time. The
[Inventory Grid](../inventory_grid/README.md) shows the alternative: passing a
string address (`"AppData.CategoryOptions"`) and letting the framework resolve
it at initialization time so the same dropdown can be reused across views.

**Number editor - custom class with decimal precision.** `EditorNumber` is one
of the framework's two custom editor classes. It mounts a native
`<input type="number">` and clamps keystrokes that would exceed the configured
precision:

```js
{
    "header": "Overall Tuition",
    "width": 100,
    "align": "right",
    "name": "overalltuition",
    "formatter": "FormatterCurrencyNumber",
    "editor": {
        "type": "EditorNumber",
        "options": {
            "decimalPrecision": 2
        }
    }
}
```

The Class Grid uses three different precisions: tuition columns at 2 decimals
(money), the Monthly Tuition Hike at 4 (the example demonstrates that very
small rate-style values benefit from extra precision), and Height in cm at 3.
Each column can pick its own.

**Date picker editor - Toast UI's built-in.** The fourth flavor is the
calendar widget; the `format` string is in Toast UI's format vocabulary
(`yyyy-MM-dd`), not dayjs:

```js
{
    "header": "Birthday",
    "name": "birthday",
    "editor": {
        "type": "datePicker",
        "options": {
            "format": "yyyy-MM-dd"
        }
    }
}
```

Note that `datePicker` requires the `tui-date-picker.js` and
`tui-date-picker.css` files to be loaded - that is why the `package.json`'s
`copyFiles` block pulls them out of `node_modules/tui-date-picker/dist/`.

---

## Feature 5 - Formatters and column alignment

A formatter is purely cosmetic: it transforms the cell value into a display
string when the cell is **not** being edited. The cell editor still sees the
raw numeric value, so a user editing `$75.50` sees `75.50` in the input box,
not the dollar sign.

The Class Grid uses one formatter, applied to the two currency columns:

```js
{
    "header": "Overall Tuition",
    "width": 100,
    "align": "right",
    "name": "overalltuition",
    "formatter": "FormatterCurrencyNumber",
    "editor": { "type": "EditorNumber", "options": { "decimalPrecision": 2 } }
}
```

`FormatterCurrencyNumber` is one of the four built-ins - the others are
`FormatterTwoDigitNumber`, `FormatterRoundedNumber`, and `FormatterDate`. The
framework looks the name up in `this.customFormatters` during the column-schema
processing pass in `onAfterInitialRender()` and swaps the string for the
function reference before handing the schema to Toast UI Grid.

`align: "right"` aligns the numeric body and footer; it does not change the
header alignment. Numeric columns are conventionally right-aligned so the
decimal points line up visually, which matters more in a tabular grid than in
a stacked form.

`width: 100` pins the column to exactly 100 pixels - the default is to
auto-size based on content. The default `GridColumnWidthResizable: true` lets
the user override this by dragging the column edge.

---

## Feature 6 - Solver-triggered columns

The Class Grid declares three columns whose edits should fire the Pict
solver - even though the example does not actually wire up a solver
expression:

```js
"ColumnsToSolveOnChange": {
    "quantity": true,
    "costperunit": true,
    "stockpile_id": true
}
```

When any cell in `quantity`, `costperunit`, or `stockpile_id` is edited, the
base class's `changeHandler()` checks `ColumnsToSolveOnChange`, sees a match,
and calls `this.services.PictApplication.solve()`. That triggers any
manifest-defined solver expressions across the whole application, not just
inside the grid.

Two things worth noting:

- **The Class Grid demonstrates the wiring even though there is no solver
  attached** - you can drop a manifest into this configuration later and it
  will immediately pick up these column triggers.
- **The example's schema does not actually include `costperunit` or
  `stockpile_id` columns.** The `ColumnsToSolveOnChange` entries are harmless
  in that case - the lookup never matches. It is a useful pattern when a
  configuration object is shared between several deployments that may or may
  not expose every column.

The per-column alternative (used by the [Inventory Grid](../inventory_grid/README.md))
is `"PictTriggerSolveOnChange": true` on the column itself. Both approaches
end up in the same `ColumnsToSolveOnChange` map after the schema processing
pass.

---

## Feature 7 - Seeded sample data

The application ships with ten student records inline. They are attached to
`pict_configuration.DefaultAppData` so Pict copies them into `AppData` at
boot:

```js
"DefaultAppData": {
    "StudentData": [
        { idrecord: 1, entity: "Student", name: "John Doe", readinglevel: "3", height: 1.75 },
        { idrecord: 2, entity: "Student", name: "Jane Doe", readinglevel: "5", height: 1.65 },
        { idrecord: 3, entity: "Student", name: "John Smith", readinglevel: "3", height: 1.851 },
        { idrecord: 4, entity: "Student", name: "Jane Smith", readinglevel: "6", overalltuition: 75.50, height: 1.754 },
        { idrecord: 5, entity: "Student", name: "John Johnson", birthday: "1976-02-1", readinglevel: "4", height: 1.95 },
        { idrecord: 6, entity: "Student", name: "Jane Johnson", birthday: "2010-05-01", readinglevel: "7", overalltuition: 75.50, height: 1.85 },
        { idrecord: 7, entity: "Student", name: "John Brown", readinglevel: "2", overalltuition: 75.50, height: 1.75 },
        { idrecord: 8, entity: "Student", name: "Jane Brown", readinglevel: "5", height: 1.657 },
        { idrecord: 9, entity: "Student", name: "John White", readinglevel: "3", overalltuition: 1.75, height: 1.85 },
        { idrecord: 10, entity: "Student", name: "Jane White", readinglevel: "6", height: 1.758 }
    ]
}
```

`DefaultAppData` is the standard Pict mechanism for offline example
applications. No fetch, no API call - open the page and the grid is populated.
This is why every example in this module is runnable from `file://` URLs after
a single `npm run build`.

---

## Running the example

```bash
cd example_applications/class_grid
npm install
npm run build
# then open dist/index.html in a browser
```

The `npm run build` step runs `npx quack build && npx quack copy`. The build
emits `dist/simple_grid.min.js`; the copy step pulls in the Pict bundle, the
Toast UI Grid bundle, the date picker bundle, and the HTML shell from
`./html/`.

## Things to try in the running app

- **Click into the Student Name cell** - a plain text input appears. Type a
  new name and press Enter.
- **Click into the Reading Level cell** - a native `<select>` appears with the
  seven options from the inline `listItems` array. Pick a different level.
- **Click into Overall Tuition** - a number input with two-decimal precision.
  Try typing `75.999` and watch the editor clamp the input to `75.99`.
- **Click into Monthly Tuition Hike** - same editor type but with four-decimal
  precision. The clamp threshold moves with the column.
- **Click into Height** - three-decimal precision. The stock data already
  includes values at the boundary (`1.851`, `1.754`) so you can see them
  render verbatim.
- **Click into Birthday** - the Toast UI date picker pops up. Pick a date.
- **Try entering an out-of-range value** - the `EditorNumber` accepts whatever
  `<input type="number">` accepts; it does not enforce a minimum or maximum.
- **Resize a column** - drag the right edge of a header. The default
  `GridColumnWidthResizable: true` lets every column resize.

## Takeaways

1. **The base view is a one-liner.** When the only thing you need is "render
   this array as an editable grid," the `class X extends libPictSectionTuiGrid`
   subclass has nothing in it. The configuration object does the work.
2. **The schema is data, not code.** Every column type, editor flavor,
   formatter, and alignment lives in `TuiColumnSchema`. Adding a column does
   not require touching the view class; serializing the schema to JSON for a
   server-driven build is straightforward.
3. **Decimal precision is per-column.** The same `EditorNumber` class drives
   the Tuition (2 dp), Monthly Tuition Hike (4 dp), and Height (3 dp) columns
   simultaneously - the `options.decimalPrecision` is per-editor, not global.
4. **Tracking columns ride along hidden.** `idrecord` and `entity` are the
   Retold convention for stable row identity. They are part of the data, just
   not painted; downstream code (change handlers, save hooks, solvers) reads
   them like any other column.
5. **Solver wiring is declarative.** `ColumnsToSolveOnChange` (or
   `PictTriggerSolveOnChange` on a column) is the only line of code you need
   to tie a grid edit to a Pict-wide solver pass - no custom event handlers.

## Related documentation

- [Overview](../../README.md) - module overview and Quick Start
- [Configuration](../../configuration.md) - column schema, editors, formatters, and data binding reference
- [API Reference](../../api.md) - class methods, properties, and extension hooks
