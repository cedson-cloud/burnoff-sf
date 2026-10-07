'use client'

import { useBoardNav } from './BoardNav'
import Icon from './Icon'

const SIZE = {
  bar: 'min-h-11 rounded-control px-[18px] text-base', // desktop top bar
  floating: 'min-h-14 rounded-full px-[22px] text-[17px] shadow-float', // phone, over the list
  block: 'min-h-12 justify-center rounded-control px-5', // inside a card
}

// The one way to add a listing, wherever it appears. It opens the paste sheet.
export default function AddListingButton({
  size, className = '', tourAnchor,
}: {
  size: keyof typeof SIZE
  className?: string
  tourAnchor?: string // data-tour name, for the one copy the walkthrough and capture scripts use
}) {
  const nav = useBoardNav()
  return (
    <button
      onClick={nav.openPaste}
      data-tour={tourAnchor}
      className={`inline-flex items-center gap-2 btn-primary ${SIZE[size]} ${className}`}
    >
      <Icon name="plus" />
      Add listing
    </button>
  )
}
