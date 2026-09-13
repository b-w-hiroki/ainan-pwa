# Canonical Fishing Direction

This folder is the visual/design anchor for the current AINAN fishing game. When implementation choices conflict, prefer the rules below over older mockups.

![Canonical fishing direction](./fishing-game-direction.jpg)

## Core interaction

`CAST → RETRIEVE → BITE → BATTLE → CATCH → TOWN`

The main fishing game is not waiting for an automatic bite. The player casts, then gradually retrieves the lure while reading visible fish behavior and deciding when to twitch, slow-reel, or wait.

## Mobile viewport contract

The product surface is always a **single portrait smartphone screen**.

- Canonical logical frame: **390 × 844**.
- The full game frame must fit inside the device visual viewport without horizontal or vertical cropping.
- iPhone safe areas / browser chrome must not hide controls or navigation.
- HUD and touch controls are screen-space UI and never move with the world camera.
- The fishing world may be larger than the phone screen, but only the world scrolls behind the fixed mobile frame.
- Do not solve long casting by making the whole game frame larger or zooming the phone UI out.
- Keep top HUD inside roughly the upper 64 px and primary fishing controls inside roughly the lower 170 px.
- The center band remains the primary water/fish/lure playfield.
- Result cards, tutorials, dialogs, and Town arrival presentation must all fit completely inside the portrait frame.

## Camera

- Keep the gameplay scale readable; do not zoom out just to show the full cast distance.
- The camera follows the lure only when the cast moves beyond the current viewport.
- During retrieve, frame the lure and nearby fish shadows rather than locking hard to the player.
- Bring the camera back toward the player for hit, battle, and catch payoff.
- Camera movement changes the world composition only; fixed HUD must remain stable inside the mobile viewport.

## Composition

- The water is the playfield and must remain visually dominant.
- Player character sits lower-left / lower area and must not block fish reading.
- After a long cast, the player may leave frame; use the small action inset only when needed.
- The diagonal line from player to lure is the main visual/gameplay axis.
- Judge every composition at phone size first. Desktop width is not additional gameplay space.

## Fish readability

Fish behavior is UI. Prefer visible motion over numeric meters:

`cruise → noticed → follow → inspect → biteReady`

The player should be able to read interest from turning, pursuit, wakes, orbiting, and fleeing.

## HUD

Keep active fishing HUD minimal:

- location / essential tackle access
- cast distance / retrieve distance
- `待つ` / `ちょい巻き` / `ゆっくり巻く`
- compact battle escape + reel information

Do not reintroduce Home-like status clutter, large score/time chips, or permanently dominant panels over the water.

## Character use

- Cast: large enough to make the throw satisfying.
- Retrieve: secondary to the water field; short reel reactions only.
- Hit/Battle: character becomes more prominent again.
- Catch: use the full success animation and final front-facing pose before result UI.

## Reward loop

The catch is not the end of the loop. The intended payoff is:

`釣れた → 町へ持ち帰る → NPC/施設/町が反応する → 次の釣りへ`

Town should visibly acknowledge the fish that was just caught before presenting growth/unlock rewards.

## Reference status

The image in this folder is a compact archive reference derived from the fishing concept-art exploration. The interaction and layout rules in this README are authoritative when the older panels differ from the current implementation.
