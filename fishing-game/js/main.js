import Phaser from 'phaser'
import TitleScene from './scenes/TitleScene.js'
import HomeScene from './scenes/HomeScene.js'
import MapScene from './scenes/MapScene.js'
import GameScene from './scenes/GameScene.js'
import CollectionScene from './scenes/CollectionScene.js'
import UpgradeScene from './scenes/UpgradeScene.js'
import ExchangeScene from './scenes/ExchangeScene.js'
import MissionScene from './scenes/MissionScene.js'
import LicenseScene from './scenes/LicenseScene.js'
import RankScene from './scenes/RankScene.js'
import TownScene from './scenes/TownScene.js'
import HelpScene from './scenes/HelpScene.js'
import MenuScene from './scenes/MenuScene.js'
import ChallengeScene from './scenes/ChallengeScene.js'
import { installPlayerAnimations } from './game/installPlayerAnimations.js'
import { installRetrieveGameplay } from './game/installRetrieveGameplay.js'
import { installRetrievePolish } from './game/installRetrievePolish.js'
import { installRetrieveFeedback } from './game/installRetrieveFeedback.js'
import { installRetrieveTutorial } from './game/installRetrieveTutorial.js'
import { installCastZoneFish } from './game/installCastZoneFish.js'
import { installRetrieveWorldFx } from './game/installRetrieveWorldFx.js'
import { installBiteCameraFeedback } from './game/installBiteCameraFeedback.js'
import { installTackleSync } from './game/installTackleSync.js'
import { installRetrieveCompletion } from './game/installRetrieveCompletion.js'
import { installFishingVisualTuning } from './game/installFishingVisualTuning.js'
import { installFishFieldDensity } from './game/installFishFieldDensity.js'
import { installRetrieveLandingBeat } from './game/installRetrieveLandingBeat.js'
import { installMinimalFishingHud } from './game/installMinimalFishingHud.js'

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
installMinimalFishingHud(GameScene)
installFishFieldDensity()

/** @type {Phaser.Types.Core.GameConfig} */
const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#ffe0a0',
  render: {
    pixelArt: false,
    antialias: true,
    roundPixels: true,
    resolution: Math.min(window.devicePixelRatio ?? 1, 2),
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 390,
    height: 844,
  },
  scene: [TitleScene, HomeScene, MapScene, GameScene, CollectionScene, UpgradeScene, ExchangeScene, MissionScene, LicenseScene, RankScene, TownScene, HelpScene, MenuScene, ChallengeScene],
}

function startGame() {
  const game = new Phaser.Game(config)
  window.__game = game
}

// Start after web fonts are ready so the first Phaser text render is stable.
if (typeof WebFont !== 'undefined') {
  WebFont.load({
    google: {
      families: ['Nunito:700,800,900', 'M+PLUS+Rounded+1c:700,800,900'],
    },
    active: startGame,
    inactive: startGame,
    timeout: 2000,
  })
} else {
  startGame()
}
