# Resource-owned multilingual graphic names

<!-- doc-language -->
[简体中文](graphic-name-aliases.md) · [English](graphic-name-aliases.en.md)
<!-- /doc-language -->

Status: implemented and verified. The following validation record describes this implementation stage.

1. Add optional aliases to definitions/metadata with shared resolution, validation and search. Fallback: selected language → configured languages → default name → ID.
2. Move 298 built-in names into definitions; UI catalogs contain only UI text. Formulas, images, generators, compositions and reusable lists retain aliases.
3. Provide name editing with fixed language choices, preserving JSON/ZIP/remote-directory round-trips and search.
4. Use resolved names for new canvas nodes; retain independent names thereafter.
5. Synchronize docs/Skills and check identities, versions, hashes, browsers and static export.

Alias edits change content/version. Language switches change only presentation. Old resources without aliases retain default names; do not silently add metadata. Preserve inactive-language aliases.

## Validation results

- 323 unit tests passed, including fallback, validation, versions/hashes, packs, remote indexes and list persistence.
- 298 definitions passed; name migration did not alter rendering definitions.
- UI audit passed for 1575 semantic messages with matching placeholders.
- Source/built graphic-name browser checks passed formula/image/generator/composition editing, authoring JSON/ZIP, cross-language search, persistence, independent node names and remote subscriptions/insertion.
- Parameter-language checks passed fixed choices, aliases, options and multi-selection.
- Built UI-language checks passed 34 views.
- Static build/pages regression passed PNG, embedded Worker, generators, 3D, examples and undo/redo with no script errors or external static assets.
- Whitespace checks passed.

Actual image testing also fixed `imageMode` being incorrectly rejected as a GLSL type. Actual type names remain reserved, with identifier regression assertions.
