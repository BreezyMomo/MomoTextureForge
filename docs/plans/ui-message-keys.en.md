# Stable UI message keys

<!-- doc-language -->
[简体中文](ui-message-keys.md) · [English](ui-message-keys.en.md)
<!-- /doc-language -->

Goal: consistent semantic IDs across catalogs, independent of wording.

1. Extract separate Chinese/English catalogs with shared resolution, interpolation and fallback. Build-time language choices remain fixed.
2. Migrate calls, HTML bindings and status/errors without translating user names/code/aliases.
3. Update audit, tests, development guidance and Skills; verify switching, identity, export and narrow layouts.
4. Build offline/static output for review; commits/pushes follow user instructions.

IDs such as `menu.file`, `common.close` and `preview.*` remain stable once allocated. New languages require registered catalogs and matching placeholders. Parameter metadata retains variables/aliases.

## Completion and validation

- At this stage, 1866 semantic IDs and separate catalogs replaced reverse lookup, with explicit HTML bindings.
- Graphic names initially used IDs in UI catalogs; a later resource-name stage moved them to resource-owned aliases. Parameter aliases always traveled with resources. User/formula/project/undo boundaries remained intact.
- Build audits checked IDs/placeholders/languages/references. Error/Worker transport retained message identity and values.
- 317 unit tests, definition validation and source/built browser checks passed: language, aliases, storage, unchanged user/pixel/project/undo state, 34 views and 1600/1100/768 widths.
- Static regressions passed 298 resources, PNG, Worker, custom/dynamic generators, 3D, examples and validation without script errors/external assets.
- Offline/static files, docs and Skills were generated for review.
