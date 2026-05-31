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
  scene: [TitleScene, HomeScene, MapScene, GameScene, CollectionScene, UpgradeScene, ExchangeScene, MissionScene, LicenseScene, RankScene, TownScene, HelpScene, MenuScene],
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
