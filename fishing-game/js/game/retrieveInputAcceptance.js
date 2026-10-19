// Presentation observes the state transition after gameplay handles an input.
// Rejected input (landing delay, cooldown, missing bait, duplicate hold) must
// not create a success cue or advance a visual-only action.
export function castLaunched(scene, wasVisible = false) {
  return !wasVisible && Boolean(scene.bobber?.visible)
}

export function twitchStarted(scene, beforeUntil = 0) {
  return scene.phase === 'retrieve'
    && scene.retrieveState?.action === 'twitch'
    && (scene.retrieveState.twitchUntil ?? 0) > beforeUntil
}

export function slowRetrieveStarted(scene, wasHeld = false) {
  return scene.phase === 'retrieve'
    && Boolean(scene.retrieveState?.slowHeld)
    && !wasHeld
}
