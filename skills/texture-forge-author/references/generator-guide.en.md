# Custom generators

<!-- doc-language -->
[简体中文](generator-guide.md) · [English](generator-guide.en.md)
<!-- /doc-language -->

Use generators for native RGB/RGBA, multiple passes or intermediate textures: colored fire, glow, smoke and procedural materials. Prefer formulas for simple scalar shapes. Existing generators can be edited/saved as copies; creation does not require template selection.

Deliver UTF-8 `.generator.json` with `schema: momo.generator-authoring/v1`. Paste/select through Create resource → Generator, preview and import. Import files also supports it alongside formula JSON. Saved generators retain code editing/JSON export; official ZIP export includes dependencies.

See the [complete three-pass example](example.generator.json). Do not generate resource IDs, slots, hashes or manifests.

## JSON fields

- `name`, `category`, `description`: name 1–80 characters, personal category default, description up to 2000. Editor metadata supplies final saved values.
- `scalar`: `alpha` or `luminance` for masks/height/normals. Original-color viewing retains RGBA.
- `parameters`: up to 64 entries with variable, optional aliases, min/max/step/default. Require `min < max`, positive step, in-range defaults and a `seed` parameter for reproducibility.
- Optional `type:"color"` is a 24-bit RGB integer (0–16777215, step 1); `type:"select"` has value/alias options. Other controls are numeric sliders/inputs. All shader bindings are floats; cast integer uses explicitly.
- `aliases`: language-tag names; one/none is valid. Configured fallback selects the first nonempty alias, otherwise variable. Legacy label is Chinese only without an explicit map. Options also support aliases/stable variables; omitted option variables derive from values. Required parameter identifiers are unique, ASCII letter/underscore first, then digits allowed, at most 80 characters; exclude GLSL/host names, `gl_` and double underscores.
- `helpers`: optional global GLSL up to 1 MB. Defined before parameter macros; pass adjustable values as arguments.
- `passes`: 1–16 ordered steps with unique ASCII `id`, `source`, optional `inputs` and `scale`.
- `inputs`: up to three previous pass IDs, bound in order to `input0`–`input2`. No self/forward/missing references; unconnected inputs cannot be sampled.
- `scale`: relative resolution, default 1, range 0.125–1. Last pass must use 1 and supplies final output. Smaller intermediates reduce cost.
- Source per pass: 65,536 characters; whole file: 2 MB.

## GLSL environment

GLSL ES 3.00, implementing `vec4 generate(vec2 uv)` per pass. UV is normalized with lower-left origin. Return straight/nonpremultiplied RGBA: original RGB and alpha 0–1; do not multiply RGB by alpha again. Intermediates use the same convention, so handle transparent edges appropriately during mixing/blur. Outputs must be finite.

Available values: parameter variables, `generatorSeed`, `generatorResolution` for this pass, and connected `sampler2D input0`–`input2`. Sample with `texture(input0,uv)`; inspect actual input dimensions using `textureSize(input0,0)`. Math helpers include PI, TAU, sat, rot, fill, line, noise, fbm and segment. Define other functions in helpers/pass source.

Do not declare main, version/include directives or duplicate host uniforms. Avoid host identifiers such as uv, generate, input0, gp, generatorResolution, called functions and GLSL types.

This is single-frame rendering, without JavaScript, arbitrary CPU geometry, network, previous-frame feedback, persistent buffers or physics simulation. `time` in seconds follows node speed/offset/freezing; reading it causes time-based rerendering. Parameters can have keys. No time reads means static cache reuse. Explain limitations and alternatives for cross-frame simulation.

## Validation and delivery

The bundled CLI supports formulas and generators:

```sh
node scripts/texforge.mjs validate effect.generator.json
node scripts/texforge.mjs render effect.generator.json --size 512 --output preview.png
node scripts/texforge.mjs check effect.generator.json --size 512 --output previews
```

Validate checks structure/connections only. Render/check use actual WebGL2. Inspect PNG colors, alpha, holes and edges at default/min/middle/max settings. Modify defaults and rerender to test parameter ranges; multiple times are not a range test. State unavailable checks.

Bound loops/sampling and avoid invalid division/sqrt/pow/normalize. Pass IDs identify compiler failures. Structural success is not compilation/visual acceptance. Failed previews retain old images but cannot save invalid code. Deliver complete JSON and actual previews with entry points, controls and remaining limits.

Optional top-level `aliases` contains graphic names, each at most 80 characters, independent of parameter aliases. Default name stays required; enter real names rather than UI message IDs. JSON and ZIP preserve them; missing aliases fall back to default name.
