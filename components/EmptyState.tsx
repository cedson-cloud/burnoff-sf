import { ReactNode } from 'react'

// An empty list: what goes here, and how to start.
export default function EmptyState({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-card bg-paper px-6 py-10 text-center">
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-[32ch] text-[15px] text-ink-2">{children}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
