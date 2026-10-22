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

## Results

All three are integrated with adjustable 24–96 bounded samples. Seven added effects passed GPU time/range/finite-pixel/import-equivalence checks. At completion, 267 unit tests and 298 definitions passed, alongside original generators, fire/smoke, custom creation, controls, export and static-site regressions. Offline checks confirmed no extra network assets.
