export const UI_COMPONENT_SPEC = Object.freeze({
  spacing: Object.freeze({ xs: 4, sm: 8, md: 12, lg: 16, xl: 24 }),
  radius: Object.freeze({ chip: 10, button: 20, card: 17, panel: 24 }),
  touch: Object.freeze({ minimum: 44, comfortable: 48 }),
  type: Object.freeze({ micro: 10, meta: 12, label: 14, title: 18, action: 20 }),
  states: Object.freeze(['idle', 'selected', 'pressed', 'disabled', 'locked', 'shortage']),
})

const CARD_STATE = Object.freeze({
  idle: { fill: 0xf8fdff, border: 0x9bcfe5, alpha: 0.94, width: 1.6 },
  selected: { fill: 0xfff5d9, border: 0xffd95a, alpha: 1, width: 3 },
  disabled: { fill: 0xe7eef1, border: 0xb4c4cb, alpha: 0.74, width: 1.5 },
  locked: { fill: 0xeef2f4, border: 0x9eafb8, alpha: 0.78, width: 1.5 },
  shortage: { fill: 0xffeee9, border: 0xff765a, alpha: 0.94, width: 2 },
})

export function drawCardSurface(graphics, { x, y, w, h, state = 'idle', accent = null, radius = UI_COMPONENT_SPEC.radius.card }) {
  const style = CARD_STATE[state] ?? CARD_STATE.idle
  graphics.fillStyle(0x173248, state === 'disabled' || state === 'locked' ? 0.07 : 0.11)
  graphics.fillRoundedRect(x + 2, y + 4, w, h, radius)
  graphics.fillStyle(style.fill, style.alpha)
  graphics.lineStyle(style.width, accent ?? style.border, state === 'disabled' || state === 'locked' ? 0.55 : 0.94)
  graphics.fillRoundedRect(x, y, w, h, radius)
  graphics.strokeRoundedRect(x, y, w, h, radius)
  graphics.fillStyle(0xffffff, state === 'disabled' || state === 'locked' ? 0.24 : 0.62)
  graphics.fillRoundedRect(x + 9, y + 7, w - 18, Math.min(9, h * 0.16), 5)
}

export function drawStatusMeter(graphics, { x, y, w, h = 12, value, max = 100, tone = 'mint' }) {
  const ratio = Math.max(0, Math.min(1, max > 0 ? value / max : 0))
  const colors = { mint: 0x71d6a2, ocean: 0x58b8df, sun: 0xffd95a, coral: 0xff765a }
  const fill = colors[tone] ?? colors.ocean
  graphics.fillStyle(0x173248, 0.10)
  graphics.fillRoundedRect(x, y, w, h, h / 2)
  const fillW = Math.max(ratio > 0 ? Math.min(h / 2, w) : 0, w * ratio)
  if (fillW > 0) {
    graphics.fillStyle(fill, 1)
    graphics.fillRoundedRect(x, y, fillW, h, h / 2)
    graphics.fillStyle(0xffffff, 0.34)
    graphics.fillRoundedRect(x + 3, y + 2, Math.max(0, fillW - 6), Math.max(2, h * 0.25), h / 4)
  }
  graphics.lineStyle(1, 0xffffff, 0.54)
  graphics.strokeRoundedRect(x, y, w, h, h / 2)
  return ratio
}
