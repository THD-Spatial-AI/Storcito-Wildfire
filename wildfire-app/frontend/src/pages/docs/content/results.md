# Viewing results

Open a completed model with **View results** in Wildfire Simulations, or click your latest model on the map.

## The risk map

The map shows the danger class of every cell, from **Very Low** (blue) to **Very High** (red). Use the layer panel to:

- show or hide the risk layer and change its **opacity**,
- switch **overlays** such as roads and labels on or off,
- pick which **layer** (dataset) to display.

If the layer is still being published, you'll see *Publishing layer to GeoServer…*. It appears automatically when ready.

## Metrics

| Metric | Meaning |
|---|---|
| **Overall risk** | The dominant risk level of the area |
| **Mean risk score** | Average of the continuous danger index |
| **High + Very High area** | Area, and share of the total, in the two most severe classes |
| **Analyzed area** | Area with valid data. Cells without data are excluded |

The **Risk Level** chart shows how the area is distributed across the five classes. Metrics are based on a sample of pixels, and the sample size is shown beneath the chart.

## Daily results (dynamic models)

A dynamic model produces a risk map for every day in its period.

- **Risk Over Time** shows the area per risk class for each day. Click a day to show it on the map.
- **Peak risk day** jumps to the most severe day. Click again to step to the next-riskiest day.
- **Play** animates the daily maps one after another.

The weather of the selected day (temperature, humidity, wind speed and direction) appears in the details panel.

## 3D terrain

Switch from **2D Map** to **3D Terrain** to drape the risk map over the landscape. Use **Relief exaggeration** to make hills easier to read. 3D needs WebGL; if your browser or graphics driver doesn't support it, the 2D map shows the same results.

## Keyboard shortcuts

| Key | Action |
|---|---|
| `Space` | Play / pause the daily animation |
| `F` | Toggle fullscreen |
| `T` | Toggle 3D terrain |
| `L` | Show / hide the risk layer |
| `+` / `-`, arrows | Zoom and move the map |

## Using the result elsewhere

- **Download** the result archive from the model list.
- Load the map layer into QGIS or another GIS through WMS. See **API access** for how to get the layer URL.
