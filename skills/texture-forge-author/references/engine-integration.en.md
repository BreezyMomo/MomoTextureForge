# Bring editor effects into a game engine

<!-- doc-language -->
[简体中文](engine-integration.md) · [English](engine-integration.en.md)
<!-- /doc-language -->

These rules apply whenever AI brings Momo Texture Forge graphics, images, postprocesses, animation or compositions into any game engine. They are not specific to one effect. Ready-to-deliver modules currently cover only some graphics and effects; check actual implementation rather than treating web rendering as target-engine support.

## 1. Read the work and target project

Use the user's native project ZIP or an explicitly authorized page snapshot to read actual nodes, dependencies, parameters, tracks and effect order. Render representative times as references. Follow [snapshot and connection rules](live-editor.en.md) for live work and [project tools](project-tools.en.md) for offline files. Do not access other pages or the entire user library to obtain source.

Establish the engine, version, rendering pipeline, usage surface and performance requirements. Use known context first and ask only for missing information that affects implementation. A Unity package does not automatically support another pipeline, engine, UI or particle use case.

## 2. Check existing modules before writing code

Unity currently uses [standard Shader modules carried by resources](unity-modules.en.md). Extract them from native resource ZIPs or read the shaderModules files returned by MCP forge_resource. Modules preserve all their own parameters and dependencies for user learning/use and AI composition. Read and reuse supplied Unity implementations without translating their GLSL again. Port only missing or unsuitable modules.

Query actual Shader support for the relevant graphics and postprocesses, then read available Shaders, runtime components, parameter mappings, dependencies and integration instructions. See [adapted graphics](realtime-shaders.en.md) for current Unity queries and delivery. Individual postprocess documents specify their contracts; [handdrawn postprocessing](handdrawn-postprocess.en.md) is one current implementation.

When whole-work export is unsupported, inspect individual nodes and stages for reusable modules instead of concluding that the work has no Shaders. MCP support and delivery use one fresh `snapshotId`; CLI queries the source project. Do not substitute display names, badges or a fixed list for capability checks, or recreate an effect from screenshots without checking existing code.

## 3. Priority: reuse, adapt, then implement gaps

| Condition | Implementation |
| --- | --- |
| An existing module matches the target environment and visual requirements | Prefer the provided Shader, runtime, importer and parameter mapping directly; do not write a simplified duplicate |
| An existing module covers the core algorithm but interfaces, pipeline or some capabilities differ | Adapt the existing source and input/output contracts, retaining useful algorithms, parameter semantics, licenses and attribution; add required interfaces or features |
| No module exists or the available module is unsuitable | Identify the concrete gap, then implement the missing part using actual editor source, project data and rendered references; do not recreate unrelated reusable modules |

This priority applies to graphic generation, postprocessing and their dependencies, not only handdrawn conversion. Package example parameters are not the user's authored values: map actual variables, paths, units and animation semantics. GLSL source may guide a port but does not establish an existing target-engine adapter.

## 4. Compose the complete effect

Connect generators, image inputs, postprocessing, masks, layer blending and animation in the authored dependency and execution order. Reuse modules first and implement only uncovered arrangement, timing, composition or other capabilities. Use multiple passes or runtime components where needed; do not force a single pass merely for delivery convenience.

Preserve color space, alpha, coordinates, scale, time units and resource ownership; see [Shader responsibilities and extension rules](shader-architecture.en.md). Never silently omit nodes, ignore unsupported parameters, substitute visual styles or alter the user's work to pass export checks. Declare baking, degradation and approximations explicitly. Static frames or static input are not complete dynamic effects.

## 5. Validate in the target engine

Follow the package's formal integration route. Check real engine compilation, representative times and motion, transparent inputs and aspect, parameter responses and composition order. For runtime resources, verify updates, input switching, release and persistence after reopening. Record browser checks, core Shader compilation and target-engine visuals separately, identifying checks not performed.

Report directly reused modules, adapted modules, new implementations and remaining gaps or explicit bakes. Successful delivery of a few modules does not mean the entire editor supports one-click conversion of arbitrary effects.
