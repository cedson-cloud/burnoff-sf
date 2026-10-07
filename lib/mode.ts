// Which deployment this is. Only the server pages (app/page.tsx, and
// app/b/[boardId]/page.tsx to redirect away in demo mode) and lib/auth.ts may
// import this: the mode is decided once per tier, not checked throughout the code.
export type Mode = 'real' | 'demo'

export function mode(): Mode {
  return process.env.BURNOFF_MODE === 'demo' ? 'demo' : 'real'
}
