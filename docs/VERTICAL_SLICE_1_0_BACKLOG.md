# AINAN Vertical Slice 1.0 Backlog

## Goal

Complete one fishing run so it is understandable, controllable, and repeatable without explanation:

`MAP → CAST → RETRIEVE → BITE → BATTLE → CATCH → RESULT → TOWN`

The current priority is not feature breadth. Stop expanding Town and secondary systems until this loop is playable.

## Definition of Done

Vertical Slice 1.0 is complete when all of the following are true:

- A first-time player can finish one catch without external explanation.
- The player can clearly identify the lure, nearby fish shadows, and fish reactions.
- Retrieve requires deliberate player input; fish do not simply auto-bite after casting.
- `待つ / ちょい巻き / ゆっくり巻く` have visibly different consequences.
- The camera follows long casts without zooming the entire scene out.
- The character supports the action without blocking the water playfield.
- Bite → Battle → Catch transitions do not feel like unrelated screens.
- Result → Town provides a clear payoff and return path.
- Five consecutive fishing runs can be completed without a progression-blocking bug.

## P0 — Must finish before adding more features

### P0-01 Retrieve playfield composition

Status: **IMPLEMENTED — SCREEN QA REQUIRED**

- Cast phase: character can be large enough for the throw to feel good.
- Retrieve phase: character shrinks to roughly 50–60% of cast size.
- Water, lure, and fish shadows become the main visual hierarchy.
- Bite prelude keeps the character secondary.
- Battle increases character presence again.
- Catch restores a large hero presentation.
- Retrieve distance label means **remaining line distance**, not initial cast distance.

Acceptance:
- At normal/near cast range, the character does not cover the target fish/lure interaction zone.
- At long range, the camera can leave the character off-screen without changing gameplay scale.

### P0-02 Retrieve must require player decisions

Status: **IMPLEMENTED — PLAY QA REQUIRED**

- Prevent immediate/automatic bite after landing.
- Typical common fish should require at least 2 meaningful retrieve decisions before bite readiness.
- `待つ`, `ちょい巻き`, `ゆっくり巻く` must create different interest changes.
- Overworking the lure can cause hesitation or flee behavior.

Acceptance:
- Repeating one action blindly is noticeably worse for at least some fish.
- Fish behavior visibly communicates whether the choice helped.

### P0-03 Fish behavior readability

Status: **PARTIAL**

- Cruise → noticed → follow → inspect → biteReady is readable primarily from motion.
- Use turn, pursuit, wake, orbit, pause, and flee before adding more numeric UI.
- Reaction text/symbols are secondary support only.

Acceptance:
- A player can point to the fish currently interested in the lure without reading a meter.

### P0-04 Bite / hook transition

Status: **PARTIAL — LARGE OVERLAY REMOVED**

- Retrieve remains visually continuous into bite.
- Fish approaches lure → brief hesitation → water/bobber cue → `ちょん` → `ぐんっ！` → hook input.
- Remove any large overlay that obscures the lure/fish relationship.

Acceptance:
- It is obvious what just caused the bite.
- Hook timing is understandable on the first session.

### P0-05 Battle continuity

Status: TODO

- Keep the same water/character scene rather than feeling like a separate minigame screen.
- Only escape/tension, reel action, and immediate instructions stay prominent.
- Ensure failure and success both resolve cleanly.

Acceptance:
- Battle can be completed without hidden rules.

### P0-06 Catch → Town payoff

Status: PARTIAL

- Catch animation → result → `町へ持ち帰る` → town catch arrival.
- Town arrival reacts to fish rarity and catch details.
- Do not add more Town systems until the fishing loop passes P0 QA.

### P0-07 Five-run QA

Status: TODO

Run five consecutive catches covering:

1. near cast
2. mid cast
3. long cast
4. bite miss / retry
5. successful catch → Town

Record any blocker, unreadable interaction, or dead-end as P0.

## P1 — Only after P0 passes

- Stronger species-specific retrieve personalities.
- Better depth/range fish ecology.
- More environment effects.
- More sophisticated Town reactions.
- Economy/balance tuning.
- Additional content and progression.

## Direction anchor

For any visual/design conflict, follow:

`docs/concept-art/canonical/README.md`

Core rule: **the water is the playfield; character animation supports it rather than replacing it.**
