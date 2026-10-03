import type { SkyState, RGB } from '../skyState'

export interface Frame {
  w: number
  h: number
  t: number
  dpr: number
  calm: boolean
}

export interface Layer {
  update(dt: number, s: SkyState, f: Frame): void
  draw(ctx: CanvasRenderingContext2D, s: SkyState, f: Frame): void
}

export const TAU = Math.PI * 2
export const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x))
export const rgba = (c: RGB | readonly number[], a = 1) =>
  `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`
export const WHITE: RGB = [255, 255, 255]
