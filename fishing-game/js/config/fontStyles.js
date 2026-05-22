export const FONT = 'Nunito, "M PLUS Rounded 1c", system-ui, sans-serif'
export const OUTLINE = '#1a2a3a'

export const SHADOW = {
  strong: { offsetX: 2, offsetY: 2, color: 'rgba(0,0,0,0.50)', blur: 0,  fill: true },
  medium: { offsetX: 1, offsetY: 2, color: 'rgba(0,0,0,0.35)', blur: 0,  fill: true },
  soft:   { offsetX: 1, offsetY: 1, color: 'rgba(0,0,0,0.22)', blur: 0,  fill: true },
  subtle: { offsetX: 0, offsetY: 1, color: 'rgba(0,0,0,0.12)', blur: 0,  fill: true },
}

export const TITLE_SHADOW = SHADOW.medium

export const TYPE = {
  display: { fontFamily: FONT, fontSize: '52px', fontWeight: '900', color: '#ffffff', shadow: SHADOW.strong },
  h1:      { fontFamily: FONT, fontSize: '30px', fontWeight: '900', color: '#1a3a5a', shadow: SHADOW.medium },
  h2:      { fontFamily: FONT, fontSize: '22px', fontWeight: '800', color: '#1a3a5a' },
  h3:      { fontFamily: FONT, fontSize: '18px', fontWeight: '700', color: '#1a3a5a' },
  body:    { fontFamily: FONT, fontSize: '16px', fontWeight: '800', color: '#1a3a5a' },
  label:   { fontFamily: FONT, fontSize: '14px', fontWeight: '900', color: '#4a7090' },
  caption: { fontFamily: FONT, fontSize: '13px', fontWeight: '800', color: '#4a7090' },
  badge:   { fontFamily: FONT, fontSize: '13px', fontWeight: '900', color: '#1a2a3a' },
}

export const UI_TEXT = {
  screenTitle: { fontSize: '30px', fontWeight: '900', color: '#1a3a5a', shadow: SHADOW.subtle },
  screenLead:  { fontSize: '15px', fontWeight: '900', color: '#45687f' },
  panelTitle:  { fontSize: '23px', fontWeight: '900', color: '#1a3a5a' },
  panelMeta:   { fontSize: '13px', fontWeight: '900', color: '#d56f00' },
  cardTitle:   { fontSize: '15px', fontWeight: '900', color: '#1a3a5a' },
  cardMeta:    { fontSize: '13px', fontWeight: '900', color: '#d56f00' },
  chip:        { fontSize: '14px', fontWeight: '900', color: '#1a2a3a' },
  micro:       { fontSize: '12px', fontWeight: '900', color: '#4a7090' },
  button:      { fontSize: '14px', fontWeight: '900', color: '#1a2a3a' },
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
    fontWeight: '700',
    color: '#1a3a5a',
    shadow: SHADOW.medium,
  },
  button: {
    fontFamily: FONT,
    fontSize: '22px',
    fontWeight: '700',
    color: '#1a2a3a',
  },
  body: {
    fontFamily: FONT,
    fontSize: '17px',
    fontWeight: '700',
    color: '#1a3a5a',
  },
  scoreValue: {
    fontFamily: FONT,
    fontSize: '22px',
    fontWeight: '700',
    color: '#e07800',
  },
  scoreLabel: {
    fontFamily: FONT,
    fontSize: '13px',
    fontWeight: '700',
    color: '#4a7090',
  },
}
