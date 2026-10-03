import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'
import { Close } from './icons'
import { useI18n } from '../lib/i18n'

export function Sheet({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode }) {
  const reduce = useReducedMotion()
  const { t } = useI18n()
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center md:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="absolute inset-0 bg-black/45 backdrop-blur-md" onClick={onClose} />
      <motion.div
        role="dialog"
        aria-label={title}
        className="glass relative max-h-[88dvh] w-full max-w-lg overflow-y-auto p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:p-6"
        style={{ borderRadius: '28px 28px 0 0', background: 'rgba(18,24,48,0.72)' }}
        initial={reduce ? false : { y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={reduce ? { opacity: 0 } : { y: 60, opacity: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-light tracking-tight">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm font-light text-white/65">{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label={t('close')} className="glass flex h-10 w-10 shrink-0 items-center justify-center" style={{ borderRadius: 999 }}>
            <Close />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  )
}
