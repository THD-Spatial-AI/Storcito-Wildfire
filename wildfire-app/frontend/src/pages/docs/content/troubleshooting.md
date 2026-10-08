# Troubleshooting & FAQ

**The map is empty or grey.**
Accept the Data & Privacy terms: the map stays hidden until you do. You can accept them from **Settings → Privacy & Terms**. If the map still doesn't load, check that your network allows the CARTO and OpenStreetMap tile servers.

**I can't select a date.**
Only dates with complete input data can be selected. The available range is shown under the date picker. Static mode needs a single date, and dynamic mode needs the start date on or before the end date.

**Continue is disabled in the wizard.**
The message under the step explains what is missing, for example a model name, a valid date or an area. Fix the blocker and the button becomes active.

**Part of my area is blank in the result.**
Those cells lie outside the wildfire-data coverage (the shaded area with the dashed outline), or outside your uploaded DTM. Draw your area inside the coverage.

**My model has been queued for a long time.**
All simulation engines are busy with other runs. The model starts automatically when an engine becomes free. The row shows an estimated time left based on similar runs.

**My model failed.**
Hover over the status to see the reason. Common causes are an unavailable simulation engine or a timeout. Start the calculation again; if it keeps failing, send feedback with the model name.

**The result says "Publishing layer to GeoServer…".**
The calculation is done and the map layer is being prepared. It appears automatically, usually within a minute.

**3D terrain doesn't start.**
3D needs WebGL. Update your browser or graphics driver, or use the 2D map, which shows the same results.

**I reached my model limit.**
Delete models you no longer need, or ask an administrator to raise your limit.

**I can't delete or move a shared model.**
Shared models belong to someone else. Copy the model to get your own version.

**How accurate is the risk map?**
The danger index is experimental. It is not a calibrated ignition probability and has not been validated against observed fires. Use it for exploration, not as an operational warning.

## Still stuck?

Send a message through **?** (Help) → **Feedback**, or open an issue on [GitHub](https://github.com/THD-Spatial-AI/Storcito-Wildfire/issues). Include the app version shown at the bottom of the sidebar.
