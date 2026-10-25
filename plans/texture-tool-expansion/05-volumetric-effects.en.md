# Volumetric fire, explosion and smoke

<!-- doc-language -->
[简体中文](05-volumetric-effects.md) · [English](05-volumetric-effects.en.md)
<!-- /doc-language -->

Status: complete.

## Scope

Add three volumetric generators with time, density, shape and lighting controls.

## Implementation

Implement bounded volume sampling and alpha composition, register resources, validate and update the static site.

## Acceptance

All three evolve with time, expose effective parameters and produce finite pixels. Unit, GPU and static-build checks pass.

## Current implementation

All three are integrated with adjustable 24–96 bounded samples. Maintenance checks time, parameter boundaries, finite pixels, alpha and pack round trips, then rebuilds static output and verifies offline dependencies. See [Development](../../docs/development.en.md) for current commands and verification levels; use current tool output for graphic/test totals.
