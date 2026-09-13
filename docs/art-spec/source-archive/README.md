# Generated source asset archive

This directory is reserved for generated source artwork and source-preserving derivatives used to build the lightweight production assets under `fishing-game/assets/fishing-field/`.

Rules:

- Generated source art is retained even when a lighter SVG derivative is used at runtime.
- Runtime assets stay optimized and replaceable.
- `docs/art-spec/GENERATED_ASSET_PROVENANCE.md` records which source became which production asset.
- New generated assets should be added to this archive before or alongside integration.

The production game never depends on these archive files at runtime.
