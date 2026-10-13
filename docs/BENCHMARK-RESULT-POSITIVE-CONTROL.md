# AINAN Result fixed-version positive-control (2026-10-13)

Common benchmark task: `ainan-result-render-01`. This is a **fixed version positive-control**, not historical failing-SHA replay or AI model comparison.

The independent [Benchmark Result workflow](../.github/workflows/benchmark-result-positive-control.yml) runs the existing production `npm run build` pipeline, uses the original `scripts/capture-named-results.mjs` to validate real Phaser Result scene ownership, fish/boss hero visibility and reward, then decodes actual PNG pixels using `scripts/result-screen-pixel-guard.mjs` for seven Result frames including `39-player-result.png`.

- Requires 390×844, actual visible golden GET heading (more than 450 matching pixels), and more than 15000 screenshot bytes, without skipping existing global screenshot guards.
- Exports PNG screenshots and a sanitized sha256/visible-pixel audit manifest as GitHub artifact. No credentials, user save data or production environment change.
- **Does not** assert the historical bug at `f195c6cb1f1a48e18121c3efcbf1ac30a0e789ff` has been reproduced. Does not prove WebKit, physical iPhone, player enjoyment or 18 AI executions.

Command (after building and starting `npm run preview -- --host 127.0.0.1 --port 4173`):

```sh
npm exec --yes --package=playwright@1.55.0 -- node scripts/capture-named-results.mjs
node scripts/benchmark-result-positive-control.mjs
```

If any frame is visually blank, the test fails. CI green is evidence of the current browser fixture only, not a measured improvement due to an AI configuration.
