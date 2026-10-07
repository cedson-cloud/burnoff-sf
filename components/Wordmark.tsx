// The name, with the sun coming up through a bank of fog.
export default function Wordmark({ className = 'text-[19px]' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-display font-bold leading-none tracking-[-0.01em] ${className}`}>
      <svg width="1.05em" height="1.05em" viewBox="0 0 20 20" aria-hidden="true">
        <circle cx="10" cy="10.5" r="6" fill="var(--sun)" />
        <rect x="1" y="11.5" width="18" height="3" rx="1.5" fill="var(--haze-soft)" stroke="var(--fog)" strokeWidth="1.5" />
        <rect x="4" y="15.5" width="13" height="3" rx="1.5" fill="var(--haze-soft)" stroke="var(--fog)" strokeWidth="1.5" />
      </svg>
      Burnoff
    </span>
  )
}
