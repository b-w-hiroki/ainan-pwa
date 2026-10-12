# Generated fishing-field asset provenance

All fishing-field parts generated during the September 2026 visual pass are tracked here. Runtime assets are normalized into lightweight SVG parts so they remain editable, tintable and animation-friendly in Phaser.

| Generated source | Managed production asset / reference |
| --- | --- |
| 静謐な青い海面のグラデーション.png | `water/water_base_01.svg` |
| 淡い水面の波紋ハイライト_恒一.png | `water/water_pattern_01.svg` |
| 透明な水面の光のきらめき.png | `water/water_highlight_01.svg` |
| 淡い水中グラデーションオーバーレイ.png | `water/underwater_depth_01.svg` |
| 透過背景の柔らかな魚シルエット.png | `fish_shadow/fish_shadow_m_idle_01.svg` |
| 左向きに弧を描く魚のシルエット.png | `fish_shadow/fish_shadow_m_turn_01.svg` |
| 青い光彩の魚シルエット.png | `fish_shadow/fish_shadow_s_idle_01.svg` |
| 海中に輝くシャークシルエット.png | `fish_shadow/fish_shadow_l_idle_01.svg` |
| 光沢ブルーのフィッシングルアー.png | `lure/lure_idle_01.svg` |
| 光輝く水流エフェクトの軌跡.png | `lure/lure_trail_01.svg` |
| 透明背景の淡い水面波紋リング.png | `fx/fx_ripple_small_01.svg` |
| 魚の水面波紋エフェクト.png | `fx/fx_follow_wave_01.svg` |
| 輝く水面の波紋スプラッシュ.png | `fx/fx_ripple_bite_01.svg` |
| 水しぶきの輝く魔法エフェクト.png | `fx/fx_hit_flash_01.svg` |
| 水中の光に輝く岩礁群.png | `field_objects/rock_01.svg` |
| 透明背景の海藻クラスター.png | `field_objects/seaweed_01.svg` |
| 光沢のある黄金色のゲームボタン.png | `ui/retrieve_button_short_reel_01.svg` |
| 蒼海湾のちょい巻きフィッシング.png | implementation target reference; composition rules are captured in canonical docs and asset definitions |
| generated fishing asset sheet | production inventory represented by this table and `asset-definitions.json` |

## Approved Harbor × Aji master split — 2026-10-12

- **Authoritative source**: `fishing-game/assets/approved-mock/cast-harbor-composite-base.png`, an existing high-quality AINAN Cast art asset. This does **not** claim a new AI-painted master has been produced.
- **Derivation**: `scripts/art/extract-harbor-approved-master.mjs` deterministically parses approved PNG pixels and writes two transparent parts, preserving all RGBA pixels when recomposited at native dimensions.
- **Parts**: `generated/harbor-aji-master-v2/cast-harbor-water-extracted.png` and `cast-harbor-nonwater-extracted.png`. They remain separable/visible/replaceable, but the nonwater part still contains baked pier/player art and is **not** yet a fully independent final production scene.
- **Use**: `ui.fishingApprovedSplitWaterV2` and `ui.fishingApprovedSplitBaseV2` in the existing `CastPresentationHost` **only** with `?qa=1&castApprovedSplit=1`. Normal production keeps the approved composite and does not preload the experimental textures.
- **Quality gate**: 390×844 real-browser screenshots `64-approved-cast-original.png` and `65-approved-cast-split-preview.png`, with owner/input/texture checks. A perceptually identical result is expected at this stage, not a superior render. Original source and generator remain in GitHub; the generated PNG files are built reproducibly by `qa:pipeline` or `predev`.
- **Next**: mask refinement, independent true harbor and character layers, depth/parallax and fish-friendly water motion, all behind review flags until the Art Direction Bible and live UX gates pass. 9 fish Jump states remain `planned`.

## Harbor foreground region derivation / orientation QA — 2026-10-12

- Source is still **the exact approved Harbor composite** `fishing-game/assets/approved-mock/cast-harbor-composite-base.png` (391×783); there is **no** claim of a new AI-painted environment.
- The versioned generator `scripts/art/extract-harbor-approved-master.mjs` now produces three additional **transparent, position-preserving masks**: `cast-harbor-background-extracted.png`, `cast-harbor-player-region-extracted.png`, and `cast-harbor-pier-region-extracted.png`. Existing water remains a separate PNG. Rendering all four parts in the original coordinate space recomposes the source pixel values.
- Some edges of the player mask still contain background colors and the removed player leaves holes in the backdrop. **Do not move, animate or replace default production art with these masks yet.** The original separate player cutout and native Phaser rod already exist; higher-quality masking/inpainting is the next acceptance gate.
- Preview only with `?qa=1&castApprovedForeground=1`. Manifest refs are `ui.fishingApprovedSplitBackgroundV3`, `ui.fishingApprovedSplitPlayerV3`, `ui.fishingApprovedSplitPierV3`; all three are excluded from normal game preload.
- Real browser evidence: 390×844 `66-approved-foreground-preview.png`; landscape 844×390 `artifacts/orientation/67-landscape-current.png` and `68-landscape-foreground-preview.png`. Landscape is currently a scaled portrait baseline, **not yet true dual-orientation UX**.
- Controls, save format, probabilities and current 1.0.0-rc.3 default visuals remain unchanged.

## Aji / Saba / Kue species-specific Jump pilot — 2026-10-12

- **Source masters:** `fishing-game/assets/generated/hero/fish_hero_aji.svg`, `fish_hero_saba.svg`, `fish_hero_kue.svg` (existing premium species illustrations). Anatomy, colors and existing highlights remain source-authentic; these are **new derivative poses**, not freshly AI-painted fish.
- **Reproducible transformation:** `scripts/art/build-species-jump-pilot.mjs` derives distinct body poses (`fish_jump_{aji,saba,kue}.svg`) **and separately replaceable, transparent** splash FX (`jump_splash_{aji,saba,kue}.svg`). The fish uses the same species body, scaled to keep the approved large hero prominence; FX is a different asset and display node.
- **Runtime contract:** `ASSETS.fishJump` preload; standard Battle hero remains unchanged until `battleState.isRaging`, when `CastPresentationHost` (existing final owner) uses the dedicated leaping artwork. No gameplay timing, hit calculation, probabilities or save format changed.
- **Evidence:** Playwright `73-aji-jump.png`, `74-saba-jump.png`, `75-kue-jump.png`, with real Battle owner and rage-state assertions. Must compare against original Battle/Result art for fish silhouette, scale, clipping and visual consistency before approving the pilot.
- **Incomplete:** Six other species keep `species-specific-jump: planned` until derivative master/individual art is authored and reviewed. This phase does not replace the high-quality Result fish.

## Five more species Jump poses — 2026-10-12

- **Source:** existing source-faithful illustrated heroes `fish_hero_bass.svg`, `fish_hero_buri.svg`, `fish_hero_isaki.svg`, `fish_hero_hirame.svg`, `fish_hero_kanpachi.svg`. Preserve species body contours and colors.
- **Generation:** `scripts/art/build-species-jump-pilot.mjs`, under the same registered pipeline as Aji/Saba/Kue. Each species has its own bend/tilt and lift parameters; fish and water splashes remain independently generated SVG parts (`fish_jump_*.svg` and `jump_splash_*.svg`).
- **Usage:** standard `CastPresentationHost` switches to species Jump only during true `battle.isRaging`; ordinary Battle and Result continue existing high-quality masters. Test `qa=1&qaAction=battle&qaJump=1&qaFish=<id>`.
- **Quality evidence:** real 390×844 screenshots 81–85. Check each versus original fish painting, edges/angles, rope, boss size and tension dock. Asset State Matrix holds a real `species-specific-jump` reference only after runtime + QA.
- **Incomplete:** Madai uses the approved 768×512 painted PNG in the real Battle presentation, while its alternate generic hero SVG is a different quality reference. Do **not** mass-generate a lower-quality Jump from the SVG: this one remains `planned` until a dedicated, style-matched Madai master is authored and reviewed.
- **No gameplay data changes:** fish rates, handling, score, save, Town progression and 1.0.0-rc.3 remain unchanged.

## Policy

- Generated source concepts are never discarded silently; every approved concept gets a managed counterpart or reference entry.
- Runtime code depends on the managed assets under `fishing-game/assets/fishing-field/`, not on a monolithic generated image.
- New generated parts must be added to this provenance table and `asset-definitions.json` before integration.

## Five premium Result hero SVGs (October 2026)

These are separately authored vector production assets using the established 640×360 premium Result hero visual language. They are **not** extracted layers from a single source image, and they do not imply that a separate dedicated jump frame has been produced.

| Species | Production asset | Distinct silhouette or markings |
| --- | --- | --- |
| Black bass | `generated/hero/fish_hero_bass.svg` | Wide mouth, dorsal spikes and dark olive lateral marking |
| Mackerel | `generated/hero/fish_hero_saba.svg` | Narrow silver-blue body and dark dorsal stripes |
| Isaki (grunt) | `generated/hero/fish_hero_isaki.svg` | Golden body and broad vertical bands |
| Flounder | `generated/hero/fish_hero_hirame.svg` | Flattened asymmetrical body, eyes on upper side |
| Kanpachi (amberjack) | `generated/hero/fish_hero_kanpachi.svg` | Streamlined body and gold forehead/lateral line |

All five are registered as `fishHeroes` in `assetManifest.js`, preloaded with the existing GameScene fishHeroes collection, and mapped only to Result's premium fish layer; Battle/collection icons remain unchanged. The five CI Result QA fixtures verify the in-game effect. No catch probabilities or fish mechanics were altered.
