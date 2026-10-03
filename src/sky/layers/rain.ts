import { mulberry32 } from '../noise'
import type { SkyState } from '../skyState'
import { clamp, type Frame, type Layer } from './util'

interface Drop {
  x: number
  y: number
  len: number
  v: number
  near: boolean
}

export class Rain implements Layer {
  private drops: Drop[] = []
  private key = ''
  private active = 0
  private slant = 0
  private rng = mulberry32(99)

  update(dt: number, s: SkyState, f: Frame) {
    const key = `${f.w}x${f.h}`
    if (key !== this.key) {
      this.key = key
      const cap = Math.round((f.w * f.h) / 1500)
      this.drops = Array.from({ length: cap }, (_, i) => this.spawn(f, i % 3 === 0, true))
    }
    this.slant = clamp((s.cloudDrift - 6) / 60, 0, 0.45) + 0.08
    this.active = f.calm ? 0 : Math.round(s.rain * this.drops.length)
    for (let i = 0; i < this.active; i++) {
      const d = this.drops[i]
      d.y += d.v * dt
      d.x += d.v * dt * this.slant
      if (d.y - d.len > f.h || d.x > f.w + 40) {
        Object.assign(d, this.spawn(f, d.near, false))
      }
    }
  }

  private spawn(f: Frame, near: boolean, scatter: boolean): Drop {
    const r = this.rng
    return {
      x: r() * (f.w + 80) - 80 * this.slant * 2,
      y: scatter ? r() * f.h : -r() * 60,
      len: near ? 20 + r() * 14 : 10 + r() * 10,
      v: near ? 1100 + r() * 500 : 700 + r() * 350,
      near,
    }
  }

  draw(ctx: CanvasRenderingContext2D, s: SkyState, f: Frame) {
    if (this.active < 1) return
    ctx.lineCap = 'round'
    for (const near of [false, true]) {
      ctx.strokeStyle = near ? 'rgba(210,224,244,0.42)' : 'rgba(200,214,236,0.2)'
      ctx.lineWidth = near ? 1.3 : 0.8
      ctx.beginPath()
      for (let i = 0; i < this.active; i++) {
        const d = this.drops[i]
        if (d.near !== near) continue
        ctx.moveTo(d.x, d.y)
        ctx.lineTo(d.x - d.len * this.slant, d.y - d.len)
      }
      ctx.stroke()
    }
    // low mist where rain meets the ground
    const g = ctx.createLinearGradient(0, f.h * 0.75, 0, f.h)
    g.addColorStop(0, 'rgba(190,205,228,0)')
    g.addColorStop(1, `rgba(190,205,228,${s.rain * 0.16})`)
    ctx.fillStyle = g
    ctx.fillRect(0, f.h * 0.75, f.w, f.h * 0.25)
  }
}
