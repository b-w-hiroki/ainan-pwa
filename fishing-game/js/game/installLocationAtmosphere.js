import { isReducedMotion } from './feedback.js'

function clearLocationAtmosphere(scene) {
  scene._locationAtmosphereTweens?.forEach(tween => {
    tween?.stop?.()
    tween?.destroy?.()
  })
  scene._locationAtmosphereTweens = []
  scene._locationAtmosphereObjects?.forEach(obj => obj?.destroy?.())
  scene._locationAtmosphereObjects = []
}

function register(scene, obj) {
  if (!obj) return obj
  scene._locationAtmosphereObjects ??= []
  scene._locationAtmosphereObjects.push(obj)
  return obj
}

function tween(scene, config) {
  if (isReducedMotion()) return null
  scene._locationAtmosphereTweens ??= []
  const tw = scene.tweens.add(config)
  scene._locationAtmosphereTweens.push(tw)
  return tw
}

function harbor(scene, W, H) {
  const g = register(scene, scene.add.graphics().setDepth(8).setScrollFactor(0))

  // Harbor life: mooring ropes, boat shadows and buoy markers.
  g.lineStyle(3, 0xd8b77a, 0.22)
  g.lineBetween(20, 120, 118, H * 0.48)
  g.lineBetween(W - 18, 104, W - 112, H * 0.43)

  g.fillStyle(0x06283f, 0.12)
  g.fillEllipse(W * 0.26, H * 0.32, 126, 24)
  g.fillEllipse(W * 0.73, H * 0.48, 104, 20)

  const buoy = (x, y, color) => {
    const c = register(scene, scene.add.container(x, y).setDepth(10).setScrollFactor(0))
    const ring = scene.add.circle(0, 0, 11, 0xffffff, 0.08).setStrokeStyle(1.5, 0xffffff, 0.24)
    const core = scene.add.circle(0, 0, 5, color, 0.82)
    c.add([ring, core])
    tween(scene, {
      targets: c,
      y: y + 5,
      duration: 1200 + Math.round(x),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
    return c
  }
  buoy(W * 0.18, H * 0.39, 0xff765a)
  buoy(W * 0.83, H * 0.58, 0xffd95a)

  if (scene.env?.timeOfDay === 'evening' || scene.env?.timeOfDay === 'night') {
    ;[[W * 0.14, H * 0.20], [W * 0.85, H * 0.25], [W * 0.74, H * 0.37]].forEach(([x, y], i) => {
      const light = register(scene, scene.add.circle(x, y, 8 + i * 2, 0xffd95a, 0.10).setDepth(9).setScrollFactor(0))
      tween(scene, {
        targets: light,
        alpha: 0.28,
        scaleX: 1.35,
        scaleY: 1.35,
        duration: 900 + i * 180,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      })
    })
  }
}

function bay(scene, W, H) {
  const g = register(scene, scene.add.graphics().setDepth(8).setScrollFactor(0))

  // Shallow-water light bands.
  g.fillStyle(0xe6fff6, 0.055)
  g.fillEllipse(W * 0.28, H * 0.30, 170, 28)
  g.fillEllipse(W * 0.70, H * 0.43, 208, 34)
  g.fillEllipse(W * 0.42, H * 0.61, 138, 24)

  // Edge seaweed silhouettes.
  g.lineStyle(5, 0x3b8d73, 0.24)
  for (let i = 0; i < 5; i++) {
    const x = 18 + i * 12
    g.lineBetween(x, H - 78, x + (i % 2 ? 10 : -7), H - 150 - i * 9)
  }
  for (let i = 0; i < 4; i++) {
    const x = W - 18 - i * 13
    g.lineBetween(x, H - 72, x + (i % 2 ? -9 : 6), H - 132 - i * 11)
  }

  // Small fish school: a quiet visual signature unique to the bay.
  const school = register(scene, scene.add.container(-70, H * 0.52).setDepth(11).setScrollFactor(0))
  for (let i = 0; i < 6; i++) {
    const fish = scene.add.graphics()
    fish.fillStyle(0x173248, 0.20 + (i % 3) * 0.03)
    fish.fillEllipse(i * 25, (i % 3) * 13, 18, 8)
    fish.fillTriangle(i * 25 + 8, (i % 3) * 13, i * 25 + 17, (i % 3) * 13 - 5, i * 25 + 17, (i % 3) * 13 + 5)
    school.add(fish)
  }
  tween(scene, {
    targets: school,
    x: W + 80,
    duration: 9000,
    repeat: -1,
    ease: 'Linear',
  })

  const shimmer = register(scene, scene.add.ellipse(W * 0.55, H * 0.36, 186, 46, 0xd9fff6, 0.05).setDepth(9).setScrollFactor(0))
  tween(scene, {
    targets: shimmer,
    x: W * 0.47,
    alpha: 0.13,
    scaleX: 1.16,
    duration: 3600,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  })
}

function cape(scene, W, H) {
  const g = register(scene, scene.add.graphics().setDepth(8).setScrollFactor(0))

  // Strong current streaks and whitewater.
  const streaks = [
    [18, H * 0.26, W * 0.72, H * 0.22],
    [W * 0.25, H * 0.39, W - 12, H * 0.34],
    [12, H * 0.55, W * 0.76, H * 0.50],
    [W * 0.20, H * 0.72, W - 20, H * 0.66],
  ]
  streaks.forEach(([x1, y1, x2, y2], i) => {
    g.lineStyle(i % 2 ? 4 : 3, 0xffffff, 0.16 + i * 0.025)
    g.lineBetween(x1, y1, x2, y2)
  })
  g.lineStyle(5, 0xdff7ff, 0.16)
  g.strokeEllipse(W * 0.18, H * 0.36, 112, 28)
  g.strokeEllipse(W * 0.82, H * 0.60, 132, 32)

  // A giant deep-water silhouette gives Kuroshio Cape a threatening identity.
  const giant = register(scene, scene.add.container(W * 0.52, H * 0.61).setDepth(9).setScrollFactor(0).setAlpha(0.16))
  const body = scene.add.ellipse(0, 0, 188, 58, 0x031725, 1)
  const tail = scene.add.triangle(-104, 0, 0, 0, -34, -27, -34, 27, 0x031725, 1)
  giant.add([body, tail])
  tween(scene, {
    targets: giant,
    x: W * 0.43,
    y: H * 0.64,
    alpha: 0.24,
    duration: 4800,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  })

  const surge = register(scene, scene.add.rectangle(W / 2, H * 0.48, W, 54, 0x74d6ef, 0.025).setDepth(7).setScrollFactor(0))
  tween(scene, {
    targets: surge,
    y: H * 0.57,
    alpha: 0.09,
    duration: 2100,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  })
}

function buildLocationAtmosphere(scene) {
  clearLocationAtmosphere(scene)
  const { width: W, height: H } = scene.scale
  if (scene.env?.point === 'pointB') bay(scene, W, H)
  else if (scene.env?.point === 'pointC') cape(scene, W, H)
  else harbor(scene, W, H)
}

export function installLocationAtmosphere(GameScene) {
  if (GameScene.prototype.__ainanLocationAtmosphereInstalled) return
  GameScene.prototype.__ainanLocationAtmosphereInstalled = true

  const originalCreate = GameScene.prototype.create
  GameScene.prototype.create = function (...args) {
    const result = originalCreate.apply(this, args)
    buildLocationAtmosphere(this)
    return result
  }

  const originalCleanup = GameScene.prototype._cleanup
  GameScene.prototype._cleanup = function (...args) {
    clearLocationAtmosphere(this)
    return originalCleanup.apply(this, args)
  }
}
