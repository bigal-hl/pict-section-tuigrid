# Invoice Grid - Custom Data Marshaling End-to-End

<!-- docuserve:example-launch:start -->
> **[Launch the live app](examples/invoice%5Fgrid/index.html)** - runs in your browser, opens in a new tab.
<!-- docuserve:example-launch:end -->

The Invoice Grid is the **deep-end** `pict-section-tuigrid` example. It picks
up where the [Inventory Grid](../inventory_grid/README.md) leaves off and
crosses every config-only boundary the framework draws:

- It **intercepts edits before they reach the grid** to clamp negative
  quantities and round unit prices to two decimal places - without writing
  the bad values to the underlying data at all.
- It **recomputes a derived `Line Total` column** every time `Quantity` or
  `Unit Price` changes, using `tuiGrid.setValue()` so the UI repaints.
- It **applies a business rule** - lines over $500 get an automatic 10%
  discount - and writes the discount percentage into the (display-only)
  Discount column at the same time.
- It **updates an invoice total outside the grid**, in a DOM element the
  application owns, every time any line total changes.
- It **registers a custom formatter** (`FormatterPercentage`) alongside the
  four built-ins so the Discount column renders as `10.0%`.
- It **injects extra Toast UI Grid configuration** (row numbers) into the
  grid settings via the `customConfigureGridSettings()` extension hook.

This is the example to read when your grid needs to *do something* - not just
present data. Every framework extension point in `pict-section-tuigrid` is
exercised here, in the order the lifecycle calls them.

## What it demonstrates

| Capability | Where you see it |
|------------|------------------|
| Custom subclass with multiple overrides | `class InvoiceGridView extends libPictSectionTuiGrid` overrides four methods |
| `initializeCustomFormatters()` override | Registers `FormatterPercentage` after calling `super` |
| `customConfigureGridSettings()` hook | Injects `rowHeaders: ['rowNum']` before the grid is instantiated |
| `preChangeHandler()` to clamp input | Clamps negative quantities to zero, rounds unit prices to 2 decimals |
| `nextValue` mutation as input transformation | The change object's `nextValue` is the contract for transforming incoming values |
| `changeHandler()` to recompute derived columns | `Line Total = Quantity × Unit Price`, written via `tuiGrid.setValue()` |
| Business rules in the change pipeline | 10% discount applied automatically when line total >= $500 |
| Writing outside the grid | `updateInvoiceTotal()` writes a formatted total into `#InvoiceTotalValue` via `ContentAssignment` |
| Custom Fable date/format services | `this.fable.DataFormat.formatterDollars(tmpTotal, 2)` for the invoice total |
| Display-only columns | Discount and Line Total have a formatter but **no editor** - they are read-only |
| `super.changeHandler()` to preserve solver | The override calls `super` at the end so `ColumnsToSolveOnChange` still fires |
| Per-row identity from hidden columns | Same `idrecord` / `entity` tracking convention as the other examples |
| Custom formatter in column schema | `"formatter": "FormatterPercentage"` resolves to the override-registered function |
| Seeded sample data | Five invoice lines in `DefaultAppData.InvoiceLines` |

## Key files

- `Invoice-Grid-Application.js` - the entire app. Defines an
  `InvoiceGridView` subclass with **four** overrides
  (`initializeCustomFormatters`, `customConfigureGridSettings`,
  `preChangeHandler`, `changeHandler`) plus a helper method
  (`updateInvoiceTotal`). The configuration object declares two read-only
  computed columns alongside the editable ones.
- `html/index.html` - the HTML shell with a custom subtitle, an invoice-total
  footer (`<strong id="InvoiceTotalValue">`), an explanatory notes panel, and
  the standard Pict + Toast UI Grid script loads. No date picker here - the
  Invoice Grid has no date columns.
- `package.json` - declares the standard dependency set and copies the
  third-party bundles into `dist/`. Note: no `tui-date-picker` copy step
  because the Invoice Grid does not use the date picker editor.

## The data model

A single array - `AppData.InvoiceLines` - with five seeded rows:

```js
"InvoiceLines": [
    { "idrecord": 1, "entity": "InvoiceLine", "description": "Consulting - Architecture Review", "unitprice": 175.00, "quantity": 8,  "discount": 10, "linetotal": 1260.00 },
    { "idrecord": 2, "entity": "InvoiceLine", "description": "Development - API Integration",    "unitprice": 150.00, "quantity": 24, "discount": 10, "linetotal": 3240.00 },
    { "idrecord": 3, "entity": "InvoiceLine", "description": "QA Testing - Regression Suite",    "unitprice": 95.00,  "quantity": 12, "discount": 10, "linetotal": 1026.00 },
    { "idrecord": 4, "entity": "InvoiceLine", "description": "SSL Certificate - 1 Year",         "unitprice": 49.99,  "quantity": 2,  "discount": 0,  "linetotal": 99.98   },
    { "idrecord": 5, "entity": "InvoiceLine", "description": "Cloud Hosting - Monthly",          "unitprice": 89.00,  "quantity": 3,  "discount": 0,  "linetotal": 267.00  }
]
```

Each row has the same hidden `idrecord` / `entity` tracking columns the other
examples use, four editable display columns (`description`, `unitprice`,
`quantity`), and two **derived** columns (`discount` and `linetotal`) that are
not editor-bound - the view fills them in.

The seed data includes the derived values precomputed so the initial render
already shows correct totals. Edit a quantity and the override recomputes the
row's `linetotal` and the application's running total live.

---

## Feature 1 - Registering a custom formatter

`initializeCustomFormatters()` runs during `onBeforeInitialize()`. The base
class populates `this.customFormatters` with the four built-ins
(`FormatterCurrencyNumber`, `FormatterTwoDigitNumber`, `FormatterRoundedNumber`,
`FormatterDate`). The override calls `super` to keep those, then adds a
`FormatterPercentage`:

```js
initializeCustomFormatters()
{
    // Call the parent to register the standard formatters first
    super.initializeCustomFormatters();

    this.customFormatters.FormatterPercentage = (pCell) =>
    {
        let tmpValue = Number.parseFloat(pCell.value);
        if (isNaN(tmpValue))
        {
            return '';
        }
        return tmpValue.toFixed(1) + '%';
    };
}
```

The formatter receives a `pCell` object with at minimum a `value` property; it
returns a display string. Once registered, the column schema can reference it
by name:

```js
{
    "header": "Discount",
    "name": "discount",
    "width": 90,
    "align": "right",
    "formatter": "FormatterPercentage"
}
```

The framework's column-schema processing pass in `onAfterInitialRender()`
looks the name up in `this.customFormatters` and swaps the string for the
function reference before handing the schema to Toast UI Grid. Because the
override registers the function **before** that pass runs (during
`onBeforeInitialize()`), the lookup succeeds.

This is the right extension point for any application-specific display
format: percentages, currencies in non-default precisions, durations,
truncated long strings, or anything else the four built-ins do not cover.
Calling `super` is non-optional - skip it and the four standard formatters
disappear.

---

## Feature 2 - Injecting Toast UI Grid settings

`customConfigureGridSettings()` is the extension hook that runs **after** the
framework has assembled its standard `gridSettings` object but **before** the
Toast UI Grid is instantiated. Override it to add or modify any Toast UI Grid
option the framework does not expose at the configuration level:

```js
customConfigureGridSettings()
{
    this.gridSettings.rowHeaders = ['rowNum'];
}
```

`rowHeaders: ['rowNum']` is a Toast UI Grid option that adds a left-edge
column showing 1-based row numbers. The framework does not expose it as a
first-class option (the dataset of all Toast UI Grid options is enormous);
the hook is the right place to reach through. Any TUI option is fair game
here - `summary` rows, `treeColumnOptions`, `rowHeaders: ['checkbox']`,
`bodyHeight`, anything.

The base class's `customConfigureGridSettings()` is a no-op stub specifically
so subclasses can override it without ever calling `super`. The Invoice Grid
demonstrates that - it does not call `super.customConfigureGridSettings()`,
and the application works fine.

---

## Feature 3 - `preChangeHandler` to clamp incoming values

`preChangeHandler(pChangeData)` runs **before** the grid applies a cell edit.
The change object carries both the current value (`value`) and the **incoming**
value (`nextValue`). The contract is: mutate `nextValue` and the grid will
write the mutated value instead of what the user typed.

The Invoice Grid uses this to enforce two input rules:

```js
preChangeHandler(pChangeData)
{
    for (let i = 0; i < pChangeData.changes.length; i++)
    {
        let tmpChange = pChangeData.changes[i];

        // Clamp negative quantities to zero
        if (tmpChange.columnName === 'quantity')
        {
            let tmpVal = Number.parseFloat(tmpChange.nextValue);
            if (!isNaN(tmpVal) && tmpVal < 0)
            {
                tmpChange.nextValue = 0;
            }
        }

        // Round unit prices to exactly two decimal places on input
        if (tmpChange.columnName === 'unitprice')
        {
            let tmpVal = Number.parseFloat(tmpChange.nextValue);
            if (!isNaN(tmpVal))
            {
                tmpChange.nextValue = Number.parseFloat(tmpVal.toFixed(2));
            }
        }
    }
}
```

Two observations:

1. **The clamp happens before the data is touched.** A user typing `-5` into
   Quantity never sees `-5` land in the cell - `nextValue` is rewritten to
   `0` before the grid applies the change. This is different from a
   post-change rollback, which would briefly flash the bad value.
2. **A `pChangeData.changes` array, not a single change.** The handler must
   loop. Paste operations and programmatic mutations can fire multiple
   changes in one event. Always iterate.

The base class's `preChangeHandler` is intentionally empty. The Invoice Grid
does not call `super.preChangeHandler()` - there is nothing to call, and
nothing would happen if it did.

---

## Feature 4 - `changeHandler` to recompute derived columns

`changeHandler(pChangeData)` runs **after** the grid has applied the edit.
The change object now carries the new value as `value` and the old value as
`prevValue`. This is the right hook for cross-column math, derived values,
external writes, and anything else that depends on the edited cell having
landed.

The Invoice Grid's override is the centerpiece of the example:

```js
changeHandler(pChangeData)
{
    const DISCOUNT_THRESHOLD = 500;
    const DISCOUNT_RATE = 10;

    for (let i = 0; i < pChangeData.changes.length; i++)
    {
        let tmpChange = pChangeData.changes[i];

        // Recompute Line Total when Quantity or Unit Price changes
        if (tmpChange.columnName === 'quantity' || tmpChange.columnName === 'unitprice')
        {
            let tmpQty = Number.parseFloat(pChangeData.instance.getValue(tmpChange.rowKey, 'quantity')) || 0;
            let tmpPrice = Number.parseFloat(pChangeData.instance.getValue(tmpChange.rowKey, 'unitprice')) || 0;
            let tmpLineTotal = tmpQty * tmpPrice;

            // Apply automatic discount when the line total exceeds the threshold
            let tmpDiscount = 0;
            if (tmpLineTotal >= DISCOUNT_THRESHOLD)
            {
                tmpDiscount = DISCOUNT_RATE;
                tmpLineTotal = tmpLineTotal * (1 - (DISCOUNT_RATE / 100));
            }

            this.tuiGrid.setValue(tmpChange.rowKey, 'discount', tmpDiscount);
            this.tuiGrid.setValue(tmpChange.rowKey, 'linetotal', tmpLineTotal);
        }
    }

    // Recompute the invoice total from all rows
    this.updateInvoiceTotal();

    // Call the parent changeHandler to preserve solver integration
    super.changeHandler(pChangeData);
}
```

Four patterns worth calling out:

**Read the current row from the grid, not from the change object.** The
change object only tells you about the cell that changed. To compute a line
total you also need the *other* cell in the row - pulled via
`pChangeData.instance.getValue(rowKey, 'columnname')`. That always reflects
the post-change state because `changeHandler` runs after the edit has landed.

**Write derived values via `tuiGrid.setValue()`, not by mutating the data.**
The framework documents this in `SetGridValueByRowKey()`'s JSDoc: "if we
mutate data in the map of plain javascript records tuigrid manages, it
doesn't automatically refresh the UI." `setValue()` triggers the grid's
internal repaint. Direct mutation of the row object would change the data
silently and the cell would not redraw until the next full render.

**Business rules belong in the change pipeline.** The discount rule -
"line total >= $500 gets 10% off" - runs on every relevant edit. There is no
separate "apply rules" pass; the rule is part of the change handler.

**Always call `super.changeHandler()` at the end.** The base class's
implementation iterates `pChangeData.changes`, checks each column against
`ColumnsToSolveOnChange`, and calls `this.services.PictApplication.solve()`
if any solver-triggered column changed. Skip `super` and you lose solver
integration. The Invoice Grid's `ColumnsToSolveOnChange` includes
`unitprice` and `quantity`, so editing either fires the application solver
*after* the override has computed the derived columns.

---

## Feature 5 - Writing outside the grid

The invoice total lives in a DOM element the application owns, not in the
grid. `updateInvoiceTotal()` is called from the override `changeHandler` and
reads the current grid data, sums the line totals, formats the result, and
writes it into the page:

```js
updateInvoiceTotal()
{
    if (!this.tuiGrid)
    {
        return;
    }

    let tmpData = this.tuiGrid.getData();
    let tmpTotal = 0;

    for (let i = 0; i < tmpData.length; i++)
    {
        let tmpLineTotal = Number.parseFloat(tmpData[i].linetotal);
        if (!isNaN(tmpLineTotal))
        {
            tmpTotal += tmpLineTotal;
        }
    }

    // Format the total as currency and write it to the page
    let tmpFormatted = this.fable.DataFormat.formatterDollars(tmpTotal, 2);
    let tmpElements = this.services.ContentAssignment.getElement('#InvoiceTotalValue');
    if (tmpElements.length > 0)
    {
        tmpElements[0].textContent = tmpFormatted;
    }
}
```

Three Retold-idiom details:

1. **`this.tuiGrid.getData()` is the source of truth.** It returns the
   current row data as plain JavaScript objects. Iterating it once per change
   is fine - five rows, sub-millisecond.
2. **`this.fable.DataFormat.formatterDollars(value, precision)`** is the
   built-in Fable formatter, the same one `FormatterCurrencyNumber` uses
   under the hood. Reusing it ensures the in-grid Unit Price formatting and
   the out-of-grid invoice total render identically.
3. **`this.services.ContentAssignment.getElement(selector)`** is the Retold
   abstraction over `document.querySelectorAll`. It is preferred over direct
   DOM access because it works in both browser and server-side render
   contexts; it returns an array-like. The Invoice Grid checks `length > 0`
   before writing - defensive, useful when the same view might be initialized
   before the DOM element exists.

The element being written to is declared in the HTML shell:

```html
<div class="invoice-footer">
    Invoice Total: <strong id="InvoiceTotalValue">$0.00</strong>
</div>
```

---

## Feature 6 - Display-only columns

The Discount and Line Total columns in the schema have a `formatter` but
**no editor**:

```js
{
    "header": "Discount",
    "name": "discount",
    "width": 90,
    "align": "right",
    "formatter": "FormatterPercentage"
},
{
    "header": "Line Total",
    "name": "linetotal",
    "width": 130,
    "align": "right",
    "formatter": "FormatterCurrencyNumber"
}
```

Toast UI Grid's convention is: a column with no editor is read-only. Click
the cell and nothing happens - no input appears, no focus. The user can only
*see* the value. This is the right shape for any computed-by-the-application
column: there is no good outcome from letting the user edit a cell that the
`changeHandler` will overwrite on the next adjacent edit.

The two display columns pair with the formatters the override
registered/inherited: `FormatterPercentage` for the discount, the built-in
`FormatterCurrencyNumber` for the line total.

The two **editable** numeric columns - Unit Price and Quantity - are the
schema's interaction surface; the two **display-only** numeric columns are
the application's response.

---

## Feature 7 - Lifecycle method ordering

The Invoice Grid touches four different lifecycle points, and the order they
run matters. The framework calls them like this:

1. **`onBeforeInitialize()`** (base class) - sets up `this.customFormatters`
   by calling `initializeCustomFormatters()`. The Invoice Grid's override
   adds `FormatterPercentage` here.
2. **First render** - the placeholder template renders into the mount
   element.
3. **`onAfterInitialRender()`** (base class) - resolves `GridDataAddress`,
   processes the column schema (substituting formatter names and editor
   types), assembles `this.gridSettings`, and calls
   `customConfigureGridSettings()`. The Invoice Grid's override adds row
   numbers here.
4. **Toast UI Grid instantiated** with the assembled settings.
5. **User edits a cell** -> Toast UI Grid fires `beforeChange` ->
   `preChangeHandler()` runs (clamp and round) -> grid applies the edit ->
   Toast UI Grid fires `afterChange` -> `changeHandler()` runs (compute
   derived columns, recompute total, call `super`).

The order tells you where to add new behavior:

- New formatter? `initializeCustomFormatters()`.
- New Toast UI Grid option? `customConfigureGridSettings()`.
- Validate or transform incoming user input? `preChangeHandler()`.
- React to a successful edit? `changeHandler()`.

---

## Running the example

```bash
cd example_applications/invoice_grid
npm install
npm run build
# then open dist/index.html in a browser
```

`npm run build` runs `npx quack build && npx quack copy`. The build emits
`dist/invoice_grid.min.js`; the copy step pulls in the Pict bundle, the
Toast UI Grid bundle, and the HTML shell.

## Things to try in the running app

- **Edit a Quantity** - change `8` to `16` on the consulting line. Watch the
  Line Total cell recompute live and the Invoice Total in the footer update
  at the same instant.
- **Type a negative number into Quantity** - try `-5`. The `preChangeHandler`
  clamps it to `0` before the cell ever shows the negative value.
- **Type a Unit Price with three decimal places** - try `49.999`. The
  `preChangeHandler` rounds it down to `50.00` before the grid stores it.
- **Drop a Quantity below the discount threshold** - change the API
  Integration line's quantity from `24` to `2`. The Line Total drops below
  $500 and the Discount column changes from `10.0%` to `0.0%`.
- **Push a Quantity above the discount threshold** - change the SSL
  Certificate line's quantity from `2` to `20`. The total crosses $500 and
  the discount kicks in automatically.
- **Look at the leftmost edge** - the row-number column on the left is
  Toast UI Grid's `rowHeaders: ['rowNum']`, injected via
  `customConfigureGridSettings()`.
- **Try editing the Discount or Line Total cells** - they are not editable.
  Toast UI Grid does nothing because the schema declares no editor for
  those columns.

## Takeaways

1. **`pre`/`changeHandler` are the input pipeline.** `preChangeHandler`
   transforms incoming values before they land; `changeHandler` reacts to
   them after. Use `pre` for clamps, rounds, and rewrites - use the
   post-handler for everything else.
2. **Always call `super.changeHandler()`.** The base class's implementation
   is where `ColumnsToSolveOnChange` triggers the Pict solver. Skip `super`
   and you silently break solver integration; subclasses must call it (the
   `pre` variant is empty in the base class, so calling `super` there is a
   no-op).
3. **`tuiGrid.setValue()`, not data mutation.** The framework documents this
   explicitly - Toast UI Grid does not repaint on direct row-object mutation
   by design. Always go through `setValue()` or the convenience methods
   (`SetGridValue`, `SetGridValueByRowKey`) on the view.
4. **Custom formatters live in a map, registered before the schema pass.**
   `initializeCustomFormatters()` runs during `onBeforeInitialize()`; the
   column-schema processing pass that resolves formatter names runs during
   `onAfterInitialRender()`. As long as the override stays in
   `initializeCustomFormatters()` and calls `super`, the timing works out.
5. **DOM writes outside the grid go through `ContentAssignment`.** Reaching
   for `document.getElementById` directly works, but `ContentAssignment` is
   the Retold abstraction that survives non-browser render contexts and
   makes the dependency on a specific element explicit at the call site.

## Related documentation

- [Overview](../../README.md) - module overview and Quick Start
- [Configuration](../../configuration.md) - column schema, formatters, editors
- [API Reference](../../api.md) - `preChangeHandler`, `changeHandler`, `customConfigureGridSettings`, `SetGridValueByRowKey`
