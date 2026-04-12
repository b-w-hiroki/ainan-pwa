import Phaser from 'phaser'
import TitleScene from './scenes/TitleScene.js'
import HomeScene from './scenes/HomeScene.js'
import MapScene from './scenes/MapScene.js'
import GameScene from './scenes/GameScene.js'

/** @type {Phaser.Types.Core.GameConfig} */
const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 390,
  height: 844,
  backgroundColor: '#ffe0a0',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [TitleScene, HomeScene, MapScene, GameScene],
}

new Phaser.Game(config)
