# Animated water, caustics, fire and lightning

<!-- doc-language -->
[简体中文](02-animated-effects.md) · [English](02-animated-effects.en.md)
<!-- /doc-language -->

Status: complete.

## Scope

Add four parameterized animated graphics through the existing library, generator editor, nodes and sequence export.

## Implementation

Append algorithms/parameters using the definition format, retain attribution and generate thumbnails.

## Acceptance

All four are visible and evolve with time; parameters, transparency and resource round-trips work.

## Results

All four are integrated. GPU checks passed for time changes, every parameter's minimum/maximum and pack equivalence. Caustics retain pixy.js MIT attribution.
