import { useEffect, useRef } from 'react'
import { Application, Graphics } from 'pixi.js'

type TimeOfDay = 'morning' | 'noon' | 'evening' | 'night'
type Weather = 'sunny' | 'cloudy' | 'rainy'

type Props = {
  aim: number
  floatRatio: number
  status: 'idle' | 'charging' | 'casted' | 'bite' | 'fight' | 'landing' | 'result'
  castFx: boolean
  rippleOn: boolean
  fishShadowLeft: number
  power: number
  tension: number
  timeOfDay: TimeOfDay
  weather: Weather
}

export function FishingGameCanvas({
  aim,
  floatRatio,
  status,
  castFx,
  rippleOn,
  fishShadowLeft,
  power,
  tension,
  timeOfDay,
  weather,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const app = new Application()
    let mounted = true

    ;(async () => {
      await app.init({
        resizeTo: host,
        backgroundAlpha: 0,
        antialias: true,
      })
      if (!mounted) return
      host.appendChild(app.canvas)

      const g = new Graphics()
      app.stage.addChild(g)

      type Spray = { x: number; y: number; vx: number; vy: number; life: number }
      let rippleTick = 0
      const sprays: Spray[] = []
      let rodAngle = -0.52
      let rodVel = 0
      let castKick = 0
      let prevCastFx = false
      app.ticker.add(() => {
        const w = app.renderer.width
        const h = app.renderer.height
        const seaTop = h * 0.4
        const bobberX = w * (0.5 + aim * (0.17 + floatRatio * 0.03))
        const bobberY = h * (0.56 - floatRatio * 0.12)
        const fishX = (fishShadowLeft / 100) * w
        const rodBaseX = w * 0.17
        const rodBaseY = h * 0.8
        const shakeX = status === 'fight' ? Math.sin(performance.now() * 0.025) * (tension / 30) : 0
        const shakeY = status === 'fight' ? Math.cos(performance.now() * 0.02) * (tension / 40) : 0

        // Detect cast edge and inject recoil kick.
        if (castFx && !prevCastFx) {
          castKick = 0.28 + power / 250
          for (let i = 0; i < 10; i += 1) {
            sprays.push({
              x: bobberX,
              y: bobberY,
              vx: (Math.random() - 0.5) * 2.6,
              vy: -Math.random() * 2.2 - 0.4,
              life: 28 + Math.random() * 16,
            })
          }
        }
        prevCastFx = castFx

        const targetBase = status === 'charging' ? -0.28 + power / 360 : -0.52
        const target = targetBase + castKick
        const spring = 0.18
        const damping = 0.82
        rodVel += (target - rodAngle) * spring
        rodVel *= damping
        rodAngle += rodVel
        castKick *= 0.78

        g.clear()

        // Palette by time/weather.
        const skyColorByTime: Record<TimeOfDay, number> = {
          morning: 0xb9dcff,
          noon: 0x8fd2ff,
          evening: 0xf59e73,
          night: 0x19305a,
        }
        const seaColorByTime: Record<TimeOfDay, number> = {
          morning: 0x2f9fc4,
          noon: 0x1a8fb5,
          evening: 0x246e9a,
          night: 0x15395b,
        }
        const weatherShade = weather === 'rainy' ? 0.78 : weather === 'cloudy' ? 0.88 : 1
        const sky = skyColorByTime[timeOfDay]
        const sea = seaColorByTime[timeOfDay]

        // sky
        g.rect(0 + shakeX, 0 + shakeY, w, seaTop).fill({ color: sky, alpha: weatherShade })
        g.rect(0 + shakeX, seaTop + shakeY, w, h - seaTop).fill({ color: sea, alpha: weatherShade })

        // soft wave strips
        g.rect(0 + shakeX, seaTop + 6 + shakeY, w, 8).fill({ color: 0xffffff, alpha: 0.14 })
        g.rect(0 + shakeX, seaTop + 24 + shakeY, w, 7).fill({ color: 0xffffff, alpha: 0.1 })

        if (weather === 'rainy') {
          for (let i = 0; i < 26; i += 1) {
            const rx = ((performance.now() * 0.25 + i * 37) % (w + 60)) - 30
            const ry = ((performance.now() * 0.55 + i * 21) % (h * 0.8))
            g.moveTo(rx + shakeX, ry + shakeY)
            g.lineTo(rx - 5 + shakeX, ry + 10 + shakeY)
            g.stroke({ width: 1.3, color: 0xdbeafe, alpha: 0.5 })
          }
        }

        // fish shadow
        if (status === 'bite' || status === 'fight') {
          g.ellipse(fishX + shakeX, h * 0.72 + shakeY, 20, 8).fill({ color: 0x0e3448, alpha: 0.42 })
        }

        // rod body + handle
        const rodTipX = rodBaseX + Math.cos(rodAngle) * (h * 0.42)
        const rodTipY = rodBaseY + Math.sin(rodAngle) * (h * 0.42)
        g.roundRect(rodBaseX - 8, rodBaseY - 12, 18, 34, 8).fill({ color: 0x8b5a2b })
        g.moveTo(rodBaseX, rodBaseY)
        g.lineTo(rodTipX, rodTipY)
        g.stroke({ width: 4.5, color: 0x2c3e50, alpha: 0.95 })

        // cast flash line
        if (castFx) {
          const lineLen = h * (0.26 + floatRatio * 0.35)
          g.moveTo(rodTipX + shakeX, rodTipY + shakeY)
          g.lineTo(bobberX + shakeX, h * 0.78 - lineLen + shakeY)
          g.stroke({ width: 2.5, color: 0xffffff, alpha: 0.9 })
        }

        // fishing line
        g.moveTo(rodTipX + shakeX, rodTipY + shakeY)
        g.lineTo(bobberX + shakeX, bobberY + shakeY)
        g.stroke({ width: 1.8, color: 0xffffff, alpha: 0.85 })

        // bobber
        g.circle(bobberX + shakeX, bobberY - 6 + shakeY, 8).fill({ color: 0xff6b6b })
        g.roundRect(bobberX - 5 + shakeX, bobberY - 6 + shakeY, 10, 16, 6).fill({ color: 0xffffff })

        // bite ripple
        if (rippleOn) {
          rippleTick += 0.12
          const r = 8 + Math.sin(rippleTick) * 2 + rippleTick * 7
          g.circle(bobberX + shakeX, bobberY + shakeY, r).stroke({
            width: 2,
            color: 0xffffff,
            alpha: Math.max(0, 0.85 - rippleTick * 0.12),
          })
          if (rippleTick > 6) rippleTick = 0
        } else {
          rippleTick = 0
        }

        // splash particles
        for (let i = sprays.length - 1; i >= 0; i -= 1) {
          const p = sprays[i]
          p.x += p.vx
          p.y += p.vy
          p.vy += 0.08
          p.life -= 1
          if (p.life <= 0) {
            sprays.splice(i, 1)
            continue
          }
          g.circle(p.x + shakeX, p.y + shakeY, 2.2).fill({ color: 0xffffff, alpha: Math.max(0, p.life / 40) })
        }
      })
    })()

    return () => {
      mounted = false
      app.destroy(true)
    }
  }, [aim, floatRatio, status, castFx, rippleOn, fishShadowLeft, power, tension, timeOfDay, weather])

  return <div ref={hostRef} className="fishing-canvas" aria-hidden="true" />
}

