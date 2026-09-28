#!/usr/bin/env python3
"""
Fetch Galicia emergency-service locations from the Xunta's VISEME/Riscos
ArcGIS MapServer (the service behind the Xeoportal de Protección Civil) and
save them as GeoJSON (EPSG:4326).

Writes one file per layer plus a combined file whose features carry a
`category` property:

    <out>/bombeiros.geojson
    <out>/policia_nacional.geojson
    ...
    <out>/galicia_emergency.geojson

Usage:
    python scripts/fetch_galicia_emergency.py
    python scripts/fetch_galicia_emergency.py --out data/galicia --with-fire-risk

Standard library only.
"""

import argparse
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

SERVICE = "https://ideg.xunta.gal/servizos/rest/services/VISEME/Riscos/MapServer"
PAGE_SIZE = 1000  # the service's maxRecordCount
RETRIES = 3
USER_AGENT = "storcito-wildfire/galicia-emergency-fetch"

# layer id -> output name
POINT_LAYERS = {
    5: "bombeiros",           # Fire stations
    6: "ges",                 # Supramunicipal emergency groups
    1: "policia_nacional",    # National Police
    2: "garda_civil",         # Guardia Civil
    3: "policia_local",       # Local police and municipal wardens
    4: "upa",                 # Police unit attached to the Xunta
    7: "smpc",                # Municipal civil protection services
    8: "avpc",                # Civil protection volunteer groups
}

# Municipal forest-fire risk polygons (ZAR / IPL / IRP attributes)
FIRE_RISK_LAYER = {52: "risco_incendio_forestal"}


def http_get_json(url: str, params: dict) -> dict:
    full = f"{url}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(full, headers={"User-Agent": USER_AGENT})
    for attempt in range(1, RETRIES + 1):
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                data = json.load(resp)
            if "error" in data:
                raise RuntimeError(f"{full}: {data['error']}")
            return data
        except (urllib.error.URLError, TimeoutError) as e:
            if attempt == RETRIES:
                raise
            print(f"  retry {attempt}/{RETRIES - 1} after error: {e}", file=sys.stderr)
            time.sleep(2 * attempt)
    raise AssertionError("unreachable")


def layer_info(layer_id: int) -> dict:
    return http_get_json(f"{SERVICE}/{layer_id}", {"f": "json"})


def object_id_field(info: dict) -> str:
    for field in info.get("fields") or []:
        if field["type"] == "esriFieldTypeOID":
            return field["name"]
    return "OBJECTID"


def fetch_layer(layer_id: int, order_by: str) -> list[dict]:
    """Return every feature of a layer as GeoJSON features, paging as needed."""
    features: list[dict] = []
    offset = 0
    while True:
        page = http_get_json(
            f"{SERVICE}/{layer_id}/query",
            {
                "where": "1=1",
                "outFields": "*",
                "outSR": 4326,
                "returnGeometry": "true",
                "resultOffset": offset,
                "resultRecordCount": PAGE_SIZE,
                "orderByFields": order_by,
                "f": "geojson",
            },
        )
        batch = page.get("features", [])
        features.extend(batch)
        exceeded = page.get("exceededTransferLimit") or page.get("properties", {}).get(
            "exceededTransferLimit"
        )
        if not batch or not exceeded:
            return features
        offset += len(batch)


def write_geojson(path: Path, features: list[dict]) -> None:
    fc = {"type": "FeatureCollection", "features": features}
    path.write_text(json.dumps(fc, ensure_ascii=False), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--out", default="data/galicia-emergency", help="output directory")
    parser.add_argument(
        "--with-fire-risk",
        action="store_true",
        help="also fetch the municipal forest-fire risk polygons",
    )
    args = parser.parse_args()

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    layers = dict(POINT_LAYERS)
    if args.with_fire_risk:
        layers.update(FIRE_RISK_LAYER)

    combined: list[dict] = []
    for layer_id, name in layers.items():
        info = layer_info(layer_id)
        source_name = info["name"]
        features = fetch_layer(layer_id, object_id_field(info))
        for f in features:
            f.setdefault("properties", {})
            f["properties"]["category"] = name
            f["properties"]["source_layer"] = source_name
        write_geojson(out / f"{name}.geojson", features)
        if layer_id in POINT_LAYERS:
            combined.extend(features)
        print(f"{name:<24} {len(features):>5} features  ({source_name})")

    write_geojson(out / "galicia_emergency.geojson", combined)
    print(f"{'galicia_emergency':<24} {len(combined):>5} features  -> {out}/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
