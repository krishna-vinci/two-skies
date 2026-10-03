import type { SkyState } from '../skyState'
import type { Frame, Layer } from './util'

interface Strike {
  t: number
  flashes: { at: number; a: number }[]
  bolt: [number, number][] | null
  branch: [number, number][] | null
}

export class Lightning implements Layer {
  private next = 2.5
  private strike: Strike | null = null
  private flash = 0

  update(dt: number, s: SkyState, f: Frame) {
    if (!s.lightning || f.calm) {
      this.strike = null
      this.flash = 0
      this.next = 2.5
      return
    }
    this.next -= dt
    if (!this.strike && this.next <= 0) {
      this.strike = this.make(f)
      this.next = 3 + Math.random() * 6
    }
    const k = this.strike
    if (k) {
      k.t += dt
      let a = 0
      for (const fl of k.flashes) if (k.t >= fl.at) a += fl.a * Math.exp(-(k.t - fl.at) / 0.12)
      this.flash = Math.min(0.55, a)
      if (k.t > 0.9) this.strike = null
    } else {
      this.flash = 0
    }
  }

  private make(f: Frame): Strike {
    const showBolt = Math.random() < 0.6
    let bolt: [number, number][] | null = null
    let branch: [number, number][] | null = null
    if (showBolt) {
      let x = f.w * (0.2 + Math.random() * 0.6)
      let y = 0
      bolt = [[x, y]]
      const segs = 7 + Math.floor(Math.random() * 3)
      const step = (f.h * 0.62) / segs
      for (let i = 0; i < segs; i++) {
        x += (Math.random() - 0.5) * step * 1.1
        y += step * (0.7 + Math.random() * 0.5)
        bolt.push([x, y])
      }
      const bi = 2 + Math.floor(Math.random() * 3)
      let [bx, by] = bolt[bi]
      branch = [[bx, by]]
      const dir = Math.random() < 0.5 ? -1 : 1
      for (let i = 0; i < 3; i++) {
        bx += dir * step * (0.4 + Math.random() * 0.5)
        by += step * (0.5 + Math.random() * 0.4)
        branch.push([bx, by])
      }
    }
    return {
      t: 0,
      flashes: [
        { at: 0, a: 0.42 },
        { at: 0.14, a: 0.55 },
      ],
      bolt,
      branch,
    }
  }

  draw(ctx: CanvasRenderingContext2D, _s: SkyState, f: Frame) {
    const k = this.strike
    if (!k || this.flash < 0.01) return
    ctx.fillStyle = `rgba(214,226,255,${this.flash})`
    ctx.fillRect(0, 0, f.w, f.h)
    if (k.bolt && this.flash > 0.08) {
      const a = Math.min(1, this.flash * 2.2)
      const stroke = (pts: [number, number][], w: number) => {
        ctx.beginPath()
        pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
        ctx.lineWidth = w
        ctx.stroke()
      }
      ctx.save()
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      ctx.shadowColor = 'rgba(170,200,255,0.9)'
      ctx.shadowBlur = 22
      ctx.strokeStyle = `rgba(235,242,255,${a})`
      stroke(k.bolt, 2.4)
      if (k.branch) stroke(k.branch, 1.4)
      ctx.restore()
    }
  }
}
