export const FONT = 'Nunito, "M PLUS Rounded 1c", system-ui, sans-serif'

export const UI_COLORS = {
  ink: '#173248',
  inkSoft: '#45687f',
  ocean: '#2f9ed4',
  oceanDeep: '#1f6f9f',
  oceanPale: '#dff5ff',
  foam: '#f8fdff',
  sand: '#fff5d9',
  sun: '#ffd95a',
  coral: '#ff765a',
  mint: '#71d6a2',
  line: '#9bcfe5',
  muted: '#718392',
  success: '#2caf72',
  warning: '#d98519',
}

export const OUTLINE = UI_COLORS.ink

export const SHADOW = {
  strong: { offsetX: 0, offsetY: 3, color: 'rgba(23,50,72,0.34)', blur: 0, fill: true },
  medium: { offsetX: 0, offsetY: 2, color: 'rgba(23,50,72,0.22)', blur: 0, fill: true },
  soft: { offsetX: 0, offsetY: 1, color: 'rgba(23,50,72,0.14)', blur: 0, fill: true },
  subtle: { offsetX: 0, offsetY: 1, color: 'rgba(23,50,72,0.08)', blur: 0, fill: true },
}

export const TITLE_SHADOW = SHADOW.medium

export const TYPE = {
  display: { fontFamily: FONT, fontSize: '52px', fontWeight: '900', color: '#ffffff', shadow: SHADOW.strong },
  h1: { fontFamily: FONT, fontSize: '30px', fontWeight: '900', color: UI_COLORS.ink, shadow: SHADOW.subtle },
  h2: { fontFamily: FONT, fontSize: '22px', fontWeight: '900', color: UI_COLORS.ink },
  h3: { fontFamily: FONT, fontSize: '18px', fontWeight: '900', color: UI_COLORS.ink },
  body: { fontFamily: FONT, fontSize: '16px', fontWeight: '800', color: UI_COLORS.ink },
  label: { fontFamily: FONT, fontSize: '14px', fontWeight: '900', color: UI_COLORS.inkSoft },
  caption: { fontFamily: FONT, fontSize: '13px', fontWeight: '800', color: UI_COLORS.inkSoft },
  badge: { fontFamily: FONT, fontSize: '13px', fontWeight: '900', color: UI_COLORS.ink },
}

export const UI_TEXT = {
  screenTitle: { fontSize: '30px', fontWeight: '900', color: UI_COLORS.ink, shadow: SHADOW.subtle },
  screenLead: { fontSize: '15px', fontWeight: '900', color: UI_COLORS.inkSoft },
  panelTitle: { fontSize: '23px', fontWeight: '900', color: UI_COLORS.ink },
  panelMeta: { fontSize: '13px', fontWeight: '900', color: UI_COLORS.warning },
  cardTitle: { fontSize: '15px', fontWeight: '900', color: UI_COLORS.ink },
  cardMeta: { fontSize: '13px', fontWeight: '900', color: UI_COLORS.warning },
  chip: { fontSize: '14px', fontWeight: '900', color: UI_COLORS.ink },
  micro: { fontSize: '12px', fontWeight: '900', color: UI_COLORS.inkSoft },
  button: { fontSize: '14px', fontWeight: '900', color: UI_COLORS.ink },
}

export function uiText(preset, overrides = {}) {
  return {
    fontFamily: FONT,
    resolution: window.devicePixelRatio ?? 1,
    ...(UI_TEXT[preset] ?? UI_TEXT.cardTitle),
    ...overrides,
  }
}

export const FONT_STYLES = {
  title: {
    fontFamily: FONT,
    fontSize: '42px',
    fontWeight: '900',
    color: UI_COLORS.ink,
    shadow: SHADOW.subtle,
  },
  button: {
    fontFamily: FONT,
    fontSize: '22px',
    fontWeight: '900',
    color: UI_COLORS.ink,
  },
  body: {
    fontFamily: FONT,
    fontSize: '17px',
    fontWeight: '800',
    color: UI_COLORS.ink,
  },
  scoreValue: {
    fontFamily: FONT,
    fontSize: '22px',
    fontWeight: '900',
    color: UI_COLORS.warning,
  },
  scoreLabel: {
    fontFamily: FONT,
    fontSize: '13px',
    fontWeight: '800',
    color: UI_COLORS.inkSoft,
  },
}
