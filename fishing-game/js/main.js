import Phaser from 'phaser'
import { MOBILE_FRAME } from './config/mobileFrame.js'
import TitleScene from './scenes/TitleScene.js'
import HomeScene from './scenes/HomeScene.js'
import MapScene from './scenes/MapScene.js'
import GameScene from './scenes/GameScene.js'
import RarityQaScene from './scenes/RarityQaScene.js'
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
import WorkshopScene from './scenes/WorkshopScene.js'
import HarborServicesScene from './scenes/HarborServicesScene.js'
import SettingsScene from './scenes/SettingsScene.js'
import ProfileScene from './scenes/ProfileScene.js'
import DailyScene from './scenes/DailyScene.js'
import AchievementScene from './scenes/AchievementScene.js'
import { installTownCatchArrival } from './game/installTownCatchArrival.js'
import { installFishingRuntime } from './game/installFishingRuntime.js'
import { backupSave, ensureSaveVersion } from './game/saveSystem.js'
import { prepareQaState, routeQaScene } from './game/qaBootstrap.js'
import { installSceneVisualPowerPass } from './game/installSceneVisualPowerPass.js'

installFishingRuntime(GameScene)

/** @type {Phaser.Types.Core.GameConfig} */
const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#073754',
  render: {
    pixelArt: false,
    antialias: true,
    roundPixels: true,
    resolution: Math.min(window.devicePixelRatio ?? 1, 2),
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: MOBILE_FRAME.width,
    height: MOBILE_FRAME.height,
  },
  scene: [TitleScene, HomeScene, MapScene, GameScene, RarityQaScene, CollectionScene, UpgradeScene, WorkshopScene, ExchangeScene, HarborServicesScene, MissionScene, LicenseScene, RankScene, ProfileScene, DailyScene, AchievementScene, TownScene, HelpScene, MenuScene, ChallengeScene, SettingsScene],
}

function startGame() {
  prepareQaState()
  ensureSaveVersion()
  const game = new Phaser.Game(config)
  window.__game = game
  routeQaScene(game)
  document.addEventListener('visibilitychange', () => { if (document.hidden) backupSave() })
}

const qaImmediateStart = typeof window !== 'undefined'
  && new URLSearchParams(window.location.search).get('qa') === '1'

if (qaImmediateStart) {
  // Visual CI must not depend on the latency of the external WebFont loader.
  // Production still waits for web fonts as before.
  startGame()
} else if (typeof WebFont !== 'undefined') {
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
