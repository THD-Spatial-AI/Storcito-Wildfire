# API access

You can fetch your models and results from scripts, Postman, QGIS or other applications with a **personal API token**.

- Base URL (production): `https://wildfire.th-deg.de/api`
- Base URL (local development): `http://localhost:8000/api`

## Getting a token

Tokens are issued by an **expert**, or by a **manager** for users in their group:

1. Go to **Dashboard → User Management**.
2. Click the **key icon** next to the user. A green key means the user already has an active token.
3. Enter a **token name** (what it's for, for example `analysis-script`), a **scope** and an **expiry** (30 days, 90 days, 1 year or never).
4. Select **Generate token** and copy it right away. It starts with `whf_`.

> The token is shown **only once**. The server stores only a hash, so it can never be shown again. Pass it on over a secure channel such as a password-manager share.

**Scopes**

| Scope | Allows |
|---|---|
| **Read-only** (recommended) | All `GET` requests |
| **Read & write** | Also creating models and starting calculations, within the user's normal permissions and limits |

A token always acts **as its user**. It sees exactly the models that user owns or that were shared with them, and it never carries admin privileges. Revoke a token in the same dialog. It stops working immediately.

## Using a token

Send the token in the `Authorization` header of every request:

```
Authorization: Bearer whf_<your-token>
```

```bash
TOKEN="whf_paste_your_token_here"
BASE="https://wildfire.th-deg.de/api"

curl -H "Authorization: Bearer $TOKEN" $BASE/models                 # list models
curl -H "Authorization: Bearer $TOKEN" $BASE/models/92               # one model
curl -H "Authorization: Bearer $TOKEN" $BASE/models/92/risk-metrics  # metrics
curl -OJ -H "Authorization: Bearer $TOKEN" $BASE/models/92/download  # result archive
```

**Python**

```python
import requests

BASE = "https://wildfire.th-deg.de/api"
headers = {"Authorization": "Bearer whf_paste_your_token_here"}

models = requests.get(f"{BASE}/models", headers=headers).json()["data"]
for m in models:
    print(m["id"], m["title"], m["status"])
```

## Endpoints

| Method | Endpoint | Description | Scope |
|---|---|---|---|
| GET | `/models` | List your models (`limit`, `offset`, `search`, `workspace_id`) | read |
| GET | `/models/stats` | Your model usage statistics | read |
| GET | `/models/{id}` | One model with its configuration | read |
| GET | `/models/{id}/results` | Result records (processing and layer status) | read |
| GET | `/models/{id}/risk-metrics` | Computed risk metrics | read |
| GET | `/models/{id}/risk-map-samples` | Positioned raster samples | read |
| GET | `/models/{id}/download` | Download the result archive | read |
| GET | `/results/{result_id}/layer` | WMS layer info for QGIS or web maps | read |
| POST | `/models` | Create a model | full |
| POST | `/calculation/start/{id}` | Start a calculation | full |

## Model id vs. result id

The map layer is **not** addressed by the model id. Two ids are involved:

- **model id**: used by every `/models/...` endpoint.
- **result id**: the id of a processed result record, used **only** by `/results/{result_id}/layer`.

```text
GET /models/84/results   →  data[0].id = 43      ← 43 is the result id
GET /results/43/layer    →  wms_url, layer_name, bounds …
```

The layer response contains `wms_url`, `layer_name` (for example `fire_risk:model_84`) and `bounds`. Add these to QGIS as a WMS connection to view the result.

If `/models/{id}/results` returns an empty list, the result hasn't been published yet and there is no layer to fetch.

## Errors

| Response | Meaning | Fix |
|---|---|---|
| `401 Invalid API token` | Token unknown, expired or revoked | Ask for a new token |
| `401 Session not found` | Header missing or malformed | Use exactly `Bearer whf_…` |
| `403 This API token is read-only` | Write attempt with a read-only token | Ask for a full-scope token if needed |
| `403 Access denied` | The model isn't yours and isn't shared with you | Ask the owner to share it |
| `404 Model not found` | Wrong model id | Check `GET /models` |
| `404 Result not found` | Model id used instead of result id, or no result yet | Get the result id from `/models/{id}/results` |

Browser apps on other domains are subject to the API's CORS allow-list. Scripts, Postman and server-side use are not affected.
