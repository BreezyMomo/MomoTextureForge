# Parameter variables and multilingual aliases

<!-- doc-language -->
[简体中文](multilingual-parameters.md) · [English](multilingual-parameters.en.md)
<!-- /doc-language -->

Status: implemented and verified; this record describes that development stage.

## Contract

- Require a unique GLSL-valid ASCII `variable`; exclude keywords, `gl_`, double underscores and host names.
- Optional `aliases` map language tags to names. Select the first nonempty configured fallback, otherwise the variable.
- Select options keep numerical values and stable variables with aliases.
- Legacy Chinese `label` is compatibility metadata, not behavior. Use `role` for feathering and similar behavior.
- Language preference is separate browser state, not project/undo/value/key/formula/hash data.
- Alias edits create resource versions; switching language does not modify resources.

## Execution order

1. Metadata validation/resolution, legacy compatibility and built-in migration.
2. Global language choices and integration with inspector, animation, multi-editing and resource/generator editors.
3. Import/export, authoring format and Skills.
4. Unit/browser/offline/static checks and documented boundaries.

## Acceptance

- Configured Chinese/English resolve selected-first, then configured order, then variable. Inactive imported aliases persist.
- Reject invalid/duplicate identifiers, tags and option metadata. Read legacy resources and preserve JSON/ZIP aliases.
- Language changes retain pixels, project serialization, keys and resource hashes.
- Hover reveals identifiers; user names/code/data remain unchanged.

## Verified scope

- Migrated 298 graphics and 1303 parameters, including select labels and specialized modes.
- 313 unit tests passed at this stage. Source/built browser checks covered fixed/rejected choices, persistence, fallback, alias export, options, multi-selection, unfinished inputs and unchanged pixels/projects/undo.
- Static checks covered new/undo, PNG, embedded Worker, dynamic/custom generators and 3D without script errors.
- English coverage includes editor, library/creation, timeline, colors, previews/export, layouts, help and examples; headers fit 1600/1100/768 widths. User names remain data. Repository documentation was translated in a later stage.
- Generator editing verified fixed nonduplicate languages, alias preview/save/export and no page errors.
- Compared against all 298 previous definitions: formulas/outputs, defaults/ranges/slots, seamless settings and generator variables remained identical.

## Fixed language options

`web/language-config.json` fixes language types at build time. Users choose Chinese or English, without typing codes or adding/reordering types. Fallback follows selected language plus configured order. Shared alias selectors disable duplicates and preserve inactive imported metadata. Legacy browser preferences use the first valid language and restore the remaining configured order.

The toolbar uses an immediate native-name selector, replacing a language dialog and bilingual entry label.
