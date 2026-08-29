/**
 * Runs `public/sw.js` against stand-in browser APIs and checks it does what it
 * says it does — chiefly that a navigation with no line falls back the way it
 * is meant to. Run with `npm run check:sw`.
 *
 * This is not a browser. It proves the worker's decisions, not the platform's:
 * caching, the fallback chain, what it refuses to touch.
 */

import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const ORIGIN = "https://sewak.example"

// ------------------------------------------------------------- the stand-ins

class FakeResponse {
  constructor(body, init = {}) {
    this.body = body
    this.status = init.status ?? 200
    this.type = init.type ?? "basic"
    this.redirected = init.redirected ?? false
  }
  get ok() {
    return this.status >= 200 && this.status < 300
  }
  clone() {
    return new FakeResponse(this.body, {
      status: this.status,
      type: this.type,
      redirected: this.redirected,
    })
  }
}

class FakeRequest {
  constructor(url, init = {}) {
    this.url = new URL(url, ORIGIN).toString()
    this.method = init.method ?? "GET"
    this.mode = init.mode ?? "no-cors"
  }
}

class FakeCache {
  constructor(name, harness) {
    this.name = name
    this.harness = harness
    this.entries = new Map()
  }
  async put(request, response) {
    this.entries.set(keyOf(request), response)
  }
  async addAll(requests) {
    for (const request of requests) {
      const response = await this.harness.fetch(request)
      if (!response.ok) throw new Error("addAll failed for " + keyOf(request))
      await this.put(request, response)
    }
  }
  async match(request, options = {}) {
    const key = keyOf(request)
    const hit = this.entries.get(key)
    if (hit) return hit
    if (options.ignoreSearch) {
      const bare = key.split("?")[0]
      for (const [stored, response] of this.entries) {
        if (stored.split("?")[0] === bare) return response
      }
    }
    return undefined
  }
}

const keyOf = (request) =>
  typeof request === "string"
    ? new URL(request, ORIGIN).toString()
    : request.url

function makeHarness() {
  const harness = {
    caches: new Map(),
    online: true,
    /** Every URL the worker actually asked the network for. */
    requested: [],
    /** URLs the network answers with a redirect, like `/`. */
    redirects: new Set(["/"]),
    /** URLs that do not exist on the server. */
    missing: new Set(),
  }

  harness.fetch = async (request) => {
    const url = keyOf(request)
    harness.requested.push(url)
    if (!harness.online) throw new TypeError("Failed to fetch")
    const path = new URL(url).pathname
    if (harness.missing.has(path)) return new FakeResponse("", { status: 404 })
    return new FakeResponse("network:" + path, {
      redirected: harness.redirects.has(path),
    })
  }

  const cacheStorage = {
    open: async (name) => {
      if (!harness.caches.has(name))
        harness.caches.set(name, new FakeCache(name, harness))
      return harness.caches.get(name)
    },
    keys: async () => [...harness.caches.keys()],
    delete: async (name) => harness.caches.delete(name),
    match: async (request, options) => {
      for (const cache of harness.caches.values()) {
        const hit = await cache.match(request, options)
        if (hit) return hit
      }
      return undefined
    },
  }

  const handlers = new Map()
  const self = {
    location: { origin: ORIGIN },
    addEventListener: (type, handler) => handlers.set(type, handler),
    skipWaiting: async () => {
      harness.skipWaitingCalled = true
    },
    clients: {
      claim: async () => {
        harness.claimCalled = true
      },
    },
  }

  const source = readFileSync(join(ROOT, "public", "sw.js"), "utf8")
  // The worker only ever reaches for these globals, so handing them in is
  // enough to run its real code unmodified.
  const load = new Function(
    "self",
    "caches",
    "fetch",
    "Response",
    "Request",
    "URL",
    source
  )
  load(
    self,
    cacheStorage,
    harness.fetch,
    { error: () => new FakeResponse("", { status: 0, type: "error" }) },
    FakeRequest,
    URL
  )

  harness.dispatch = async (type, extra = {}) => {
    const handler = handlers.get(type)
    if (!handler) throw new Error("no handler for " + type)
    let waited
    let responded
    handler({
      ...extra,
      waitUntil: (p) => (waited = p),
      respondWith: (p) => (responded = p),
    })
    if (waited) await waited
    return responded ? await responded : undefined
  }

  harness.navigate = (path) =>
    harness.dispatch("fetch", {
      request: new FakeRequest(path, { mode: "navigate" }),
    })

  harness.get = (path) =>
    harness.dispatch("fetch", { request: new FakeRequest(path) })

  return harness
}

// ------------------------------------------------------------------- the run

let passed = 0
let failed = 0
const check = (name, condition, detail = "") => {
  if (condition) {
    passed++
    console.log("  ok   " + name)
  } else {
    failed++
    console.log("  FAIL " + name + (detail ? " -> " + detail : ""))
  }
}

const sw = makeHarness()

console.log("install")
await sw.dispatch("install")
const shell = sw.caches.get("sewak-shell-v1")
check("precaches the offline page", await shell.match("/offline"))
check(
  "precaches a landing screen for a cold offline start",
  await shell.match("/sewak-cargo-movers/dashboard")
)
check(
  "takes over without waiting for tabs to close",
  sw.skipWaitingCalled === true
)

console.log("\nactivate")
sw.caches.set("sewak-shell-v0", new FakeCache("sewak-shell-v0", sw))
sw.caches.set("some-other-app", new FakeCache("some-other-app", sw))
await sw.dispatch("activate")
check("drops the previous version's cache", !sw.caches.has("sewak-shell-v0"))
check("keeps the current one", sw.caches.has("sewak-shell-v1"))
check("leaves other caches alone", sw.caches.has("some-other-app"))
check("claims open pages", sw.claimCalled === true)

console.log("\nonline")
let response = await sw.navigate("/sewak-union-roadways/bilty")
check(
  "navigation is served from the network",
  response.body === "network:/sewak-union-roadways/bilty"
)
check("and kept for later", await shell.match("/sewak-union-roadways/bilty"))

sw.requested = []
await sw.get("/_next/static/chunks/app.abc123.js")
const assets = sw.caches.get("sewak-assets-v1")
check(
  "build output is cached",
  await assets.match("/_next/static/chunks/app.abc123.js")
)
await sw.get("/_next/static/chunks/app.abc123.js")
check(
  "and a second ask never reaches the network",
  sw.requested.length === 1,
  sw.requested.join(", ")
)

sw.requested = []
await sw.navigate("/")
check("a redirect is not cached", !(await shell.match("/")))

console.log("\noffline")
sw.online = false

response = await sw.navigate("/sewak-union-roadways/bilty")
check(
  "a screen opened before still opens",
  response.body === "network:/sewak-union-roadways/bilty"
)

response = await sw.navigate("/")
check(
  "a cold start lands on the default firm's dashboard",
  response.body === "network:/sewak-cargo-movers/dashboard",
  response.body
)

response = await sw.navigate("/sewak-union-roadways/invoices")
check(
  "a screen never opened here falls back to the offline page",
  response.body === "network:/offline",
  response.body
)

response = await sw.get("/_next/static/chunks/app.abc123.js")
check(
  "cached build output still serves",
  response.body === "network:/_next/static/chunks/app.abc123.js"
)

console.log("\nwhat it refuses to touch")
sw.online = true
check(
  "a POST is left to the browser",
  (await sw.dispatch("fetch", {
    request: new FakeRequest("/anything", { method: "POST" }),
  })) === undefined
)
check(
  "another origin is left alone",
  (await sw.dispatch("fetch", {
    request: new FakeRequest("https://fonts.example/x.woff2"),
  })) === undefined
)

sw.missing.add("/gone")
await sw.get("/gone")
check("a 404 is not cached", !(await shell.match("/gone")))

console.log(`\n${passed} passed, ${failed} failed`)
if (failed) process.exitCode = 1
