const DEFAULTS = {
  size: 20,
  fg: 0x1f6f9f,
  bg: 0xf8fdff,
  border: 0x9bcfe5,
  depth: 20,
}

export function drawUiGlyph(scene, x, y, type, options = {}) {
  const o = { ...DEFAULTS, ...options }
  const g = scene.add.graphics().setDepth(o.depth)
  if (o.disc !== false) {
    g.fillStyle(o.bg, 1)
    g.lineStyle(1.5, o.border, 0.9)
    g.fillCircle(x, y, o.size)
    g.strokeCircle(x, y, o.size)
  }
  g.fillStyle(o.fg, 1)
  g.lineStyle(Math.max(2, o.size * 0.12), o.fg, 1)
  drawGlyph(g, type, x, y, o.size / 20)
  return g
}

export function drawGlyph(g, type, x, y, s = 1) {
  if (type === 'rod') {
    g.lineBetween(x - 9*s, y + 11*s, x + 7*s, y - 11*s)
    g.lineStyle(2*s, 0xffffff, 0.95)
    g.lineBetween(x + 7*s, y - 11*s, x + 10*s, y + 3*s)
    g.strokeCircle(x + 10*s, y + 6*s, 3*s)
    return
  }
  if (type === 'trophy') {
    g.fillRoundedRect(x - 8*s, y - 11*s, 16*s, 11*s, 3*s)
    g.fillRect(x - 3*s, y, 6*s, 8*s)
    g.fillRoundedRect(x - 8*s, y + 8*s, 16*s, 4*s, 2*s)
    g.strokeArc(x - 9*s, y - 5*s, 5*s, Math.PI/2, Math.PI*1.5)
    g.strokeArc(x + 9*s, y - 5*s, 5*s, -Math.PI/2, Math.PI/2)
    return
  }
  if (type === 'fish') {
    g.fillEllipse(x - 2*s, y, 19*s, 10*s)
    g.fillTriangle(x + 7*s, y, x + 15*s, y - 7*s, x + 15*s, y + 7*s)
    g.fillStyle(0xf8fdff, 1)
    g.fillCircle(x - 7*s, y - 2*s, 1.8*s)
    return
  }
  if (type === 'mission') {
    g.fillRoundedRect(x - 10*s, y - 12*s, 20*s, 24*s, 4*s)
    g.fillStyle(0xf8fdff, 1)
    g.fillRoundedRect(x - 5*s, y - 6*s, 10*s, 2.5*s, 1*s)
    g.fillRoundedRect(x - 5*s, y, 10*s, 2.5*s, 1*s)
    g.fillRoundedRect(x - 5*s, y + 6*s, 7*s, 2.5*s, 1*s)
    return
  }
  if (type === 'ticket') {
    g.fillRoundedRect(x - 13*s, y - 8*s, 26*s, 16*s, 4*s)
    g.fillStyle(0xf8fdff, 1)
    g.fillCircle(x - 8*s, y, 2*s)
    g.fillCircle(x + 8*s, y, 2*s)
    g.fillRect(x - 1*s, y - 6*s, 2*s, 12*s)
    return
  }
  if (type === 'gift') {
    g.fillRoundedRect(x - 12*s, y - 4*s, 24*s, 16*s, 3*s)
    g.fillRect(x - 14*s, y - 8*s, 28*s, 6*s)
    g.fillStyle(0xf8fdff, 1)
    g.fillRect(x - 2*s, y - 8*s, 4*s, 20*s)
    g.fillStyle(0x1f6f9f, 1)
    g.strokeCircle(x - 5*s, y - 11*s, 5*s)
    g.strokeCircle(x + 5*s, y - 11*s, 5*s)
    return
  }
  if (type === 'profile') {
    g.fillCircle(x, y - 7*s, 6*s)
    g.fillEllipse(x, y + 7*s, 20*s, 12*s)
    return
  }
  if (type === 'settings') {
    g.strokeCircle(x, y, 8*s)
    g.fillCircle(x, y, 3*s)
    for (let i=0;i<8;i++) {
      const a=Math.PI*2*i/8
      const x1=x+Math.cos(a)*10*s, y1=y+Math.sin(a)*10*s
      const x2=x+Math.cos(a)*14*s, y2=y+Math.sin(a)*14*s
      g.lineBetween(x1,y1,x2,y2)
    }
    return
  }
  if (type === 'book') {
    g.fillRoundedRect(x - 13*s, y - 10*s, 12*s, 20*s, 3*s)
    g.fillRoundedRect(x + 1*s, y - 10*s, 12*s, 20*s, 3*s)
    g.fillStyle(0xf8fdff, 1)
    g.fillRect(x - 1*s, y - 8*s, 2*s, 16*s)
    return
  }
  if (type === 'shop') {
    g.fillRoundedRect(x - 12*s, y - 3*s, 24*s, 14*s, 3*s)
    g.fillRoundedRect(x - 9*s, y - 12*s, 18*s, 9*s, 3*s)
    g.fillStyle(0xf8fdff, 1)
    g.fillRoundedRect(x - 4*s, y + 2*s, 8*s, 9*s, 2*s)
    return
  }
  if (type === 'rank') {
    g.fillCircle(x, y - 2*s, 8*s)
    g.fillTriangle(x - 7*s, y + 4*s, x - 2*s, y + 14*s, x + 1*s, y + 5*s)
    g.fillTriangle(x + 7*s, y + 4*s, x + 2*s, y + 14*s, x - 1*s, y + 5*s)
    g.fillStyle(0xf8fdff, 1)
    g.fillCircle(x, y - 2*s, 3*s)
    return
  }
  if (type === 'help') {
    g.strokeCircle(x, y, 11*s)
    g.lineStyle(3*s, 0x1f6f9f, 1)
    g.lineBetween(x - 2*s, y - 5*s, x + 2*s, y - 8*s)
    g.lineBetween(x + 2*s, y - 8*s, x + 6*s, y - 4*s)
    g.lineBetween(x + 6*s, y - 4*s, x + 1*s, y + 1*s)
    g.fillCircle(x + 1*s, y + 7*s, 1.7*s)
    return
  }
  g.fillCircle(x, y, 6*s)
}
