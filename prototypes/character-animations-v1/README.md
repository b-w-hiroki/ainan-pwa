# AINAN character animation prototype v1

Approved character separation v2 (`a8fba41`) is preserved. This isolated prototype adds four playable motion studies without replacing production assets.

## Run

Serve the repository root and open `prototypes/character-animations-v1/preview.html`. The page provides state selection, play/pause/restart, optional one-shot looping, and 0.5×/1×/1.5× speed.

## Contract and timing

- Design frame: 320 × 420 transparent PNG.
- Shared seated/foot pivot: `(160, 400)`.
- CSS placement in the approved 390 × 844 scene: actor width 250 px, pivot at approximately `(195, 700)`.
- Rod and fishing line are an independent SVG layer. The caught fish is an independent project-owned SVG layer.
- Cast: 1420 ms one-shot; fight: 920 ms loop; joy: 1780 ms one-shot; escape sadness: 1920 ms one-shot. The exact phase ledger and grip/tip anchors are in `animation-manifest.json`.
- One-shots explicitly return to `idle`; switching state or restarting invalidates the prior run token; repeated Play while running is ignored.

## Proposed game event hookup

| Existing/game event | Prototype state | Policy |
|---|---|---|
| cast input accepted / `CASTING` entered | `cast` | Play once; lock duplicate input until cast gameplay state advances. |
| fish tension active / reel resistance | `fight` | Loop while tension is active; stop on catch, escape, pause, or scene exit. |
| catch result committed | `joy` | Play once after result data is fixed, then return to idle/result UI. |
| escape/fail result committed | `sad` | Play once, then return to idle/retry UI. |

Integration should call `selectState()` followed by `play()`, or lift the same token-cancellation rules into the game scene. A new event interrupts the prior visual run safely; retry starts a fresh token.

## Fidelity gaps before production hookup

- These are high-fidelity prototype poses generated from the approved character, not a final hand-redrawn animation sheet. Fine line weight and face construction vary slightly between states.
- Motion uses pose cross-fades plus 2 px/0.5° follow-through. Final production should add 1–2 hand-authored in-betweens per transition.
- The rod is a separate vector proxy so grip/tip continuity can be tuned; the final rod texture should replace it after anchor sign-off.
- Joy intentionally overlays an existing project fish asset separately. Its scale should be set from the actual caught species.
- Browser QA is not physical-iPhone acceptance; vibration remains outside this prototype and must stay a safe no-op where unsupported.
