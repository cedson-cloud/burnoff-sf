// The icon set: 24px grid, 1.75 stroke, round caps and joins, drawn in
// currentColor. Inline so there's no icon dependency. Decorative by default;
// the button or link around an icon carries the accessible name.

const PATHS = {
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  sliders: <><path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" /></>,
  chevron: <path d="m9 6 6 6-6 6" />,
  down: <path d="m6 9 6 6 6-6" />,
  copy: <><rect x="8" y="8" width="12" height="12" rx="2.5" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  external: <path d="M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />,
  play: <><circle cx="12" cy="12" r="8.5" /><path d="m10.5 9 4.5 3-4.5 3z" /></>,
  sync: <><path d="M20 11a8 8 0 0 0-14.5-4.5L4 8" /><path d="M4 4v4h4" /><path d="M4 13a8 8 0 0 0 14.5 4.5L20 16" /><path d="M20 20v-4h-4" /></>,
  help: <><circle cx="12" cy="12" r="8.5" /><path d="M9.75 9.5a2.25 2.25 0 1 1 3.4 1.95c-.7.4-1.15.9-1.15 1.7v.35" /><path d="M12 16.6v.1" /></>,
  alert: <><path d="M12 4.5 21 19.5H3z" /><path d="M12 10v4M12 17v.1" /></>,
  paste: <><rect x="6" y="5" width="12" height="15" rx="2.5" /><path d="M9 5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1M9.5 11h5M9.5 14.5h5" /></>,
  trash: <path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" />,
  star: <path d="m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.6-4.8 2.6.9-5.4-3.9-3.8 5.4-.8z" />,
}

type IconName = keyof typeof PATHS

// `filled` fills the shape too, for an on state (a chosen star).
export default function Icon({
  name, size = 20, filled = false, className,
}: {
  name: IconName
  size?: number
  filled?: boolean
  className?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {PATHS[name]}
    </svg>
  )
}

// The non-color mark for an unknown value: a dashed ring around "?".
export function FogMark({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-grid size-[18px] flex-none place-items-center rounded-full border-[1.5px] border-dashed border-haze-ink text-[11px] font-bold leading-none text-haze-ink ${className}`}
    >
      ?
    </span>
  )
}
