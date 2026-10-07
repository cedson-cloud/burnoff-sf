import { redirect } from 'next/navigation'
import DemoApp from '@/components/DemoApp'
import { mode } from '@/lib/mode'

export const dynamic = 'force-dynamic'

// Client composition root: the one place that picks a mode's tree. Real mode
// sends you to the board's unguessable URL, where RealApp asks for the passcode.
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
  redirect(`/b/${boardId}`)
}
