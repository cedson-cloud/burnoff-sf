'use client'

import { ReactNode, useEffect, useRef } from 'react'
import Icon from './Icon'

// Full-screen sheet, mobile-first: fills the viewport, header stays put,
// content scrolls, close is always reachable with a thumb. On desktop it is
// the side panel next to the list (Board gives it the column).
export default function Sheet({
  title, onClose, children, footer, actions,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  actions?: ReactNode // extra header buttons, left of Close
}) {
  // Move focus into the sheet when it opens, so keyboard and screen reader users start here.
  // Board makes the page behind a phone sheet inert, so focus can't wander out of it, and
  // hands focus back to whatever opened the sheet once it closes.
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => ref.current?.focus({ preventScroll: true }), [])
  // Escape closes, same as the Close button.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented && !e.isComposing) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div ref={ref} tabIndex={-1} role="dialog" aria-label={title} className="fixed inset-0 outline-none z-30 flex flex-col bg-paper lg:static lg:h-full lg:overflow-hidden lg:rounded-card lg:shadow-panel">
      <header className="flex flex-none items-center gap-1 border-b border-line py-2 pl-5 pr-2">
        <h2 className="min-w-0 flex-1 truncate font-display text-[22px] font-semibold leading-tight tracking-[-0.01em]">
          {title}
        </h2>
        {actions}
        <button
          onClick={onClose}
          aria-label="Close"
          className="grid size-11 flex-none place-items-center rounded-full text-ink active:bg-well"
        >
          <Icon name="close" />
        </button>
      </header>
      <div data-sheet-body className="min-h-0 flex-1 overflow-y-auto px-5">
        <div className="mx-auto max-w-2xl py-4">{children}</div>
      </div>
      {footer && (
        <footer className="flex-none border-t border-line bg-paper px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto max-w-2xl">{footer}</div>
        </footer>
      )}
    </div>
  )
}
