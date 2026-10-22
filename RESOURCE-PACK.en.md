# Graphic resource pack v1

<!-- doc-language -->
[简体中文](RESOURCE-PACK.md) · [English](RESOURCE-PACK.en.md)
<!-- /doc-language -->

Projects, components, libraries and basic graphics share one ZIP container. Legacy JSON remains importable but cannot embed external dependencies. PNG/EXR/frame-image exports are separate.

## File layout

```text
manifest.json             Pack schema, formula ABI, entrypoint and asset index
content.json              Project, component, component collection or asset entry
shapes/<sha256>.json      Definitions and formula/image references
formulas/<sha256>.glsl    Formula source and helper libraries
images/<sha256>.png       Image bytes; JPEG/WebP/SVG also supported
```

The manifest uses `schema: momo.texture-pack/v1`; the base ABI is `momo-pattern/16-v1`. Generator packs declare `momo-pattern/16-v1+generator-v1`. `content` names the entry JSON. `assets` contains `{id, hash, file}`: node-facing graphic ID, SHA-256 of the resolved canonical resource JSON, and descriptor path. Paths are relative to the pack root. Absolute paths, external URLs, empty segments, `..` and duplicate names are forbidden.

Entry schemas include `momo.texture-tree/v1` (project), `momo.texture-subtree/v1` (component), `momo.texture-library/v1` (presets array), and `momo.texture-assets/v1` (basic assets without nodes).

Assets contain `kind: formula | image`, `definition` and `libraries`. Generator capability lives inside the definition. Definitions retain the 16-slot formula ABI, with separate generator capability for extended parameters. Output/seamless `file` fields reference source files; libraries have `{file}` records. Images additionally contain `mime` and `file`. Formulas can be multiline expressions or bodies and include parameter definitions. Slots and keys retain their binding contract.

Images support original color/alpha, luminance masks and alpha masks. Original-color mode preserves RGBA; height uses luminance multiplied by alpha. Images participate in UV, arrangement, masks and animation. Source resolution limits enlargement detail. Saving processed bitmaps bakes the result; SVG retains its source paths.

## Usage

- **Save project:** exports canvas nodes and dependencies; restore through Open project.
- **Export resources** in the library: exports selected resources and dependencies in an indexed library ZIP; individual official packs can also be exported.
- **Create resource → Import files:** accepts official resource/library ZIPs and supported authoring/legacy JSON. Project ZIPs use Open project.
- **Create resource → Image:** imports PNG/JPEG/WebP/SVG as image resources.
- The reusable graphics list is saved separately in this browser; project files contain the canvas's dependencies, not a full list backup.

Exports embed required built-in definitions and helper libraries, so recipients need a compatible ABI rather than an identical built-in catalog. Masks and density-map references, including density keys, are collected. Packs use graphic IDs for density references and rebuild runtime indexes on import. Identical formula files deduplicate by content. Vector libraries remain complete dependency files.

## Edit formulas and repack

1. Export an official resource pack and extract it.
2. Edit names/parameters in `shapes` and referenced GLSL. Retain required helper libraries.
3. Run:

```sh
node pack-resource-folder.mjs ./extracted-resource ./my-graphic.zip
```

The script regenerates hashes and indexes. Recompressing edited files without this step fails validation. Formula resources can also be edited and saved through the library's resource editor.

## Import and persistence

Import validates ZIP CRC, paths, counts, expanded sizes, dependencies and SHA-256, then definitions, decoded images and ordinary/seamless GPU compilation/rendering before persistence. Assets use IndexedDB; drafts and reusable node lists use browser local storage.

Content identical to local built-ins reuses their IDs. Other content uses `asset_<sha256>`. Names do not replace identities, and repeated identical dependencies reuse assets. Components remain independent entries. Failure rolls back temporary registrations and reports the error.

ZIP Store and Deflate are supported; encryption, multipart and ZIP64 are not. Pack/expanded-size, file-count, image-size and canvas-node budgets are validated separately. A pack and its expanded total are limited to 64 MiB, an individual file to 16 MiB, with up to 4096 files and images up to 4096×4096. The old 256-custom-asset/40-component count limits are no longer applied. Browser storage quotas may impose additional limits. Unsupported ABI or GPU compilation fails explicitly instead of substituting a circle.

`validate-resource-pack.html` performs standalone GPU round-trip checks without modifying user projects or persistent libraries.

## Multilingual parameter metadata

Definition parameters/options carry stable `variable` and optional `aliases`. Import/export never rewrites them for the current display language. Alias edits affect hashes; language preferences do not. Legacy label-only descriptors retain their original data/hash and are interpreted as Chinese aliases only at display boundaries. Graphic names also carry top-level `name + aliases`. See [Language and aliases](docs/12-language-and-aliases.en.md).
