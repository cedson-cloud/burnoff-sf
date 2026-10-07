'use client'

const REPO_URL = 'https://github.com/cedson-cloud/burnoff-sf'

export default function DemoBanner({ onHelp }: { onHelp: () => void }) {
  return (
    <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 text-xs text-slate-300">
      <p className="min-w-0 flex-1">
        <span className="font-semibold text-white">Demo</span> · data stays in your browser ·{' '}
        <a href={REPO_URL} target="_blank" rel="noreferrer" className="font-medium text-white underline underline-offset-2">
          Deploy your own
        </a>
      </p>
      <button
        onClick={onHelp}
        className="flex h-6 w-6 flex-none items-center justify-center rounded-full border border-slate-600 font-semibold text-white active:bg-slate-700"
        aria-label="Show the walkthrough"
      >
        ?
      </button>
    </div>
  )
}
