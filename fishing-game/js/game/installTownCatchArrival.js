import { ASSETS } from '../config/assetManifest.js'
import { FONT, SHADOW, UI_COLORS } from '../config/fontStyles.js'

const TEXT_RES = window.devicePixelRatio ?? 1

const FISH_ART = {
  aji: ASSETS.fish.ajiIcon,
  tai: ASSETS.fish.madaiIcon,
  bass: ASSETS.fish.blackBassIcon,
  buri: ASSETS.fish.buriIcon,
  kue: ASSETS.fish.kueIcon,
}

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

function arrivalCopy(rarity) {
  return ARRIVAL_COPY[rarity] ?? ARRIVAL_COPY.common
}

export function installTownCatchArrival(TownScene) {
  if (TownScene.prototype.__ainanTownCatchArrivalInstalled) return
  TownScene.prototype.__ainanTownCatchArrivalInstalled = true

  const originalCreate = TownScene.prototype.create
  TownScene.prototype.create = function (data = {}) {
    const result = originalCreate.call(this, data)
    const catchArrival = data?.catchArrival
    if (catchArrival?.fishId) this._showCatchArrival(catchArrival)
    return result
  }

  TownScene.prototype._showCatchArrival = function (catchArrival) {
    const { width: W, height: H } = this.scale
    const copy = arrivalCopy(catchArrival.rarity)
    const legendary = catchArrival.rarity === 'legendary'
    const rare = catchArrival.rarity === 'rare' || legendary
    const accent = legendary ? 0xffd95a : rare ? 0xff9f68 : 0x71d6a2

    const items = []
    const scrim = this.add.rectangle(W / 2, H / 2, W, H, 0x0b2434, 0.68).setInteractive()
    items.push(scrim)

    const x = 24
    const y = 154
    const w = W - 48
    const h = 404

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

    items.push(this.add.text(W / 2, y + 31, copy.tag, {
      fontFamily: FONT,
      resolution: TEXT_RES,
      fontSize: '10px',
      fontWeight: '900',
      color: legendary ? '#9a6b00' : UI_COLORS.oceanDeep,
      letterSpacing: 1,
    }).setOrigin(0.5))

    items.push(this.add.text(W / 2, y + 55, catchArrival.name ?? '今日の釣果', {
      fontFamily: FONT,
      resolution: TEXT_RES,
      fontSize: '23px',
      fontWeight: '900',
      color: UI_COLORS.ink,
      shadow: SHADOW.subtle,
    }).setOrigin(0.5))

    const halo = this.add.graphics()
    halo.fillStyle(accent, legendary ? 0.18 : 0.10)
    halo.fillCircle(W / 2, y + 145, 76)
    halo.lineStyle(2, accent, 0.48)
    halo.strokeCircle(W / 2, y + 145, 68)
    items.push(halo)

    const art = FISH_ART[catchArrival.fishId]
    let fishVisual
    if (art?.key && this.textures.exists(art.key)) {
      fishVisual = this.add.image(W / 2, y + 145, art.key).setDisplaySize(112, 112)
    } else {
      fishVisual = this.add.text(W / 2, y + 145, catchArrival.emoji ?? '🐟', {
        fontSize: '72px',
        resolution: TEXT_RES,
      }).setOrigin(0.5)
    }
    items.push(fishVisual)

    const statBg = this.add.graphics()
    statBg.fillStyle(0xdff5ff, 0.72)
    statBg.lineStyle(1.5, 0x9bcfe5, 0.78)
    statBg.fillRoundedRect(x + 50, y + 220, w - 100, 42, 14)
    statBg.strokeRoundedRect(x + 50, y + 220, w - 100, 42, 14)
    items.push(statBg)

    const sizeLabel = Number.isFinite(Number(catchArrival.sizeCm)) ? `${Number(catchArrival.sizeCm).toFixed(1)}cm` : '—'
    const scoreLabel = Number.isFinite(Number(catchArrival.score)) ? `+${Number(catchArrival.score).toLocaleString()}pt` : '釣果登録'
    items.push(this.add.text(W / 2 - 54, y + 241, sizeLabel, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '15px', fontWeight: '900', color: UI_COLORS.oceanDeep,
    }).setOrigin(0.5))
    items.push(this.add.text(W / 2 + 54, y + 241, scoreLabel, {
      fontFamily: FONT, resolution: TEXT_RES, fontSize: '15px', fontWeight: '900', color: UI_COLORS.warning,
    }).setOrigin(0.5))

    items.push(this.add.text(W / 2, y + 289, copy.title, {
      fontFamily: FONT,
      resolution: TEXT_RES,
      fontSize: '19px',
      fontWeight: '900',
      color: UI_COLORS.ink,
    }).setOrigin(0.5))

    items.push(this.add.text(W / 2, y + 318, copy.body, {
      fontFamily: FONT,
      resolution: TEXT_RES,
      fontSize: '11px',
      fontWeight: '800',
      color: UI_COLORS.inkSoft,
      align: 'center',
      wordWrap: { width: w - 70 },
    }).setOrigin(0.5, 0))

    const button = this._actionButton(W / 2, y + h - 38, '町のみんなに届ける', () => {
      container.destroy(true)
      this.cameras.main.flash(180, 235, 250, 255, true)
    }, 226, 48)
    items.push(button)

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
