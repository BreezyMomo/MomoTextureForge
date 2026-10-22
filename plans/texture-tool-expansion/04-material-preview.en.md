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

## Results

Normal settings connect to output and persistence. The preview supports three models, rotation, lighting, roughness, metalness, parallax and repetition. GPU checks passed for five normal settings, initialization and model switching. Later UI refinements determine which preview controls remain exposed.
