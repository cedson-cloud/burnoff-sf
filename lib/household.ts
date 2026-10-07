import { cap } from './format'
import { Profile } from './types'

export type Household = {
  solo: boolean
  we: 'I' | 'we'
  us: 'me' | 'us'
  our: 'my' | 'our'
  weAre: "I'm" | "we're"
  // Opens a sentence naming the companion: "My sister and I are" / "I'm"
  weIntro: string
  // How messages refer to the companion ("my sister", "Sam"); '' when solo
  companion: string
  // Short UI label ("Sam", "My sister"); '' when solo
  companionLabel: string
}

// The one place that decides solo vs. pair. Messages refer to the companion by
// phrase, then name; with neither, the search is solo and copy speaks as "I".
export function household(p: Profile): Household {
  const phrase = p.companionPhrase.trim()
  const name = p.companionName.trim()
  const companion = phrase || name
  if (!companion) {
    return { solo: true, we: 'I', us: 'me', our: 'my', weAre: "I'm", weIntro: "I'm", companion: '', companionLabel: '' }
  }
  return {
    solo: false,
    we: 'we',
    us: 'us',
    our: 'our',
    weAre: "we're",
    weIntro: `${cap(companion)} and I are`,
    companion,
    companionLabel: name || cap(phrase),
  }
}
