import { installPlayerAnimations } from './installPlayerAnimations.js'
import { installRetrieveGameplay } from './installRetrieveGameplay.js'
import { installRetrievePolish } from './installRetrievePolish.js'
import { installRetrieveFeedback } from './installRetrieveFeedback.js'
import { installRetrieveTutorial } from './installRetrieveTutorial.js'
import { installCastZoneFish } from './installCastZoneFish.js'
import { installRetrieveWorldFx } from './installRetrieveWorldFx.js'
import { installBiteCameraFeedback } from './installBiteCameraFeedback.js'
import { installTackleSync } from './installTackleSync.js'
import { installRetrieveCompletion } from './installRetrieveCompletion.js'
import { installFishingVisualTuning } from './installFishingVisualTuning.js'
import { installFishFieldDensity } from './installFishFieldDensity.js'
import { installRetrieveLandingBeat } from './installRetrieveLandingBeat.js'
import { installMinimalFishingHud } from './installMinimalFishingHud.js'
import { installVerticalSliceLayout } from './installVerticalSliceLayout.js'
import { installVerticalSliceAgency } from './installVerticalSliceAgency.js'
import { installVerticalSliceFishReadability } from './installVerticalSliceFishReadability.js'
import { installVerticalSliceBattleContinuity } from './installVerticalSliceBattleContinuity.js'
import { installVerticalSliceResultRouting } from './installVerticalSliceResultRouting.js'
import { installVerticalSliceHookInput } from './installVerticalSliceHookInput.js'
import { installVerticalSliceQaMode } from './installVerticalSliceQaMode.js'
import { installMobileFishingShell } from './installMobileFishingShell.js'
import { installBlueprintFishingField } from './installBlueprintFishingField.js'
import { installFishingFieldMotionFx } from './installFishingFieldMotionFx.js'
import { installCastFishStaging } from './installCastFishStaging.js'
import { installFishingBiteHitPresentation } from './installFishingBiteHitPresentation.js'
import { installFishingBattlePresentation } from './installFishingBattlePresentation.js'
import { installFishingResultPresentation } from './installFishingResultPresentation.js'
import { installFishingVisualUpgrade } from './installFishingVisualUpgrade.js'
import { installFishingPresentationGuard } from './installFishingPresentationGuard.js'
import { installStaminaSessionGate } from './installStaminaSessionGate.js'
import { installMidgameProgression } from './installMidgameProgression.js'
import { installEnvironmentPresentation } from './installEnvironmentPresentation.js'
import { installRetentionProgress } from './installRetentionProgress.js'
import { installBossBattlePhases } from './installBossBattlePhases.js'
import { installBossArtPresentation } from './installBossArtPresentation.js'
import { installBossEventPolish } from './installBossEventPolish.js'
import { installRarityWaterReadability } from './installRarityWaterReadability.js'
import { installCatchRewardPolish } from './installCatchRewardPolish.js'
import { installLocationAtmosphere } from './installLocationAtmosphere.js'
import { installPlayerFishingPolish } from './installPlayerFishingPolish.js'
import { installFishingFeelPass } from './installFishingFeelPass.js'
import { installFishingDiagnostics } from './diagnostics.js'
import { installCastCameraPanPrototype } from './installCastCameraPanPrototype.js'
import { installConeCastRetrievePrototype } from './installConeCastRetrievePrototype.js'

function installGameplay(GameScene) {
  installFishingVisualTuning()
  installPlayerAnimations(GameScene)
  installRetrieveGameplay(GameScene)
  installRetrievePolish(GameScene)
  installRetrieveFeedback(GameScene)
  installRetrieveTutorial(GameScene)
  installCastZoneFish(GameScene)
  installRetrieveWorldFx(GameScene)
  installBiteCameraFeedback(GameScene)
  installTackleSync(GameScene)
  installRetrieveCompletion(GameScene)
  installRetrieveLandingBeat(GameScene)
  installFishFieldDensity()
  installVerticalSliceAgency(GameScene)
  installVerticalSliceHookInput(GameScene)
  installMidgameProgression(GameScene)
  installRetentionProgress(GameScene)
  installBossBattlePhases(GameScene)
}

function installPresentation(GameScene) {
  installMinimalFishingHud(GameScene)
  installVerticalSliceLayout(GameScene)
  installVerticalSliceFishReadability(GameScene)
  installVerticalSliceBattleContinuity(GameScene)
  installVerticalSliceResultRouting(GameScene)
  installMobileFishingShell(GameScene)

  // Canonical presentation ownership begins here. Keep this sequence centralized.
  installBlueprintFishingField(GameScene)
  installFishingFieldMotionFx(GameScene)
  installCastFishStaging(GameScene)
  installFishingBiteHitPresentation(GameScene)
  installFishingBattlePresentation(GameScene)
  installFishingResultPresentation(GameScene)
  installFishingVisualUpgrade(GameScene)
  installEnvironmentPresentation(GameScene)
  installBossArtPresentation(GameScene)
  installBossEventPolish(GameScene)
  installRarityWaterReadability(GameScene)
  installCatchRewardPolish(GameScene)
  installLocationAtmosphere(GameScene)
  installPlayerFishingPolish(GameScene)
}

function installQa(GameScene) {
  installVerticalSliceQaMode(GameScene)
}

function installFinalGuards(GameScene) {
  // Keep order explicit: stamina may short-circuit older create wrappers.
  installStaminaSessionGate(GameScene)
  // Feel pass observes final gameplay methods without changing balance.
  installFishingFeelPass(GameScene)
  // Presentation guard remains the final visual owner.
  installFishingPresentationGuard(GameScene)
  installCastCameraPanPrototype(GameScene)
  installConeCastRetrievePrototype(GameScene)
  // Diagnostics observe the fully wrapped runtime and never change gameplay.
  installFishingDiagnostics(GameScene)
}

export function installFishingRuntime(GameScene) {
  installGameplay(GameScene)
  installPresentation(GameScene)
  installQa(GameScene)
  installFinalGuards(GameScene)
}
