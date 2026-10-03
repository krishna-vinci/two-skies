import { PULL_THRESHOLD } from '../lib/usePullToRefresh'

export function PullIndicator({ pull, dragging, refreshing }: { pull: number; dragging: boolean; refreshing: boolean }) {
  const progress = Math.min(1, pull / PULL_THRESHOLD)
  const visible = pull > 2 || refreshing
  return (
    <div
      aria-hidden={!visible}
      className="pointer-events-none fixed left-1/2 top-0 z-[70]"
      style={{
        transform: `translate(-50%, calc(max(10px, env(safe-area-inset-top)) + ${pull * 0.85 - 48}px))`,
        opacity: visible ? 1 : 0,
        transition: dragging ? 'none' : 'transform 0.3s cubic-bezier(0.22,1,0.36,1), opacity 0.25s',
      }}
    >
      <div className="glass flex h-11 w-11 items-center justify-center" style={{ borderRadius: 999 }}>
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={refreshing ? 'animate-spin' : ''}
          style={refreshing ? undefined : { transform: `rotate(${progress * 270}deg)`, opacity: 0.45 + progress * 0.55 }}
        >
          <path d="M20 12a8 8 0 1 1-2.6-5.9" />
          <path d="M20 4v4.5h-4.5" />
        </svg>
      </div>
    </div>
  )
}
