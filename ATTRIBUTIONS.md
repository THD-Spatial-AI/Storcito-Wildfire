# Attributions

This file lists the data sources, basemap services and third-party software used by the STORCITO Wildfire platform, with their licences and required attribution statements. Licences of third-party components apply to those components; the code in this repository is licensed under the [MIT License](LICENSE).

Where a provider's licence is not stated below, follow the terms published on the provider's page before redistributing data or derived maps.

## Data Sources

These inputs are processed by the STORCITO wildfire calculation engine; the platform displays the resulting maps.

| Source | Use | Licence / attribution |
|---|---|---|
| [Copernicus Sentinel-2 L2A](https://dataspace.copernicus.eu) (Copernicus Data Space Ecosystem) | NDVI, NDMI; B8A/B12 for the optional burn-history overlay | Free and open Copernicus data policy. Attribution: "Contains modified Copernicus Sentinel data [year]". |
| [Copernicus Sentinel-3 SLSTR Level-2 LST](https://dataspace.copernicus.eu) (`SENTINEL3_SLSTR_L2_LST`) | Land-surface temperature | Free and open Copernicus data policy. Attribution: "Contains modified Copernicus Sentinel data [year]". |
| [CORINE Land Cover 2018](https://land.copernicus.eu/en/products/corine-land-cover) | Wildland–urban interface proxy; fallback exclusion mask | Copernicus Land Monitoring Service data policy. Attribution: "© European Union, Copernicus Land Monitoring Service 2018, European Environment Agency (EEA)". |
| [CLC+ Backbone 2023](https://library.land.copernicus.eu/products/CLCplus_Backbone_2023_PUM_v1.html) | Preferred exclusion mask | Copernicus Land Monitoring Service data policy. Attribution: "© European Union, Copernicus Land Monitoring Service 2023, European Environment Agency (EEA)". |
| [MeteoGalicia WRF ARW 1 km](https://www.meteogalicia.gal) (`WRF_ARW_1KM_HIST`) | Hourly weather for the Canadian Fire Weather Index | See MeteoGalicia terms of use. Credit: MeteoGalicia, Xunta de Galicia. |
| [IGN/CNIG INSPIRE elevation model](https://www.ign.es) (`Elevacion4258_25`) | Elevation, slope, aspect, TWI; reference grid | CC BY 4.0. Attribution: "Derived from MDT25 © Instituto Geográfico Nacional". |
| [MITECO Forest Map of Spain](https://www.miteco.gob.es) (`modelocombustible`) | Fuel model | See MITECO terms of use. Credit: Ministerio para la Transición Ecológica y el Reto Demográfico. |
| [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov) (MODIS active fire detections) | Optional burn-history overlay | NASA open data. Acknowledgement: "We acknowledge the use of data and/or imagery from NASA's Fire Information for Resource Management System (FIRMS), part of NASA's Earth Science Data and Information System (ESDIS)." |
| [OpenStreetMap](https://www.openstreetmap.org) via the [Geofabrik](https://download.geofabrik.de) Galicia extract | Roads and railways for infrastructure distance and WUI preselection | [ODbL 1.0](https://opendatacommons.org/licenses/odbl/). Attribution: "© OpenStreetMap contributors". |
| [OpenDataSoft georef-spain](https://public.opendatasoft.com) (`georef-spain-comunidad-autonoma`, `georef-spain-provincia`, `georef-spain-municipio`) | Administrative boundaries for regional checks and map context | See the dataset pages on OpenDataSoft. |
| [Open-Meteo](https://open-meteo.com) | Operational weather display in the application | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Attribution: "Weather data by Open-Meteo.com". |

## Basemaps

| Service | Licence / attribution |
|---|---|
| [CARTO](https://carto.com/attributions) basemaps (Voyager, Positron) | "© OpenStreetMap contributors © CARTO" |
| [OpenStreetMap France / Humanitarian OSM Team](https://www.hotosm.org) tiles | "© OpenStreetMap contributors, tiles style by Humanitarian OpenStreetMap Team hosted by OpenStreetMap France" |
| [Esri ArcGIS Online](https://www.esri.com) reference layers (World Boundaries and Places, World Transportation) | Esri terms of use. Attribution: "Sources: Esri and contributors". |

## Software Libraries

Licences below were read from the installed packages.

### Frontend

| Library | Licence |
|---|---|
| [React](https://react.dev) / React DOM | MIT |
| [React Router](https://reactrouter.com) | MIT |
| [CesiumJS](https://cesium.com/platform/cesiumjs/) | Apache-2.0 |
| [MapLibre GL JS](https://maplibre.org) | BSD-3-Clause |
| [OpenLayers](https://openlayers.org) | BSD-2-Clause |
| [Apache ECharts](https://echarts.apache.org) | Apache-2.0 |
| [Turf.js](https://turfjs.org) | MIT |
| [proj4js](https://proj4js.github.io/proj4js/) | MIT |
| [geotiff.js](https://geotiffjs.github.io) | MIT |
| [TanStack Query / Virtual](https://tanstack.com) | MIT |
| [Zustand](https://github.com/pmndrs/zustand) | MIT |
| [i18next](https://www.i18next.com) / react-i18next | MIT |
| [React Aria Components](https://react-spectrum.adobe.com/react-aria/) | Apache-2.0 |
| [Tailwind CSS](https://tailwindcss.com) | MIT |
| [Tabler Icons](https://tabler.io/icons) | MIT |
| [Lucide](https://lucide.dev) | ISC |
| [Inter (Fontsource)](https://fontsource.org/fonts/inter) | OFL-1.1 |
| [Axios](https://axios-http.com) | MIT |
| [Vite](https://vite.dev) | MIT |

### Backend

| Library | Licence |
|---|---|
| [Gin](https://github.com/gin-gonic/gin) / gin-contrib/cors | MIT |
| [GORM](https://gorm.io) (with PostgreSQL driver and datatypes) | MIT |
| [pgx](https://github.com/jackc/pgx) | MIT |
| [Asynq](https://github.com/hibiken/asynq) | MIT |
| [go-redis](https://github.com/redis/go-redis) | BSD-2-Clause |
| [go-oidc](https://github.com/coreos/go-oidc) | Apache-2.0 |
| [Logrus](https://github.com/sirupsen/logrus) | MIT |
| [automaxprocs](https://github.com/uber-go/automaxprocs) | MIT |

### Infrastructure

| Component | Licence |
|---|---|
| [PostgreSQL](https://www.postgresql.org) | PostgreSQL License |
| [PostGIS](https://postgis.net) | GPL-2.0-or-later |
| [pgRouting](https://pgrouting.org) | GPL-2.0-or-later |
| [GeoServer](https://geoserver.org) (kartoza/geoserver image) | GPL-2.0 |
| [Keycloak](https://www.keycloak.org) | Apache-2.0 |
| [Redis](https://redis.io) 7 | BSD-3-Clause up to 7.2; RSALv2/SSPLv1 from 7.4 |
| [nginx](https://nginx.org) | BSD-2-Clause |

### Wildfire Calculation Engine (separate repository)

Source: [storcito-wildfire-risk-engine](https://github.com/THD-Spatial-AI/storcito-wildfire-risk-engine). Its own [ATTRIBUTIONS.md](https://github.com/THD-Spatial-AI/storcito-wildfire-risk-engine/blob/main/ATTRIBUTIONS.md) lists the full data and software credits.

The STORCITO engine uses [GDAL](https://gdal.org) (MIT; cite as <https://doi.org/10.5281/zenodo.5884351>), [GRASS GIS](https://grass.osgeo.org) (GPL-2.0-or-later), NumPy, Rasterio, GeoPandas and Matplotlib.

## Research

- Novo, A., Fariñas-Álvarez, N., Martínez-Sánchez, J., González-Jorge, H., Fernández-Alonso, J. M., & Lorenzo, H. (2020). Mapping forest fire risk—A case study in Galicia (Spain). *Remote Sensing, 12*(22), 3705. <https://doi.org/10.3390/rs12223705> — AHP approach and default FWI class boundaries.
- Van Wagner, C. E. (1987). *Development and structure of the Canadian Forest Fire Weather Index System* (Forestry Technical Report 35). Canadian Forestry Service — Fire Weather Index equations.
- Saaty, R. W. (1987). The analytic hierarchy process—What it is and how it is used. *Mathematical Modelling, 9*(3–5), 161–176. <https://doi.org/10.1016/0270-0255(87)90473-8>
