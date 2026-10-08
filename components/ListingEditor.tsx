'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { cap } from '@/lib/format'
import { household } from '@/lib/household'
import { FoundSource } from '@/lib/find'
import { buildTemplates, openingTemplate } from '@/lib/messages'
import { allIn, scoreListing } from '@/lib/score'
import { Listing, ListingStatus, STATUSES, Settings, Unit, emptyUnit } from '@/lib/types'
import { EditorSection } from './BoardNav'
import FactorStrip from './FactorStrip'
import { Field, Group, inputCls, segment, segmentTrack, textareaCls } from './Field'
import Icon, { FogMark } from './Icon'
import { SUGGESTED_NEXT, formatDayTime, listWords, money, unknownNames } from './listing-format'
import ScoreMark from './ScoreMark'
import Sheet from './Sheet'

// One sheet per listing, in the order you need it: how it scores, what to do
// next, the message to send, then every other field under Details.

const STEPS: ListingStatus[] = STATUSES.filter(s => s !== 'Passed')

export default function ListingEditor({
  listing, section, sources, settings, isNew, onClose, onSave, onDelete,
}: {
  listing: Listing
  section?: EditorSection // scroll here on open
  sources?: FoundSource[] // a listing Claude found on the web: where each value came from
  settings: Settings
  isNew: boolean
  onClose: () => void
  onSave: (l: Listing) => void
  onDelete: (id: string) => void
}) {
  const [draft, setDraft] = useState<Listing>(listing)
  const [templateId, setTemplateId] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  // A freshly parsed listing opens with Details showing, so it gets checked before saving.
  const [detailsOpen, setDetailsOpen] = useState(isNew)
  const nextRef = useRef<HTMLElement>(null)
  const messagesRef = useRef<HTMLElement>(null)

  const set = (patch: Partial<Listing>) => setDraft(d => ({ ...d, ...patch }))
  const setUnit = (id: string, patch: Partial<Unit>) =>
    setDraft(d => ({ ...d, units: d.units.map(u => (u.id === id ? { ...u, ...patch } : u)) }))

  const c = settings.criteria
  const score = useMemo(() => scoreListing(draft, c), [draft, c])
  const templates = useMemo(() => buildTemplates(draft, settings), [draft, settings])
  // The chosen template; until one is chosen, the one the status called for when the sheet opened.
  const template = templates.find(t => t.id === templateId) ?? openingTemplate(templates, listing.status)
  // Only a Lead's first message marks it sent. On any later status that would move it backwards.
  const markSent = template.kind === 'initial' && draft.status === 'Lead'
  const h = household(settings.profile)
  const you = settings.profile.yourName.trim()
  const unknown = unknownNames(score)
  // Fields that feed an unknown score factor get fog, exactly as the score sees it.
  const fogged = new Set(score.factors.filter(f => f.unknown).map(f => f.key))
  const target = score.unit

  // Opened at a section (once, on open): bring it into view.
  useEffect(() => {
    const at = section === 'next' ? nextRef : section === 'messages' ? messagesRef : null
    at?.current?.scrollIntoView({ block: 'start' })
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

  // Fields that show both beside the message and in Details: one definition each.
  const contactField = (hint?: string) => (
    <Field label="Contact" span hint={hint}>
      <input value={draft.contact} onChange={e => set({ contact: e.target.value })} placeholder="Name, phone, email" className={inputCls} />
    </Field>
  )
  const hookField = (hint?: string) => (
    <Field label="What you liked about it" span hint={hint}>
      <input value={draft.hook} onChange={e => set({ hook: e.target.value })} placeholder="the rooftop deck faces the bridge" className={inputCls} />
    </Field>
  )
  const feeAndParkingFields = (
    <>
      <Field label="Required fees a month">
        <input inputMode="numeric" value={draft.feesMonthly} onChange={e => set({ feesMonthly: e.target.value })} disabled={draft.priceBasis === 'all-in'} className={inputCls} />
      </Field>
      <Field label="Parking available" fog={fogged.has('parking')}>
        <select value={draft.parkingAvail} onChange={e => set({ parkingAvail: e.target.value as Listing['parkingAvail'] })} className={inputCls}>
          <option value="yes">Yes</option>
          <option value="no">No</option>
          <option value="unknown">Not known</option>
        </select>
      </Field>
      <Field label="Parking a month">
        <input inputMode="numeric" value={draft.parkingMonthly} onChange={e => set({ parkingMonthly: e.target.value })} className={inputCls} />
      </Field>
    </>
  )

  const address = [draft.address, draft.hood].filter(Boolean).join(', ')
  const passed = draft.status === 'Passed'
  const stepIndex = STEPS.indexOf(draft.status)

  return (
    <Sheet
      title={draft.name || (isNew ? 'New listing' : 'Listing')}
      onClose={onClose}
      actions={
        draft.url && (
          <a
            href={draft.url}
            target="_blank"
            rel="noreferrer"
            aria-label="Open the listing page"
            className="grid size-11 flex-none place-items-center rounded-full text-ink active:bg-well"
          >
            <Icon name="external" />
          </a>
        )
      }
      footer={
        <button
          // Nothing edited on a saved listing: close without a write.
          onClick={() => (!isNew && draft === listing ? onClose() : onSave(draft))}
          className="min-h-12 w-full rounded-control btn-primary"
        >
          Save
        </button>
      }
    >
      {/* 1. How it scores */}
      <section className="pb-6 pt-2">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            {address && <p className="text-[15px] text-ink-2">{address}</p>}
            {score.allIn !== null ? (
              <p className="mt-1 text-base">
                <b className="text-[22px] font-bold tabular-nums">{money(score.allIn)}</b> a month all-in
              </p>
            ) : (
              <p className="mt-1 flex items-center gap-1.5 text-base text-haze-ink">
                <FogMark /> Rent not known
              </p>
            )}
          </div>
          <ScoreMark total={score.total} large />
        </div>
        <div className="mt-6">
          <FactorStrip listing={draft} score={score} detail />
        </div>
        {unknown.length > 0 && (
          <p className="mt-4 flex items-start gap-2 rounded-inset bg-haze-wash px-3.5 py-3 text-[14.5px] text-haze-ink">
            <FogMark className="mt-px" />
            <span>
              {cap(listWords(unknown))} not known yet. {unknown.length === 1 ? 'It gets' : 'Each gets'} half credit until
              you find out.
            </span>
          </p>
        )}
        {sources && <FoundOnTheWeb sources={sources} />}
      </section>

      {/* 2. What to do next */}
      <section ref={nextRef} className="scroll-mt-2 border-t border-line py-6">
        <h3 className="font-display text-[19px] font-semibold">Next step</h3>
        <p className="mt-2 text-lg font-semibold leading-snug">
          {passed ? 'You passed on this one' : draft.nextAction || SUGGESTED_NEXT[draft.status]}
        </p>

        <ol aria-label="Status" className="mt-5 flex">
          {STEPS.map((s, i) => {
            const done = !passed && i < stepIndex
            const current = s === draft.status
            return (
              <li key={s} className="relative flex-1">
                {i > 0 && (
                  <span
                    aria-hidden
                    className={`absolute right-1/2 top-[13px] h-0.5 w-full ${done || current ? 'bg-ink' : 'bg-ink/18'}`}
                  />
                )}
                <button
                  type="button"
                  onClick={() => set({ status: s })}
                  aria-current={current ? 'step' : undefined}
                  className="relative z-[1] flex min-h-[56px] w-full flex-col items-center gap-1.5 text-center"
                >
                  <span
                    className={`mt-1.5 size-4 rounded-full ${
                      current
                        ? 'bg-sun shadow-[0_0_0_3px_var(--paper),0_0_0_5px_var(--ink)]'
                        : done
                          ? 'bg-ink'
                          : 'bg-paper shadow-[inset_0_0_0_2px_var(--line-strong)]'
                    }`}
                  />
                  <span className={`text-[11.5px] leading-tight ${current ? 'font-semibold text-ink' : 'text-ink-2'}`}>
                    {s}
                  </span>
                </button>
              </li>
            )
          })}
        </ol>

        <div className="mt-4 grid gap-3">
          <Field label="Next action">
            <input
              value={draft.nextAction}
              onChange={e => set({ nextAction: e.target.value })}
              placeholder={SUGGESTED_NEXT[draft.status] || 'What happens next'}
              className={inputCls}
            />
          </Field>
          <Field label="Tour date and time">
            <input type="datetime-local" value={draft.tourAt} onChange={e => set({ tourAt: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Ask about on the tour">
            <input value={draft.askAbout} onChange={e => set({ askAbout: e.target.value })} className={inputCls} />
          </Field>
        </div>
        {draft.inquiredAt > 0 && (
          <p className="mt-3 text-[13px] text-ink-2">
            First message sent {formatDayTime(draft.inquiredAt)}
          </p>
        )}
        {passed ? (
          <p className="mt-3 text-[15px] text-ink-2">Tap a step to bring it back.</p>
        ) : (
          <button
            type="button"
            onClick={() => set({ status: 'Passed' })}
            className="mt-2 min-h-11 text-[15px] font-semibold text-ink-2 underline underline-offset-[3px]"
          >
            Pass on this one
          </button>
        )}
      </section>

      {/* 3. The message, with everything that changes it right beside it */}
      <section ref={messagesRef} className="scroll-mt-2 border-t border-line py-6">
        <div data-tour="messages">
          <h3 className="font-display text-[19px] font-semibold">Message</h3>
          <p id="landlord-label" className="mb-1.5 mt-3 text-[13.5px] font-medium text-ink-2">Who you’re writing to</p>
          <div role="radiogroup" aria-labelledby="landlord-label" className={segmentTrack}>
            {(
              [
                ['Individual', 'Private owner'],
                ['Property mgmt', 'Property manager'],
              ] as [Listing['landlordType'], string][]
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={draft.landlordType === value}
                onClick={() => set({ landlordType: value })}
                className={segment(draft.landlordType === value)}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-sm text-ink-2">
            {draft.landlordType === 'Individual'
              ? 'Friendly and personal, with a bit about you.'
              : 'Numbers first: rent, fees, parking and deposit.'}
          </p>
        </div>

        <div className="mt-4">
          <Field label="Which message">
            <select value={template?.id ?? ''} onChange={e => setTemplateId(e.target.value)} className={inputCls}>
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </Field>
        </div>

        {template && (
          <>
            <p className="mt-3 whitespace-pre-wrap rounded-inset bg-well p-4 text-[15.5px] leading-relaxed">{template.body}</p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => void copy(template.id, template.body)}
                className="inline-flex min-h-12 flex-none items-center justify-center gap-2 rounded-control px-4 font-semibold control-outline active:bg-well"
              >
                <Icon name={copied === template.id ? 'check' : 'copy'} size={18} />
                {copied === template.id ? 'Copied' : 'Copy'}
              </button>
              {markSent && (
                <button
                  type="button"
                  onClick={() => void sentIt(template.id, template.body)}
                  className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-control bg-ink px-4 font-semibold text-paper active:bg-ink/85"
                >
                  <Icon name="copy" size={18} />
                  Copy and mark sent
                </button>
              )}
            </div>
            {markSent && (
              <p className="mt-2 text-[13px] text-ink-2">
                Copy and mark sent also moves this to Inquired and starts the one-day nudge timer.
              </p>
            )}
          </>
        )}

        {/* The listing's own fields that this message reads. They're the same fields as in Details. */}
        <div className="mt-6">
          <Group title="What goes into it" hint="Edit these and the message changes. The part about you comes from Your criteria.">
            {draft.landlordType === 'Individual' ? (
              <>
                {contactField('Their first name starts the message.')}
                {hookField()}
              </>
            ) : (
              <>
                {target && (
                  <Field label={`Rent for ${target.label || 'the unit'}`} fog={fogged.has('cost')}>
                    <input inputMode="numeric" value={target.rent} onChange={e => setUnit(target.id, { rent: e.target.value })} placeholder="Not known" className={inputCls} />
                  </Field>
                )}
                {feeAndParkingFields}
              </>
            )}
          </Group>
        </div>
      </section>

      {/* 4. Everything else */}
      <section className="border-t border-line pb-2 pt-3">
        <button
          type="button"
          onClick={() => setDetailsOpen(o => !o)}
          aria-expanded={detailsOpen}
          className="flex min-h-12 w-full items-center gap-2.5 text-left"
        >
          <span className="font-display text-[19px] font-semibold">Details</span>
          {unknown.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-haze-wash py-1 pl-1.5 pr-2.5 text-[13.5px] font-semibold text-haze-ink">
              <FogMark />
              {unknown.length} not known
            </span>
          )}
          <Icon name="down" className={`ml-auto flex-none transition-transform ${detailsOpen ? 'rotate-180' : ''}`} />
        </button>

        {detailsOpen && (
          <div className="mt-3 space-y-7 pb-4">
            <Group title="The place">
              <Field label="Name"><input value={draft.name} onChange={e => set({ name: e.target.value })} className={inputCls} /></Field>
              <Field label="Neighborhood"><input value={draft.hood} onChange={e => set({ hood: e.target.value })} className={inputCls} /></Field>
              <Field label="Address" span><input value={draft.address} onChange={e => set({ address: e.target.value })} className={inputCls} /></Field>
              <Field label="Listing link" span><input value={draft.url} onChange={e => set({ url: e.target.value })} className={inputCls} /></Field>
              <Field label="Found on"><input value={draft.source} onChange={e => set({ source: e.target.value })} placeholder="Zillow" className={inputCls} /></Field>
              {!h.solo && (
                <Field label="Whose lead">
                  <select value={draft.owner} onChange={e => set({ owner: e.target.value as Listing['owner'] })} className={inputCls}>
                    <option value="Me">{you || 'Me'}</option>
                    <option value="Companion">{h.companionLabel}</option>
                    <option>Both</option>
                  </select>
                </Field>
              )}
              {contactField()}
              <Field label="Walk, transit and bike scores" span><input value={draft.scores} onChange={e => set({ scores: e.target.value })} placeholder="Walk 94, Transit 87" className={inputCls} /></Field>
            </Group>

            <Group title="Money and getting around">
              <Field label="Quoted rent is">
                <select value={draft.priceBasis} onChange={e => set({ priceBasis: e.target.value as Listing['priceBasis'] })} className={inputCls}>
                  <option value="base">Base, fees extra</option>
                  <option value="all-in">All-in, fees included</option>
                </select>
              </Field>
              {feeAndParkingFields}
              <Field label="Commute, door to door (min)" span fog={fogged.has('commute')}>
                <input inputMode="numeric" value={draft.commuteMin} onChange={e => set({ commuteMin: e.target.value })} placeholder="Not known" className={inputCls} />
              </Field>
              <Field label="One-time fees and terms" span>
                <input value={draft.feesOneTime} onChange={e => set({ feesOneTime: e.target.value })} placeholder="Deposit $500, app fee $52 (non-refundable)" className={inputCls} />
              </Field>
              <Field label="Fees you’ve paid ($)"><input inputMode="numeric" value={draft.feesPaid} onChange={e => set({ feesPaid: e.target.value })} className={inputCls} /></Field>
            </Group>

            <section>
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-[15px] font-semibold">Units</h4>
                <button
                  type="button"
                  onClick={() => setDraft(d => ({ ...d, units: [...d.units, emptyUnit()] }))}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold control-outline active:bg-well"
                >
                  <Icon name="plus" size={16} />
                  Add unit
                </button>
              </div>
              {draft.units.length === 0 && <p className="text-sm text-ink-2">No units yet. Add one to score this listing.</p>}
              <div className="space-y-3">
                {draft.units.map(u => {
                  const unitAllIn = allIn(draft, u, c)
                  const scored = u.id === target?.id
                  return (
                    <div
                      key={u.id}
                      className={`rounded-control p-3 ${scored ? 'shadow-[inset_0_0_0_2px_var(--ink)]' : 'control-outline'}`}
                    >
                      <div className="flex items-center gap-2">
                        <label className="flex min-h-10 items-center gap-2 text-sm font-semibold">
                          <input
                            type="radio"
                            name="target-unit"
                            checked={u.target}
                            onChange={() => setDraft(d => ({ ...d, units: d.units.map(x => ({ ...x, target: x.id === u.id })) }))}
                            className="size-[18px] accent-ink"
                          />
                          {h.solo ? 'The one I’d take' : 'The one we’d take'}
                        </label>
                        {unitAllIn !== null && (
                          <span className="text-[13px] tabular-nums text-ink-2">{money(unitAllIn)} all-in</span>
                        )}
                        <button
                          type="button"
                          onClick={() => setDraft(d => ({ ...d, units: d.units.filter(x => x.id !== u.id) }))}
                          className="ml-auto min-h-10 px-1 text-sm font-semibold text-alarm"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-3">
                        <Field label="Label"><input value={u.label} onChange={e => setUnit(u.id, { label: e.target.value })} placeholder="N-344, 1bd" className={inputCls} /></Field>
                        <Field label="Rent a month" fog={scored && fogged.has('cost')}>
                          <input inputMode="numeric" value={u.rent} onChange={e => setUnit(u.id, { rent: e.target.value })} placeholder={scored ? 'Not known' : ''} className={inputCls} />
                        </Field>
                        <Field label="Size (ft²)" fog={scored && fogged.has('size')}>
                          <input inputMode="numeric" value={u.sqft} onChange={e => setUnit(u.id, { sqft: e.target.value })} placeholder={scored ? 'Not known' : ''} className={inputCls} />
                        </Field>
                        {/* Move-in is unknown either because this date doesn't read or because Your
                            criteria has no move-in date; only the first is this field's fog. */}
                        <Field label="Available" fog={scored && fogged.has('timing') && !!c.moveInEnd}>
                          <input value={u.avail} onChange={e => setUnit(u.id, { avail: e.target.value })} placeholder="Now, Sep 18" className={inputCls} />
                        </Field>
                        <Field label="Note" span><input value={u.note} onChange={e => setUnit(u.id, { note: e.target.value })} className={inputCls} /></Field>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            <Group title="After the tour">
              <Field label={h.solo ? 'Video' : `Video for ${h.companionLabel}`} span>
                <div className="flex gap-2">
                  <input value={draft.mediaUrl} onChange={e => set({ mediaUrl: e.target.value })} placeholder="Walkthrough video link" className={inputCls} />
                  {draft.mediaUrl && (
                    <a
                      href={draft.mediaUrl}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Play the video"
                      className="grid size-11 flex-none place-items-center rounded-control control-outline"
                    >
                      <Icon name="play" />
                    </a>
                  )}
                </div>
              </Field>
              <Rating label={!h.solo && you ? `${you}’s rating` : 'Your rating'} value={draft.myScore} onChange={v => set({ myScore: v })} />
              {!h.solo && (
                <Rating label={`${h.companionLabel}’s rating`} value={draft.companionScore} onChange={v => set({ companionScore: v })} />
              )}
              {hookField('Goes into the first message to a private owner and the after-tour message.')}
              <Field label="Notes" span>
                <textarea value={draft.notes} onChange={e => set({ notes: e.target.value })} rows={3} className={textareaCls} />
              </Field>
            </Group>

            {!isNew && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Delete "${draft.name || 'this listing'}"? This can't be undone.`)) onDelete(draft.id)
                }}
                className="inline-flex min-h-11 items-center gap-2 text-[15px] font-semibold text-alarm"
              >
                <Icon name="trash" size={18} />
                Delete listing
              </button>
            )}
          </div>
        )}
      </section>
    </Sheet>
  )
}

// Shown on a listing Claude looked up, until it's saved. The sources also go into
// Notes, so they're still there afterwards.
function FoundOnTheWeb({ sources }: { sources: FoundSource[] }) {
  return (
    <div className="mt-4 rounded-inset bg-well p-4">
      <h4 className="text-[15px] font-semibold">Found on the web</h4>
      <p className="mt-0.5 text-sm text-ink-2">
        Claude found these on other sites. Check them against the listing before you save.
      </p>
      {sources.length > 0 && (
        <ul className="mt-3 space-y-2 text-[14.5px]">
          {sources.map((s, i) => (
            <li key={i} className="min-w-0">
              <span>{s.what}</span>{' '}
              <a href={s.url} target="_blank" rel="noreferrer" className="whitespace-nowrap text-ink-2 underline underline-offset-2">
                {hostOf(s.url)}
              </a>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-sm text-ink-2">
        Some details, like fees and parking prices, often aren’t published anywhere. Add them when you learn them.
        What’s worth asking is in Ask about on the tour.
      </p>
    </div>
  )
}

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

// Stars from 1 to 5; tapping the chosen star clears it. The label sits outside
// any <label> element, so tapping its words doesn't set a star.
function Rating({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const id = useId()
  return (
    <div className="min-w-0">
      <span id={id} className="mb-1.5 block text-[13.5px] font-medium text-ink-2">{label}</span>
      <div role="radiogroup" aria-labelledby={id} className="-ml-2 flex">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={n === value}
            aria-label={`${n} of 5`}
            onClick={() => onChange(value === n ? 0 : n)}
            className={`grid size-10 place-items-center ${n <= value ? 'text-sun-press' : 'text-ink/25'}`}
          >
            <Icon name="star" size={22} filled={n <= value} />
          </button>
        ))}
      </div>
    </div>
  )
}
