// Application Code for the TuiGrid playground.
//
// `Base` is the synthesized PictApplication wrapper that registers the
// TuiGrid view from your Pict Config (under `TuiGridViewConfig`).
// Return a class that extends `Base` to customize lifecycle hooks or
// register additional views/providers.
//
// One bit of glue this playground needs: Toast UI Grid ships its CSS
// separately from its JS bundle, and the docuserve playground `Imports`
// schema currently only emits <script> tags — not <link> tags.  So we
// inject the two Toast UI stylesheets into the iframe document here,
// once, before the section renders.  This is a temporary gap; once
// _playground.json grows a stylesheet import shape, this hook can go
// away.
//
// The Toast UI Grid + Date Picker bundles themselves load via the
// `Source: "cdn"` Imports entries (jsDelivr mirrors of the same npm
// packages Toast UI publishes), so they are already on `window.tui`
// by the time onAfterInitialize fires.
return class extends Base
{
	onBeforeInitializeAsync(fCallback)
	{
		try
		{
			let tmpHead = document.head;
			let tmpStyleHrefs =
			[
				'https://cdn.jsdelivr.net/npm/tui-grid@4/dist/tui-grid.min.css',
				'https://cdn.jsdelivr.net/npm/tui-date-picker@4/dist/tui-date-picker.min.css'
			];
			for (let i = 0; i < tmpStyleHrefs.length; i++)
			{
				if (!document.querySelector('link[href="' + tmpStyleHrefs[i] + '"]'))
				{
					let tmpLink = document.createElement('link');
					tmpLink.rel = 'stylesheet';
					tmpLink.href = tmpStyleHrefs[i];
					tmpHead.appendChild(tmpLink);
				}
			}
		}
		catch (pError)
		{
			console.warn('[playground] Toast UI CSS injection failed:', pError);
		}
		return super.onBeforeInitializeAsync(fCallback);
	}

	onAfterInitialize()
	{
		super.onAfterInitialize();
		console.log('[playground] Initial Employees =', this.pict.AppData.Employees);
	}
};
