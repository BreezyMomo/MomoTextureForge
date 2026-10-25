# Normal controls and 3D material preview

<!-- doc-language -->
[简体中文](04-material-preview.md) · [English](04-material-preview.en.md)
<!-- /doc-language -->

Status: complete.

## Scope

Improve normal direction, algorithm and smoothing controls. Add local material preview with models, lighting and rotation.

## Implementation

Connect normal settings/export, implement sphere/plane/cube viewing and update help.

## Acceptance

Normal settings affect output and persist. Preview samples the current canvas and works offline.

## Current implementation

Normal settings connect to output and persistence. The preview offers sphere, plane and cube, camera rotation, lighting, roughness, metalness and texture repetition. See [Normals and 3D preview](../../docs/07-normal-and-material.en.md) for current controls. Models/lights are inspection aids, are not exported with images and do not imply geometry extrusion.
