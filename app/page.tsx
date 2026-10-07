import { redirect } from 'next/navigation'
import DemoApp from '@/components/DemoApp'
import RootRedirect from '@/components/RootRedirect'
import { mode } from '@/lib/mode'

export const dynamic = 'force-dynamic'

// Client composition root: the one place that picks a mode's tree. In real mode the
// board's URL is a secret, so the root only sends a device back to a board it has
// already opened. `npm run dev` still redirects straight there for convenience.
export default function Home() {
  if (mode() === 'demo') return <DemoApp />

  const boardId = process.env.BOARD_ID
  if (!boardId) {
    return (
      <main className="p-8 text-sm">
        <p>BOARD_ID is not set. Add it to .env.local and restart.</p>
      </main>
    )
  }
  if (process.env.NODE_ENV === 'development') redirect(`/b/${boardId}`)
  return <RootRedirect />
}
