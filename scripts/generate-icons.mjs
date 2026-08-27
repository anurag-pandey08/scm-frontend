/**
 * Draws the app's icon set and writes it into `public/icons` and `app`.
 *
 * Run with `npm run icons`. The output is committed, so this only needs running
 * when the mark itself changes — it is here so the icons can be regenerated
 * rather than being opaque binaries nobody can edit.
 *
 * Everything is drawn from scratch with `node:zlib` and a PNG encoder below.
 * The project has no image toolchain, and a lorry drawn out of boxes and
 * circles is worth more than a dependency.
 *
 * The mark is a lorry in the ink blue the L.R. book is printed in, so the
 * installed app and the paperwork it prints look like they came from the same
 * office. It is a stand-in: the firm's own roundel is not in the repo.
 */

import { deflateSync } from "node:zlib"
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")

/** The blue the lorry receipt is printed in — see `bilty-lr.tsx`. */
const INK = [0x1c, 0x3f, 0x94]
const WHITE = [0xff, 0xff, 0xff]

// ---------------------------------------------------------------- PNG writing

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buffer) {
  let c = 0xffffffff
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const head = Buffer.alloc(8)
  head.writeUInt32BE(data.length, 0)
  head.write(type, 4, "ascii")
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0)
  return Buffer.concat([head, data, crc])
}

/** 8-bit RGBA, no interlacing — `pixels` is width * height * 4 bytes. */
function encodePng(width, height, pixels) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // colour type: RGBA
  // 10, 11, 12 stay 0: deflate, adaptive filtering, no interlace.

  // One filter byte per scanline. Filter 0 (none) throughout: these are flat
  // areas of colour, so deflate does the work and the encoder stays readable.
  const raw = Buffer.alloc(height * (1 + width * 4))
  for (let y = 0; y < height; y++) {
    const from = y * width * 4
    const to = y * (1 + width * 4) + 1
    pixels.copy(raw, to, from, from + width * 4)
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ])
}

/**
 * A .ico wrapping PNGs — the format Vista and later read, and every browser
 * that still asks for `/favicon.ico`.
 */
function encodeIco(images) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // 1 = icon
  header.writeUInt16LE(images.length, 4)

  const directory = Buffer.alloc(16 * images.length)
  let offset = header.length + directory.length

  images.forEach((image, index) => {
    const at = index * 16
    directory[at] = image.size >= 256 ? 0 : image.size
    directory[at + 1] = image.size >= 256 ? 0 : image.size
    directory[at + 4] = 1 // colour planes
    directory.writeUInt16LE(32, at + 6) // bits per pixel
    directory.writeUInt32BE(0, at + 8)
    directory.writeUInt32LE(image.png.length, at + 8)
    directory.writeUInt32LE(offset, at + 12)
    offset += image.png.length
  })

  return Buffer.concat([header, directory, ...images.map((i) => i.png)])
}

// ---------------------------------------------------------------- the drawing

/**
 * Shapes are predicates over the unit square, so the same drawing renders at
 * every size. Each pixel is sampled on a 4x4 grid and averaged, which is all
 * the anti-aliasing a mark made of boxes and circles needs.
 */
const SAMPLES = 4

function roundedRect(x0, y0, x1, y1, r) {
  return (x, y) => {
    if (x < x0 || x > x1 || y < y0 || y > y1) return false
    const dx = Math.max(x0 + r - x, 0, x - (x1 - r))
    const dy = Math.max(y0 + r - y, 0, y - (y1 - r))
    return dx * dx + dy * dy <= r * r
  }
}

function circle(cx, cy, r) {
  return (x, y) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r
}

const union =
  (...shapes) =>
  (x, y) =>
    shapes.some((shape) => shape(x, y))

const without = (shape, hole) => (x, y) => shape(x, y) && !hole(x, y)

/**
 * The lorry: a box body, a cab with a bonnet, and two wheels. Drawn large and
 * plain — at 32 pixels the wheels and the gap under the body are the only
 * things that survive, and they are what make it read as a lorry.
 */
const LORRY = union(
  // Body
  roundedRect(0.08, 0.3, 0.55, 0.62, 0.04),
  // Cab, sitting lower than the body with a sloped bonnet in front
  roundedRect(0.58, 0.42, 0.83, 0.62, 0.04),
  roundedRect(0.58, 0.34, 0.75, 0.5, 0.03)
)

/** Wheels sit proud of the body, cut out from it so the axles read clearly. */
const WHEELS = union(circle(0.235, 0.67, 0.105), circle(0.7, 0.67, 0.105))
const HUBS = union(circle(0.235, 0.67, 0.042), circle(0.7, 0.67, 0.042))

/**
 * @param size      pixels square
 * @param maskable  fill the whole square and pull the art in to the safe zone
 *                  Android masks icons to a circle, so a maskable icon must
 *                  keep everything that matters inside the middle 80%
 * @param opaque    no transparent corners — iOS rounds the square itself and
 *                  puts black behind anything left see-through
 */
function draw(size, { maskable = false, opaque = false } = {}) {
  const pixels = Buffer.alloc(size * size * 4)

  const badge =
    maskable || opaque
      ? () => true
      : roundedRect(0.045, 0.045, 0.955, 0.955, 0.22)

  // The lorry keeps its proportions; on a maskable icon the whole drawing
  // shrinks towards the middle instead.
  const inset = maskable ? 0.68 : 1
  const shift = (1 - inset) / 2
  const place = (shape) => (x, y) =>
    shape((x - shift) / inset, (y - shift) / inset)

  const body = place(without(LORRY, WHEELS))
  const wheels = place(WHEELS)
  const hubs = place(HUBS)

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let inBadge = 0
      let inMark = 0

      for (let sy = 0; sy < SAMPLES; sy++) {
        for (let sx = 0; sx < SAMPLES; sx++) {
          const x = (px + (sx + 0.5) / SAMPLES) / size
          const y = (py + (sy + 0.5) / SAMPLES) / size
          if (badge(x, y)) inBadge++
          // The hub is punched back out of the wheel, so it shows the blue
          // behind it rather than a third colour.
          if (body(x, y) || (wheels(x, y) && !hubs(x, y))) inMark++
        }
      }

      const total = SAMPLES * SAMPLES
      const badgeAlpha = inBadge / total
      const markAlpha = (inMark / total) * badgeAlpha

      const at = (py * size + px) * 4
      for (let c = 0; c < 3; c++) {
        // Blue badge, white lorry over it, composited by coverage.
        pixels[at + c] = Math.round(
          INK[c] * (1 - markAlpha / (badgeAlpha || 1)) +
            WHITE[c] * (markAlpha / (badgeAlpha || 1))
        )
      }
      pixels[at + 3] = Math.round(badgeAlpha * 255)
    }
  }

  return encodePng(size, size, pixels)
}

// ------------------------------------------------------------------- and away

const icons = join(ROOT, "public", "icons")
mkdirSync(icons, { recursive: true })

const written = []
function write(path, buffer) {
  writeFileSync(path, buffer)
  written.push(
    `${path.slice(ROOT.length + 1).replace(/\\/g, "/")}  ${buffer.length} bytes`
  )
}

write(join(icons, "icon-192.png"), draw(192))
write(join(icons, "icon-512.png"), draw(512))
write(join(icons, "maskable-192.png"), draw(192, { maskable: true }))
write(join(icons, "maskable-512.png"), draw(512, { maskable: true }))
write(join(icons, "apple-touch-icon.png"), draw(180, { opaque: true }))

write(
  join(ROOT, "src", "app", "favicon.ico"),
  encodeIco([16, 32, 48].map((size) => ({ size, png: draw(size) })))
)

console.log(written.join("\n"))
