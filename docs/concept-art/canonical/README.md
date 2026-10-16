# Canonical Fishing Direction

This folder is the visual/design anchor for the current AINAN fishing game. When implementation choices conflict, prefer the rules below over older mockups.

![Canonical fishing direction](./fishing-game-direction.jpg)

## Mobile fishing UI blueprint

Use this screen-flow / layout blueprint as the implementation target for the fishing vertical slice:

![Mobile fishing UI blueprint](./mobile-fishing-ui-blueprint.jpg)

The blueprint is intentionally stronger on **screen composition and interaction hierarchy** than on final art direction. Keep the water as the dominant playfield and the character secondary during active fishing. The 390×844 portrait remains the approved first-priority layout baseline, while true landscape layout is a separately reviewed target, not a scaled portrait screenshot.

## Core interaction

`CAST → RETRIEVE → BITE → BATTLE → CATCH → TOWN`

The main fishing game is not waiting for an automatic bite. The player casts, then gradually retrieves the lure while reading visible fish behavior and deciding when to twitch, slow-reel, or wait.

## Primary rule: the fishing playfield owns the screen

The fishing character is **not the main subject during active fishing**. The character is an animation/presentation element that supports the action.

- The majority of the phone screen belongs to **water, fish shadows, lure, line, wakes, and the fish/lure relationship**.
- Never enlarge the character at the expense of readable fishing space.
- During Retrieve, the character should be small and peripheral, and may leave the viewport during long casts.
- During Bite and Battle, the fish/lure/line relationship still has visual priority over the character.
- Character prominence is reserved for short beats: cast motion, hook reaction, catch celebration, and result payoff.
- If there is a conflict between showing the character and making the fishing interaction easier to read, **choose gameplay readability**.

## Mobile viewport contract

The product surface is a **single viewport in portrait and landscape smartphone orientations**, never split-screen. Portrait 390×844 remains the canonical current production baseline; landscape 844×390 / 932×430 is **QA-only until separate visual, interaction, and production approval**.

- Canonical logical frame: **390 × 844**.
- The active portrait **or** landscape composition must fit its own visual viewport without horizontal/vertical cropping or forced shrinking of the portrait interface.
- iPhone safe areas / browser chrome must not hide controls or navigation.
- HUD and touch controls are screen-space UI and never move with the world camera.
- The fishing world may be larger than the phone screen, but only the world scrolls behind the fixed mobile frame.
- Do not solve long casting by making the whole game frame larger or zooming the phone UI out.
- In portrait, keep the top HUD inside roughly the upper 64 px and the primary fishing controls inside roughly the lower 170 px. Landscape requires separate native layout/controls with >=44 CSS px hit areas and safe-area margins; never uniformly scale portrait UI to fit.
- The center band remains the primary water/fish/lure playfield and should occupy the clear majority of the screen.
- Result cards, tutorials, dialogs, and Town arrival must fit in the active portrait or landscape viewport, with readable type and non-overlapping controls.

## Camera

- Keep the gameplay scale readable; do not zoom out just to show the full cast distance.
- At release the camera transfers attention from the rod tip toward the flying lure; it must keep following the lure even when the original viewport would have lost it, revealing additional ocean rather than stretching the initial frame.
- During retrieve, frame the lure and nearby fish shadows rather than locking hard to the player.
- During Battle, frame fish + line + water first; the player is supporting context.
- At splash, settle the view around landing; through retrieve keep lure/fish readable, then transition toward the player mainly for catch payoff without a camera jump.
- Camera movement changes the world composition only; fixed HUD must remain stable inside the mobile viewport.

## Composition

- The water is the playfield and must remain visually dominant.
- Player character stays at the edge/lower area when visible and must not block fish reading.
- After a long cast, the player may leave frame; that is acceptable.
- Do not use a permanent split screen or character panel during ordinary fishing.
- The diagonal line from player/rod direction to lure is a supporting visual axis, not a reason to center the character.
- Judge every composition at true phone size first: portrait and native landscape have separate world/UI layouts. Desktop width is not extra gameplay space.

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

- Cast: visible enough to sell the throw, but still secondary to the intended landing area.
- Retrieve: small supporting actor; water/fish/lure dominate.
- Bite: remain small so the bite itself is readable.
- Battle: slightly more visible, but fish + line + water remain primary.
- Catch: use the full success animation and final front-facing pose as the short hero payoff.

Current implementation target scale relative to the original character presentation:

- Cast: about **78%**
- Retrieve: about **34%**
- Bite/HIT: about **40%**
- Battle: about **56%**
- Catch celebration: about **96%**

These values are tuning references, not reasons to sacrifice playfield readability.

## Reward loop

The catch is not the end of the loop. The intended payoff is:

`釣れた → 町へ持ち帰る → NPC/施設/町が反応する → 次の釣りへ`

Town should visibly acknowledge the fish that was just caught before presenting growth/unlock rewards.

## Reference status

The images in this folder are historical composition references. New artwork must also meet [the full rebuild contract](../../pipeline/art-rebuild-v2-contract.json) and the latest [parent Issue #216](https://github.com/b-w-hiroki/ainan-pwa/issues/216); existing art remains as rollback until replacements are visually approved and actually integrated. Current main controls/save are authoritative and no QA-only screenshot approves release.