# AINAN Art Direction Bible v1 — existing game & approved mock first

> **Scope:** visual quality baseline for the P0 material-remake workflow. This does **not** approve any new AI image, replace a runtime texture, change controls, or promote RC3. Baseline: main `c9dd78d85dc3ccbeefd0fac9e4e3a85769fec655` (2026-10-12). Machine-readable companion: [art-direction-contract.json](art-direction-contract.json).

## 0. Authority and disagreements

1. **Composition, play and camera:** [canonical fishing direction README](../concept-art/canonical/README.md) (primary source of game intent). The two compressed JPEGs in that folder are layout/art references, **not** enough to judge current final texture quality in isolation.
2. **Currently accepted in-game quality:** approved production images in `fishing-game/assets/approved-mock/`, plus **fresh, commit-matched 390×844 runtime captures** (see `golden-screens.json`).
3. **Current implementation & input truth:** `CastPresentationHost`, `installFishingRuntime.js`, `assetManifest.js`, `visual-owners.json`. Layout mock images must not override actual slingshot input or the current active drawing owner.
4. **Reusable production workflow:** private Studio Playbook `docs/ASSET-PIPELINE.md` and `docs/GENRE-ASSET-STRATEGIES.md`, applied as a 2.5D fishing workflow, without changing this game's established visual language.

**Precedence:** active gameplay contracts → canonical composition/readability → approved in-game art quality → new candidate. Do not allow a prettier stand-alone render to reduce playability or drift from the established look.

## 1. What current AINAN actually looks like

The October 2026 screenshots were reviewed at 390×844, especially the real Cast/Retrieve/Battle/Result and three-location Battle captures.

| Element | Keep from the live game | What can improve without changing direction |
| --- | --- | --- |
| **WORLD: seawater & harbor** | Strong turquoise→deep-cyan sea, high-frequency sunlight glints and convincing water depth; recognizable pier, boats and shore; bright open atmosphere. | Recover camera-compatible depth and parallax with sky/distance/water/land/foreground as **independent layers**. Keep glints subordinate to fish silhouette and lure. |
| **PLAYER** | Warm orange outfit, readable hand-drawn/anime silhouette, cap, rod and dynamic pose, shading consistent with lively sea. Character supports fishing; does not dominate the water. | Stable body/rod pivots across wind-up, release, reel, resist, joy and fail; cleaner sprite edges at phone scale, unified light direction. |
| **FISH** | Species silhouette, premium-sized Battle/Result fish, clear fish identification even without labels. `madai-approved-live` and current hero art are **references**, not all equally polished. | Richer controlled highlights, depth and fins on flatter SVG fish **within the same existing illustrated style**; avoid photoreal paste-in and simple recolors. Add dedicated species motion only after visual consistency review. |
| **UI** | Compact light-blue/white HUD and glossy blue/gold dock/actions, high contrast and immediate tap affordance. | Keep live labels and hit areas separate; use design-system spacing and high-res text to improve clarity. No reintroduction of large old controls over water. |
| **FX** | Lively white water rings, splashes and restrained golden success highlights; clear `GET!` reward moment. | Separate independent ripple/foam/glow layers; time them to cast, hook, Battle and catch instead of permanently covering the sea. |
| **TOWN** | Existing town-stage artwork, identifiable NPCs and facility growth stages connected to fishing progression. | Rebuild facilities as replaceable parts, ensure recent catch causes visible NPC/market/diner acknowledgement before the next trip. |

Do not reinterpret this as “uniform flat-vector art” or “realistic photo collage.” The approved art direction is a **single cohesive mobile game** combining luminous stylized water, illustrated characters/fish and refined game-interface surfaces. Inconsistency is a targeted defect, not permission to replace every good element.

## 2. Phase composition contract (390×844)

- **Cast:** lower-left bank/character → upper-right landing target, with the fishing space dominant. Keep left-bottom swipe/pull-release casting. The rod, line and aiming arc are distinct; the dock remains within the portrait viewport. The accepted reference is `46-mock-cast.png`.
- **Retrieve:** emphasize lure, nearby shadows, turning/following/bite behaviors. Put the 3 touch actions in a dedicated lower area; no instruction panel over the central sea. Reference: `47-mock-retrieve.png`.
- **HIT:** the moment of contact is instantly readable via short motion, water FX and reaction; old overlays never remain after state transition. Reference: appropriate `36-player-hit.png` flow capture.
- **Battle:** fish occupies the main hero area; water + tension + line visible; the character is secondary. Maintain the corrected foreground ordering and rotated-fish margins from PR #107/#109. References: `48-mock-battle.png`, `58`–`60` location Battle frames.
- **Result:** GET → hero fish → name/size/points → town/retry. Never obscure the fish with a duplicate held fish or hide labels behind art. Reference: `49-mock-result.png` plus named Result 50–54 and late 56/57 captures.
- **Town:** distinct growth states and quick route back to fishing. Evidence: `05-town-lv1.png` and `07-town-lv5.png`.

**Fixed mobile frame:** HUD roughly top 64 px; active action dock roughly lower 170 px; camera pans the world only. Keep safe areas clear. Review 390×844 first and also 320×568, 430×932 and 844×390 as applicable. Tap targets aim for at least 44 px without reducing fishing visibility.

## 3. Approved asset anchors & their roles

Keep the following production assets available throughout transition:

- `ui.fishingApprovedCastHarborBase`: existing approved bright-water / waterfront **composition and quality anchor**, not the new final layered export.
- `ui.fishingApprovedRetrievePanel`: lure-fish-water visual relationship.
- `ui.fishingApprovedCleanHarbor`: reflective battle water and depth.
- `ui.fishingApprovedCastPlayerVisible`: actor's recognizable silhouette/costume/shading.
- `ui.fishingApprovedResultBase` and `ui.fishingApprovedCastRing`: glossy reward / action frame quality.
- `ui.fishingApprovedMadaiLive`: dimensional fish painting reference; **do not blindly copy its shape to other species**.
- `fishHeroes.aji`: current working hero texture, useful for a before/after comparison; flatter parts may warrant improvement.

Machine-readable asset keys, explicit reference roles and screenshot IDs live in `art-direction-contract.json`. Do not hard-code new colors to match JPEG compression artifacts; derive candidate palette from actual lossless production art.

## 4. Master artwork and layer contract

**First vertical slice:** Harbor × Aji — Cast → Retrieve → HIT → Battle → Result → Town.

Create an approved layered master **at identical camera/lighting/perspective**. Group into:

1. WORLD — sky, cloud, distant shore/buildings, sea base, wave highlights, sea depth, pier/land, props and weather overlays. Keep camera-parallax and fixed-screen elements distinct.
2. PLAYER — root/body, face/arms where animated, held rod, fishing line, cast poses, retrieve, resist, success and failure.
3. FISH — small/medium/large underwater silhouette, turning and pursuit, HIT, body/fins/tail, Battle/Jump/Result hero, collection icon.
4. UI — HUD surface, Cast/three Retrieve actions, tension, Result card and CTA *skin*; live text, labels and input hit regions remain code-rendered.
5. FX — independent splash/ripple/wake/glow/rarity beats with timing/alpha and reduced-motion fallback.
6. TOWN — background growth tiers, market, diner, NPC reactions, facilities and growth indicators.

**Every asset brief** records `family / assetId / source master / state / view & camera / light direction / palette / proportions / transparent margin / pivot / dimensions / depth owner / manifest ref / source license and generation process / QA screenshots`. Reuse the same view/pivot/shading rules for state variations. Preserve source masters and processing history in git or documented archival source; never leave the only master in a temporary working folder.

## 5. Migration and non-regression gates

1. **No unverified mass replacement:** keep current approved sprites active while candidates are produced. Track `concept → source → normalized → manifested → integrated → browser-reviewed → pr-green → merged` separately from `asset / procedural / planned` state kind.
2. **Asset contract:** one final owner per visual slot; no second full-screen overlay. Use `assetManifest.js`, preload and GameScene's actual state. Record the provenance and the old→new mapping.
3. **Visual review:** side-by-side **approved intended mock / current commit-matched runtime / candidate runtime** at 390×844. Review color/lighting/perspective, readability, main-subject scale, clipping, overlap, edge quality, player/fish relation and CTA hierarchy. No automatic approval just because PNG size/hash changes or CI passes.
4. **Input and feel:** real Cast pull, retrieve choices, HIT/Battle, Result→Town→new trip, camera movement, duplicate listeners and touch targets. Do not edit probability, economy, save format or RC3 version in the art PR.
5. **Release QA:** `npm run qa:pipeline` → relevant smoke → `npm run build` → Playwright 390×844 captures and visible-pixel guard → PR CI → **manual screenshot comparison** → merge. Physical iPhone release gate remains issue #27.
6. **Reject candidate if:** generic/unrelated AI aesthetics, blurred water/fish, muted current sea, off-model player, uniformly recolored fish, missing independent parts, monolithic screen art, changed tap target, unreadable UI, fish clipping or malformed Result. Revert candidate while retaining prior approved asset.

## 6. Current evaluation and next slice

- **Pass / retain:** current luminous Harbor water; approved blue/gold control styling; Result visual hierarchy after PR #106; Battle fish foreground and screen-margin fixes from PR #107/#109.
- **Targeted visual risk:** some newer hero-fish SVG surfaces read flatter than the polished water and `madai-approved-live`. Improve their volume **without changing fish anatomy/identity or overall style**. This is a review observation, not a claim that new frames exist.
- **Not built yet:** new layered masters, fully authored species Jump frames for 9 species, new Aji/Habor replacement assets, fish-specific Town reactions. These remain future slices under #110/#108.
- **This document's Done:** intent and visual anchors are pinned in the repository and validated by pipeline smoke; no runtime image is replaced. Next PR should perform the actual layered master / migration inventory and a **real screenshot comparison** before claiming any new artwork is production-ready.

See [GOLDEN_SCREEN_RULES.md](GOLDEN_SCREEN_RULES.md), [ASSET_PIPELINE.md](ASSET_PIPELINE.md), [Visual Owner Registry](VISUAL_OWNER_REGISTRY.md), and the [source provenance](../art-spec/GENERATED_ASSET_PROVENANCE.md).
