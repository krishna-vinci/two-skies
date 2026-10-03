import { mulberry32 } from '../noise'
import type { SkyState } from '../skyState'
import { TAU, type Frame, type Layer } from './util'

interface Flake {
  x: number
  y: number
  r: number
  v: number
  ph: number
  sway: number
}

export class Snow implements Layer {
  private flakes: Flake[] = []
  private key = ''
  private active = 0
  private rng = mulberry32(5)

  update(dt: number, s: SkyState, f: Frame) {
    const key = `${f.w}x${f.h}`
    if (key !== this.key) {
      this.key = key
      const cap = Math.round((f.w * f.h) / 4500)
      this.flakes = Array.from({ length: cap }, () => this.spawn(f, true))
    }
    this.active = f.calm ? 0 : Math.round(s.snow * this.flakes.length)
    for (let i = 0; i < this.active; i++) {
      const p = this.flakes[i]
      p.y += p.v * dt
      p.x += Math.sin(f.t * 0.9 + p.ph) * p.sway * dt + s.cloudDrift * 0.3 * dt
      if (p.y > f.h + 6 || p.x > f.w + 10) Object.assign(p, this.spawn(f, false))
    }
  }

  private spawn(f: Frame, scatter: boolean): Flake {
    const r = this.rng
    const size = 0.8 + Math.pow(r(), 2) * 2.8
    return {
      x: r() * f.w,
      y: scatter ? r() * f.h : -8,
      r: size,
      v: 30 + size * 22 + r() * 24,
      ph: r() * TAU,
      sway: 8 + r() * 22,
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.active < 1) return
    for (let i = 0; i < this.active; i++) {
      const p = this.flakes[i]
      ctx.fillStyle = `rgba(255,255,255,${0.35 + Math.min(0.55, p.r * 0.2)})`
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, TAU)
      ctx.fill()
    }
  }
}
