import type { SkyState } from '../skyState'
import { clamp, TAU, type Frame, type Layer } from './util'

export class Sun implements Layer {
  update() {}

  draw(ctx: CanvasRenderingContext2D, s: SkyState, f: Frame) {
    const a = s.sunGlow
    if (a < 0.01) return
    const x = s.sunX * f.w
    const y = s.sunY * f.h
    const R = Math.max(f.w, f.h) * 0.62

    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    const g = ctx.createRadialGradient(x, y, 0, x, y, R)
    g.addColorStop(0, `rgba(255,244,214,${0.8 * a})`)
    g.addColorStop(0.07, `rgba(255,214,150,${0.62 * a})`)
    g.addColorStop(0.22, `rgba(255,160,90,${0.3 * a})`)
    g.addColorStop(0.55, `rgba(255,120,80,${0.09 * a})`)
    g.addColorStop(1, 'rgba(255,120,70,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, f.w, f.h)

    // anamorphic streak
    if (a > 0.3) {
      const sw = f.w * 0.9
      const sg = ctx.createLinearGradient(x - sw / 2, 0, x + sw / 2, 0)
      sg.addColorStop(0, 'rgba(255,220,170,0)')
      sg.addColorStop(0.5, `rgba(255,236,200,${0.28 * a})`)
      sg.addColorStop(1, 'rgba(255,220,170,0)')
      ctx.fillStyle = sg
      ctx.fillRect(x - sw / 2, y - 1.2, sw, 2.4)
    }
    ctx.restore()

    // disc, only when the sun is actually above the horizon
    if (s.sunY < 0.81 && a > 0.2) {
      const dr = Math.min(f.w, f.h) * 0.042
      const dg = ctx.createRadialGradient(x, y, 0, x, y, dr * 1.5)
      dg.addColorStop(0, `rgba(255,255,248,${clamp(a * 1.1)})`)
      dg.addColorStop(0.62, `rgba(255,246,214,${clamp(a * 1.05)})`)
      dg.addColorStop(1, 'rgba(255,230,170,0)')
      ctx.fillStyle = dg
      ctx.beginPath()
      ctx.arc(x, y, dr * 1.5, 0, TAU)
      ctx.fill()
    }
  }
}
