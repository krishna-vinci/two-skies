import { mulberry32 } from '../noise'
import type { SkyState } from '../skyState'
import { TAU, type Frame, type Layer } from './util'

interface Star {
  x: number
  y: number
  r: number
  ph: number
  sp: number
  big: boolean
  tint: string
}

const TINTS = ['255,255,255', '210,225,255', '255,244,214']

export class Stars implements Layer {
  private pts: Star[] = []
  private key = ''

  update(_dt: number, _s: SkyState, f: Frame) {
    const key = `${f.w}x${f.h}`
    if (key === this.key) return
    this.key = key
    const rng = mulberry32(7)
    const n = Math.round((f.w * f.h) / 2200)
    this.pts = Array.from({ length: n }, () => {
      const big = rng() > 0.93
      return {
        x: rng() * f.w,
        y: Math.pow(rng(), 0.85) * f.h * 0.82,
        r: big ? 1.3 + rng() * 1 : 0.6 + rng() * 0.8,
        ph: rng() * TAU,
        sp: 0.6 + rng() * 2.2,
        big,
        tint: TINTS[Math.floor(rng() * TINTS.length)],
      }
    })
  }

  draw(ctx: CanvasRenderingContext2D, s: SkyState, f: Frame) {
    if (s.stars < 0.01) return
    for (const p of this.pts) {
      const tw = f.calm ? 0.8 : 0.55 + 0.45 * Math.sin(f.t * p.sp + p.ph)
      const horizonFade = 1 - (p.y / f.h) * 0.9
      const a = Math.min(1, s.stars * tw * horizonFade * 1.5)
      if (a < 0.02) continue
      ctx.fillStyle = `rgba(${p.tint},${a})`
      if (p.big) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, TAU)
        ctx.fill()
        ctx.strokeStyle = `rgba(${p.tint},${a * 0.35})`
        ctx.lineWidth = 0.7
        const l = p.r * 4.5
        ctx.beginPath()
        ctx.moveTo(p.x - l, p.y)
        ctx.lineTo(p.x + l, p.y)
        ctx.moveTo(p.x, p.y - l)
        ctx.lineTo(p.x, p.y + l)
        ctx.stroke()
      } else {
        ctx.fillRect(p.x, p.y, p.r, p.r)
      }
    }
  }
}
