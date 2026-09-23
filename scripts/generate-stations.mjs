/**
 * Builds the station list the L.R.'s From and To boxes search.
 *
 * Run with `npm run stations`. The output is committed, so this only needs
 * running when the list should be refreshed — once a year is generous. It is
 * here so `src/lib/stations.data.json` can be regenerated rather than being an
 * unexplained wall of place names nobody can check.
 *
 * Why a file rather than a lookup against somebody's API: this app is meant to
 * keep working when the line does not — `public/sw.js` says so, and means it.
 * A booking clerk halfway through an L.R. should not be told the destination
 * box is unavailable because a free geocoder is down or has decided this office
 * asks too many questions. Seven thousand names cost about a fifth of a
 * megabyte, load once, and then answer instantly and forever.
 *
 * The source is the GeoNames `cities500` dump — every populated place on earth
 * with more than five hundred people. Filtered to India that is a little over
 * 7,000 towns, which is a far longer list than a transport office will ever
 * book to, and reaches down well past the district towns.
 *
 * GeoNames is CC BY 4.0. The attribution rides along in the generated file and
 * is printed in the UI; see `station-field.tsx`.
 */

import { writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { inflateRawSync } from "node:zlib"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const OUT = join(ROOT, "src", "lib", "stations.data.json")

const DUMP = "https://download.geonames.org/export/dump/cities500.zip"
const ADMIN1 = "https://download.geonames.org/export/dump/admin1CodesASCII.txt"

const COUNTRY = "IN"

// Columns of the GeoNames dump, which ships without a header row.
const NAME = 1
const ASCII_NAME = 2
const COUNTRY_CODE = 8
const ADMIN1_CODE = 10
const POPULATION = 14

// --------------------------------------------------------------- zip reading

/**
 * Pulls the single member out of a zip.
 *
 * The project has no archive library and this is not worth one: the GeoNames
 * dumps hold exactly one file each, so the central directory has exactly one
 * entry, and `node:zlib` already does the only hard part. Offsets are from the
 * PKZIP APPNOTE — 4.3.12 for the central directory, 4.3.7 for the local header.
 */
function unzipSingleMember(buffer) {
  const eocd = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]))
  if (eocd < 0) throw new Error("Not a zip file — no end-of-central-directory")

  const centralDirectory = buffer.readUInt32LE(eocd + 16)
  const method = buffer.readUInt16LE(centralDirectory + 10)
  const compressedSize = buffer.readUInt32LE(centralDirectory + 20)
  const localHeader = buffer.readUInt32LE(centralDirectory + 42)

  // The local header repeats the name and extra-field lengths, and they are not
  // always the same as the central directory's — so the data offset has to be
  // worked out from the local copy.
  const nameLength = buffer.readUInt16LE(localHeader + 26)
  const extraLength = buffer.readUInt16LE(localHeader + 28)
  const start = localHeader + 30 + nameLength + extraLength
  const compressed = buffer.subarray(start, start + compressedSize)

  // 0 is stored, 8 is deflate. GeoNames uses deflate; handle both anyway.
  return method === 0 ? compressed : inflateRawSync(compressed)
}

async function download(url) {
  process.stdout.write(`  ${url}\n`)
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`${url} answered ${response.status} ${response.statusText}`)
  }
  return Buffer.from(await response.arrayBuffer())
}

// ------------------------------------------------------------------ the list

/**
 * `admin1CodesASCII.txt` maps a country's first-level divisions to their names.
 * India's are its states and union territories, keyed `IN.16` and the like —
 * the dump carries only the number, so the names have to be joined back on.
 */
function readStates(text) {
  const states = new Map()
  for (const line of text.split("\n")) {
    const [code, , asciiName] = line.split("\t")
    if (!code?.startsWith(`${COUNTRY}.`)) continue
    states.set(code.slice(COUNTRY.length + 1), asciiName)
  }
  return states
}

async function main() {
  process.stdout.write("Fetching GeoNames:\n")
  const [dump, admin1] = await Promise.all([download(DUMP), download(ADMIN1)])

  const states = readStates(admin1.toString("utf8"))
  const text = unzipSingleMember(dump).toString("utf8")

  /**
   * Ranked by population, because that is the order a booking clerk means when
   * they type three letters: Mumbai before Mumbra. The number itself is thrown
   * away afterwards — once the list is sorted, a row's position says everything
   * about it that the search needs, and an index costs nothing to store.
   */
  const rows = []
  for (const line of text.split("\n")) {
    if (!line) continue
    const columns = line.split("\t")
    if (columns[COUNTRY_CODE] !== COUNTRY) continue

    const state = states.get(columns[ADMIN1_CODE])
    if (!state) continue

    // The app writes a name India has several of as "Pali, Rajasthan", so a
    // comma in the name itself would read as a state that is not one. The two
    // rows this drops are somebody's address filed as a place, not towns.
    const name = columns[ASCII_NAME] || columns[NAME]
    if (name.includes(",")) continue

    rows.push({
      // The ASCII spelling, not the accented one: it is what a clerk types, and
      // what should come out of the printer on the consignment note.
      name,
      state,
      population: Number(columns[POPULATION]) || 0,
    })
  }

  rows.sort((a, b) => b.population - a.population)

  // The same town shows up more than once where GeoNames holds both the
  // municipality and something inside it under one name. The bigger of the two
  // is the one a lorry is going to, and it sorts first.
  const seen = new Set()
  const stateNames = []
  const stateIndex = new Map()
  const cities = []

  for (const row of rows) {
    const key = `${row.name}|${row.state}`
    if (seen.has(key)) continue
    seen.add(key)

    if (!stateIndex.has(row.state)) {
      stateIndex.set(row.state, stateNames.length)
      stateNames.push(row.state)
    }
    cities.push([row.name, stateIndex.get(row.state)])
  }

  const data = {
    $comment:
      "Generated by scripts/generate-stations.mjs — do not edit by hand. " +
      "Cities are ordered by population, largest first.",
    source: "GeoNames cities500",
    sourceUrl: "https://www.geonames.org/",
    license: "CC BY 4.0",
    generatedOn: new Date().toISOString().slice(0, 10),
    states: stateNames,
    cities,
  }

  writeFileSync(OUT, `${JSON.stringify(data)}\n`)

  const kb = Math.round(Buffer.byteLength(JSON.stringify(data)) / 1024)
  process.stdout.write(
    `\n${cities.length} stations across ${stateNames.length} states ` +
      `→ src/lib/stations.data.json (${kb} KB)\n`
  )
}

await main()
