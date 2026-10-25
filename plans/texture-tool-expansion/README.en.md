# Texture tool expansion plan

<!-- doc-language -->
[简体中文](README.md) · [English](README.en.md)
<!-- /doc-language -->

These foundational extensions are implemented; each file describes scope and acceptance methods rather than a pending execution queue. See [Current scope](../../ROADMAP.en.md), the [manual](../../docs/README.en.md) and [development guide](../../docs/development.en.md) for current workflows.

| Order | Plan | Status |
| --- | --- | --- |
| 1 | [Unified generator time](01-generator-time.en.md) | Complete |
| 2 | [Animated water, caustics, fire and lightning](02-animated-effects.en.md) | Complete |
| 3 | [General postprocessing](03-postprocessing.en.md) | Complete |
| 4 | [Normal controls and material preview](04-material-preview.en.md) | Complete |
| 5 | [Volumetric fire, explosion and smoke](05-volumetric-effects.en.md) | Complete |

Entries: Graphics library → effects; node → Composite → postprocessing; preview channel/mode → normals and 3D materials.

Delivery includes source, help, AI Skills and a static website. Commits/pushes follow separate user instructions.

During maintenance, run `npm test`, `npm run validate:definitions` and `npm run build:pages`, then choose relevant [browser checks](../../docs/development.en.md#checks-and-skill-generation). Current output determines test/graphic totals. Artifacts belong in ignored `test-results/`.
