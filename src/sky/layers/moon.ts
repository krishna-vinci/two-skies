import type { SkyState } from '../skyState'
import { TAU, type Frame, type Layer } from './util'

export class Moon implements Layer {
  update() {}

  draw(ctx: CanvasRenderingContext2D, s: SkyState, f: Frame) {
    if (s.moonVisible < 0.01) return
    const r = Math.min(f.w, f.h) * 0.075
    const cx = f.w * 0.76
    const cy = f.h * 0.2
    const a = s.moonVisible

    // soft halo
    const halo = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r * 5)
    halo.addColorStop(0, `rgba(200,215,255,${0.3 * a})`)
    halo.addColorStop(0.25, `rgba(200,215,255,${0.14 * a})`)
    halo.addColorStop(0.55, `rgba(200,215,255,${0.045 * a})`)
    halo.addColorStop(1, 'rgba(200,215,255,0)')
    ctx.fillStyle = halo
    ctx.fillRect(cx - r * 5, cy - r * 5, r * 10, r * 10)

    ctx.save()
    ctx.translate(cx, cy)
    // dark side (earthshine)
    ctx.fillStyle = `rgba(150,165,205,${0.14 * a})`
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, TAU)
    ctx.fill()

    // lit shape
    const p = s.moonPhase
    if (p > 0.5) ctx.scale(-1, 1)
    const rx = r * Math.cos(p * TAU)
    ctx.beginPath()
    ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, false)
    ctx.ellipse(0, 0, Math.max(0.001, Math.abs(rx)), r, 0, Math.PI / 2, -Math.PI / 2, rx > 0)
    ctx.closePath()
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r * 1.1)
    g.addColorStop(0, `rgba(255,252,240,${a})`)
    g.addColorStop(1, `rgba(214,222,240,${a})`)
    ctx.fillStyle = g
    ctx.fill()

    // faint maria
    ctx.clip()
    ctx.fillStyle = `rgba(150,160,185,${0.22 * a})`
    for (const [x, y, k] of [
      [-0.25, -0.2, 0.28],
      [0.2, 0.15, 0.22],
      [-0.05, 0.4, 0.15],
      [0.38, -0.3, 0.12],
    ]) {
      ctx.beginPath()
      ctx.arc(x * r, y * r, k * r, 0, TAU)
      ctx.fill()
    }
    ctx.restore()
  }
}
