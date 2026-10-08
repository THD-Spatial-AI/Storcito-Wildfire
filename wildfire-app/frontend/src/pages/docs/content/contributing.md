# Contributing

Bug reports, feature requests and pull requests are welcome. The full guide is in [CONTRIBUTING.md](https://github.com/THD-Spatial-AI/Storcito-Wildfire/blob/main/CONTRIBUTING.md), and everyone taking part follows the [Code of Conduct](https://github.com/THD-Spatial-AI/Storcito-Wildfire/blob/main/CODE_OF_CONDUCT.md).

## Reporting issues

Use the [issue tracker](https://github.com/THD-Spatial-AI/Storcito-Wildfire/issues). Include what you expected, what happened, steps to reproduce, screenshots or logs, and the app version.

Changes to the scoring rules, weights or FWI conventions belong in the [wildfire risk engine](https://github.com/THD-Spatial-AI/storcito-wildfire-risk-engine) repository.

## Branches

Branch names are checked in CI and follow `<type>/<description>`:

- **type:** `feat`, `feature`, `fix`, `bugfix`, `hotfix`, `release`, `chore`, `docs`, `refactor`, `test`, `style` or `perf`
- **description:** lowercase letters, digits, hyphens and dots

Examples: `fix/login-validation`, `feat/export-geotiff`, `docs/readme-setup`.

## Commits

Commit messages are checked in CI and follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(results): add relief exaggeration control
fix(map): keep bookmarks after reload
docs: update installation steps
```

## Updating this documentation

The pages you are reading are Markdown files in `wildfire-app/frontend/src/pages/docs/content`. To add a page:

1. Create a new `.md` file in that folder.
2. Add an entry for it in `wildfire-app/frontend/src/pages/docs/sections.ts`.

## License & citation

The project is released under the MIT License. If you use it in research, cite it using the metadata in [CITATION.cff](https://github.com/THD-Spatial-AI/Storcito-Wildfire/blob/main/CITATION.cff).
