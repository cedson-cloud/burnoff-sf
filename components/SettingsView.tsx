'use client'

import { ReactNode, useEffect, useState } from 'react'
import { introLine } from '@/lib/messages'
import { blockedDay } from '@/lib/tours'
import { Settings } from '@/lib/types'
import { Field, Group, inputCls, textareaCls } from './Field'
import Icon from './Icon'
import { WEEKDAYS } from './listing-format'
import Sheet from './Sheet'

// Your criteria: what every listing is scored against, plus the profile the
// messages speak from. One form, with Save in the sheet's footer so it stays on
// screen. `children` go below the form (the demo's data controls).
export default function SettingsView({
  settings, onSave, onClose, children,
}: {
  settings: Settings
  onSave: (s: Settings) => void
  onClose: () => void
  children?: ReactNode
}) {
  const [draft, setDraft] = useState<Settings>(settings)
  const [status, setStatus] = useState<'clean' | 'edited' | 'saved'>('clean')

  // Pick up settings that changed elsewhere (the other person's save, a reset or
  // an import): always when the form has no unsaved edits, otherwise only when they're newer.
  useEffect(() => setDraft(d => (status !== 'edited' || d.updatedAt < settings.updatedAt ? settings : d)), [settings])

  const c = draft.criteria
  const p = draft.profile
  const touch = () => setStatus('edited')
  const setC = (patch: Partial<Settings['criteria']>) => {
    touch()
    setDraft(d => ({ ...d, criteria: { ...d.criteria, ...patch } }))
  }
  const setP = (patch: Partial<Settings['profile']>) => {
    touch()
    setDraft(d => ({ ...d, profile: { ...d.profile, ...patch } }))
  }

  return (
    <Sheet
      title="Your criteria"
      onClose={onClose}
      footer={
        <div className="flex items-center gap-3">
          <p aria-live="polite" className={`min-w-0 flex-1 text-sm ${status === 'saved' ? 'text-good' : 'text-ink-2'}`}>
            {status === 'saved' ? 'Saved. Scores updated.' : status === 'edited' ? 'Unsaved changes' : ''}
          </p>
          <button
            type="submit"
            form="criteria"
            disabled={status !== 'edited'}
            className="min-h-12 flex-none rounded-control px-6 btn-primary disabled:opacity-50"
          >
            Save
          </button>
        </div>
      }
    >
      <form
        id="criteria"
        onSubmit={e => {
          e.preventDefault()
          if (status !== 'edited') return
          onSave(draft)
          setStatus('saved')
        }}
      >
        <div className="space-y-8">
          <Group
            title="What you need"
            hint="Every listing gets a score out of 100 against these: cost 35, parking 20 if you need it, commute 20, size 15 and move-in 10. Change them and every listing is re-scored."
          >
            <Field label="Target a month, all-in">
              <NumInput value={c.targetAllIn} onChange={v => setC({ targetAllIn: v })} />
            </Field>
            <Field label="The most you’d pay">
              <NumInput value={c.hardCeiling} onChange={v => setC({ hardCeiling: v })} />
            </Field>
            <Field label="Smallest size (ft²)">
              <NumInput value={c.minSqft} onChange={v => setC({ minSqft: v })} />
            </Field>
            <Field label="Bedrooms">
              <NumInput value={c.beds} onChange={v => setC({ beds: v })} />
            </Field>
            <Field label="Longest commute (min)">
              <NumInput value={c.maxCommuteMin} onChange={v => setC({ maxCommuteMin: v })} />
            </Field>
            <Field label="Commute measured to">
              <input value={c.commuteAnchor ?? ''} onChange={e => setC({ commuteAnchor: e.target.value })} placeholder="Work address" className={inputCls} />
            </Field>
            <Field label="Need parking">
              <select value={c.parkingRequired ? 'yes' : 'no'} onChange={e => setC({ parkingRequired: e.target.value === 'yes' })} className={inputCls}>
                <option value="yes">Yes, score it</option>
                <option value="no">No, ignore it</option>
              </select>
            </Field>
            <Field label="Count parking in all-in">
              <select value={c.includeParking ? 'yes' : 'no'} onChange={e => setC({ includeParking: e.target.value === 'yes' })} className={inputCls}>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </Field>
            <Field label="Move in from">
              <input type="date" value={c.moveInStart} onChange={e => setC({ moveInStart: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Move in by">
              <input type="date" value={c.moveInEnd} onChange={e => setC({ moveInEnd: e.target.value })} className={inputCls} />
            </Field>
          </Group>

          <Group title="A day you can’t tour" hint="Optional. To do crosses it out so nobody books a tour then.">
            <Field label="Day">
              {/* Stored as blockedDay + blockedDayLabel; the day is active only while the label is set. */}
              <select
                value={blockedDay(c)}
                onChange={e => {
                  const day = +e.target.value
                  setC(day < 0 ? { blockedDayLabel: '' } : { blockedDay: day, blockedDayLabel: c.blockedDayLabel.trim() || "Can't tour" })
                }}
                className={inputCls}
              >
                <option value={-1}>None</option>
                {WEEKDAYS.map((d, i) => (
                  <option key={d} value={i}>{d}</option>
                ))}
              </select>
            </Field>
            <Field label="Why">
              <input value={c.blockedDayLabel} onChange={e => setC({ blockedDayLabel: e.target.value })} placeholder="Work shift" className={inputCls} />
            </Field>
          </Group>

          <Group title="About you" hint="Your messages speak from this. Only write what’s true.">
            <Field label="Your name">
              <input value={p.yourName} onChange={e => setP({ yourName: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Phone">
              <input type="tel" value={p.phone} onChange={e => setP({ phone: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Searching with" hint="Leave blank if it’s just you.">
              <input value={p.companionName} onChange={e => setP({ companionName: e.target.value })} placeholder="Their name" className={inputCls} />
            </Field>
            <Field label="Messages call them">
              <input value={p.companionPhrase} onChange={e => setP({ companionPhrase: e.target.value })} placeholder="my wife" className={inputCls} />
            </Field>
            <Field label="Moving from">
              <input value={p.movingFrom} onChange={e => setP({ movingFrom: e.target.value })} placeholder="Sacramento" className={inputCls} />
            </Field>
            <Field label="When, in words">
              <input value={p.moveInWindowText} onChange={e => setP({ moveInWindowText: e.target.value })} placeholder="late October" className={inputCls} />
            </Field>
            <Field label="About you" span hint="Goes in first messages to private owners.">
              <textarea value={p.aboutUs} onChange={e => setP({ aboutUs: e.target.value })} rows={3} placeholder="Two quiet professionals, no pets, non-smokers." className={textareaCls} />
            </Field>
            <Field label="Qualifications" span>
              <textarea value={p.qualifications} onChange={e => setP({ qualifications: e.target.value })} rows={3} placeholder="Combined income over 3x rent, strong credit, references available." className={textareaCls} />
            </Field>
            <div className="col-span-2 rounded-inset bg-well p-4">
              <p className="text-[13.5px] font-medium text-ink-2">Your messages will open like this</p>
              <p className="mt-1 text-[15px] leading-relaxed">{introLine(p)}</p>
            </div>
          </Group>

          <p className="flex gap-2.5 rounded-inset px-4 py-3.5 text-sm text-ink-2 shadow-[inset_0_0_0_1.5px_var(--line)]">
            <Icon name="alert" size={18} className="mt-px flex-none text-ink" />
            <span>
              Burnoff has no real accounts or security. Never store SSNs, bank or account numbers, or income documents
              here. Application paperwork goes straight to the landlord, not into this app.
            </span>
          </p>
        </div>
      </form>
      {children && <div className="mt-8">{children}</div>}
    </Sheet>
  )
}

function NumInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      inputMode="numeric"
      value={Number.isFinite(value) ? value : ''}
      onChange={e => onChange(e.target.value === '' ? 0 : +e.target.value)}
      className={inputCls}
    />
  )
}
