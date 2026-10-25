# Unified generator time

<!-- doc-language -->
[简体中文](01-generator-time.md) · [English](01-generator-time.en.md)
<!-- /doc-language -->

Status: complete.

## Scope

Supply GLSL `time` in seconds using node-clock speed, offset, freezing and export time. Preserve static cache behavior/results.

## Implementation

Connect time detection, GPU uniforms and cache keys. Add preview time to resource editing and update authoring guidance.

## Acceptance

Dynamic generators change across times and remain identical when frozen; static cache hits and existing generators remain valid.

## Current implementation

Time detection, GPU input, caching and preview time are connected. Generators reading time redraw dynamically, static inputs cache, and formula clocks support speed, offset and freezing. See [Animation](../../docs/06-animation.en.md) for current semantics and [Development](../../docs/development.en.md) for checks rather than treating a historical pixel difference as an acceptance threshold.
