# Pict Section TuiGrid

A Pict view that wraps the [Toast UI Grid](https://ui.toast.com/tui-grid) as a configurable data table for Pict applications. Define your columns, editors, and formatters in JSON, point the grid at your application data, and get an interactive, editable data grid with solver integration.

## Quick Start

```bash
npm install pict-section-tuigrid
```

### 1. Define a Grid View

Extend `PictSectionTuiGrid` and register it with a Pict application:

```javascript
const libPictApplication = require('pict-application');
const libPictSectionTuiGrid = require('pict-section-tuigrid');

class InventoryGridView extends libPictSectionTuiGrid
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
	}
}

const InventoryGridConfig =
{
	"ViewIdentifier": "InventoryGrid",
	"TargetElementAddress": "#GridContainer",
	"GridDataAddress": "AppData.Inventory",
	"TuiColumnSchema":
	[
		{ "header": "ID", "name": "id", "hidden": true },
		{ "header": "Product", "name": "product", "editor": "text" },
		{
			"header": "Price",
			"name": "price",
			"align": "right",
			"formatter": "FormatterCurrencyNumber",
			"editor": { "type": "EditorNumber", "options": { "decimalPrecision": 2 } }
		},
		{ "header": "Quantity", "name": "qty", "editor": { "type": "EditorNumber", "options": { "decimalPrecision": 0 } } }
	]
};

class MyApp extends libPictApplication
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
		this.pict.addView('InventoryGridView', InventoryGridConfig, InventoryGridView);
	}
}

module.exports = MyApp;

module.exports.default_configuration =
{
	"Name": "Inventory App",
	"Hash": "Inventory",
	"MainViewportViewIdentifier": "InventoryGridView",
	"pict_configuration":
	{
		"Product": "Inventory-App",
		"DefaultAppData":
		{
			"Inventory":
			[
				{ id: 1, product: "Widget", price: 9.99, qty: 100 },
				{ id: 2, product: "Gadget", price: 24.50, qty: 42 }
			]
		}
	}
};
```

### 2. Create the HTML Page

```html
<!doctype html>
<html>
<head>
	<style id="PICT-CSS"></style>
	<link href="tui-grid.css" rel="stylesheet">
	<script src="./pict.min.js"></script>
	<script>
		Pict.safeOnDocumentReady(() => { Pict.safeLoadPictApplication(MyApp, 1) });
	</script>
</head>
<body>
	<div id="GridContainer"></div>
	<script src="./tui-grid.js"></script>
	<script src="./my_app.min.js"></script>
</body>
</html>
```

### 3. Build and Run

```bash
npx quack build && npx quack copy
```

Open `dist/index.html` in your browser.

## How It Works

1. Your Pict application initializes and renders the grid view
2. The view places a placeholder element in the DOM
3. On first render, `onAfterInitialRender()` resolves the `GridDataAddress` to load data from `AppData`
4. The column schema is processed -- string formatter names are mapped to built-in functions, editor type strings are mapped to editor classes, and address-based `listItems` are resolved
5. A Toast UI Grid instance is created with the resolved configuration
6. Change events are wired: `beforeChange` calls `preChangeHandler()` and `afterChange` calls `changeHandler()`
7. When a cell in a solver-enabled column changes, the Pict application solver runs

## Built-In Formatters

| Formatter | Description |
|-----------|-------------|
| `FormatterCurrencyNumber` | Formats as US dollars (e.g., `$1,234.56`) |
| `FormatterTwoDigitNumber` | Rounds to 2 decimal places |
| `FormatterRoundedNumber` | Rounds to configurable decimal precision |
| `FormatterDate` | Formats dates via dayjs (supports custom `dateformat`) |

## Built-In Editors

| Editor | Description |
|--------|-------------|
| `EditorText` | Text input with placeholder, pattern, minLength, maxLength, required |
| `EditorNumber` | Number input with configurable `decimalPrecision` |
| `"text"` | Shorthand for a basic text input editor |
| `"select"` | Native select dropdown with `listItems` (array or address string) |
| `"datePicker"` | Toast UI date picker with configurable `format` |

## Solver Integration

Mark columns that should trigger the Pict application solver when edited:

```javascript
// In the column schema:
{ "header": "Quantity", "name": "qty", "PictTriggerSolveOnChange": true }

// Or in the view configuration:
"ColumnsToSolveOnChange": { "qty": true, "price": true }
```

When a user edits a cell in one of these columns, `changeHandler()` automatically calls `this.services.PictApplication.solve()`.

## Examples

Two working example applications are included in the `example_applications/` folder:

- **`inventory_grid/`** -- A config-only inventory table with text, currency, select, and date editors. No custom code beyond configuration.
- **`invoice_grid/`** -- Overrides `preChangeHandler` and `changeHandler` to compute line totals, apply discount logic, and format a running invoice total in real time.

## Learn More

- [Configuration](configuration.md) -- Column schema, grid options, and data binding reference
- [API Reference](api.md) -- Complete class method and property documentation
- [Pict View](https://fable-retold.github.io/pict-view/) -- The base view class TuiGrid extends
- [Pict Application](https://fable-retold.github.io/pict-application/) -- The application container
