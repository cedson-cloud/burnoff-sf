'use client'

// Full-screen sheet, mobile-first: fills the viewport, header stays put,
// content scrolls, close is always reachable with a thumb.
export default function Sheet({
  title, onClose, children, footer,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-white">
      <header className="flex flex-none items-center gap-2 border-b border-slate-200 px-3 py-2.5">
        <h2 className="min-w-0 flex-1 truncate text-base font-bold">{title}</h2>
        <button
          onClick={onClose}
          className="flex-none rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 active:bg-slate-100"
        >
          Close
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <div className="mx-auto max-w-2xl">{children}</div>
      </div>
      {footer && (
        <footer className="flex-none border-t border-slate-200 bg-white px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto max-w-2xl">{footer}</div>
        </footer>
      )}
    </div>
  )
}
