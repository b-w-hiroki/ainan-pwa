import Phaser from 'phaser'
import TitleScene from './scenes/TitleScene.js'
import HomeScene from './scenes/HomeScene.js'
import MapScene from './scenes/MapScene.js'
import GameScene from './scenes/GameScene.js'

/** @type {Phaser.Types.Core.GameConfig} */
const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#ffe0a0',
  // 対処1: roundPixels で文字のサブピクセルにじみを防ぐ
  render: {
    pixelArt: false,
    antialias: true,
    roundPixels: true,
    resolution: window.devicePixelRatio ?? 1,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 390,
    height: 844,
  },
  scene: [TitleScene, HomeScene, MapScene, GameScene],
}

function startGame() {
  new Phaser.Game(config)
}

// 対処4: WebFont が読み込まれる前に描画されるにじみを防ぐ
if (typeof WebFont !== 'undefined') {
  WebFont.load({
    google: {
      families: ['Nunito:700,800,900', 'M+PLUS+Rounded+1c:700,800'],
    },
    active: startGame,
    inactive: startGame,  // フォント失敗時もゲームを起動する
    timeout: 2000,        // 2秒でタイムアウトして起動
  })
} else {
  startGame()
}
