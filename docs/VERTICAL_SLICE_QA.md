# AINAN Vertical Slice 1.0 — 5-run QA

Use this after the automated smoke QA passes.

## QA mode

Open the fishing game with `?qa=1` appended to the URL.

QA mode is opt-in only and does not appear in normal play. A fixed strip shows:

- current phase
- rod preset
- current lure distance and range band
- retrieve decision count
- target fish / interest state
- battle calm/rage state and escape/reel values

The first-row `近 / 中 / 遠` buttons restart the fishing scene with:

- 近: 汐風港 + 初心者竿 + standard bait
- 中: 汐風港 + カーボン竿 + standard bait
- 遠: 汐風港 + 高級竿 + standard bait

The second row accelerates failure/success routing checks:

- `HITミス`: while in RETRIEVE/WAIT, force the hook-miss recovery path and verify it returns to CAST.
- `逃走`: while in BATTLE, force the escaped result and verify only the retry CTA is available.
- `釣果GET`: force a caught result, then use the real `町へ持ち帰る` CTA to verify Town arrival.

These QA controls do not appear in normal play. Range presets do not write equipment selection to persistent progress.

## Run 1 — near cast

1. Press `近`.
2. Use a weak-to-medium cast.
3. Confirm the landing stays in the near band.
4. Confirm the character shrinks after landing.
5. Confirm `待つ / ちょい巻き / ゆっくり` are visible.
6. Confirm a fish must be influenced by at least two meaningful retrieve decisions before bite.

Pass when:

- lure and fish shadows are easy to identify
- character does not cover the interaction area
- fish response is readable from turn / pursuit / wake / orbit rather than a numeric meter

## Run 2 — mid cast

1. Press `中`.
2. Cast around the middle of the power cycle.
3. Confirm the QA distance reads roughly the mid band.
4. Use at least two different retrieve decisions.
5. Confirm the fish visibly changes behavior before bite.

Pass when:

- the chosen action visibly changes fish response
- repeated blind input is not always optimal
- bite is causally connected to the retrieve action

## Run 3 — long cast / camera follow

1. Press `遠`.
2. Make a strong cast toward open water.
3. Confirm the lure moves beyond the initial viewport.
4. Confirm the camera follows the lure without zooming the entire scene out.
5. During retrieve, confirm the camera returns gradually as the lure comes back.

Pass when:

- lure and nearby fish remain readable at long range
- player may leave the viewport without breaking line/lure readability
- no camera snap or large zoom-out occurs

## Run 4 — hook miss / retry

Natural path:

1. Reach `ぐんっ！ / HIT`.
2. Intentionally do not tap within the hook window.
3. Confirm the miss resolves cleanly.
4. Confirm the scene returns to CAST and accepts the very next press.

Fast QA path:

1. Reach RETRIEVE.
2. Press `HITミス`.
3. Confirm the same recovery path returns to CAST.

Pass when:

- no dead input remains after miss
- fish returns to normal behavior
- camera returns to cast composition
- retry does not require an unexplained extra tap

## Run 5 — catch / result / Town

Natural path:

1. Hook a fish successfully.
2. In Battle, swipe only while calm.
3. When the fish rages, stop and wait.
4. Catch the fish.

Fast QA path:

1. Press `釣果GET` to force a successful catch result.
2. Wait for the catch animation/result handoff.

Then for either path:

1. Confirm the catch animation finishes before the result card.
2. Confirm the result screen only moves through explicit buttons.
3. Press `町へ持ち帰る`.
4. Confirm Town receives fish name, size, points and rarity reaction.

Also verify failure routing once:

1. Enter BATTLE.
2. Press `逃走`.
3. Confirm success-only `町へ持ち帰る / 図鑑` controls are hidden and only explicit retry remains.

Pass when:

- Battle feels like continuation of the same water scene
- result does not silently reset on background tap
- escaped result cannot accidentally route to Town
- `町へ持ち帰る` is the clear primary success route
- Town arrival feels like payoff for the catch

## Vertical Slice 1.0 completion gate

Mark the slice complete only when all five runs pass without:

- progression blockers
- dead input
- missing assets
- camera discontinuity
- unreadable lure/fish relationship
- accidental result navigation

Automated smoke QA remains a build gate, but it does not replace this visual/interaction pass.
