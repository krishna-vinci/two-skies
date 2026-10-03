import { lerpState, type SkyState } from './skyState'
import { Clouds } from './layers/clouds'
import { Fog } from './layers/fog'
import { Lightning } from './layers/lightning'
import { Moon } from './layers/moon'
import { Rain } from './layers/rain'
import { Snow } from './layers/snow'
import { Stars } from './layers/stars'
import { Sun } from './layers/sun'
import { rgba, type Frame } from './layers/util'

const FADE_SECONDS = 1.2
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)

export class SkyEngine {
  private ctx: CanvasRenderingContext2D
  private w = 0
  private h = 0
  private dpr = 1
  private stars = new Stars()
  private moon = new Moon()
  private sun = new Sun()
  private clouds = new Clouds()
  private fog = new Fog()
  private rain = new Rain()
  private snow = new Snow()
  private lightning = new Lightning()
  private current: SkyState | null = null
  private from: SkyState | null = null
  private to: SkyState | null = null
  private fade = 1
  private raf = 0
  private last = 0
  private t = 0
  private wanted = false
  private mq = window.matchMedia('(prefers-reduced-motion: reduce)')
  private ro: ResizeObserver
  private canvas: HTMLCanvasElement

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(canvas)
    document.addEventListener('visibilitychange', this.onVisibility)
    this.resize()
  }

  setState(s: SkyState) {
    if (!this.current) {
      this.current = this.from = this.to = s
      this.fade = 1
      return
    }
    this.from = this.current
    this.to = s
    this.fade = 0
  }

  resize() {
    const c = this.canvas
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.w = c.clientWidth
    this.h = c.clientHeight
    c.width = Math.max(1, Math.round(this.w * this.dpr))
    c.height = Math.max(1, Math.round(this.h * this.dpr))
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
  }

  start() {
    this.wanted = true
    if (this.raf || document.hidden) return
    this.last = performance.now()
    this.raf = requestAnimationFrame(this.tick)
  }

  stop() {
    this.wanted = false
    cancelAnimationFrame(this.raf)
    this.raf = 0
  }

  destroy() {
    this.stop()
    this.ro.disconnect()
    document.removeEventListener('visibilitychange', this.onVisibility)
  }

  private onVisibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(this.raf)
      this.raf = 0
    } else if (this.wanted) {
      this.start()
    }
  }

  private tick = (now: number) => {
    this.raf = requestAnimationFrame(this.tick)
    const dt = Math.min(0.05, (now - this.last) / 1000)
    this.last = now
    this.t += dt
    if (!this.current || !this.from || !this.to || this.w < 2 || this.h < 2) return

    if (this.fade < 1) {
      this.fade = Math.min(1, this.fade + dt / FADE_SECONDS)
      this.current = lerpState(this.from, this.to, ease(this.fade))
    }
    const s = this.current
    const f: Frame = { w: this.w, h: this.h, t: this.t, dpr: this.dpr, calm: this.mq.matches }

    this.stars.update(dt, s, f)
    this.clouds.update(dt, s, f)
    this.fog.update(dt, s, f)
    this.rain.update(dt, s, f)
    this.snow.update(dt, s, f)
    this.lightning.update(dt, s, f)

    const { ctx } = this
    const g = ctx.createLinearGradient(0, 0, 0, f.h)
    g.addColorStop(0, rgba(s.top))
    g.addColorStop(0.58, rgba(s.mid))
    g.addColorStop(1, rgba(s.bottom))
    ctx.globalAlpha = 1
    ctx.fillStyle = g
    ctx.fillRect(0, 0, f.w, f.h)

    this.stars.draw(ctx, s, f)
    this.moon.draw(ctx, s, f)
    this.sun.draw(ctx, s, f)
    this.clouds.draw(ctx, s, f)
    this.fog.draw(ctx, s, f)
    this.rain.draw(ctx, s, f)
    this.snow.draw(ctx)
    this.lightning.draw(ctx, s, f)

    const r = Math.hypot(f.w, f.h) / 2
    const v = ctx.createRadialGradient(f.w / 2, f.h / 2, r * 0.55, f.w / 2, f.h / 2, r)
    v.addColorStop(0, 'rgba(0,0,0,0)')
    v.addColorStop(1, 'rgba(0,0,0,0.26)')
    ctx.fillStyle = v
    ctx.fillRect(0, 0, f.w, f.h)
  }
}
