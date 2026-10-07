// Generates the PWA icons (public/icon-192.png, icon-512.png, apple-touch-icon.png)
// with no image dependencies: raw RGBA pixels -> zlib -> PNG chunks.
// Run once with `npm run icons`; the PNGs are checked in.

import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// Tokens from app/globals.css.
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const FOG = hex('#e6e4df')
const SUN = hex('#f2a33a')
const HAZE_SOFT = hex('#d3d9de')
const HAZE = hex('#aeb8c0')

function crc32(buf) {
  let c, crc = 0xffffffff
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    crc = (crc >>> 8) ^ c
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function png(size, pixelAt) {
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1)
    raw[row] = 0 // filter: none
    for (let x = 0; x < size; x++) {
      raw.set(pixelAt(x + 0.5, y + 0.5, size), row + 1 + x * 4)
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8  // bit depth
  ihdr[9] = 6  // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// The wordmark's mark (components/Wordmark.tsx, 20-unit viewBox): the sun coming up
// through two bands of fog, each band cut out of the sun by a fog-colored stroke.
// Shapes are signed distances in glyph units; coverage = 0.5 - distance in pixels,
// which antialiases every edge. The sun is a little larger than in the wordmark so it
// holds up on a home screen, and the whole mark sits inside the maskable safe circle.
const circle = (cx, cy, r) => (x, y) => Math.hypot(x - cx, y - cy) - r
// rect(x, y, w, h) with corner radius r
const roundRect = (x, y, w, h, r) => (px, py) => {
  const qx = Math.abs(px - x - w / 2) - w / 2 + r
  const qy = Math.abs(py - y - h / 2) - h / 2 + r
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r
}
// a band from the wordmark (rounded ends), grown or shrunk by `grow`
const band = (x, y, w, h, grow) => {
  const rect = roundRect(x, y, w, h, h / 2)
  return (px, py) => rect(px, py) - grow
}
const STROKE = 0.75 // half the wordmark's 1.5 stroke
const BANDS = [[1, 11.5, 18, 3], [4, 15.5, 13, 3]]

// At 64 px and below the bands use the darker haze, or they vanish on a 16 px browser tab.
function layers(bandFill) {
  return [
    [circle(10, 10, 7), SUN],
    ...BANDS.flatMap((b) => [[band(...b, STROKE), FOG], [band(...b, -STROKE), bandFill]]),
  ]
}

const UNITS = 25 // glyph units across the tile
const CX = 10, CY = 11.6 // glyph point at the tile centre

// `corner` rounds the tile (as a fraction of its width) and leaves the rest transparent.
function burnoffPixel({ bandFill, corner = 0 }) {
  const shapes = layers(bandFill)
  const tile = roundRect(CX - UNITS / 2, CY - UNITS / 2, UNITS, UNITS, UNITS * corner)
  return (px, py, size) => {
    const unit = UNITS / size
    const x = CX + (px / size - 0.5) * UNITS
    const y = CY + (py / size - 0.5) * UNITS
    const cover = (d) => Math.min(1, Math.max(0, 0.5 - d / unit))
    let c = FOG
    for (const [shape, rgb] of shapes) {
      const a = cover(shape(x, y))
      if (a > 0) c = c.map((v, i) => v + (rgb[i] - v) * a)
    }
    return [...c.map(Math.round), corner ? Math.round(cover(tile(x, y)) * 255) : 255]
  }
}

mkdirSync(join(root, 'public'), { recursive: true })
// Full bleed and opaque: Android and iOS apply their own mask.
const appIcon = burnoffPixel({ bandFill: HAZE_SOFT })
for (const [size, name] of [
  [192, 'icon-192.png'],
  [512, 'icon-512.png'],
  [180, 'apple-touch-icon.png'],
]) {
  writeFileSync(join(root, 'public', name), png(size, appIcon))
  console.log(`wrote public/${name}`)
}

// app/icon.png is auto-served by Next as the favicon. Rounded so it isn't a hard square on a dark tab bar.
writeFileSync(join(root, 'app', 'icon.png'), png(64, burnoffPixel({ bandFill: HAZE, corner: 0.22 })))
console.log('wrote app/icon.png')
