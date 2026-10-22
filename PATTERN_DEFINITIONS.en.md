# Pattern definitions and formula files

<!-- doc-language -->
[简体中文](PATTERN_DEFINITIONS.md) · [English](PATTERN_DEFINITIONS.en.md)
<!-- /doc-language -->

Each built-in pattern owns its directory/configuration and is registered in the ordered `web/definitions/builtin.json` index. Shared math/periodic/vector functions live in `libraries/`. Startup validates and reads local files; browser and Node consume the same definitions without a separate definition-generation step or production dependency. Parameters, layers/masks, animation, arrangements, tiling, normals and export use this catalog. Multipass rendering and encoding remain host responsibilities.

`NaturalWood` uses 16 parameters and an independent `natural-wood-v1` library with `nw`-prefixed functions to avoid conflicts with imported wood formulas. It retains portable authoring source for editing/export. Existing `Wood` and other indexes are unchanged.

```text
web/definitions/
  builtin.json                 # Categories, libraries, ordered {id,file} index
  libraries/                   # Shared GLSL
  patterns/
    Circle/
      pattern.json             # Complete pattern configuration
      formula.glsl             # Ordinary formula
    Brick/
      pattern.json
      formula.glsl
      periodic.glsl            # Optional native periodic formula
```

Developers can edit files and refresh; restart an older `start.bat` server when updating because JSON/GLSL MIME types and same-origin file loading are required. Users can also create/edit/import formulas through the library. Configuration is data, not JavaScript or `eval`. Structural validation does not replace GPU compilation or provide an arbitrary-code sandbox.

## Directory structure

The index uses `schema: momo.texture-index/v1`, positive `revision`, `abi: momo-pattern/16-v1`, ordered categories/pattern references and named libraries. References are `{id,file}`, for example `{"id":"Circle","file":"patterns/Circle/pattern.json"}`. Paths are relative to the index, IDs must match their configs, and paths must be unique. Categories are `{id,name}`; libraries are `{file,abi}`. The catalog uses `math-v1`; periodic/vector capabilities additionally declare `periodic-v1`/`vector-v1`.

Each `pattern.json` contains the complete record. Formula paths are relative to that file, such as `formula.glsl`. API/CLI also accept the earlier inline `momo.texture-library/v1` form with source dependencies. Both resolve to the same validated in-memory catalog.

| Field | Contract |
| --- | --- |
| schema / revision / abi | `momo.texture-pattern/v1`, positive revision, `momo-pattern/16-v1` |
| id / name / aliases | Unique stable ID, default name and optional language→name map |
| category / order / variant | Category ID, global order and category-local index; append new IDs without reordering existing ones |
| defaults | 16 finite numbers preserving slot ABI; exposed slots equal parameter defaults |
| parameters | `{slot,key,variable,aliases,min,max,step,default}`; up to 16 unique slots for scalar formulas |
| parameters[].type / options | Optional `type:"select"` and `{value,variable,aliases}` options; integer in-range values and discrete animation |
| renderPadding | Optional 0–0.5 symmetric scalar-formula rendering margin; logical coordinates, pivot, selection and cell spacing unchanged |
| outputs.scalar | Required scalar formula for blending/masks/arrangement/height/normals |
| outputs.vector | Optional `{library:"vector-v1"}` with retained scalar sampling |
| seamless | `blend`, `repeat` or `periodic` |
| editor | `kind: parameters / gear / star / bezier`, explicitly declaring specialized capabilities/slots |

See Circle, Gear and BezierRibbon configurations. Add a folder/config/formula and append its index reference with the next global order and category variant. Edit an existing pattern in its own files. Fixed slot keys are `R W N S D K H T A B C E F G I J`; names are display data, not bindings. Existing numeric arrays and keyframe paths retain their ABI.

`PuzzlePiece` is a single piece with independent flat/tab/socket edges and outline/solid modes. Slot 9 selects round/square/dovetail/wave; slot 10 controls roundness; slots 11–14 are top-left/top-right/bottom-right/bottom-left body radii, 0–0.4. The body fills 0–1 while tabs extend outside. Existing grid arrangements repeat it. Complementary edges share connector parameters and mirrored profiles; rounded interior corners leave gaps. `renderPadding:0.46` bounds the tabs and new pieces default to `boundary:visible`.

All nodes use `boundary:clip|visible|repeat`. Renderers compute directional content bounds from transforms, filters and ancestor needs, independently of blue logical bounds/pivot/cell spacing. Groups default to clipping but can allow overflow. Final canvas clipping always remains. New padded graphics start with a smaller region to fit their content; setting region dimensions to 1 can still hit the final canvas boundary. Packs retain metadata.

## Formula descriptors and ABI

A descriptor uses exactly one of `file` and `inline`:

```json
{
  "kind": "expression",
  "file": "formula.glsl",
  "libraries": ["math-v1"]
}
```

An expression can span lines but contains no statements, function definitions or semicolons; the host generates `return sat(expression)`. A body contains local variables, branches, bounded loops and returns in an independent switch-case scope. Return a finite 0–1 scalar:

```glsl
float value=0.;
for(int i=0;i<3;i++) {
  value+=exp(-dot(q,q)/(R*R));
}
return sat(value/3.);
```

Declare complete helper functions in GLSL libraries and reference them from the formula. Dependencies merge once and pass through existing pruning. All referenced libraries must be registered; additional libraries compile in declared order and must avoid host-name duplicates. External URLs, `#include`, `#version` and JavaScript are unsupported. The GPU validates final syntax/types. Initialization file/schema errors and rendering compiler errors use their respective feedback paths.

Ordinary formulas access transformed `u`, `q=u*2.-1.`, `r=length(q)`, `angle=atan(q.y,q.x)`, `time`, and raw vectors `a/b/c/d`. Legacy `R/W/N/S` map to `a`; `D/K/H` to `b.xyz`; `T=time*b.w`. Use raw `b.w/c/d` for slot 7 and slots 8–15 when maintaining native formulas. Functions such as `sat/fill/line/noise/fbm/profileShape/ribbonShape` come from `math-v1.glsl`; the file-layout migration did not rewrite algorithms.

Periodic formulas retain `u/a/b/time` and `R/W/N/S/D/K/H/T` with the first eight slots only. Do not paste an ordinary formula needing `c/d` into that entry. Vector libraries retain `rawVectorAt/vectorAt` and `{{id:PatternID}}` references. Every ID must exist. Curvature/direction/time/masks, HeightNormal and RG encoding remain supported. New vector patterns require a library branch, not just a vector flag.

## Seamless and specialized capabilities

- `blend`: generic edge blending.
- `repeat`: declares an `extent` algorithm (radius/ring/rectangle/cross/ellipse/polygon/capsule/heart/profile/bezier). The host constrains effective scale and repeats shapes without overwriting authored values.
- `periodic`: declares separate `source`, stable periodic `order`, optional `countSlot` (default 2, declared among the first eight slots), `countMultiplier` 1 or 2, `evenCount` and `rows`. The host snaps period counts/rotation/brick rows accordingly.

Star/Gear/Bezier selectors, conditional controls, curve dragging and keys use `editor.kind` while preserving slots. Arrangement, compositing, multipass normals, RGBA packing, alpha and atlas/frame/batch export are host capabilities, not per-formula reimplementations. Existing project migrations remain where supported. Portable projects/packs carry dependencies; simple built-in configuration links use IDs and parameters.

## Validation and rendering checks

```sh
npm run validate:definitions
node validate-definitions.mjs <local-index-json>
npm test
```

Validation checks schema/ABI, ordering, IDs/categories, index/config identity, parameter bindings/ranges/defaults, capabilities, dependencies and source paths/content before publishing the registry. Configuration and formula reads are separate phases, each with concurrency up to eight and one read per file. Registered records are frozen. The CLI reports actual configuration/source counts; structural/file success does not replace GPU compilation.

An earlier deduplication removed 11 definitions and renumbered global/category indexes with the user's approval to drop old-canvas compatibility. Fixed premigration snapshots and ID redirects are not maintained. Tests cover loading/paths/integrity, saved presets, node operations and actual GPU rendering. Formula edits require a revision update and revalidation.

OgeeFlowerTile draws one centered shape using a body formula. Generic diagonal-grid arrangement supplies repetition. Node/GPU periodic and parameter regressions cover it.

## Built-in formulas

The current index registers 298 graphics; `web/definitions/builtin.json` is authoritative. Each definition declares parameters, grayscale/mask/normal support and optional vector output. Seamless behavior chooses native periods, shape repetition or blending.

### Effect resources

`PlumeSmoke`, `LayeredFog`, `TurbulentFlame`, `BallisticSparks`, `BranchedLightning`, `BokehDust` and `FilmGrain` declare `generator.schema: momo.generator/v1` and use a generator path. Scalar formulas retain 16 slots. Generators expose up to 64 parameters; keys from slot 16 are `P16`, `P17`, etc.

Smoke combines seeded geometry/density, two-direction blur, domain warping and edge treatment; fog uses density and postprocessing. Sparks/lightning build trajectories and two-scale glow. Fire, dust and grain use full-screen shaders. Output supplies original color, alpha and scalar sampling through existing transforms, arrangements, masks, coloring and export. Original-color mode retains generator colors; node coloring replaces color while keeping alpha.

`generator.programs` references render shaders in `generator.libraries`, which packs include. Host v1 engines build CPU smoke/trajectory geometry; recipients must support that capability, with unknown versions rejected. Configuration never executes JavaScript. Parameter editing retains editable generator resources instead of baking images. Scalar-formula authoring JSON cannot contain a generator; use generator JSON or official packs.

Generator packs use `momo-pattern/16-v1+generator-v1` so older tools reject rather than show empty images. Ordinary formula packs keep the base ABI. The lower-level three-layer `Renderer` cannot combine different parameter sets for one generator ID; use `TreeRenderer` to generate per node before compositing, as the workbench does.

These seven expose speed and seconds-based motion and also accept parameter keys. Zero speed freezes motion. Seed/parameters/time/size determine reproducible output. Generic edge blending is not a claim of native spatial or temporal periodicity. Film grain uses Ashima Arts/Stefan Gustavson MIT simplex noise, distributed with its notice/license.

### Custom generators

Create resource → Generator accepts `momo.generator-authoring/v1` JSON with parameters, helpers and ordered GLSL passes, not a built-in-template selector. See [generator authoring](skills/texture-forge-author/references/generator-guide.en.md). Formula/generator files can be imported together, and the CLI supports validate/render/check.

Internally, `generator.effect:pipeline` contains passes with `id`, `program`, `inputs` and `scale`. Programs reference bundled libraries; `helpers` names helper libraries. Inputs can reference only earlier passes, up to three, bound to `input0`–`input2`. The final pass is full-sized. Intermediates are recycled after their last use. This uses generator v1 capability and pack ABI; older engines that do not know pipeline reject it explicitly.

User GLSL runs in WebGL2, not arbitrary JavaScript/CPU trajectory code. `time` follows node clocks and export-frame time. Actual shader reads of time add it to cache keys; static generators reuse cache. Built-in geometry engines can declare optional boolean `generator.usesTime`. Old undeclared resources whose shaders do not read time stay static. There is no cross-frame feedback. Saving, composition and export share this generator path.

### Animated and volumetric generators

`FlowingWater`, `WaterCaustics`, `Bonfire`, `AnimatedLightning`, `VolumeFlame`, `VolumeExplosion` and `VolumeSmoke` use pipelines and time. Volumes use 24–96 bounded samples with density, turbulence, lighting and sample controls. Explosions restart by evolution speed. Continuous motion does not guarantee matching export endpoints. The caustics core is adapted from pixy.js with its MIT license in GLSL.

Node `postFx` holds blur radius, Bloom strength/radius/threshold, sharpening, chromatic distance and toon levels, default `[0,0,16,0.6,0,0,0]`. Groups composite before filtering; PSD rasterizes filtered groups. `output.normalAlgorithm`, `normalFlipX`, `normalFlipY`, `normalInvert` and `normalSmooth` affect normal output and packed normal channels. Missing legacy settings retain Sobel behavior.

## Parameter variables and aliases

Variables are unique GLSL-valid ASCII identifiers up to 80 characters, allowing an initial underscore but excluding keywords, `gl_`, double underscores and host names. Slots/keys never vary with language. Optional aliases select the first nonempty configured-language value, otherwise the variable. New definitions require variables. Legacy keys/labels are interpreted at read boundaries without changing original hashes.

`role:feather` controls host feathering; `role:edge-softness` identifies contour-export edge guidance without changing defaults; `role:image-mode` identifies image-channel behavior. Never infer logic from display names. Options keep stable values and may have variables/aliases. Graphic names use separate top-level `name + aliases`. See [Language and aliases](docs/12-language-and-aliases.en.md).
