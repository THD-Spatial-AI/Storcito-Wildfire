# Managing models

Open **Wildfire Simulations** in the sidebar to see all your models.

## Workspaces

Models are organised in **workspaces**. Everyone has a default workspace, and you can create more, for example one per project or region. Use the workspace selector to:

- create, rename, copy or delete a workspace,
- share a workspace with other users or with groups,
- see who a shared workspace belongs to.

## The model list

Each row shows the model name, status, period, owner, workspace and risk level. Use the search box and the **From / To** date filter to find models. The summary cards above the list count your models by status.

**Pin to top** keeps important models at the top of the list.

### Model status

| Status | Meaning |
|---|---|
| **Draft** | Saved but not calculated yet |
| **Queued** | Waiting for a free simulation engine |
| **Running / Calculating** | The engine is computing the result |
| **Processing** | The result is being unpacked and published as a map layer |
| **Completed / Published** | The result is ready to view |
| **Failed** | The calculation did not finish. Hover for the reason |
| **Cancelled** | The run was stopped |
| **Modified** | The configuration changed after the last run. Recalculate to update the result |

While a model is queued or running, the row shows an estimated time left. The estimate is based on similar earlier runs.

## Actions on a model

| Action | What it does |
|---|---|
| **View results** | Opens the results viewer (completed models) |
| **Edit** | Reopens the wizard to change the configuration |
| **Calculate** | Starts or restarts the calculation |
| **Share** | Gives another user access to the model. Revoke access in the same dialog |
| **Copy** | Creates a copy, for example to try different settings |
| **Move to workspace** | Moves the model to another workspace |
| **Download** | Downloads the result archive |
| **Delete** | Removes the model |

Select several rows to **delete**, **move**, **copy** or **calculate** them together. Select exactly two completed models to **compare** them.

## Shared models

Models shared with you are marked with their owner. You can open them, but you cannot delete, move or re-share them. Make a copy first if you want your own version.

Copies remember where they came from: a copy shows its **parent model**, and the original lists its copies.
