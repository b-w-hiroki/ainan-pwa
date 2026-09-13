import { BackgroundManager } from '../scenes/components/BackgroundManager.js'

export function installFishingVisualTuning() {
  if (BackgroundManager.prototype.__ainanFishingVisualTuningInstalled) return
  BackgroundManager.prototype.__ainanFishingVisualTuningInstalled = true

  BackgroundManager.prototype._drawFish = function (g, type, sc) {
    const alpha = type === 'rare' ? 0.84 : type === 'uncommon' ? 0.74 : 0.62
    const shadowCol = 0x08283a
    const bodyW = 30 * sc
    const bodyH = 14 * sc

    g.clear()

    // 水中のぼんやりした外周を先に描き、背景色が明るくても魚影を見失いにくくする。
    g.fillStyle(0xc8f4ff, type === 'rare' ? 0.18 : 0.10)
    g.fillEllipse(0, 1 * sc, 38 * sc, 19 * sc)

    if (type === 'rare') {
      g.fillStyle(0x76b6d8, 0.18)
      g.fillEllipse(0, 0, 48 * sc, 24 * sc)
    }

    g.fillStyle(shadowCol, alpha)
    g.fillEllipse(0, 0, bodyW, bodyH)
    g.fillTriangle(bodyW * 0.43, 0, bodyW * 0.72, -bodyH * 0.60, bodyW * 0.72, bodyH * 0.60)

    // 背びれを少し大きめにして、移動方向を読みやすくする。
    g.fillStyle(shadowCol, alpha * 0.92)
    g.fillTriangle(-3 * sc, -bodyH * 0.42, 5 * sc, -bodyH * 0.44, 1 * sc, -bodyH * 0.88)

    // 小さなハイライトでシルエットが完全な黒塊にならないようにする。
    g.fillStyle(0x8bc6d8, type === 'rare' ? 0.28 : 0.16)
    g.fillEllipse(-6 * sc, -2 * sc, 8 * sc, 3 * sc)
  }
}
