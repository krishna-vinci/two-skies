import { mix, type SkyState } from '../skyState'
import { rgba, WHITE, type Frame, type Layer } from './util'

const BANDS = [
  { y: 0.62, h: 0.2, speed: 6, off: 0 },
  { y: 0.74, h: 0.24, speed: -9, off: 300 },
  { y: 0.52, h: 0.18, speed: 4, off: 700 },
]

export class Fog implements Layer {
  private off = BANDS.map((b) => b.off)

  update(dt: number, _s: SkyState, f: Frame) {
    const k = f.calm ? 0.25 : 1
    BANDS.forEach((b, i) => (this.off[i] += dt * b.speed * k))
  }

  draw(ctx: CanvasRenderingContext2D, s: SkyState, f: Frame) {
    if (s.fog < 0.01) return
    const col = mix(s.bottom, WHITE, 0.55)
    // ground haze
    const hz = ctx.createLinearGradient(0, f.h * 0.3, 0, f.h)
    hz.addColorStop(0, rgba(col, 0))
    hz.addColorStop(1, rgba(col, s.fog * 0.55))
    ctx.fillStyle = hz
    ctx.fillRect(0, 0, f.w, f.h)

    BANDS.forEach((b, i) => {
      const span = f.w * 1.6
      const cx = ((this.off[i] % span) + span) % span - f.w * 0.3
      const ry = f.h * b.h
      ctx.save()
      ctx.translate(cx, f.h * b.y)
      ctx.scale(f.w / ry, 1)
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, ry)
      g.addColorStop(0, rgba(col, s.fog * 0.38))
      g.addColorStop(1, rgba(col, 0))
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(0, 0, ry, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    })
  }
}
