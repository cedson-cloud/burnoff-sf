// The score: the biggest thing on a card, with the sun dot that marks it as the fit.
export default function ScoreMark({ total, large = false }: { total: number; large?: boolean }) {
  return (
    <div className="flex flex-none flex-col items-end">
      <span className={`font-display ${large ? 'text-score-lg' : 'text-score'} font-light tabular-nums tracking-[-0.035em]`}>
        <span className="sr-only">Fit </span>
        {total}
        <span className="sr-only"> out of 100</span>
      </span>
      <span aria-hidden className="mt-2 flex items-center gap-1.5 text-[13px] text-ink-2">
        <span className="size-[9px] rounded-full bg-sun" />
        {large ? 'fit out of 100' : 'fit'}
      </span>
    </div>
  )
}
