# Character motion integration v1

Local-only integration based on separated character assets v2 (`a8fba41`) and the approved four-state prototype (`5511072`). Production publishing is intentionally out of scope.

## Event contract

| Gameplay state/event | Visual action | Completion/interruption |
|---|---|---|
| Cast input accepted; press remains held | `idle → castMid → castWindup` | Holds on wind-up. Pointer cancellation returns through the ordinary Cast state. |
| Accepted cast input released | `castMid → castRelease → follow-through → idle` | Duplicate cast input is rejected while the cast trajectory is active. Bait consumption and trajectory calculation remain in gameplay code. |
| `phase === battle` | `fightLeft → fightMid → fightRight → fightMid` | Loops until phase changes. Result, scene exit, or cleanup cancels the loop token. |
| `outcome === caught` after result commit | `joyLift → joyMid → joyHold → joyMid → idle` | Fish image is a separate species-aware layer. Score, catch record, reward, and save are already committed before playback. |
| `outcome === escaped` after result commit | `sadDrop → sadMid → sadSlump → sadMid → idle` | Rod lowers with a short loose line; retry starts a new controller at idle. |

## Asset and anchor ledger

- Character frames: transparent PNG, 320 × 420.
- Shared seated/foot pivot: `(160, 400)`.
- Runtime design canvas: 390 × 844; character frame centered at `(101, 670)`, displayed at 218 × 286.
- Character, approved separated rod PNG, line graphics, and species fish are independent layers.
- Rod origin uses source grip `(130,515)`, source tip `(169,379)`. Per-pose rotation and scale map those points to the frame grip/tip anchors in `CharacterMotionController.js`.
- Normal transitions use authored in-betweens with only a 55–70 ms texture dissolve. Reduced-motion uses a static representative pose and abbreviated return to idle.

## Failure and lifecycle behavior

- A monotonically increasing token cancels stale delayed frames on interruption/retry.
- Scene shutdown destroys timers, tweens, layers, and input listeners.
- Resize/orientation is inherited from the 390 × 844 presentation root and does not change the shared frame pivot.
- If any required motion texture fails, the controller remains disabled and the existing approved player presentation remains visible.
- Presentation code contains no bait/ST, collision, score, reward, catch-history, or save mutations.

## Verification

- `npm run qa:character-motion`
- `node scripts/character-motion-browser-qa.mjs` while the local Vite server is running on the configured QA URL.
- Full `npm run build`, including all regression QA, TypeScript, Vite, and PWA generation.

Browser QA covers visible cast press/release, fight loop, caught/escaped results, interruption/back, duplicate input, retry, portrait/landscape resize, reduced-motion, and one missing-texture fallback. This is not physical-iPhone acceptance.
