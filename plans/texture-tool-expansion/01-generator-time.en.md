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

## Results

Time detection, GPU input, caching and preview time are connected. GPU checks passed: average cross-time pixel difference 0.0746, identical frozen output and cache hits for the original static flame.
