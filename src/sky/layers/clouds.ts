import { mulberry32 } from '../noise'
import { mix, type RGB, type SkyState } from '../skyState'
import { clamp, rgba, TAU, WHITE, type Frame, type Layer } from './util'

const SW = 560
const SH = 280

interface Palette {
  hi: RGB
  mid: RGB
  lo: RGB
  shade: RGB
}
const LIGHT: Palette = { hi: [255, 255, 255], mid: [240, 244, 252], lo: [208, 217, 235], shade: [150, 165, 195] }
const DARK: Palette = { hi: [128, 136, 152], mid: [96, 104, 122], lo: [72, 80, 98], shade: [38, 44, 58] }

function buildSprite(seed: number, pal: Palette): HTMLCanvasElement {
  const rng = mulberry32(seed)
  const c = document.createElement('canvas')
  c.width = SW
  c.height = SH
  const g = c.getContext('2d')!
  const n = 10 + Math.floor(rng() * 6)
  for (let i = 0; i < n; i++) {
    const t = rng()
    const bias = 1 - Math.abs(t - 0.5) * 1.5
    const r = 34 + 62 * bias * (0.6 + 0.4 * rng())
    const cx = SW * (0.14 + 0.72 * t)
    const cy = SH * 0.68 - r * (0.35 + 0.5 * rng()) * bias
    const grad = g.createRadialGradient(cx - r * 0.2, cy - r * 0.35, r * 0.1, cx, cy, r)
    grad.addColorStop(0, rgba(pal.hi, 0.95))
    grad.addColorStop(0.72, rgba(pal.mid, 0.82))
    grad.addColorStop(1, rgba(pal.lo, 0))
    g.fillStyle = grad
    g.beginPath()
    g.arc(cx, cy, r, 0, TAU)
    g.fill()
  }
  g.globalCompositeOperation = 'source-atop'
  const sh = g.createLinearGradient(0, SH * 0.35, 0, SH * 0.82)
  sh.addColorStop(0, rgba(pal.shade, 0))
  sh.addColorStop(1, rgba(pal.shade, 0.55))
  g.fillStyle = sh
  g.fillRect(0, 0, SW, SH)
  g.globalCompositeOperation = 'destination-out'
  const fade = g.createLinearGradient(0, SH * 0.68, 0, SH * 0.88)
  fade.addColorStop(0, 'rgba(0,0,0,0)')
  fade.addColorStop(1, 'rgba(0,0,0,1)')
  g.fillStyle = fade
  g.fillRect(0, 0, SW, SH)
  return c
}

interface Band {
  scale: number
  speed: number
  alpha: number
  y: [number, number]
}
const BANDS: Band[] = [
  { scale: 0.42, speed: 0.35, alpha: 0.6, y: [0.1, 0.34] },
  { scale: 0.78, speed: 0.7, alpha: 0.85, y: [0.2, 0.46] },
  { scale: 1.15, speed: 1.2, alpha: 0.95, y: [0.3, 0.58] },
]
const PER_BAND = 7
const SPRITES = 6

interface Inst {
  sprite: number
  off: number
  y: number
  rank: number
  jit: number
  band: Band
}

export class Clouds implements Layer {
  private light: HTMLCanvasElement[]
  private dark: HTMLCanvasElement[]
  private insts: Inst[]
  private cv = document.createElement('canvas')
  private cx = this.cv.getContext('2d')!

  constructor() {
    this.light = Array.from({ length: SPRITES }, (_, i) => buildSprite(100 + i, LIGHT))
    this.dark = Array.from({ length: SPRITES }, (_, i) => buildSprite(100 + i, DARK))
    const rng = mulberry32(42)
    this.insts = BANDS.flatMap((band) =>
      Array.from({ length: PER_BAND }, () => ({
        sprite: Math.floor(rng() * SPRITES),
        off: rng() * 2000,
        y: band.y[0] + rng() * (band.y[1] - band.y[0]),
        rank: rng(),
        jit: 0.85 + rng() * 0.35,
        band,
      })),
    )
  }

  update(dt: number, s: SkyState, f: Frame) {
    const k = f.calm ? 0.25 : 1
    for (const i of this.insts) i.off += dt * s.cloudDrift * i.band.speed * k
  }

  draw(ctx: CanvasRenderingContext2D, s: SkyState, f: Frame) {
    const d = s.cloudDensity
    if (d < 0.01) return
    const { cv, cx } = this
    const pw = Math.round(f.w * f.dpr)
    const ph = Math.round(f.h * f.dpr)
    if (cv.width !== pw || cv.height !== ph) {
      cv.width = pw
      cv.height = ph
    }
    cx.setTransform(f.dpr, 0, 0, f.dpr, 0, 0)
    cx.globalCompositeOperation = 'source-over'
    cx.globalAlpha = 1
    cx.clearRect(0, 0, f.w, f.h)

    const dk = s.cloudDarkness
    const unit = clamp(f.w / 720, 0.6, 1.4)

    // overcast veil
    if (d > 0.7) {
      const va = ((d - 0.7) / 0.3) * 0.55
      const vc = mix([240, 244, 252], [84, 92, 110], dk)
      const vg = cx.createLinearGradient(0, 0, 0, f.h * 0.8)
      vg.addColorStop(0, rgba(vc, va))
      vg.addColorStop(1, rgba(vc, 0))
      cx.fillStyle = vg
      cx.fillRect(0, 0, f.w, f.h)
    }

    for (const i of this.insts) {
      const a = i.band.alpha * clamp((d - i.rank * 0.85) / 0.18)
      if (a < 0.01) continue
      const w = SW * i.band.scale * unit * i.jit
      const h = SH * i.band.scale * unit * i.jit
      const span = f.w + w
      const x = (i.off % span) - w
      const y = i.y * f.h - h * 0.5
      cx.globalAlpha = a * (1 - dk * 0.85)
      cx.drawImage(this.light[i.sprite], x, y, w, h)
      if (dk > 0.02) {
        cx.globalAlpha = a * dk
        cx.drawImage(this.dark[i.sprite], x, y, w, h)
      }
    }
    cx.globalAlpha = 1

    // tint by sky colour so sunset clouds glow and night clouds go dark
    cx.globalCompositeOperation = 'source-atop'
    const tg = cx.createLinearGradient(0, 0, 0, f.h)
    tg.addColorStop(0, rgba(mix(s.mid, WHITE, 0.35), 0.45))
    tg.addColorStop(1, rgba(mix(s.bottom, WHITE, 0.12), 0.78))
    cx.fillStyle = tg
    cx.fillRect(0, 0, f.w, f.h)
    const dim = clamp(1 - s.luminance * 2.4)
    if (dim > 0.01) {
      cx.fillStyle = rgba([8, 12, 30], dim * 0.85)
      cx.fillRect(0, 0, f.w, f.h)
    }
    cx.globalCompositeOperation = 'source-over'

    ctx.drawImage(cv, 0, 0, f.w, f.h)
  }
}
