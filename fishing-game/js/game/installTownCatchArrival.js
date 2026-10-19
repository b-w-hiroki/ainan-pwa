import { ASSETS } from '../config/assetManifest.js'
import { FONT, SHADOW, UI_COLORS } from '../config/fontStyles.js'
import { getTownCatchReaction, TOWN_CATCH_ICONS } from './townCatchReactions.js'

const TEXT_RES = typeof window !== 'undefined' ? (window.devicePixelRatio ?? 1) : 1

const FISH_ART = TOWN_CATCH_ICONS

const ARRIVAL_COPY = {
  common: {
    tag: 'FRESH CATCH',
    title: '今日の釣果が届いた！',
    body: '魚市場に新しい魚が並び、町の人たちが集まってきた。',
  },
  uncommon: {
    tag: 'NICE CATCH',
    title: 'いい魚が港に届いた！',
    body: '立派な釣果に市場がざわつく。町の評判も少しずつ広がっていく。',
  },
  rare: {
    tag: 'RARE CATCH',
    title: '珍しい魚に町が沸いた！',
    body: '見慣れない大物をひと目見ようと、港に人だかりができている。',
  },
  legendary: {
    tag: 'LEGEND ARRIVED',
    title: '伝説の釣果が港へ！',
    body: '町じゅうが大騒ぎ。今日の釣果が、この港の新しい物語になった。',
  },
}

export function getTownArrivalCopy(rarity) {
  // Scene transition input is display-only, but malformed imported saves or
  // QA data must not expose Object.prototype as an arrival copy.
  return Object.hasOwn(ARRIVAL_COPY, rarity) ? ARRIVAL_COPY[rarity] : ARRIVAL_COPY.common
}

export function getTownCatchArrivalLayout(width, height) {
  const wide = width > height && width >= 740 && height >= 370
  const x = wide ? (width - 650) / 2 : 24
  const y = wide ? (height - 336) / 2 : 154
  const w = wide ? 650 : width - 48
  const h = wide ? 336 : 452
  const artX = wide ? x + 165 : width / 2
  const copyX = wide ? x + 477 : width / 2
  return {
    wide, x, y, w, h, artX, copyX,
    tagY: y + (wide ? 28 : 31),
    nameY: y + (wide ? 58 : 55),
    fishY: y + (wide ? 152 : 145),
    fishSize: wide ? 104 : 112,
    stat: wide
      ? { x: x + 40, y: y + 245, w: 250, h: 42, textY: y + 266 }
      : { x: x + 50, y: y + 220, w: w - 100, h: 42, textY: y + 241 },
    titleY: y + (wide ? 78 : 289),
    bodyY: y + (wide ? 117 : 318),
    bodyWidth: wide ? 270 : w - 70,
    actionWidth: wide ? 248 : 226,
    actionHeight: wide ? 48 : 48,
    confirmY: wide ? y + 235 : y + h - 80,
    returnY: wide ? y + 290 : y + h - 28,
  }
}

export function installTownCatchArrival(TownScene) {
  if (TownScene.prototype.__ainanTownCatchArrivalInstalled) return
  TownScene.prototype.__ainanTownCatchArrivalInstalled = true

  // Arrival is entered directly from Result; TownScene may be launched
  // without GameScene, so preload its own dedicated fish icon textures.
  const originalPreload = TownScene.prototype.preload
  TownScene.prototype.preload = function (...args) {
    const result = originalPreload.apply(this, args)
    for (const art of Object.values(FISH_ART)) {
      if (art?.status === 'ready' && !this.textures.exists(art.key)) {
        this.load.image(art.key, art.path)
      }
    }
    return result
  }

  const originalCreate = TownScene.prototype.create
  TownScene.prototype.create = function (data = {}) {
    const result = originalCreate.call(this, data)
    const catchArrival = data?.catchArrival
    if (catchArrival?.fishId) this._showCatchArrival(catchArrival)
    return result
  }

  TownScene.prototype._showCatchArrival = function (catchArrival) {
    const { width: W, height: H } = this.scale
    const layout = getTownCatchArrivalLayout(W, H)
    const copy = getTownArrivalCopy(catchArrival.rarity)
    const bodyCopy = getTownCatchReaction(catchArrival.fishId) ?? copy.body
    const legendary = catchArrival.rarity === 'legendary'
    const rare = catchArrival.rarity === 'rare' || legendary
    const accent = legendary ? 0xffd95a : rare ? 0xff9f68 : 0x71d6a2

    const items = []
    const scrim = this.add.rectangle(W / 2, H / 2, W, H, 0x0b2434, 0.68).setInteractive()
    items.push(scrim)

    const { x, y, w, h } = layout

    const card = this.add.graphics()
    card.fillStyle(0x071a28, 0.22)
    card.fillRoundedRect(x + 4, y + 7, w, h, 28)
    card.fillStyle(0xf8fdff, 0.995)
    card.lineStyle(3, accent, 0.96)
    card.fillRoundedRect(x, y, w, h, 28)
    card.strokeRoundedRect(x, y, w, h, 28)
    card.fillStyle(accent, legendary ? 0.22 : 0.14)
    card.fillRoundedRect(x + 14, y + 14, w - 28, 58, 20)
    items.push(card)

    items.push(this.add.text(layout.artX, layout.tagY, copy.tag, {
      fontFamily: FONT,
      resolution: TEXT_RES,
      fontSize: '10px',
      fontWeight: '900',
      color: legendary ? '#9a6b00' : UI_COLORS.oceanDeep,
      letterSpacing: 1,
    }).setOrigin(0.5))

    items.push(this.add.text(layout.artX, layout.nameY, catchArrival.name ?? '今日の釣果', {
      fontFamily: FONT,
      resolution: TEXT_RES,
      fontSize: '23px',
      fontWeight: '900',
      color: UI_COLORS.ink,
      shadow: SHADOW.subtle,
    }).setOrigin(0.5))

    const halo = this.add.graphics()
    halo.fillStyle(accent, legendary ? 0.18 : 0.10)
    halo.fillCircle(layout.artX, layout.fishY, layout.wide ? 70 : 76)
    halo.lineStyle(2, accent, 0.48)
    halo.strokeCircle(layout.artX, layout.fishY, layout.wide ? 62 : 68)
    items.push(halo)

    const art = FISH_ART[catchArrival.fishId]
    let fishVisual
    if (art?.key && this.textures.exists(art.key)) {
      fishVisual = this.add.image(layout.artX, layout.fishY, art.key).setDisplaySize(layout.fishSize, layout.fishSize)
    } else {
      fishVisual = this.add.text(layout.artX, layout.fishY, catchArrival.emoji ?? '🐟', {
        fontSize: '72px',
        resolution: TEXT_RES,
      }).setOrigin(0.5)
    }
    items.push(fishVisual)
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('qa') === '1') {
      this._qaCatchArrivalSnapshot = Object.freeze({
        fishId: catchArrival.fishId,
        fishTexture: fishVisual?.texture?.key ?? null,
        reaction: bodyCopy,
        speciesReaction: getTownCatchReaction(catchArrival.fishId) !== null,
        layout: layout.wide ? 'landscape' : 'portrait',
      })
    }

    const statBg = this.add.graphics()
    statBg.fillStyle(0xdff5ff, 0.72)
    statBg.lineStyle(1.5, 0x9bcfe5, 0.78)
    statBg.fillRoundedRect(layout.stat.x, layout.stat.y, layout.stat.w, layout.stat.h, 14)
    statBg.strokeRoundedRect(layout.stat.x, layout.stat.y, layout.stat.w, layout.stat.h, 14)
    items.push(statBg)

    const sizeLabel = Number.isFinite(Number(catchArrival.sizeCm)) ? `${Number(catchArrival.sizeCm).toFixed(1)}cm` : '—'
    const scoreLabel = Number.isFinite(Number(catchArrival.score)) ? `+${Number(catchArrival.score).toLocaleString()}pt` : '釣果登録'
    items.push(this.add.text(layout.artX - 54, layout.stat.textY, sizeLabel, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '15px', fontWeight: '900', color: UI_COLORS.oceanDeep,
    }).setOrigin(0.5))
    items.push(this.add.text(layout.artX + 54, layout.stat.textY, scoreLabel, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '15px', fontWeight: '900', color: UI_COLORS.warning,
    }).setOrigin(0.5))

    items.push(this.add.text(layout.copyX, layout.titleY, copy.title, {
      fontFamily: FONT,
      resolution: TEXT_RES,
      fontSize: '19px',
      fontWeight: '900',
      color: UI_COLORS.ink,
    }).setOrigin(0.5))

    items.push(this.add.text(layout.copyX, layout.bodyY, bodyCopy, {
      fontFamily: FONT,
      resolution: TEXT_RES,
      fontSize: layout.wide ? '13px' : '11px',
      fontWeight: '800',
      color: UI_COLORS.inkSoft,
      align: 'center',
      wordWrap: { width: layout.bodyWidth },
    }).setOrigin(0.5, 0))

    const confirm = this._actionButton(layout.copyX, layout.confirmY, '釣果は登録済み・港を見る', () => {
      container.destroy(true)
      this.cameras.main.flash(180, 235, 250, 255, true)
    }, layout.actionWidth, layout.actionHeight)
    items.push(confirm)

    const returnFishing = this._actionButton(layout.copyX, layout.returnY, '次の釣り場を選ぶ', () => {
      container.destroy(true)
      this.scene.start('MapScene')
    }, layout.actionWidth, layout.actionHeight)
    items.push(returnFishing)

    const container = this.add.container(0, 18, items).setDepth(220).setAlpha(0)
    this.tweens.add({ targets: container, y: 0, alpha: 1, duration: 240, ease: 'Back.easeOut' })
    this.time.delayedCall(280, () => {
      this.cameras.main.flash(180, 255, legendary ? 226 : 245, legendary ? 120 : 210, true)
      this.tweens.add({
        targets: fishVisual,
        scaleX: fishVisual.scaleX * 1.07,
        scaleY: fishVisual.scaleY * 1.07,
        duration: 420,
        yoyo: true,
        ease: 'Sine.easeInOut',
      })
    })
  }
}
