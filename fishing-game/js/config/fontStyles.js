export const FONT = 'Nunito, "M PLUS Rounded 1c", system-ui, sans-serif'
export const OUTLINE = '#1a2a3a'

export const SHADOW = {
  strong: { offsetX: 2, offsetY: 3, color: 'rgba(0,0,0,0.55)', blur: 6,  fill: true },
  medium: { offsetX: 1, offsetY: 2, color: 'rgba(0,0,0,0.35)', blur: 4,  fill: true },
  soft:   { offsetX: 1, offsetY: 1, color: 'rgba(0,0,0,0.22)', blur: 3,  fill: true },
  subtle: { offsetX: 0, offsetY: 1, color: 'rgba(0,0,0,0.12)', blur: 2,  fill: true },
}

export const TITLE_SHADOW = SHADOW.medium

export const TYPE = {
  display: { fontFamily: FONT, fontSize: '52px', fontStyle: '900', color: '#ffffff', shadow: SHADOW.strong },
  h1:      { fontFamily: FONT, fontSize: '30px', fontStyle: '900', color: '#1a3a5a', shadow: SHADOW.medium },
  h2:      { fontFamily: FONT, fontSize: '22px', fontStyle: '800', color: '#1a3a5a' },
  h3:      { fontFamily: FONT, fontSize: '18px', fontStyle: '700', color: '#1a3a5a' },
  body:    { fontFamily: FONT, fontSize: '15px', fontStyle: '700', color: '#1a3a5a' },
  label:   { fontFamily: FONT, fontSize: '13px', fontStyle: '800', color: '#4a7090' },
  caption: { fontFamily: FONT, fontSize: '12px', fontStyle: '700', color: '#4a7090' },
  badge:   { fontFamily: FONT, fontSize: '11px', fontStyle: '900', color: '#1a2a3a' },
}

export const FONT_STYLES = {
  title: {
    fontFamily: FONT,
    fontSize: '42px',
    fontStyle: '700',
    color: '#1a3a5a',
    shadow: SHADOW.medium,
  },
  button: {
    fontFamily: FONT,
    fontSize: '22px',
    fontStyle: '700',
    color: '#1a2a3a',
  },
  body: {
    fontFamily: FONT,
    fontSize: '17px',
    fontStyle: '600',
    color: '#1a3a5a',
  },
  scoreValue: {
    fontFamily: FONT,
    fontSize: '22px',
    fontStyle: '700',
    color: '#e07800',
  },
  scoreLabel: {
    fontFamily: FONT,
    fontSize: '12px',
    fontStyle: '700',
    color: '#4a7090',
  },
}
