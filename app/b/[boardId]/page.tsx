import { redirect } from 'next/navigation'
import RealApp from '@/components/RealApp'
import { mode } from '@/lib/mode'

export const dynamic = 'force-dynamic'

export default async function BoardPage({ params }: { params: Promise<{ boardId: string }> }) {
  // The demo has no shared boards; its board lives at the root.
  if (mode() === 'demo') redirect('/')
  const { boardId } = await params
  return <RealApp boardId={boardId} />
}
