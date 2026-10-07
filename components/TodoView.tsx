'use client'

import { ReactNode } from 'react'
import { num } from '@/lib/score'
import { blockedDay, startOfDay, todoQueues } from '@/lib/tours'
import { Listing, Settings } from '@/lib/types'
import { EditorSection } from './BoardNav'
import EmptyState from './EmptyState'
import Icon from './Icon'
import { WEEKDAYS, ago, formatDayLong, formatDayTime, formatTime, formatWeekday, money } from './listing-format'

// To do: what needs doing, as actions, with this week's tours on a strip. The
// queues and their rules live in lib/tours.ts. Every row opens its listing on the
// part its heading asks for: the message to send, or the next step to take.

const DAY = 24 * 60 * 60 * 1000

export default function TodoView({
  listings, settings, onOpen,
}: {
  listings: Listing[]
  settings: Settings
  onOpen: (l: Listing, section?: EditorSection) => void
}) {
  const now = Date.now()
  const q = todoQueues(listings, now)
  const c = settings.criteria
  const feesPaid = listings.reduce((a, l) => a + (num(l.feesPaid) ?? 0), 0)
  const blocked = blockedDay(c)

  const nothing = Object.values(q).every(queue => queue.length === 0)

  if (nothing) {
    return (
      <div data-tour="todo" className="mt-2">
        <EmptyState title="Nothing to do right now">
          Messages to send, replies and tours show up here as you add listings.
        </EmptyState>
      </div>
    )
  }

  return (
    <div data-tour="todo" className="space-y-7 pt-1.5">
      {q.pastDue.length > 0 && (
        <Section title="Tours to update" count={q.pastDue.length} hint="The tour date has passed. Mark it Toured or Passed, or pick a new time.">
          {q.pastDue.map(l => (
            <Row key={l.id} listing={l} onOpen={() => onOpen(l, 'next')} alarm>
              Tour was {formatDayTime(Date.parse(l.tourAt))}
            </Row>
          ))}
        </Section>
      )}

      <section>
        <Heading title="Tours this week" count={q.thisWeek.length} />
        <WeekStrip today={startOfDay(now)} tours={q.thisWeek.map(x => x.t)} blocked={blocked} />
        {blocked >= 0 && (
          <p className="mt-2 text-sm text-ink-2">
            No tours on {WEEKDAYS[blocked]}s: {c.blockedDayLabel}
          </p>
        )}
        {q.thisWeek.length > 0 ? (
          <List className="mt-3">
            {q.thisWeek.map(({ l, t }) => (
              <Row key={l.id} listing={l} onOpen={() => onOpen(l, 'messages')} lead={<TimeTag t={t} />}>
                {[l.hood, l.askAbout && `Ask about: ${l.askAbout}`].filter(Boolean).join('. ')}
              </Row>
            ))}
          </List>
        ) : (
          <p className="mt-3 text-[15px] text-ink-2">No tours booked in the next seven days.</p>
        )}
      </section>

      {q.leads.length > 0 && (
        <Section title="Send the first message" count={q.leads.length} hint="Open one to copy its message, then tap Copy and mark sent.">
          {q.leads.map(l => (
            <Row key={l.id} listing={l} onOpen={() => onOpen(l, 'messages')}>
              {l.hood}
            </Row>
          ))}
        </Section>
      )}

      {q.quiet.length > 0 && (
        <Section title="Send a nudge" count={q.quiet.length} hint="No reply for over a day.">
          {q.quiet.map(l => (
            <Row key={l.id} listing={l} onOpen={() => onOpen(l, 'messages')}>
              {[`Sent ${ago(now - l.inquiredAt)}`, l.contact].filter(Boolean).join('. ')}
            </Row>
          ))}
        </Section>
      )}

      {q.replied.length > 0 && (
        <Section title="Book a tour" count={q.replied.length} hint="They replied.">
          {q.replied.map(l => (
            <Row key={l.id} listing={l} onOpen={() => onOpen(l, 'next')}>
              {l.nextAction || l.hood}
            </Row>
          ))}
        </Section>
      )}

      {q.deciding.length > 0 && (
        <Section title="Decide or follow up" count={q.deciding.length} hint="Toured or applied.">
          {q.deciding.map(l => (
            <Row key={l.id} listing={l} onOpen={() => onOpen(l, 'next')}>
              {l.status === 'Applied' ? 'Applied' : 'Toured'}
              {l.nextAction ? `. ${l.nextAction}` : ''}
            </Row>
          ))}
        </Section>
      )}

      {q.waiting.length > 0 && (
        <Section title="Waiting to hear back" count={q.waiting.length} hint="Sent within the last day.">
          {q.waiting.map(l => (
            <Row key={l.id} listing={l} onOpen={() => onOpen(l, 'messages')}>
              {l.inquiredAt > 0 ? `Sent ${ago(Math.max(3600e3, now - l.inquiredAt))}` : l.hood}
            </Row>
          ))}
        </Section>
      )}

      {q.later.length > 0 && (
        <Section title="Tours after this week" count={q.later.length}>
          {q.later.map(({ l, t }) => (
            <Row key={l.id} listing={l} onOpen={() => onOpen(l, 'messages')}>
              {formatDayTime(t)}
            </Row>
          ))}
        </Section>
      )}

      {q.unscheduled.length > 0 && (
        <Section title="Tour booked, no time set" count={q.unscheduled.length}>
          {q.unscheduled.map(l => (
            <Row key={l.id} listing={l} onOpen={() => onOpen(l, 'next')}>
              {l.tourAt || 'Add the date and time'}
            </Row>
          ))}
        </Section>
      )}

      {feesPaid > 0 && (
        <p className="text-[15px] text-ink-2">
          Fees paid so far: <b className="font-semibold tabular-nums text-ink">{money(feesPaid)}</b>
        </p>
      )}
    </div>
  )
}

function Heading({ title, count, hint }: { title: string; count: number; hint?: string }) {
  return (
    <div className="mb-2.5">
      <h2 className="flex items-center gap-2 font-display text-[19px] font-semibold">
        {title}
        {count > 0 && (
          <span className="rounded-full bg-ink/8 px-2 py-0.5 font-sans text-[13px] font-semibold tabular-nums text-ink-2">
            {count}
          </span>
        )}
      </h2>
      {hint && <p className="mt-0.5 text-sm text-ink-2">{hint}</p>}
    </div>
  )
}

function Section({ title, hint, count, children }: { title: string; hint?: string; count: number; children: ReactNode }) {
  return (
    <section>
      <Heading title={title} count={count} hint={hint} />
      <List>{children}</List>
    </section>
  )
}

function List({ className = '', children }: { className?: string; children: ReactNode }) {
  return <ul className={`overflow-hidden rounded-card bg-paper ${className}`}>{children}</ul>
}

function Row({
  listing: l, onOpen, alarm, lead, children,
}: {
  listing: Listing
  onOpen: () => void
  alarm?: boolean
  lead?: ReactNode
  children?: ReactNode
}) {
  return (
    <li className="border-b border-line last:border-0">
      <button onClick={onOpen} className="flex min-h-[60px] w-full items-center gap-3 px-4 py-3 text-left active:bg-well">
        {alarm && <Icon name="alert" size={20} className="flex-none text-alarm" />}
        {lead}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-semibold">{l.name || 'Untitled'}</span>
          {children && (
            <span className={`block truncate text-sm ${alarm ? 'font-medium text-alarm' : 'text-ink-2'}`}>{children}</span>
          )}
        </span>
        <Icon name="chevron" size={18} className="flex-none text-ink-2" />
      </button>
    </li>
  )
}

function TimeTag({ t }: { t: number }) {
  return (
    <span className="flex w-14 flex-none flex-col text-[13px] leading-tight">
      <span className="font-semibold">{formatWeekday(t)}</span>
      <span className="tabular-nums text-ink-2">{formatTime(t)}</span>
    </span>
  )
}

// The next seven days at a glance: a sun dot on each day with a tour.
function WeekStrip({ today, tours, blocked }: { today: number; tours: number[]; blocked: number }) {
  const days = Array.from({ length: 7 }, (_, i) => new Date(today + i * DAY))
  return (
    <ol className="grid grid-cols-7 gap-1 rounded-card bg-paper p-2" aria-label="The next seven days">
      {days.map((d, i) => {
        const start = d.getTime()
        const n = tours.filter(t => t >= start && t < start + DAY).length
        const isBlocked = d.getDay() === blocked
        const label = `${formatDayLong(start)}: ${
          n ? `${n} ${n === 1 ? 'tour' : 'tours'}` : isBlocked ? 'no tours, blocked' : 'free'
        }`
        return (
          <li
            key={start}
            aria-label={label}
            className={`flex flex-col items-center gap-1 rounded-control py-2 ${i === 0 ? 'bg-well' : ''} ${
              isBlocked ? 'text-ink-2 line-through decoration-ink-2/60' : ''
            }`}
          >
            <span aria-hidden className="text-xs text-ink-2">
              {i === 0 ? 'Today' : formatWeekday(start)}
            </span>
            <span aria-hidden className={`text-[17px] tabular-nums ${n ? 'font-bold' : 'font-medium'}`}>{d.getDate()}</span>
            <span aria-hidden className={`size-1.5 rounded-full ${n ? 'bg-sun' : 'bg-transparent'}`} />
          </li>
        )
      })}
    </ol>
  )
}
