// Generates the PWA icons (public/icon-192.png, icon-512.png, apple-touch-icon.png)
// with no image dependencies: raw RGBA pixels -> zlib -> PNG chunks.
// Run once with `npm run icons`; the PNGs are checked in.

import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const BG = [15, 23, 42, 255] // slate-900
const FG = [255, 255, 255, 255]

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
      const [r, g, b, a] = pixelAt(x, y, size)
      const i = row + 1 + x * 4
      raw[i] = r; raw[i + 1] = g; raw[i + 2] = b; raw[i + 3] = a
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

// Simple house glyph: triangle roof over a square body with a door cut out.
function housePixel(x, y, size) {
  const u = x / size
  const v = y / size
  // roof: triangle with apex at (0.5, 0.22), base y=0.52 spanning x 0.18..0.82
  const inRoof = v >= 0.22 && v <= 0.52 && Math.abs(u - 0.5) <= ((v - 0.22) / 0.30) * 0.32
  // body: rect
  const inBody = u >= 0.28 && u <= 0.72 && v >= 0.52 && v <= 0.80
  // door: cut-out
  const inDoor = u >= 0.44 && u <= 0.56 && v >= 0.62 && v <= 0.80
  return (inRoof || inBody) && !inDoor ? FG : BG
}

mkdirSync(join(root, 'public'), { recursive: true })
for (const [size, name] of [
  [192, 'icon-192.png'],
  [512, 'icon-512.png'],
  [180, 'apple-touch-icon.png'],
]) {
  writeFileSync(join(root, 'public', name), png(size, housePixel))
  console.log(`wrote public/${name}`)
}

// app/icon.png is auto-served by Next as the favicon
writeFileSync(join(root, 'app', 'icon.png'), png(64, housePixel))
console.log('wrote app/icon.png')
