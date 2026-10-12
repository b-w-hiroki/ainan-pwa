# AINAN Asset Migration Inventory v2

> **Status: inventory created, no new art generated/installed.** Complete manifest coverage is not the same as complete *visual evaluation*. Visual authority: [ART_DIRECTION_BIBLE.md](ART_DIRECTION_BIBLE.md).

## Why a second register exists

- `assetManifest.js`: active ready asset **paths/keys** and file existence, source of production truth.
- `asset-states.json`: gameplay/presentation states, independently tagged **asset / procedural / planned**. In particular all nine `species-specific-jump` states are still planned.
- `asset-migration-inventory.json`: **185 existing production assets** and replacement progress. It contains **manifest keys only**, never duplicate paths. A planned AI replacement cannot silently turn an existing `ready` production record into "remade".
- `art-direction-contract.json`: approved appearance references, comparative screens and blocked regressions.
- `visual-owners.json`: one active owner per visible slot. New artwork does not justify another wrapper or full-screen overlay.

The migration record is a planning/QA layer, not a second asset manifest. Changes to an asset's production path or preload must still happen in code and pass real browser QA.

## Baseline audit coverage

At main `9ee799d87e7ce7f3efe0976b4681479d7c7f0798`, all **185** ready manifest assets are represented across **12** manifest groups:

| Group | Count | Primary evaluation |
| --- | ---: | --- |
| backgrounds | 9 | WORLD / existing Town backgrounds |
| characters | 30 | PLAYER animation/rod pivots; NPCs in TOWN |
| facilities | 6 | TOWN standalone structures |
| facilityLevels | 12 | TOWN progression-state artwork |
| fish | 14 | Fish collection icons and gameplay parts |
| fishHeroes | 9 | Premium Battle and Result fishes, species consistency |
| fishingField | 24 | WORLD water/rock, lure, fish shadow and FX |
| bosses | 3 | Large fish/Boss artwork |
| rewards | 3 | Reward/collection UI |
| equipment | 12 | Rod/bait presentation |
| gameplayFx | 5 | Battle/Result feedback and status texture |
| ui | 58 | HUD, actions, approved-mock, reusable skin |
| **Total** | **185** | All active refs covered automatically |

**Current decisions (not completed rebuilds):**

- **12 reference-protected:** approved quality/composite art that must stay until a better *verified* replacement exists. Some of these are current screens, others are paint/style references; keep provenance.
- **69 remake-candidate:** priority parts/families for next master/layer/state production. `candidateStage: not-started` means *nothing has been regenerated or integrated yet*.
- **104 audit-required:** needs screenshot/source/owner review before any reuse/remake decision; do not batch erase unfamiliar game content.

Across visual families: world 18, player 40, fish 30, ui 61, fx 9, town 27. These are **migration ownership labels**, not an assertion that the manifest groups map one-to-one to visual slots.

## Migration status rules

`treatment` indicates **what to do with the old production asset**:

- `reference-protected`: retain existing approved-quality source/implementation. This status cannot be promoted by marking a new image finished.
- `remake-candidate`: planned for independent-parts master production; **old production remains active**.
- `audit-required`: not yet rated or classified individually. It remains active and must not be deleted.
- `reuse-verified`: reviewed and intentionally reused; requires linked review evidence.
- `superseded`: replaced by a merged, browser-verified production manifest entry, with replacementRef and evidence.

`candidateStage` is a **separate** ordered process:

`not-started → master → normalized → manifested → integrated → browser-reviewed → pr-green → merged`.

- `master`: source art + generation brief and provenance committed to versioned storage.
- `normalized`: actual independent transparent parts, pivots and output format verified.
- `manifested`: production asset registered/preloaded. Does **not** imply anything appeared on screen.
- `integrated`: correct game event/phase/owner uses the asset, not a QA-only overlay.
- `browser-reviewed`: 390×844 screenshot compared to approved mock/current runtime, with visual evidence and real loop tested.
- `pr-green` / `merged`: build, relevant smoke, browser QA and CI passed; exact branch/PR committed.
- No physical-iPhone completion is inferred: release Issue #27 is separate.

## Order of work

1. **Harbor × Aji baseline**: inspect active approved composite, create quality-matched 2.5D layered master (sky/harbor/land/water/character/rod/line/fish/FX/UI/Town).
2. **One phase at a time**: Cast → Retrieve → HIT → Battle → Result → Town. Produce only state variants required by actual gameplay; keep the old art as a fallback until screenshot review.
3. **One species family at a time**: Aji first, then Saba and Kue to exercise medium/large/Boss silhouettes, then remaining six. Each missing dedicated Jump starts as `planned` in the state matrix.
4. **One location at a time**: Harbor → Bay → Cape, with stable lighting/perspective and distinct water/atmosphere.
5. **QA and owner**: check `CastPresentationHost` and `installFishingRuntime.js`, `qa:pipeline`, `build`, mobile E2E, real screenshots (390×844 plus small/large viewports), no old-owner input leaks.

## Updating the register correctly

For each selected candidate:
1. Record the current asset reference, its on-screen phase/slot, reference mock and real screenshot.
2. Add `sourceMaster` (Git-tracked source), new master/part provenance, and source→normalized mapping.
3. Introduce the new manifest ref in a scoped PR; do not overwrite/remove an approved baseline prematurely.
4. Connect to actual gameplay state and display owner, then set `reviewEvidence` (committed report/CI artifact link).
5. Promote a stage only when evidence exists; `superseded` only after merged and visual checked. Update `asset-states.json` with *actual* gameplay availability.

`scripts/asset-migration-contract-smoke.mjs` runs under `npm run qa:pipeline`. It fails on manifest assets missing from this register, orphan entries, premature supersession, disappearing protected references and stage promotion without evidence. It validates integrity, **not the visual quality of the pixels**.

## Approved foreground pilot and orientation scope

Following the source-derived water/base split, three new foreground segmentation parts were added under the approved Harbor master generator (background, player region, pier region). All are QA-only `manifested` candidates; the initial inventory baseline was 185 refs and grows as registered experiment parts are added. The pixel-perfect master reconstruction is verified; the derived player region is **not** a motion-ready cutout and the occluded backdrop is **not** yet inpainted.

Real browser QA now covers the unchanged portrait field and the 844×390 letterboxed landscape baseline. This does not yet deliver portrait/landscape reflow; see [ORIENTATION_AND_LAYER_PLAN.md](ORIENTATION_AND_LAYER_PLAN.md).

## Next vertical slice and release constraint

**Next PR:** first candidate source master and independent part export for Harbor × Aji, connected to the active presentation owner and backed by before/after phone captures. No global rewrite, no balance/save/input changes and no `1.0.0` promotion before physical iPhone QA #27. Manage broader visual and town-work tasks in #110 and #108.
