'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { household } from '@/lib/household'
import { buildTemplates } from '@/lib/messages'
import { allIn, num, scoreListing, targetUnit } from '@/lib/score'
import { Listing, STATUSES, Settings, Unit, emptyUnit } from '@/lib/types'
import { EditorSection } from './BoardNav'
import Sheet from './Sheet'

export default function ListingEditor({
  listing, section, settings, isNew, onClose, onSave, onDelete,
}: {
  listing: Listing
  section?: EditorSection // scroll here on open
  settings: Settings
  isNew: boolean
  onClose: () => void
  onSave: (l: Listing) => void
  onDelete: (id: string) => void
}) {
  const [draft, setDraft] = useState<Listing>(listing)
  const [openTemplate, setOpenTemplate] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const messagesRef = useRef<HTMLElement>(null)

  const set = (patch: Partial<Listing>) => setDraft(d => ({ ...d, ...patch }))
  const setUnit = (id: string, patch: Partial<Unit>) =>
    setDraft(d => ({ ...d, units: d.units.map(u => (u.id === id ? { ...u, ...patch } : u)) }))

  const c = settings.criteria
  const score = useMemo(() => scoreListing(draft, c), [draft, c])
  const templates = useMemo(() => buildTemplates(draft, settings), [draft, settings])
  const h = household(settings.profile)
  const you = settings.profile.yourName.trim()

  // Opened at Messages (once, on open): show the first template, not just titles.
  useEffect(() => {
    if (section !== 'messages') return
    setOpenTemplate(templates[0]?.id ?? null)
    messagesRef.current?.scrollIntoView({ block: 'start' })
  }, [])

  const copy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // http / older WebView fallback
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    setCopied(id)
    setTimeout(() => setCopied(cur => (cur === id ? null : cur)), 2000)
  }

  const sentIt = async (id: string, text: string) => {
    await copy(id, text)
    // Advance status and start the 24h nudge timer, then persist.
    onSave({ ...draft, status: 'Inquired', inquiredAt: Date.now() })
  }

  return (
    <Sheet
      title={draft.name || (isNew ? 'New listing' : 'Listing')}
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <button
            onClick={() => onSave(draft)}
            className="flex-1 rounded-xl bg-slate-900 py-3 font-semibold text-white active:bg-slate-700"
          >
            Save
          </button>
          {!isNew && (
            <button
              onClick={() => {
                if (confirm(`Delete "${draft.name || 'this listing'}"? This can't be undone.`)) onDelete(draft.id)
              }}
              className="flex-none rounded-xl border border-rose-200 px-4 py-3 text-sm font-medium text-rose-600 active:bg-rose-50"
            >
              Delete
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-4 pb-4">
        {/* live score summary */}
        <div className="flex items-center justify-between rounded-xl bg-slate-900 px-3 py-2.5 text-white">
          <span className="text-sm">
            {score.allIn !== null ? <b className="text-base tabular-nums">${Math.round(score.allIn)}</b> : 'no rent yet'}
            {score.allIn !== null && <span className="text-slate-300"> all-in/mo</span>}
          </span>
          <span className="text-sm text-slate-300">
            fit <b className="text-base tabular-nums text-white">{score.total}</b>/100
          </span>
        </div>

        <Section title="Basics">
          <Grid>
            <Field label="Name"><input value={draft.name} onChange={e => set({ name: e.target.value })} className={inputCls} /></Field>
            <Field label="Neighborhood"><input value={draft.hood} onChange={e => set({ hood: e.target.value })} className={inputCls} /></Field>
            <Field label="Address" span><input value={draft.address} onChange={e => set({ address: e.target.value })} className={inputCls} /></Field>
            <Field label="URL" span>
              <div className="flex gap-1.5">
                <input value={draft.url} onChange={e => set({ url: e.target.value })} className={inputCls} />
                {draft.url && (
                  <a href={draft.url} target="_blank" rel="noreferrer" className="flex-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600">↗</a>
                )}
              </div>
            </Field>
            <Field label="Source"><input value={draft.source} onChange={e => set({ source: e.target.value })} placeholder="Zillow…" className={inputCls} /></Field>
            <Field label="Landlord type">
              <select value={draft.landlordType} onChange={e => set({ landlordType: e.target.value as Listing['landlordType'] })} className={inputCls}>
                <option>Individual</option>
                <option>Property mgmt</option>
              </select>
            </Field>
            {!h.solo && (
              <Field label="Owner (whose lead)">
                <select value={draft.owner} onChange={e => set({ owner: e.target.value as Listing['owner'] })} className={inputCls}>
                  <option value="Me">{you || 'Me'}</option>
                  <option value="Companion">{h.companionLabel}</option>
                  <option>Both</option>
                </select>
              </Field>
            )}
            <Field label="Walk/Transit/Bike"><input value={draft.scores} onChange={e => set({ scores: e.target.value })} placeholder="Walk 94 · Transit 87" className={inputCls} /></Field>
          </Grid>
        </Section>

        <Section title="Money">
          <Grid>
            <Field label="Quoted rent is">
              <select value={draft.priceBasis} onChange={e => set({ priceBasis: e.target.value as Listing['priceBasis'] })} className={inputCls}>
                <option value="base">Base (fees extra)</option>
                <option value="all-in">All-in (fees included)</option>
              </select>
            </Field>
            <Field label="Required fees $/mo">
              <input inputMode="numeric" value={draft.feesMonthly} onChange={e => set({ feesMonthly: e.target.value })} disabled={draft.priceBasis === 'all-in'} className={inputCls + ' disabled:bg-slate-50 disabled:text-slate-300'} />
            </Field>
            <Field label="Parking $/mo"><input inputMode="numeric" value={draft.parkingMonthly} onChange={e => set({ parkingMonthly: e.target.value })} className={inputCls} /></Field>
            <Field label="Parking available?">
              <select value={draft.parkingAvail} onChange={e => set({ parkingAvail: e.target.value as Listing['parkingAvail'] })} className={inputCls}>
                <option value="yes">Yes</option>
                <option value="no">No</option>
                <option value="unknown">Unknown (ask)</option>
              </select>
            </Field>
            <Field label="One-time fees & terms" span>
              <input value={draft.feesOneTime} onChange={e => set({ feesOneTime: e.target.value })} placeholder="Deposit $500 · App $52 (non-ref)" className={inputCls} />
            </Field>
            <Field label="Fees actually paid $"><input inputMode="numeric" value={draft.feesPaid} onChange={e => set({ feesPaid: e.target.value })} className={inputCls} /></Field>
            <Field label="Commute door-to-door (min)"><input inputMode="numeric" value={draft.commuteMin} onChange={e => set({ commuteMin: e.target.value })} className={inputCls} /></Field>
          </Grid>
        </Section>

        <Section
          title="Units"
          action={
            <button
              onClick={() => setDraft(d => ({ ...d, units: [...d.units, emptyUnit()] }))}
              className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 active:bg-slate-100"
            >
              + Unit
            </button>
          }
        >
          {draft.units.length === 0 && <p className="text-xs text-slate-400">No units yet. Add one to score this listing.</p>}
          <div className="space-y-2.5">
            {draft.units.map(u => {
              const unitAllIn = allIn(draft, u, c)
              return (
                <div key={u.id} className={`rounded-xl border p-2.5 ${u.target ? 'border-slate-900' : 'border-slate-200'}`}>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                      <input
                        type="radio"
                        name="target-unit"
                        checked={u.target}
                        onChange={() => setDraft(d => ({ ...d, units: d.units.map(x => ({ ...x, target: x.id === u.id })) }))}
                        className="h-4 w-4 accent-slate-900"
                      />
                      target
                    </label>
                    {unitAllIn !== null && (
                      <span className="text-xs tabular-nums text-slate-500">${Math.round(unitAllIn)} all-in</span>
                    )}
                    <button
                      onClick={() => setDraft(d => ({ ...d, units: d.units.filter(x => x.id !== u.id) }))}
                      className="ml-auto text-xs text-rose-500"
                    >
                      remove
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Field label="Label"><input value={u.label} onChange={e => setUnit(u.id, { label: e.target.value })} placeholder="N-344 · 1bd" className={inputCls} /></Field>
                    <Field label="Rent $/mo"><input inputMode="numeric" value={u.rent} onChange={e => setUnit(u.id, { rent: e.target.value })} className={inputCls} /></Field>
                    <Field label="Sq ft"><input inputMode="numeric" value={u.sqft} onChange={e => setUnit(u.id, { sqft: e.target.value })} className={inputCls} /></Field>
                    <Field label="Available"><input value={u.avail} onChange={e => setUnit(u.id, { avail: e.target.value })} placeholder="Now / Sep 18" className={inputCls} /></Field>
                    <Field label="Note" span><input value={u.note} onChange={e => setUnit(u.id, { note: e.target.value })} className={inputCls} /></Field>
                  </div>
                </div>
              )
            })}
          </div>
        </Section>

        <Section title="Status & schedule">
          <Grid>
            <Field label="Status">
              <select value={draft.status} onChange={e => set({ status: e.target.value as Listing['status'] })} className={inputCls}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Tour date & time">
              <input type="datetime-local" value={draft.tourAt} onChange={e => set({ tourAt: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Contact" span><input value={draft.contact} onChange={e => set({ contact: e.target.value })} placeholder="Name · phone · email" className={inputCls} /></Field>
            <Field label="Next action" span><input value={draft.nextAction} onChange={e => set({ nextAction: e.target.value })} className={inputCls} /></Field>
            <Field label="Ask about on tour" span>
              <input value={draft.askAbout} onChange={e => set({ askAbout: e.target.value })} className={inputCls} />
            </Field>
          </Grid>
          {draft.inquiredAt > 0 && (
            <p className="mt-2 text-xs text-slate-400">
              Inquiry sent {new Date(draft.inquiredAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </p>
          )}
        </Section>

        <Section title="Messages" tour="messages" sectionRef={messagesRef}>
          <p className="mb-2 text-xs text-slate-400">
            Templates for a {draft.landlordType === 'Individual' ? 'private owner (relationship-first)' : 'management company (numbers-first)'}.
            “Sent it” copies the text, marks this Inquired, and starts the 24h nudge timer.
          </p>
          <div className="space-y-2">
            {templates.map(t => (
              <div key={t.id} className="overflow-hidden rounded-xl border border-slate-200">
                <button
                  onClick={() => setOpenTemplate(openTemplate === t.id ? null : t.id)}
                  className="flex w-full items-center px-3 py-2.5 text-left text-sm font-medium active:bg-slate-50"
                >
                  <span className="min-w-0 flex-1">{t.title}</span>
                  <span className="flex-none text-slate-300">{openTemplate === t.id ? '▴' : '▾'}</span>
                </button>
                {openTemplate === t.id && (
                  <div className="border-t border-slate-100 p-2.5">
                    <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-2.5 text-xs leading-relaxed text-slate-700">
                      {t.body}
                    </pre>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => void copy(t.id, t.body)}
                        className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700 active:bg-slate-50"
                      >
                        {copied === t.id ? 'Copied ✓' : 'Copy'}
                      </button>
                      {t.kind === 'initial' && (
                        <button
                          onClick={() => void sentIt(t.id, t.body)}
                          className="flex-1 rounded-lg bg-slate-900 py-2 text-sm font-semibold text-white active:bg-slate-700"
                        >
                          Sent it →
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>

        <Section title="After the tour">
          <Grid>
            <Field label={h.solo ? 'Video' : `Video for ${h.companionLabel}`} span>
              <div className="flex gap-1.5">
                <input value={draft.mediaUrl} onChange={e => set({ mediaUrl: e.target.value })} placeholder="Walkthrough video URL" className={inputCls} />
                {draft.mediaUrl && (
                  <a href={draft.mediaUrl} target="_blank" rel="noreferrer" className="flex-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600">▶</a>
                )}
              </div>
            </Field>
            <Field label={!h.solo && you ? `${you}'s score` : 'Your score'}><Stars value={draft.myScore} onChange={v => set({ myScore: v })} /></Field>
            {!h.solo && (
              <Field label={`${h.companionLabel}'s score`}><Stars value={draft.companionScore} onChange={v => set({ companionScore: v })} /></Field>
            )}
            <Field label="Hook (personalizes messages)" span>
              <input value={draft.hook} onChange={e => set({ hook: e.target.value })} placeholder="the rooftop deck faces the bridge" className={inputCls} />
            </Field>
            <Field label="Notes" span>
              <textarea value={draft.notes} onChange={e => set({ notes: e.target.value })} rows={3} className={inputCls} />
            </Field>
          </Grid>
        </Section>
      </div>
    </Sheet>
  )
}

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm outline-none focus:border-slate-400'

function Section({
  title, action, tour, sectionRef, children,
}: {
  title: string
  action?: React.ReactNode
  tour?: string
  sectionRef?: React.Ref<HTMLElement>
  children: React.ReactNode
}) {
  return (
    <section ref={sectionRef} data-tour={tour} className="scroll-mt-3 rounded-2xl border border-slate-200 bg-white p-3">
      <div className="mb-2.5 flex items-center justify-between">
        <h3 className="text-sm font-bold">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  )
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2.5">{children}</div>
}

function Field({ label, span, children }: { label: string; span?: boolean; children: React.ReactNode }) {
  return (
    <label className={`block ${span ? 'col-span-2' : ''}`}>
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</span>
      {children}
    </label>
  )
}

function Stars({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1 py-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(value === n ? 0 : n)}
          className={`text-xl leading-none ${n <= value ? 'text-amber-400' : 'text-slate-200'}`}
          aria-label={`${n} of 5`}
        >
          ★
        </button>
      ))}
    </div>
  )
}
