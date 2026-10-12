# Harbor foreground quality gates — before animation or landscape promotion

The current water, player region, pier region and background layers are **losslessly recomposable**, but coarse rectangle masks do not produce motion-ready sprites. The approved portrait game remains unchanged.

## Mandatory acceptance checks
1. **Silhouette:** crop the character using its existing approved independent cutout as the reference. Alpha edges must follow the figure, hat, hands and rod. No rectangular sea/pier color blocks can travel with the character.
2. **Hidden background:** separately restore the seawater, quay and props behind the figure and pier. Compare color, lighting, horizon and reflections against adjacent pixels and the canonical mock. Do not describe missing occluded pixels as existing source data.
3. **Rod and line:** prefer current native Phaser rod/line owner and pivots; avoid a duplicate baked rod or hit region. Verify Cast pull → release → retrieve and reaction states.
4. **Motion:** once inpainting and cutout edges pass screenshot review, allow movement/parallax. Test full range and both portrait/landscape viewport bounds.
5. **Cross-phase consistency:** keep fish/lure contrast, player size and sea readability across Cast/Retrieve/HIT/Battle/Result; preserve current UI and safe areas.
6. **QA:** capture baseline, cutout preview and animated extremal poses at 390×844 and 844×390. Real input tests, source provenance, owner registry, migration stage and CI success required before promotion.

The generator now emits `cutoutEdgeStats`, `motionReady:false` and `backgroundInpainted:false` to avoid conflating a static pixel-perfect decomposition with finished character sprites. These are diagnostic flags, not automatic visual acceptance.

## Release sequencing
- P0: improve character mask and fill missing background with high-quality art direction; keep source composite as rollback.
- P0: isolate player/rod pivots and verify full Cast loop.
- P0: true landscape world composition, HUD and side controls with 44 CSS-px targets.
- P1: landscape Retrieve/Battle/Result/Town and device rotation/resume.
- P1: nine species states, harbor/bay/cape visuals, catch-to-town loop.
- Release: physical iPhone #27 must be approved before 1.0.0.
