import { ASSETS } from '../config/assetManifest.js'
import { FISHING_MOCK_LAYOUT as L } from './layouts/fishingMockLayout.js'
import { FishingLegacyVisibilityGate } from './FishingLegacyVisibilityGate.js'

const TEXT_RES = typeof window !== 'undefined' ? (window.devicePixelRatio ?? 1) : 1
const FONT = 'M PLUS Rounded 1c, Nunito, sans-serif'

const FISH_KEY = {
  aji: ASSETS.fish.ajiIcon.key,
  tai: ASSETS.fish.madaiIcon.key,
  bass: ASSETS.fish.blackBassIcon.key,
  buri: ASSETS.fish.buriIcon.key,
  kue: ASSETS.fish.kueIcon.key,
  saba: ASSETS.fish.sabaIcon.key,
  isaki: ASSETS.fish.isakiIcon.key,
  hirame: ASSETS.fish.hirameIcon.key,
  kanpachi: ASSETS.fish.kanpachiIcon.key,
}

const POINT_BG = {
  pointA: ASSETS.backgrounds.fishingHarbor,
  pointB: ASSETS.backgrounds.fishingBay,
  pointC: ASSETS.backgrounds.fishingCape,
}

const FIELD = ASSETS.fishingField

const POINT_NAME = {
  pointA: '汐風港',
  pointB: '蒼海湾',
  pointC: '黒潮崎',
}

function hasTexture(scene, assetOrKey) {
  const key = typeof assetOrKey === 'string' ? assetOrKey : assetOrKey?.key
  return Boolean(key && scene.textures?.exists?.(key))
}

function addText(scene, x, y, text, size, options = {}) {
  return scene.add.text(x, y, text, {
    fontFamily: FONT,
    resolution: TEXT_RES,
    fontSize: `${size}px`,
    fontStyle: 'bold',
    color: options.color ?? '#ffffff',
    align: options.align ?? 'center',
    stroke: options.stroke,
    strokeThickness: options.strokeThickness ?? 0,
  }).setOrigin(options.originX ?? 0.5, options.originY ?? 0.5).setScrollFactor(0)
}

export class FishingPresentation {
  constructor(scene) {
    this.scene = scene
    this.phase = null
    this.root = null
    this.phaseRoot = null
    this.gate = new FishingLegacyVisibilityGate(scene)
    this._resultHits = []
  }

  build() {
    if (this.root?.active) return
    const scene = this.scene
    this.root = scene.add.container(0, 0).setDepth(3000).setScrollFactor(0)
    this.phaseRoot = scene.add.container(0, 0).setScrollFactor(0)
    this.root.add(this.phaseRoot)
    this.enter(scene.phase ?? 'cast')
  }

  _clearPhase() {
    this._resultHits.forEach(hit => hit?.destroy?.())
    this._resultHits = []
    this.phaseRoot?.removeAll?.(true)
  }

  _background({ battle = false } = {}) {
    const scene = this.scene
    const W = L.viewport.width
    const H = L.viewport.height
    const asset = POINT_BG[scene.env?.point] ?? POINT_BG.pointA
    const bg = hasTexture(scene, asset)
      ? scene.add.image(W / 2, H / 2, asset.key).setDisplaySize(W, H).setScrollFactor(0)
      : scene.add.rectangle(W / 2, H / 2, W, H, 0x238fc1).setScrollFactor(0)
    this.phaseRoot.add(bg)

    if (battle) {
      const veil = scene.add.rectangle(W / 2, L.playfield.y + L.playfield.height / 2, W, L.playfield.height, 0x0b6e9b, 0.24).setScrollFactor(0)
      this.phaseRoot.add(veil)
    }
    return bg
  }

  _topHud(status) {
    const scene = this.scene
    const g = scene.add.graphics().setScrollFactor(0)
    g.fillStyle(0x0a4667, 1)
    g.fillRect(0, 0, L.viewport.width, L.topHud.height)
    g.lineStyle(1.5, 0x8edfff, 0.55)
    g.lineBetween(0, L.topHud.height - 1, L.viewport.width, L.topHud.height - 1)
    g.fillStyle(0xffffff, 0.10)
    g.fillCircle(28, 32, 16)
    g.lineStyle(1.5, 0xffffff, 0.46)
    g.strokeCircle(28, 32, 16)
    this.phaseRoot.add(g)
    this.phaseRoot.add(addText(scene, 28, 32, '‹', 25))
    this.phaseRoot.add(addText(scene, 52, 31, `釣り場・${POINT_NAME[scene.env?.point] ?? '釣り場'}`, 12, { originX: 0 }))
    this.phaseRoot.add(addText(scene, 356, 31, status, 12, { originX: 1 }))
  }

  _player(layout) {
    const scene = this.scene
    const asset = ASSETS.characters.playerDefaultUi ?? ASSETS.characters.playerDefault
    if (!hasTexture(scene, asset)) return
    const player = scene.add.image(layout.x, layout.y, asset.key)
      .setOrigin(0.5, 1)
      .setDisplaySize(layout.width, layout.height)
      .setScrollFactor(0)
    this.phaseRoot.add(player)
  }

  _fishShadow(x, y, width, alpha = 0.66) {
    const scene = this.scene
    const asset = FIELD.fishShadowMediumIdle
    if (hasTexture(scene, asset)) {
      const fish = scene.add.image(x, y, asset.key)
        .setDisplaySize(width, Math.round(width * 0.50))
        .setAlpha(alpha)
        .setScrollFactor(0)
      this.phaseRoot.add(fish)
      return
    }

    const g = scene.add.graphics().setScrollFactor(0)
    const h = Math.round(width * 0.34)
    g.fillStyle(0x08283a, alpha)
    g.fillEllipse(x, y, width, h)
    g.fillTriangle(x + width * 0.40, y, x + width * 0.64, y - h * 0.58, x + width * 0.64, y + h * 0.58)
    this.phaseRoot.add(g)
  }

  _cast() {
    const scene = this.scene
    this._background()
    this._topHud('キャスト')
    L.cast.fish.forEach((f, i) => this._fishShadow(f.x, f.y, f.width, i ? 0.48 : 0.72))
    this._player(L.cast.player)

    // Always show a restrained landing target so Cast has a clear visual goal
    // without adding another instruction card.
    const aim = scene.add.graphics().setScrollFactor(0)
    aim.fillStyle(0xffd95a, 0.10)
    aim.fillEllipse(L.cast.target.x, L.cast.target.y, 74, 34)
    aim.lineStyle(3, 0xffe88a, 0.92)
    aim.strokeEllipse(L.cast.target.x, L.cast.target.y, 74, 34)
    aim.lineStyle(1.4, 0xffffff, 0.74)
    aim.strokeEllipse(L.cast.target.x, L.cast.target.y, 42, 20)
    for (let i = 0; i < 5; i++) {
      const t = (i + 1) / 6
      const x = L.cast.player.x + 32 + (L.cast.target.x - (L.cast.player.x + 32)) * t
      const y = L.cast.player.y - 110 + (L.cast.target.y - (L.cast.player.y - 110)) * t - Math.sin(Math.PI * t) * 74
      aim.fillStyle(0xffffff, 0.78 - i * 0.08)
      aim.fillCircle(x, y, Math.max(2, 4 - i * 0.35))
    }
    this.phaseRoot.add(aim)

    const dock = scene.add.graphics().setScrollFactor(0)
    dock.fillStyle(0xf7fbfd, 1)
    dock.fillRect(0, L.controls.y, L.controls.width, L.controls.height)
    dock.lineStyle(2, 0xb9d9e7, 0.9)
    dock.lineBetween(0, L.controls.y, L.controls.width, L.controls.y)
    dock.fillStyle(0xd8edf5, 1)
    dock.fillRoundedRect(L.cast.power.x, L.cast.power.y, L.cast.power.width, L.cast.power.height, 5)
    dock.fillStyle(0x58b8df, 1)
    dock.fillRoundedRect(L.cast.power.x, L.cast.power.y, 126, L.cast.power.height, 5)
    dock.fillStyle(0x2f9ed4, 1)
    dock.lineStyle(3, 0xffffff, 0.96)
    dock.fillCircle(L.cast.action.x, L.cast.action.y, L.cast.action.radius)
    dock.strokeCircle(L.cast.action.x, L.cast.action.y, L.cast.action.radius)
    this.phaseRoot.add(dock)
    this.phaseRoot.add(addText(scene, 24, 700, 'パワー', 11, { color: '#173248', originX: 0 }))
    this.phaseRoot.add(addText(scene, L.cast.action.x, L.cast.action.y, '投げる', 14))
  }

  _retrieve() {
    const scene = this.scene
    this._background()
    const meters = this._lineMeters()
    this._topHud(`残り ${Math.round(meters)}m`)
    L.retrieve.fish.forEach((f, i) => this._fishShadow(f.x, f.y, f.width, i ? 0.46 : 0.72))
    this._player(L.retrieve.player)

    const lure = this._screenLure()
    const line = scene.add.graphics().setScrollFactor(0)
    line.lineStyle(2, 0xffffff, 0.92)
    line.lineBetween(L.retrieve.lineStart.x, L.retrieve.lineStart.y, lure.x - 6, lure.y + 3)
    this.phaseRoot.add(line)
    if (hasTexture(scene, FIELD.lureIdle)) {
      this.phaseRoot.add(scene.add.image(lure.x, lure.y, FIELD.lureIdle.key).setDisplaySize(38, 38).setScrollFactor(0))
    }

    const dock = scene.add.graphics().setScrollFactor(0)
    dock.fillStyle(0x063a56, 1)
    dock.fillRect(0, L.controls.y, L.controls.width, L.controls.height)
    dock.lineStyle(2, 0x8edfff, 0.52)
    dock.lineBetween(0, L.controls.y, L.controls.width, L.controls.y)
    const fills = [0x248cd6, 0x2ebd67, 0xf2a01f]
    L.retrieve.actions.forEach((a, i) => {
      dock.fillStyle(fills[i], 1)
      dock.lineStyle(i === 1 ? 4 : 3, 0xffffff, 0.96)
      dock.fillCircle(a.x, a.y, a.radius)
      dock.strokeCircle(a.x, a.y, a.radius)
    })
    this.phaseRoot.add(dock)
    this.phaseRoot.add(addText(scene, 195, 693, '魚影の反応を見ながら操作', 10, { color: '#dff5ff' }))
    ;[['Ⅱ','待つ'],['↻','ちょい巻き'],['≫','ゆっくり巻く']].forEach(([mark,label], i) => {
      const a = L.retrieve.actions[i]
      this.phaseRoot.add(addText(scene, a.x, a.y - 4, mark, i === 1 ? 25 : 22))
      this.phaseRoot.add(addText(scene, a.x, 821, label, i === 1 ? 11 : 10))
    })
  }

  _battle() {
    const scene = this.scene
    this._background({ battle: true })

    const top = scene.add.graphics().setScrollFactor(0)
    top.fillStyle(0x073754, 1)
    top.fillRect(0, 0, L.viewport.width, L.topHud.height)
    top.lineStyle(1.5, 0x8edfff, 0.56)
    top.lineBetween(0, L.topHud.height - 1, L.viewport.width, L.topHud.height - 1)
    const escape = Math.max(0, Math.min(100, scene.battleState?.escape ?? 45))
    top.fillStyle(0xdff5ff, 0.28)
    top.fillRoundedRect(L.battle.tension.x, L.battle.tension.y, L.battle.tension.width, L.battle.tension.height, 7)
    top.fillStyle(escape > 72 ? 0xff765a : escape > 42 ? 0xffc857 : 0x58b8df, 1)
    top.fillRoundedRect(L.battle.tension.x, L.battle.tension.y, Math.max(8, L.battle.tension.width * escape / 100), L.battle.tension.height, 7)
    this.phaseRoot.add(top)
    this.phaseRoot.add(addText(scene, 16, 35, 'テンション', 11, { originX: 0 }))

    const waterFocus = scene.add.graphics().setScrollFactor(0)
    waterFocus.fillStyle(0x8edfff, 0.08)
    waterFocus.fillEllipse(L.battle.fish.x, L.battle.fish.y + 4, 286, 170)
    waterFocus.lineStyle(2, 0xc7f3ff, 0.28)
    waterFocus.strokeEllipse(L.battle.fish.x, L.battle.fish.y + 4, 264, 148)
    waterFocus.lineStyle(1.2, 0xffffff, 0.16)
    waterFocus.strokeEllipse(L.battle.fish.x, L.battle.fish.y + 7, 310, 188)
    this.phaseRoot.add(waterFocus)

    const key = FISH_KEY[scene.fish?.id] ?? FISH_KEY.aji
    if (hasTexture(scene, key)) {
      this.phaseRoot.add(scene.add.image(L.battle.fish.x, L.battle.fish.y, key)
        .setDisplaySize(L.battle.fish.width, L.battle.fish.height).setScrollFactor(0))
    }

    const dock = scene.add.graphics().setScrollFactor(0)
    dock.fillStyle(0x073754, 0.96)
    dock.fillRect(0, L.controls.y, L.controls.width, L.controls.height)
    dock.lineStyle(2, 0x8edfff, 0.34)
    dock.lineBetween(0, L.controls.y, L.controls.width, L.controls.y)
    this.phaseRoot.add(dock)
    this.phaseRoot.add(addText(scene, 195, 748, '↓', 48))
    this.phaseRoot.add(addText(scene, 195, L.battle.instructionY, '下にスワイプで巻く', 14))
  }

  _result() {
    const scene = this.scene
    const W = L.viewport.width
    const H = L.viewport.height
    const bg = scene.add.rectangle(W / 2, H / 2, W, H, 0x073754, 1).setScrollFactor(0)
    this.phaseRoot.add(bg)

    this.phaseRoot.add(addText(scene, W / 2, L.result.labelY, `${scene.fish?.name ?? '魚'}を釣り上げた！`, 17, {
      color: '#ffffff',
      stroke: '#2f9ed4',
      strokeThickness: 8,
    }))

    const key = FISH_KEY[scene.fish?.id] ?? FISH_KEY.aji
    if (hasTexture(scene, key)) {
      const halo = scene.add.circle(L.result.fish.x, L.result.fish.y, 86, 0x58b8df, 0.14)
        .setStrokeStyle(2, 0x8edfff, 0.38).setScrollFactor(0)
      const fish = scene.add.image(L.result.fish.x, L.result.fish.y, key)
        .setDisplaySize(L.result.fish.width, L.result.fish.height).setScrollFactor(0)
      this.phaseRoot.add([halo, fish])
    }

    const catchData = scene.catches?.[scene.catches.length - 1] ?? {}
    const size = Number(catchData.sizeCm ?? scene.fish?.sizeCm ?? 0)
    const score = Number(catchData.score ?? 0)
    this.phaseRoot.add(addText(scene, W / 2, L.result.nameY, scene.fish?.name ?? '魚', 27))

    const stats = scene.add.graphics().setScrollFactor(0)
    stats.fillStyle(0x062c44, 0.92)
    stats.lineStyle(1.5, 0xbcecff, 0.54)
    stats.fillRoundedRect(L.result.stats.x, L.result.stats.y, L.result.stats.width, L.result.stats.height, 17)
    stats.strokeRoundedRect(L.result.stats.x, L.result.stats.y, L.result.stats.width, L.result.stats.height, 17)
    this.phaseRoot.add(stats)
    this.phaseRoot.add(addText(scene, W / 2, L.result.stats.y + 31, `サイズ  ${size.toFixed(1)} cm　+${score} pt`, 14))
    this.phaseRoot.add(addText(scene, W / 2, L.result.stats.y + 58, `レア度  ${this._rarityStars()}`, 12, { color: '#dff5ff' }))

    this._resultButton(L.result.primary, '町へ持ち帰る', true, () => this._goTown())
    this._resultButton(L.result.secondary, '↻ もう一度釣る', false, () => this._retry())
  }

  _resultButton(rect, label, primary, action) {
    const scene = this.scene
    const g = scene.add.graphics().setScrollFactor(0)
    g.fillStyle(primary ? 0xffd95a : 0x0e425f, 1)
    g.lineStyle(primary ? 3 : 1.5, primary ? 0xffef9b : 0x8edfff, 0.9)
    g.fillRoundedRect(rect.x, rect.y, rect.width, rect.height, 20)
    g.strokeRoundedRect(rect.x, rect.y, rect.width, rect.height, 20)
    this.phaseRoot.add(g)
    this.phaseRoot.add(addText(scene, rect.x + rect.width / 2, rect.y + rect.height / 2, label, primary ? 15 : 12, {
      color: primary ? '#173248' : '#ffffff',
    }))
    const hit = scene.add.rectangle(rect.x + rect.width / 2, rect.y + rect.height / 2, rect.width, rect.height, 0x000000, 0)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', pointer => {
        pointer?.event?.stopPropagation?.()
        action()
      })
    this.phaseRoot.add(hit)
    this._resultHits.push(hit)
  }

  _goTown() {
    const scene = this.scene
    const lastCatch = scene.catches?.[scene.catches.length - 1]
    const catchArrival = lastCatch && scene.fish ? {
      fishId: scene.fish.id,
      name: scene.fish.name,
      emoji: scene.fish.emoji,
      rarity: scene.fish.rarity,
      sizeCm: lastCatch.sizeCm,
      score: lastCatch.score,
    } : null
    scene._cleanup?.()
    scene.scene.start('TownScene', { catchArrival })
  }

  _retry() {
    const scene = this.scene
    const env = { ...scene.env, player: { ...(scene.env?.player ?? {}) } }
    scene._cleanup?.()
    scene.scene.restart(env)
  }

  _rarityStars() {
    const n = { common: 1, uncommon: 2, rare: 3, legendary: 5 }[this.scene.fish?.rarity] ?? 1
    return '★'.repeat(n) + '☆'.repeat(Math.max(0, 5 - n))
  }

  _lineMeters() {
    const s = this.scene
    if (!s.bobber || s.anchorX == null || s.anchorY == null) return 20
    return Math.hypot(s.bobber.x - s.anchorX, s.bobber.y - s.anchorY) / 18
  }

  _screenLure() {
    const scene = this.scene
    if (!scene.bobber?.visible) return { x: L.retrieve.lureFallback.x, y: L.retrieve.lureFallback.y }
    const cam = scene.cameras?.main
    return {
      x: Math.max(150, Math.min(348, scene.bobber.x - (cam?.scrollX ?? 0))),
      y: Math.max(150, Math.min(590, scene.bobber.y - (cam?.scrollY ?? 0))),
    }
  }

  enter(rawPhase) {
    if (!this.root?.active) return
    const phase = rawPhase === 'wait' ? 'battle' : rawPhase
    if (this.phase === phase && phase !== 'retrieve' && phase !== 'battle') {
      this.gate.sync()
      return
    }

    this.phase = phase
    this._clearPhase()
    this.gate.suppress()

    if (phase === 'retrieve') this._retrieve()
    else if (phase === 'battle') this._battle()
    else if (phase === 'result') this._result()
    else this._cast()
  }

  sync() {
    if (!this.root?.active) return
    const phase = this.scene.phase === 'wait' ? 'battle' : this.scene.phase
    this.gate.sync()

    if (phase !== this.phase) {
      this.enter(phase)
      return
    }

    // Retrieve and Battle contain live values/positions; redraw them cheaply.
    if (phase === 'retrieve' || phase === 'battle') {
      this._clearPhase()
      if (phase === 'retrieve') this._retrieve()
      else this._battle()
    }
  }

  destroy() {
    this._clearPhase()
    this.root?.destroy?.(true)
    this.root = null
    this.phaseRoot = null
    this.gate.destroy()
  }
}
