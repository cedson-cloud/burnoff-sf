'use client'

import { ReactNode } from 'react'
import { FogMark } from './Icon'

export const inputCls =
  'w-full min-h-11 rounded-control border-[1.5px] border-line-strong bg-field px-3 text-[15px] outline-none focus:border-ink disabled:bg-well disabled:text-ink-2'

// Grows with its text instead of scrolling inside a scrolling sheet.
export const textareaCls = `${inputCls} min-h-[88px] py-2.5 [field-sizing:content]`

// A segmented control: a sunken track with the chosen segment raised on paper.
export const segmentTrack = 'flex rounded-inset bg-ink/8 p-[3px]'
export const segment = (on: boolean) =>
  `min-h-10 flex-1 rounded-control px-3 text-[15px] font-semibold ${on ? 'bg-paper text-ink shadow-raised' : 'text-ink-2'}`

// A labeled field. `fog` marks one that feeds an unknown score factor; `hint`
// says what the value does.
export function Field({
  label, span, fog, hint, children,
}: {
  label: string
  span?: boolean
  fog?: boolean
  hint?: string
  children: ReactNode
}) {
  return (
    <label className={`block min-w-0 ${span ? 'col-span-2' : ''}`}>
      <span className={`mb-1.5 flex items-center gap-1.5 text-[13.5px] font-medium ${fog ? 'text-haze-ink' : 'text-ink-2'}`}>
        {fog && <FogMark />}
        {label}
      </span>
      {children}
      {hint && <span className="mt-1.5 block text-[13px] text-ink-2">{hint}</span>}
    </label>
  )
}

export function Group({ title, hint, children }: { title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <section>
      <h4 className="text-[15px] font-semibold">{title}</h4>
      {hint && <p className="mt-0.5 text-sm text-ink-2">{hint}</p>}
      <div className="mt-3 grid grid-cols-2 gap-3">{children}</div>
    </section>
  )
}
