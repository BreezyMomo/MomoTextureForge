# Momo Texture Forge

<!-- doc-language -->
[简体中文](AGENTS.md) · [English](AGENTS.en.md)
<!-- /doc-language -->

This repository maintains the Momo Texture Forge browser graphics/texture editor.

- Run commands from the repository root. Use Node.js for dependencies, tests and builds.
- Keep the built-in library extension mechanism. `web/definitions/builtin.json` and its referenced definitions are authoritative. External libraries are not automatically distributed/downloaded with the app.
- Preserve attribution/license text in shared GLSL. Catalog changes do not justify removing or replacing notices.
- Change visual formulas only for a concrete issue or user-approved visual improvement, not merely to produce different implementations. Do not maintain historical review/change logs or obsolete formula fingerprints.
- After changing a built-in's appearance, regenerate its thumbnail using `node tests/builtin-release-browser-check.mjs --pattern <ID>`, rebuild and inspect the actual card.
- Capture tutorial images with `tools/capture-docs.mjs`. Maintain numbered annotations in `tools/docs-annotations.mjs` using actual control locations. Keep captions synchronized and targets visible.
- Workbench entry: `web/tree-app.js`. Built-in graphics: `web/definitions`.
- Parameters require stable, graphic-local unique `variable` identifiers. Display aliases follow configured language fallback; otherwise show the variable. Use `role` for behavior, never translated labels. Language changes must not alter projects, keys or hashes. See [language metadata](docs/12-language-and-aliases.en.md).
- Skill sources live in `skills/`; regenerate with `node build-authoring-kit.mjs` after changes.
- Export graphic-recommendation context from the library only; do not restore selected-node context or fixed graphic catalogs. An explicitly user-paired read-only MCP may read the complete main-canvas work. Use one snapshotId for structure, resources and rendering, capture again after edits, and never automatically read other tabs or the user's entire library.
- Install with `npm ci`. Validate using `npm test` and `npm run validate:definitions`. Build with `npm run build:standalone`.
- Put test artifacts in ignored `test-results/` and offline output in `dist/`. `npm run build:pages` updates tracked `site/`. Do not commit dependencies/browser profiles.
- Commit, push and publish according to user instructions.

- Fixed UI text uses stable semantic IDs through `uiText`, dynamic sentences through `uiFormat`, and separate JSON catalogs in `web/locales/` registered by `catalogs.js`. Do not use Chinese text as IDs or reverse-lookup translations. HTML uses explicit data bindings. Errors carry message IDs/values and render through `uiError`. Edit wording in language files, and validate keys/placeholders at build time. Resolve parameter aliases through `parameterLabel`; never translate user names/code. Option values, selectors and conditions do not depend on translations. After UI edits run UI-language unit and source/built browser checks, retaining narrow-window usability.
- Language types/native names/default are fixed in `web/language-config.json`. Selectors only choose configured values; users cannot edit language types/codes. Selected language wins, then configured order. Preserve inactive imported aliases.
- Graphic names belong to resources: top-level `name + aliases`; parameters retain their own `variable + aliases`. Display with `graphicLabel`, search with `graphicSearchText`, and do not maintain names in UI catalogs. Preserve aliases in libraries/lists/JSON/ZIP/remote indexes. Derived templates must not inherit old name aliases. New node names use the resolved display name, then remain independent.
- Documentation has Chinese `.md` and adjacent English `.en.md` editions. Keep body links within their edition and update both together. Language-switch links are the exception. Use separate screenshots in each edition’s interface language (`docs/images/en/` for English and `docs/images/` for Chinese); share examples and code. Guide navigation uses Chinese for `zh-CN`, English otherwise. Validate pairs, links and anchors with `node tools/check-docs.mjs`. Ship both Skill editions and generate both parameter-reference tables.
