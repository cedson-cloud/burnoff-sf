'use client'

import Icon from './Icon'

// The README's step-by-step guide, not the top of the repo.
const DEPLOY_URL = 'https://github.com/cedson-cloud/burnoff-sf#use-it-for-your-own-search'

export default function DemoBanner({ own, onHelp }: { own: boolean; onHelp: () => void }) {
  return (
    <div className="flex items-center gap-3 bg-fog-2 pl-4 pr-1 text-[13px] text-ink-2 lg:pl-8 lg:pr-5">
      <p className="min-w-0 flex-1">
        {own ? 'Your board, saved in this browser only.' : 'Sample board. Your changes stay in this browser.'}
      </p>
      <a
        href={DEPLOY_URL}
        target="_blank"
        rel="noreferrer"
        className="inline-flex min-h-11 flex-none items-center font-semibold text-ink underline underline-offset-[3px]"
      >
        Deploy your own
      </a>
      <button
        onClick={onHelp}
        className="grid size-11 flex-none place-items-center rounded-full text-ink active:bg-fog"
        aria-label="Show the walkthrough"
      >
        <Icon name="help" />
      </button>
    </div>
  )
}
