# Inventory Grid — Config-Only with Address-Resolved Dropdowns

<!-- docuserve:example-launch:start -->
> **[&#9654; Launch the live app](examples/inventory%5Fgrid/index.html)** — runs in your browser, opens in a new tab.
<!-- docuserve:example-launch:end -->

The Inventory Grid is the canonical "configuration-only" `pict-section-tuigrid`
application. Eight inventory records, seven visible columns, every editor
flavor the framework ships — and **not one line of custom view code beyond the
empty constructor**. The grid view's class body is literally an empty
`super(...)` call.

What makes this example interesting is what the configuration does on top of
the [Class Grid](../class_grid/README.md) foundation: it freezes the first
visible column so the SKU stays put as the user scrolls horizontally, it uses
the validated `EditorText` class (placeholders, max-lengths) instead of the
unconstrained `"text"` shorthand, and it resolves its category dropdown's
option list from an **AppData address** rather than inlining the literals.
That last detail is the one that scales — the same dropdown can be reused
across views, hydrated from a server fetch, or swapped wholesale without
touching the schema.

It is the natural middle step between the bare-bones
[Class Grid](../class_grid/README.md) and the customization-heavy
[Invoice Grid](../invoice_grid/README.md), which finally crosses the
config-only boundary to override the data marshaling methods.

## What it demonstrates

| Capability | Where you see it |
|------------|------------------|
| Empty subclass | `class InventoryGridView extends libPictSectionTuiGrid` — no overrides |
| Frozen first visible column | `GridColumnFrozenCount: 1` — SKU stays on screen as the grid scrolls horizontally |
| Vertical scroll explicit | `GridScrollY: true` — overrides the auto-height default |
| Resizable columns | `GridColumnWidthResizable: true` |
| Hidden tracking columns | `idrecord` and `entity` for stable row identity |
| `EditorText` with HTML5 validation | SKU column — placeholder and `maxLength: 12` |
| Text editor shorthand | Product Name column — `"editor": "text"` |
| Address-resolved select options | Category column — `listItems: "AppData.CategoryOptions"` |
| Currency formatter on numeric column | Unit Price column — right-aligned, 2-decimal `EditorNumber` |
| Integer-only number editor | Quantity column — `decimalPrecision: 0` rejects fractional values |
| Date formatter + date picker pair | Reorder Date — `FormatterDate` with `dateformat: "YYYY-MM-DD"` |
| Per-column solver trigger | `"PictTriggerSolveOnChange": true` on Unit Price and Quantity |
| View-level solver trigger | `ColumnsToSolveOnChange` for the same columns — both work |
| Seeded sample data | `DefaultAppData.InventoryItems` and `DefaultAppData.CategoryOptions` |

## Key files

- `Inventory-Grid-Application.js` — the entire app. Defines an empty
  `InventoryGridView` subclass, the `InventoryGridConfiguration` schema, and
  an `InventoryApplication` class that registers the view. The application's
  comment header doubles as a contents page for the schema.
- `html/index.html` — the HTML shell. Adds a title, subtitle, and themed
  body background; mounts the grid into `<div id="InventoryGridContainer">`;
  loads `pict.min.js`, the Toast UI Grid bundle, the date picker bundle, and
  finally `inventory_grid.min.js`.
- `package.json` — declares `pict` / `pict-application` / `pict-view` /
  `tui-grid` as dependencies and copies their `dist/*` into this app's
  `dist/` folder via `copyFiles`.

## The data model

Two top-level arrays in `AppData`, both seeded inline by `DefaultAppData`:

```js
"CategoryOptions": [
    { "value": "electronics", "text": "Electronics" },
    { "value": "hardware",    "text": "Hardware"   },
    { "value": "software",    "text": "Software"   },
    { "value": "accessories", "text": "Accessories"},
    { "value": "services",    "text": "Services"   }
],
"InventoryItems": [
    { "idrecord": 1, "entity": "InventoryItem", "sku": "WDG-001", "name": "Standard Widget", "category": "hardware", "unitprice": 9.99, "quantity": 250, "reorderdate": "2025-03-15" },
    /* … 7 more rows … */
]
```

`InventoryItems` is the array the grid renders — one row per item, with the
column schema's `name` keys matching the record's properties. `CategoryOptions`
is the lookup table the Category column's `select` editor resolves at
initialization time. The split between *what the grid shows* and *the lookup
data the grid needs* is intentional — it lets a future view (a category
manager, a chart, an autocomplete) reuse `CategoryOptions` without coupling to
the inventory table.

The `idrecord` / `entity` pair is the same Retold tracking convention used in
every example in this module — hidden columns that carry stable row identity
so downstream change handlers can identify a row without trusting Toast UI
Grid's internal row keys.

---

## Feature 1 — Grid-level layout options

Three grid-level options shape the inventory grid's behavior at the table
level rather than per-column:

```js
"ViewIdentifier": "InventoryGrid",
"TargetElementAddress": "#InventoryGridContainer",
"GridDataAddress": "AppData.InventoryItems",
"GridScrollY": true,
"GridColumnWidthResizable": true,
"GridColumnFrozenCount": 1,
```

- **`GridColumnFrozenCount: 1`** — pins the first **visible** column to the
  left edge, leaving the rest free to scroll horizontally. The hidden columns
  (`idrecord`, `entity`) are not counted toward the frozen count, so the first
  visible column here is SKU. Try scrolling the grid right in a narrow window
  and watch SKU stay anchored.
- **`GridScrollY: true`** — enables vertical scrolling explicitly. The default
  is true anyway; specifying it makes the configuration self-documenting.
- **`GridColumnWidthResizable: true`** — every column header gets a resize
  handle. Drag and the column snaps to the new width.

These are all passthrough options to Toast UI Grid via the framework's
`gridSettings` shaping in `onAfterInitialRender()`. The mapping lives in the
[Configuration reference](../../configuration.md) under "Grid Display
Options".

---

## Feature 2 — `EditorText` with HTML5 validation

The SKU column uses the framework's custom `EditorText` class rather than the
`"text"` shorthand. `EditorText` mounts a real `<input type="text">` with
HTML5 validation attributes:

```js
{
    "header": "SKU",
    "name": "sku",
    "width": 100,
    "editor":
    {
        "type": "EditorText",
        "options":
        {
            "placeholder": "e.g. WDG-001",
            "maxLength": 12
        }
    }
}
```

The available `options` keys map straight onto the underlying input element:

| Option | HTML5 attribute | Effect |
|--------|----------------|--------|
| `placeholder` | `placeholder` | Ghost text shown when the field is empty |
| `pattern` | `pattern` | Regex constraint enforced on form submission |
| `minLength` | `minlength` | Minimum character count |
| `maxLength` | `maxlength` | Maximum character count — the browser will not let the user type past it |
| `required` | `required` | Browser blocks an empty value |

The SKU column uses `maxLength` to keep entries inside the existing
`WDG-001` / `GDG-002` / `ACC-012` convention; the placeholder hints at the
expected format. The Product Name column right below it uses the
unconstrained `"text"` shorthand because free-form product descriptions need
no length cap.

The behavior of `EditorText` lives in
`source/Pict-TuiGrid-Editor-Text.js` and is registered in
`source/Pict-TuiGrid-Editors.js` so it can be referenced by name in any
schema:

```js
module.exports =
{
    EditorNumber: require('./Pict-TuiGrid-Editor-Number.js'),
    EditorText: require('./Pict-TuiGrid-Editor-Text.js'),
};
```

The framework's column-schema pass in `onAfterInitialRender()` substitutes
the string `"EditorText"` with the actual class reference before handing the
schema to Toast UI Grid.

---

## Feature 3 — Address-resolved select options

The Category column does not inline its option list. It passes a **string
address** — `AppData.CategoryOptions` — and lets the framework resolve it at
initialization time:

```js
{
    "header": "Category",
    "name": "category",
    "editor":
    {
        "type": "select",
        "options":
        {
            "listItems": "AppData.CategoryOptions"
        }
    }
}
```

This is the production-grade pattern. The inline-literal variant (see the
[Class Grid](../class_grid/README.md)'s Reading Level column) is fine when
the option set is fixed at design time, but every real application has at
least one dropdown whose contents come from somewhere else — a server fetch,
a configuration file, a shared lookup table. With an address, the schema
stays static while the option set varies.

The address is resolved in `onAfterInitialRender()` against the same address
space the data binding uses:

```js
const tmpAddressSpace =
{
    Fable: this.fable,
    Pict: this.fable,
    AppData: this.AppData,
    Bundle: this.Bundle,
    Options: this.options,
};
let tmpListItems = this.fable.manifest.getValueByHash(tmpAddressSpace, tmpColumn.editor.options.listItems);
```

Two consequences worth knowing:

1. **The lookup happens exactly once**, at the first render. Mutating
   `AppData.CategoryOptions` afterwards does not change the dropdown.
2. **A missing or non-object address logs a warning and falls back to an
   empty list.** The grid still renders; the dropdown is just empty. The
   warning is `Pict TuiGrid for column [<name>] had [<address>] as a
   listItems address, but it didn't return an object…` — useful when
   debugging a misnamed lookup.

The legal forms for `listItems` are an array (inline) and a string (address);
nothing else is accepted.

---

## Feature 4 — Numeric editors at two different precisions

The Inventory Grid uses `EditorNumber` for both the Unit Price and Quantity
columns, but at different `decimalPrecision` values:

```js
{
    "header": "Unit Price",
    "name": "unitprice",
    "width": 110,
    "align": "right",
    "formatter": "FormatterCurrencyNumber",
    "PictTriggerSolveOnChange": true,
    "editor":
    {
        "type": "EditorNumber",
        "options": { "decimalPrecision": 2 }
    }
},
{
    "header": "Quantity",
    "name": "quantity",
    "width": 90,
    "align": "right",
    "PictTriggerSolveOnChange": true,
    "editor":
    {
        "type": "EditorNumber",
        "options": { "decimalPrecision": 0 }
    }
}
```

Two decimals for prices (`9.99`, `19.50`, `34.99`) and **zero** decimals for
quantities — `decimalPrecision: 0` is the right knob for whole-number
quantities. The custom editor enforces this at keystroke time: type `5.7`
into the Quantity column and the editor clamps the displayed value back to
`5` after the input event fires.

`FormatterCurrencyNumber` on Unit Price renders the stored numeric value as
US dollars (`$9.99`, `$24.99`, `$299.00`) when the cell is not being edited.
The format pipeline is one-way — the formatter runs on display only; the
editor still sees and writes the raw numeric value. This is what allows
straightforward arithmetic in a custom `changeHandler` (as the
[Invoice Grid](../invoice_grid/README.md) demonstrates).

---

## Feature 5 — Date formatter paired with date picker

The Reorder Date column pairs a display-time formatter with an editor:

```js
{
    "header": "Reorder Date",
    "name": "reorderdate",
    "formatter": "FormatterDate",
    "dateformat": "YYYY-MM-DD",
    "editor":
    {
        "type": "datePicker",
        "options":
        {
            "format": "yyyy-MM-dd"
        }
    }
}
```

The two `format` strings look almost identical but come from different
libraries:

- **`dateformat: "YYYY-MM-DD"`** is the **dayjs** format string consumed by the
  `FormatterDate` function in `source/Pict-Section-TuiGrid.js`. It runs on
  display when the cell is not being edited.
- **`options.format: "yyyy-MM-dd"`** is the **Toast UI Date Picker** format
  string. It is in TUI's own format vocabulary (lowercase `yyyy`, etc.) and
  controls what the calendar widget puts back into the cell when the user
  picks a date.

The two formats must agree on the semantic shape (`YYYY-MM-DD` and
`yyyy-MM-dd` both produce ISO-style dates) so the formatter can parse what
the editor wrote. If they disagree, you get round-trip drift.

The date picker requires the `tui-date-picker.js` and `tui-date-picker.css`
files in the same page as the grid — that is why the `package.json`'s
`copyFiles` block has an explicit entry for `node_modules/tui-date-picker/dist/*`.

---

## Feature 6 — Solver triggers, two ways

The Inventory Grid declares its solver-triggered columns **twice** — once
per-column and once at the view level. Both are valid; both end up in the
same map after the schema pass:

```js
"ColumnsToSolveOnChange":
{
    "unitprice": true,
    "quantity": true
},
"TuiColumnSchema":
[
    /* … */
    {
        "header": "Unit Price",
        "name": "unitprice",
        "width": 110,
        "align": "right",
        "formatter": "FormatterCurrencyNumber",
        "PictTriggerSolveOnChange": true,
        "editor": { /* … */ }
    },
    {
        "header": "Quantity",
        "name": "quantity",
        "width": 90,
        "align": "right",
        "PictTriggerSolveOnChange": true,
        "editor": { /* … */ }
    },
    /* … */
]
```

The view-level `ColumnsToSolveOnChange` is the **bulk-declare** form — useful
when the schema is generated and you want a separate, terse declaration of
which columns drive the solver. The per-column `PictTriggerSolveOnChange:
true` is the **inline** form — useful when the schema is hand-written and
you want each column's behavior to be visible on its own line.

The framework's column-schema processing loop in `onAfterInitialRender()`
copies every `PictTriggerSolveOnChange: true` into the
`ColumnsToSolveOnChange` map, so the two forms unify before the change
handler ever runs:

```js
for (let i = 0; i < this.columnSchema.length; i++)
{
    let tmpColumn = this.columnSchema[i];
    if (tmpColumn.PictTriggerSolveOnChange)
    {
        this.options.ColumnsToSolveOnChange[tmpColumn.name] = tmpColumn;
    }
    /* … */
}
```

The base class's `changeHandler()` then checks every change against the map
and calls `this.services.PictApplication.solve()` if any cell in a triggered
column was edited. The Inventory Grid does not actually ship with a solver
manifest — but the wiring is in place, so dropping one in later is a
one-property change.

---

## Feature 7 — A purely passive subclass

Every other example in this module overrides at least one method. The
Inventory Grid does not:

```js
class InventoryGridView extends libPictSectionTuiGrid
{
    constructor(pFable, pOptions, pServiceHash)
    {
        super(pFable, pOptions, pServiceHash);
    }
}
```

Everything the application does — frozen columns, validated text editors,
address-resolved dropdowns, formatters, editors, solver triggers — lives in
the configuration object. The subclass exists purely so the application can
register a named view with `pict.addView('InventoryGridView',
InventoryGridConfiguration, InventoryGridView)`. The minute the application
needs to compute a derived value, write outside the grid, or transform input
before it lands, the empty subclass picks up an override — and that is
exactly the boundary the [Invoice Grid](../invoice_grid/README.md) crosses.

---

## Running the example

```bash
cd example_applications/inventory_grid
npm install
npm run build
# then open dist/index.html in a browser
```

`npm run build` runs `npx quack build && npx quack copy`. The build emits
`dist/inventory_grid.min.js`; the copy step pulls in the Pict bundle, the
Toast UI Grid bundle, the date picker bundle, and the HTML shell.

## Things to try in the running app

- **Scroll horizontally** — the SKU column stays anchored on the left edge
  while the rest of the columns scroll past. That is `GridColumnFrozenCount:
  1` doing its job.
- **Click into the SKU cell** — a text input appears with the `e.g. WDG-001`
  placeholder. Try typing more than 12 characters; the browser will not let
  you past 12.
- **Click into Product Name** — an unconstrained text input. No placeholder,
  no max length.
- **Click into Category** — a native `<select>` appears, populated from
  `AppData.CategoryOptions` via the address resolution. Pick `Software` for a
  hardware widget and watch it update.
- **Click into Unit Price** — a number input with 2-decimal precision. Try
  typing `9.999`; the editor clamps it to `9.99`.
- **Click into Quantity** — a number input with **zero**-decimal precision.
  Try typing `5.7`; the editor clamps it to `5`.
- **Click into Reorder Date** — the Toast UI date picker pops up. Pick a date
  and watch the cell render it as `YYYY-MM-DD` via `FormatterDate`.
- **Resize a column** — drag the right edge of any non-frozen header.

## Takeaways

1. **Config-only scales surprisingly far.** Frozen columns, validated text
   editors, address-resolved dropdowns, per-column precision, date pickers,
   and solver triggers all live in the configuration object. The view subclass
   stays empty.
2. **`EditorText` is the validated cousin of `"text"`.** Reach for the full
   editor object whenever you have a length cap, a placeholder, a pattern, or
   a required flag. The shorthand `"text"` is for true free-form fields.
3. **Address-resolved options keep dropdowns reusable.** A literal `listItems`
   array couples the schema to the option set; a `listItems: "AppData.X"`
   string decouples them — the same dropdown can drive multiple views,
   reload from a server fetch, or swap wholesale via a single AppData
   assignment.
4. **`decimalPrecision: 0` is the integer-only knob.** Use it for any
   whole-number column — quantities, counts, row numbers, age fields. The
   `EditorNumber` clamp runs on every keystroke.
5. **Solver triggers are declarative and additive.** Per-column
   `PictTriggerSolveOnChange: true` and view-level `ColumnsToSolveOnChange`
   are equivalent and unify in the same map. Pick whichever reads better at
   the call site; do not worry about mixing them.

## Related documentation

- [Overview](../../README.md) — module overview and Quick Start
- [Configuration](../../configuration.md) — frozen columns, editors, formatters, address resolution
- [API Reference](../../api.md) — `EditorText`, `EditorNumber`, formatter functions
