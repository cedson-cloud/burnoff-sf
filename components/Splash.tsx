import { ReactNode } from 'react'
import Wordmark from './Wordmark'

// A centered screen with the wordmark, for when there's no board to show yet:
// the passcode prompt, the site root's dead end, a link to a board that's gone.
export default function Splash({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6">
      <div className="w-full max-w-xs text-center">
        <h1>
          <Wordmark className="text-[28px]" />
        </h1>
        {children}
      </div>
    </main>
  )
}
