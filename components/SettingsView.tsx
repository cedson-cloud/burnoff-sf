'use client'

import { useEffect, useRef, useState } from 'react'
import { introLine } from '@/lib/messages'
import { Settings } from '@/lib/types'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function SettingsView({
  settings, onSave,
}: {
  settings: Settings
  onSave: (s: Settings) => void
}) {
  const [draft, setDraft] = useState<Settings>(settings)
  const [saved, setSaved] = useState(false)
  const dirty = useRef(false) // edited since the last save

  // Pick up settings that changed elsewhere (the other person's save, a reset or
  // an import): always when the form is untouched, otherwise only when they're newer.
  useEffect(() => setDraft(d => (!dirty.current || d.updatedAt < settings.updatedAt ? settings : d)), [settings])

  const c = draft.criteria
  const p = draft.profile
  const setC = (patch: Partial<Settings['criteria']>) => {
    dirty.current = true
    setSaved(false)
    setDraft(d => ({ ...d, criteria: { ...d.criteria, ...patch } }))
  }
  const setP = (patch: Partial<Settings['profile']>) => {
    dirty.current = true
    setSaved(false)
    setDraft(d => ({ ...d, profile: { ...d.profile, ...patch } }))
  }

  return (
    <form
      className="space-y-6"
      onSubmit={e => {
        e.preventDefault()
        dirty.current = false
        onSave(draft)
        setSaved(true)
      }}
    >
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-bold">Scoring criteria</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label="Target all-in $/mo">
            <NumInput value={c.targetAllIn} onChange={v => setC({ targetAllIn: v })} />
          </Field>
          <Field label="Hard ceiling $/mo">
            <NumInput value={c.hardCeiling} onChange={v => setC({ hardCeiling: v })} />
          </Field>
          <Field label="Min sq ft">
            <NumInput value={c.minSqft} onChange={v => setC({ minSqft: v })} />
          </Field>
          <Field label="Max commute (min)">
            <NumInput value={c.maxCommuteMin} onChange={v => setC({ maxCommuteMin: v })} />
          </Field>
          <Field label="Beds">
            <NumInput value={c.beds} onChange={v => setC({ beds: v })} />
          </Field>
          <Field label="Parking required">
            <select value={c.parkingRequired ? 'yes' : 'no'} onChange={e => setC({ parkingRequired: e.target.value === 'yes' })} className={inputCls}>
              <option value="yes">Yes, score it</option>
              <option value="no">No, ignore it</option>
            </select>
          </Field>
          <Field label="Move-in window start">
            <input type="date" value={c.moveInStart} onChange={e => setC({ moveInStart: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Move-in window end">
            <input type="date" value={c.moveInEnd} onChange={e => setC({ moveInEnd: e.target.value })} className={inputCls} />
          </Field>
          <div className="col-span-2">
            <Field label="Commute anchor">
              <input value={c.commuteAnchor ?? ''} onChange={e => setC({ commuteAnchor: e.target.value })} placeholder="Address commute minutes are measured to" className={inputCls} />
            </Field>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-bold">Day you can't tour (optional)</h2>
        <p className="mt-1 text-xs text-slate-500">
          A recurring day you're never free for showings. The Week tab greys it out so nobody books a tour then.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label="Day">
            {/* Stored as blockedDay + blockedDayLabel; the day is active only while the label is set. */}
            <select
              value={c.blockedDayLabel.trim() ? c.blockedDay : -1}
              onChange={e => {
                const day = +e.target.value
                setC(day < 0 ? { blockedDayLabel: '' } : { blockedDay: day, blockedDayLabel: c.blockedDayLabel.trim() || "Can't tour" })
              }}
              className={inputCls}
            >
              <option value={-1}>None</option>
              {DAYS.map((d, i) => (
                <option key={d} value={i}>{d}</option>
              ))}
            </select>
          </Field>
          <Field label="Why (shown on the day)">
            <input value={c.blockedDayLabel} onChange={e => setC({ blockedDayLabel: e.target.value })} placeholder="e.g. Work shift" className={inputCls} />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-bold">Profile (used in message templates)</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label="Your name">
            <input value={p.yourName} onChange={e => setP({ yourName: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Searching with (optional)">
            <input value={p.companionName} onChange={e => setP({ companionName: e.target.value })} placeholder="Their name; blank if solo" className={inputCls} />
          </Field>
          <Field label="Messages call them (optional)">
            <input value={p.companionPhrase} onChange={e => setP({ companionPhrase: e.target.value })} placeholder="e.g. my wife; blank uses their name" className={inputCls} />
          </Field>
          <Field label="Phone">
            <input type="tel" value={p.phone} onChange={e => setP({ phone: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Moving from">
            <input value={p.movingFrom} onChange={e => setP({ movingFrom: e.target.value })} placeholder="e.g. Sacramento" className={inputCls} />
          </Field>
          <Field label="Move-in window, in words">
            <input value={p.moveInWindowText} onChange={e => setP({ moveInWindowText: e.target.value })} placeholder="e.g. late October" className={inputCls} />
          </Field>
          <div className="col-span-2">
            <Field label="About you (goes in first inquiries)">
              <textarea value={p.aboutUs} onChange={e => setP({ aboutUs: e.target.value })} rows={2} placeholder="e.g. Two quiet professionals, no pets, non-smokers." className={inputCls} />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Qualifications (only what's true)">
              <textarea value={p.qualifications} onChange={e => setP({ qualifications: e.target.value })} rows={2} placeholder="e.g. Combined income over 3x rent, strong credit, references available." className={inputCls} />
            </Field>
          </div>
        </div>
        <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <span className="font-semibold">Your messages will open like this:</span> “{introLine(p)}”
        </p>
      </section>

      <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
        Burnoff has no real accounts or security. Never store SSNs, bank or
        account numbers, or income documents here. Application paperwork goes directly to the
        landlord, not into this app.
      </p>

      <button type="submit" className="w-full rounded-xl bg-slate-900 py-3 font-semibold text-white active:bg-slate-700">
        {saved ? 'Saved ✓' : 'Save settings'}
      </button>
    </form>
  )
}

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm outline-none focus:border-slate-400'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</span>
      {children}
    </label>
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
