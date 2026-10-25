# General postprocessing

<!-- doc-language -->
[简体中文](03-postprocessing.md) · [English](03-postprocessing.en.md)
<!-- /doc-language -->

Status: complete.

## Scope

Add blur, Bloom, sharpening, chromatic aberration and toon levels to nodes/groups. Defaults remain disabled for existing projects.

## Implementation

Add serialization, GPU passes and editor controls across groups, masks and export.

## Acceptance

Old projects render identically by default. Every filter visibly affects output, with valid save round-trips, groups and export.

## Current implementation

These five basic filters are integrated for nodes/groups. The current stack also includes handdrawn, distortion, dissolve and creative effects; see [Postprocessing](../../docs/05-canvas-and-compositing.en.md#node-post-processing-and-execution-order) for ordering and scope. Native keys, resource persistence and image/animation export are supported. Unity adaptation has a [separate scope](../../docs/14-shader-reference.en.md), not implied by web support.
