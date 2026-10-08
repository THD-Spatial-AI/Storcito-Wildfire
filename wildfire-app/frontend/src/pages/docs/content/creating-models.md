# Creating a model

A **model** is one wildfire assessment: a name, a period, an area and a set of risk signals. Start a new one from **Wildfire Simulations → New Model** or press `N` on the map.

The wizard has a short intro card and then guides you step by step. A progress bar shows where you are, and your progress is saved as you go. You can hide the intro card with **Don't show this intro again** and bring it back in **Settings → Display → Model creation**.

## Step 1 — Model initialization

**Model name.** Choose a name you will recognise later, for example *Galicia Summer 2026 Wildfire Risk*. The **Quick picks** offer ready-made names.

**Calculation mode.**

| Mode | What it does |
|---|---|
| **Static** | Assesses a **single day**. The date is picked for you: for each available year, the day with the highest temperature, which is the worst-case weather for that year |
| **Dynamic** | Assesses a **range of days** that you choose. Every day is modelled with its own weather, and the run returns the peak-risk day |

Both modes use the weather from the **16:00–17:00** window, the hottest and driest part of the afternoon.

**Period.** Only dates for which input data exist can be selected. The available range is shown under the date picker. If a date is unavailable, the step tells you why and **Continue** stays disabled.

## Step 2 — Area selection

Choose how to define the area:

- **Draw area** — click on the map to add points and close the polygon to finish. You can draw several separate areas.
- **Select complete region** — click inside an administrative region to use its full boundary. Click another region to replace it.
- **Upload GeoJSON** — upload a Polygon or MultiPolygon in WGS84 (EPSG:4326).

**Tips for drawing**

- Click the first point again, or double-click, to close the polygon.
- Press `Esc` to cancel the current drawing.
- In edit mode, drag a vertex to move it, click an edge to add a vertex, and hold `Alt` while clicking a vertex to remove it.

**Stay inside the coverage.** The shaded area with the dashed outline shows where wildfire data is available. Pixels outside it cannot be calculated and stay blank.

**Optional terrain model (DTM).** You can upload your own Digital Terrain Model as a GeoTIFF (`.tif`). Its coverage is drawn on the map; your area must lie inside it. If you don't upload one, the bundled regional terrain is used.

The **Area summary** shows the status, number of areas, total area and perimeter.

## Step 3 — Risk components

These signals feed the AHP-weighted risk model. All three are on by default and recommended:

| Signal | Weight | What it adds |
|---|---|---|
| **Fire-weather (FWI)** | 30% | Wind, humidity, temperature and drought. The strongest fire driver |
| **Terrain & slope** | 6% | Elevation, slope and aspect. Fire accelerates uphill, and sun-facing slopes dry faster |
| **Historical fires** | 4% | How often fires have burned in the area before |

Vegetation (NDVI) and infrastructure are always included and cannot be switched off. Turning a signal off removes its weight, and the run continues with the remaining signals.

> Keep **Fire-weather** on unless you specifically need a baseline without weather. Without it the date no longer matters and the risk is strongly underestimated.

**Precomputed regional map.** Every night, the whole region is analysed with all risk layers enabled. If you run a dynamic model for a **single day** that the nightly run has already covered, you can switch this on: your area is clipped from that map and the result arrives in seconds. With it on, the three signals are locked. Switch it off to compute everything for your exact area, which takes about 1–2 minutes. Precomputed maps are not used for static mode or for date ranges.

**Custom data (optional).** Upload weather-station data as Excel or CSV (`.xlsx` / `.csv`) with hourly temperature, humidity, wind and precipitation. It is used to compute the Fire Weather Index for your area. If you leave it empty, the bundled regional weather data is used.

## Step 4 — Final review

The app checks your configuration in real time:

- **Blockers** (red) must be fixed in their step before the model can run, for example a missing name or a date outside the available range.
- **Warnings** (amber) should be reviewed, for example running with fire-weather disabled.

When everything passes, you'll see *All checks passed. Ready to save & calculate.*

## Step 5 — Save & calculate

Check the summary once more, then choose:

- **Save** to store the model as a draft and calculate later, or
- **Save & run** to store it and start the calculation immediately.

You can follow the progress in **Wildfire Simulations**. When the calculation finishes, you get a notification and can open the result.
