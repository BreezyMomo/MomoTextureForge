# Texture tool expansion plan

<!-- doc-language -->
[简体中文](README.md) · [English](README.en.md)
<!-- /doc-language -->

Execute in order. Each file records scope, acceptance and results.

| Order | Plan | Status |
| --- | --- | --- |
| 1 | [Unified generator time](01-generator-time.en.md) | Complete |
| 2 | [Animated water, caustics, fire and lightning](02-animated-effects.en.md) | Complete |
| 3 | [General postprocessing](03-postprocessing.en.md) | Complete |
| 4 | [Normal controls and material preview](04-material-preview.en.md) | Complete |
| 5 | [Volumetric fire, explosion and smoke](05-volumetric-effects.en.md) | Complete |

Entries: Graphics library → effects; node → Composite → postprocessing; preview channel/mode → normals and 3D materials.

Delivery includes source, help, AI Skills and a static website. Commits/pushes follow separate user instructions.

Validation at completion: 267 unit tests, 298 definitions, static build, and expansion/GPU/control/generator/fire-smoke/custom-generator/release/pages browser regressions passed. Artifacts are in ignored `test-results/`. These figures describe that implementation stage, not the current total.
