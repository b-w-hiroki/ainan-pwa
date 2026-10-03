import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '../../../oh-edo-work/node_modules/playwright/index.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const assetDir = path.join(here, 'assets')
const previewDir = path.join(here, 'previews')
await mkdir(previewDir, { recursive: true })

const sourceNames = {
  sky: 'sky-source.png',
  clouds: 'clouds-source.png',
  distantHarbor: 'distant-harbor-source.png',
  sea: 'sea-source.png',
  platform: 'platform-source.png',
  character: 'character-rodless-source.png',
  heldRod: 'held-rod-source.png',
}

const dataUris = Object.fromEntries(await Promise.all(Object.entries(sourceNames).map(async ([key, file]) => {
  const bytes = await readFile(path.join(assetDir, file))
  return [key, `data:image/png;base64,${bytes.toString('base64')}`]
})))

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1800, height: 1320 }, deviceScaleFactor: 1 })

const normalized = await page.evaluate(async ({ dataUris }) => {
  const W = 390
  const H = 844
  const load = src => new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = src
  })
  const images = Object.fromEntries(await Promise.all(Object.entries(dataUris).map(async ([key, src]) => [key, await load(src)])))
  const bounds = image => {
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const context = canvas.getContext('2d', { willReadFrequently: true })
    context.drawImage(image, 0, 0)
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height)
    let left = canvas.width
    let top = canvas.height
    let right = -1
    let bottom = -1
    let opaquePixels = 0
    for (let y = 0; y < canvas.height; y += 1) {
      for (let x = 0; x < canvas.width; x += 1) {
        const alpha = data[(y * canvas.width + x) * 4 + 3]
        if (alpha > 8) {
          left = Math.min(left, x)
          top = Math.min(top, y)
          right = Math.max(right, x)
          bottom = Math.max(bottom, y)
          opaquePixels += 1
        }
      }
    }
    return {
      sourceWidth: canvas.width,
      sourceHeight: canvas.height,
      left,
      top,
      right,
      bottom,
      width: Math.max(0, right - left + 1),
      height: Math.max(0, bottom - top + 1),
      alphaCoverage: Number((opaquePixels / (canvas.width * canvas.height)).toFixed(4)),
    }
  }
  const sourceBounds = Object.fromEntries(Object.entries(images).map(([key, image]) => [key, bounds(image)]))
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const context = canvas.getContext('2d')
  const output = {}
  const clear = () => context.clearRect(0, 0, W, H)
  const store = key => { output[key] = canvas.toDataURL('image/png') }
  const drawBounded = (image, bound, dx, dy, dw, dh) => context.drawImage(
    image,
    bound.left,
    bound.top,
    bound.width,
    bound.height,
    dx,
    dy,
    dw,
    dh,
  )

  clear()
  context.drawImage(images.sky, 0, 0, images.sky.naturalWidth, Math.round(images.sky.naturalHeight * 0.62), 0, 0, W, 286)
  store('sky')

  clear()
  drawBounded(images.clouds, sourceBounds.clouds, -4, 42, 398, 202)
  store('clouds')

  clear()
  drawBounded(images.distantHarbor, sourceBounds.distantHarbor, -18, 178, 426, 124)
  store('distantHarbor')

  clear()
  context.drawImage(images.sea, 0, 0, images.sea.naturalWidth, images.sea.naturalHeight, 0, 240, W, H - 240)
  store('sea')

  clear()
  drawBounded(images.platform, sourceBounds.platform, -50, 500, 500, 344)
  store('platform')

  clear()
  drawBounded(images.character, sourceBounds.character, 15, 450, 154, 220)
  store('character')

  clear()
  drawBounded(images.heldRod, sourceBounds.heldRod, 124, 376, 48, 143)
  store('heldRod')

  return { output, sourceBounds }
}, { dataUris })

for (const [key, dataUri] of Object.entries(normalized.output)) {
  await writeFile(path.join(assetDir, `${key}-390x844.png`), Buffer.from(dataUri.split(',')[1], 'base64'))
}

const outputUris = Object.fromEntries(await Promise.all(Object.keys(normalized.output).map(async key => {
  const bytes = await readFile(path.join(assetDir, `${key}-390x844.png`))
  return [key, `data:image/png;base64,${bytes.toString('base64')}`]
})))

const normalizedStats = await page.evaluate(async ({ outputUris }) => {
  const load = src => new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = src
  })
  const entries = await Promise.all(Object.entries(outputUris).map(async ([key, src]) => {
    const image = await load(src)
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const context = canvas.getContext('2d', { willReadFrequently: true })
    context.drawImage(image, 0, 0)
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data
    let transparentPixels = 0
    let opaquePixels = 0
    for (let index = 3; index < data.length; index += 4) {
      if (data[index] === 0) transparentPixels += 1
      if (data[index] === 255) opaquePixels += 1
    }
    return [key, {
      width: canvas.width,
      height: canvas.height,
      transparentPixels,
      opaquePixels,
      hasTransparency: transparentPixels > 0,
    }]
  }))
  return Object.fromEntries(entries)
}, { outputUris })

for (const [key, stats] of Object.entries(normalizedStats)) {
  if (stats.width !== 390 || stats.height !== 844) throw new Error(`${key} is not normalized to 390x844`)
  if (key !== 'sea' && !stats.hasTransparency) throw new Error(`${key} lost its transparent background`)
}

const anchors = {
  design: { width: 390, height: 844 },
  horizonY: 258,
  dockTop: 500,
  character: {
    foot: { x: 92, y: 670 },
    hand: { x: 130, y: 515 },
    bounds: { x: 15, y: 450, width: 154, height: 220 },
  },
  heldRod: {
    grip: { x: 130, y: 515 },
    tip: { x: 169, y: 379 },
    bounds: { x: 124, y: 376, width: 48, height: 143 },
  },
  line: {
    start: { x: 169, y: 379 },
    target: { x: 310, y: 235 },
  },
}

const variants = [
  { id: 'normal', label: '通常配置', seaTop: 240, characterDx: 0, characterDy: 0, rodRotation: 0 },
  { id: 'wide-sea', label: '海を広く', seaTop: 188, characterDx: 0, characterDy: 0, rodRotation: 0 },
  { id: 'character-moved', label: 'キャラ位置変更', seaTop: 240, characterDx: 42, characterDy: -22, rodRotation: 0 },
  { id: 'rod-only', label: '竿単独変更', seaTop: 240, characterDx: 0, characterDy: 0, rodRotation: -8 },
]

const previews = await page.evaluate(async ({ outputUris, anchors, variants }) => {
  const load = src => new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = src
  })
  const images = Object.fromEntries(await Promise.all(Object.entries(outputUris).map(async ([key, src]) => [key, await load(src)])))
  const render = variant => {
    const canvas = document.createElement('canvas')
    canvas.width = 390
    canvas.height = 844
    const context = canvas.getContext('2d')
    context.fillStyle = '#dff5ff'
    context.fillRect(0, 0, 390, 844)
    context.drawImage(images.sky, 0, 0)
    context.drawImage(images.clouds, 0, 0)
    if (variant.seaTop < 240) {
      context.drawImage(images.sea, 0, 240, 390, 604, 0, variant.seaTop, 390, 844 - variant.seaTop)
      context.globalAlpha = 0.92
      context.drawImage(images.distantHarbor, 0, -32)
      context.globalAlpha = 1
    } else {
      context.drawImage(images.sea, 0, 0)
      context.drawImage(images.distantHarbor, 0, 0)
    }
    context.drawImage(images.platform, 0, 0)
    context.drawImage(images.character, variant.characterDx, variant.characterDy)

    const hand = {
      x: anchors.character.hand.x + variant.characterDx,
      y: anchors.character.hand.y + variant.characterDy,
    }
    const tip = {
      x: anchors.heldRod.tip.x + variant.characterDx,
      y: anchors.heldRod.tip.y + variant.characterDy,
    }
    context.save()
    context.translate(hand.x, hand.y)
    context.rotate(variant.rodRotation * Math.PI / 180)
    context.translate(-hand.x, -hand.y)
    context.drawImage(images.heldRod, variant.characterDx, variant.characterDy)
    context.restore()

    const angle = variant.rodRotation * Math.PI / 180
    const dx = tip.x - hand.x
    const dy = tip.y - hand.y
    const rotatedTip = {
      x: hand.x + dx * Math.cos(angle) - dy * Math.sin(angle),
      y: hand.y + dx * Math.sin(angle) + dy * Math.cos(angle),
    }
    context.strokeStyle = 'rgba(236,252,255,.92)'
    context.lineWidth = 1.5
    context.setLineDash([5, 7])
    context.beginPath()
    context.moveTo(rotatedTip.x, rotatedTip.y)
    context.lineTo(310, variant.seaTop < 240 ? 208 : 235)
    context.stroke()
    context.setLineDash([])

    if (variant.label) {
      context.fillStyle = 'rgba(4,26,42,.75)'
      context.fillRect(10, 10, 132, 28)
      context.fillStyle = '#fff'
      context.font = 'bold 14px sans-serif'
      context.fillText(variant.label, 20, 29)
    }
    return canvas.toDataURL('image/png')
  }
  return {
    ...Object.fromEntries(variants.map(variant => [variant.id, render(variant)])),
    completeClean: render({ ...variants[0], label: '' }),
  }
}, { outputUris, anchors, variants })

for (const [id, dataUri] of Object.entries(previews)) {
  const file = id === 'completeClean' ? 'composite-complete-clean-390x844.png' : `composite-${id}-390x844.png`
  await writeFile(path.join(previewDir, file), Buffer.from(dataUri.split(',')[1], 'base64'))
}

const comparisonCards = await Promise.all(variants.map(async variant => ({
  ...variant,
  src: `data:image/png;base64,${(await readFile(path.join(previewDir, `composite-${variant.id}-390x844.png`))).toString('base64')}`,
})))
await page.setContent(`<!doctype html><meta charset="utf-8"><style>
*{box-sizing:border-box}body{margin:0;padding:24px;background:#e9f2f5;color:#12364b;font-family:Arial,'Yu Gothic',sans-serif}
h1{margin:0 0 8px;font-size:30px}.lead{margin:0 0 20px;color:#476675}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;align-items:start}
.card{background:#fff;border:2px solid #326581;border-radius:12px;overflow:hidden;box-shadow:0 8px 20px #1232}.card h2{margin:0;padding:10px;text-align:center;font-size:18px;border-bottom:1px solid #cbdde5}
.card img{display:block;width:100%;height:auto}.note{margin-top:18px;padding:16px 20px;background:#fff;border-radius:10px;border:1px solid #abc5d1;font-size:16px;line-height:1.55}
</style><h1>AINAN cast separated asset prototype v2</h1><p class="lead">390×844共通座標 / 糸のみCanvas描画 / 承認版は未置換</p><div class="grid">${comparisonCards.map(card => `<section class="card"><h2>${card.label}</h2><img src="${card.src}"></section>`).join('')}</div><div class="note">v2では人物の帽子・髪・腰装備、足場の継ぎ目、遠景の左右配置を局所修正。海面開始位置、人物＋手アンカー、竿の手元回転は引き続き独立変更できる。</div>`)
await page.screenshot({ path: path.join(previewDir, 'comparison-4-variants.png'), fullPage: true })

const approvedBase = `data:image/png;base64,${(await readFile(path.join(here, '..', '..', 'fishing-game', 'assets', 'approved-mock', 'cast-harbor-composite-base.png'))).toString('base64')}`
const cleanComposite = `data:image/png;base64,${(await readFile(path.join(previewDir, 'composite-complete-clean-390x844.png'))).toString('base64')}`
await page.setContent(`<!doctype html><meta charset="utf-8"><style>
*{box-sizing:border-box}body{margin:0;padding:28px;background:#edf4f6;color:#14384d;font-family:Arial,'Yu Gothic',sans-serif}h1{margin:0 0 18px}.grid{display:grid;grid-template-columns:repeat(2,390px);gap:24px;justify-content:center}.card{background:#fff;border:2px solid #326581;border-radius:12px;overflow:hidden}.card h2{margin:0;padding:12px;text-align:center}.card img{display:block;width:390px;height:844px;object-fit:fill}.note{max-width:804px;margin:18px auto 0;padding:16px;background:#fff;border:1px solid #abc5d1;border-radius:10px;line-height:1.55}
</style><h1>Approved source pixels / separated prototype</h1><div class="grid"><section class="card"><h2>承認構図参照</h2><img src="${approvedBase}"></section><section class="card"><h2>分離合成試作</h2><img src="${cleanComposite}"></section></div><div class="note">主要構図、明るい港色、後方三分の一視点の釣り人は維持。人物の帽子・髪・腰装備、遠景の船/桟橋配置、足場の継ぎ目は生成編集による差が残り、正式採用前に再承認・ペイント修正が必要。</div>`)
await page.screenshot({ path: path.join(previewDir, 'source-vs-prototype.png'), fullPage: true })

const v1Composite = `data:image/png;base64,${(await readFile(path.join(here, '..', 'cast-layer-set-v1', 'previews', 'composite-complete-clean-390x844.png'))).toString('base64')}`
await page.setContent(`<!doctype html><meta charset="utf-8"><style>
*{box-sizing:border-box}body{margin:0;padding:28px;background:#edf4f6;color:#14384d;font-family:Arial,'Yu Gothic',sans-serif}h1{margin:0 0 18px}.grid{display:grid;grid-template-columns:repeat(2,390px);gap:24px;justify-content:center}.card{background:#fff;border:2px solid #326581;border-radius:12px;overflow:hidden}.card h2{margin:0;padding:12px;text-align:center}.card img{display:block;width:390px;height:844px}.note{max-width:804px;margin:18px auto 0;padding:16px;background:#fff;border:1px solid #abc5d1;border-radius:10px;line-height:1.55}
</style><h1>AINAN separated prototype — v1 / v2</h1><div class="grid"><section class="card"><h2>v1</h2><img src="${v1Composite}"></section><section class="card"><h2>v2 局所修正</h2><img src="${cleanComposite}"></section></div><div class="note">v2変更点: 人物の帽子・髪束・腰装備を承認絵へ寄せ、足場の黄色縁と過剰な継ぎ目を除去。遠景の中央桟橋をなくし、元絵と同じ左右開きの船・係留壁へ変更。</div>`)
await page.screenshot({ path: path.join(previewDir, 'v1-v2-improvement.png'), fullPage: true })

const anchorCards = [
  { label: '通常', src: cleanComposite, hand: [130, 515], tip: [169, 379] },
  { label: '人物移動 +42,-22', src: comparisonCards.find(card => card.id === 'character-moved').src, hand: [172, 493], tip: [211, 357] },
  { label: '竿のみ -8°', src: comparisonCards.find(card => card.id === 'rod-only').src, hand: [130, 515], tip: [150, 375] },
]
const anchorCard = card => {
  const marker = (point, className, text) => `<span class="marker ${className}" style="left:${point[0] * 2 - 180 - 10}px;top:${point[1] * 2 - 650 - 10}px"><b>${text}</b></span>`
  return `<section class="card"><h2>${card.label}</h2><div class="zoom"><img src="${card.src}">${marker(card.hand, 'hand', '手')}${marker(card.tip, 'tip', '先')}</div></section>`
}
await page.setContent(`<!doctype html><meta charset="utf-8"><style>
*{box-sizing:border-box}body{margin:0;padding:26px;background:#203747;color:#fff;font-family:Arial,'Yu Gothic',sans-serif}h1{margin:0 0 18px}.grid{display:grid;grid-template-columns:repeat(3,360px);gap:18px;justify-content:center}.card{background:#fff;color:#17384c;border-radius:12px;overflow:hidden}.card h2{margin:0;padding:11px;text-align:center}.zoom{position:relative;width:360px;height:560px;overflow:hidden;background:#9ddbef}.zoom>img{position:absolute;width:780px;height:1688px;left:-180px;top:-650px}.marker{position:absolute;width:20px;height:20px;border:3px solid;border-radius:50%;background:#fff8;box-shadow:0 0 0 2px #fff}.marker b{position:absolute;left:20px;top:-4px;color:#fff;background:#102b3dcc;padding:2px 5px;font-size:13px}.hand{border-color:#ff3b30}.tip{border-color:#35d06f}.note{max-width:1116px;margin:18px auto 0;padding:15px 18px;background:#fff;color:#17384c;border-radius:10px;line-height:1.55}
</style><h1>手 → 竿 → 糸 anchor QC</h1><div class="grid">${anchorCards.map(anchorCard).join('')}</div><div class="note">赤=手/グリップ、緑=竿先/糸開始。人物移動では両anchorを同じ差分で移動。竿のみ変更では手を回転中心に固定し、竿先から糸を再計算する。</div>`)
await page.screenshot({ path: path.join(previewDir, 'anchor-qc.png'), fullPage: true })

const layerCards = Object.keys(outputUris).map(key => ({ key, src: outputUris[key] }))
await page.setViewportSize({ width: 1600, height: 1300 })
await page.setContent(`<!doctype html><meta charset="utf-8"><style>
*{box-sizing:border-box}body{margin:0;padding:24px;background:#263746;color:#fff;font-family:Arial,'Yu Gothic',sans-serif}
h1{margin:0 0 18px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}.card{background:#fff;color:#16384a;border-radius:10px;overflow:hidden}.card h2{font-size:17px;margin:0;padding:9px;text-align:center}.checker{background-color:#eef3f5;background-image:linear-gradient(45deg,#cad5da 25%,transparent 25%),linear-gradient(-45deg,#cad5da 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#cad5da 75%),linear-gradient(-45deg,transparent 75%,#cad5da 75%);background-size:24px 24px;background-position:0 0,0 12px,12px -12px,-12px 0}.checker img{display:block;width:100%;height:auto}
</style><h1>AINAN cast layer inventory — 390×844</h1><div class="grid">${layerCards.map(card => `<section class="card"><h2>${card.key}</h2><div class="checker"><img src="${card.src}"></div></section>`).join('')}</div>`)
await page.screenshot({ path: path.join(previewDir, 'layer-inventory.png'), fullPage: true })

const manifest = {
  version: 2,
  status: 'prototype-review-only',
  generatedAt: new Date().toISOString(),
  anchors,
  variants,
  layers: Object.fromEntries(Object.keys(sourceNames).map(key => [key, {
    source: `assets/${sourceNames[key]}`,
    normalized: `assets/${key}-390x844.png`,
    sourcePixels: normalized.sourceBounds[key],
    normalizedCanvas: normalizedStats[key],
    transparent: normalizedStats[key].hasTransparency,
    sourceOpaque: key === 'sea',
  }])),
}
await writeFile(path.join(here, 'asset-manifest.json'), JSON.stringify(manifest, null, 2) + '\n')

await browser.close()
console.log('AINAN separated cast prototype built')
console.log(`  normalized layers: ${Object.keys(outputUris).length}`)
console.log(`  comparison variants: ${variants.length}`)
