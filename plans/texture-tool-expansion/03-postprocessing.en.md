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

## Results

All five filters support keys, resources, PSD compositing and streamed export. GPU pixel comparisons and model unit tests passed.
