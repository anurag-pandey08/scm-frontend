/**
 * The office's copy of the app, kept on the machine.
 *
 * A transport office does not stop when the line does — lorries are still being
 * placed, L.R.s still written, bills still printed. Everything this app holds
 * already lives in the browser (seed books in memory, letterheads in local
 * storage), so once the shell is cached there is nothing left that needs the
 * network. The job here is only to make the shell survive a reload.
 *
 * Strategies, and why:
 *
 *   Navigations      network-first. The office should see the current build
 *                    whenever it can; the cache is the safety net, not the
 *                    default. Offline, a screen opened here before opens again;
 *                    one that never has says so on the offline page.
 *
 *   Build output     cache-first. Everything under `/_next/static` is
 *                    content-hashed, so a hit is always the right file and a
 *                    new build asks for new URLs.
 *
 *   Flight data      network-first. Soft navigations fetch the RSC payload for
 *                    a route; cached, they work offline too.
 *
 * What this deliberately does not do is precache the whole build. That needs
 * the build manifest, which means a build-integrated tool (Serwist and the
 * like). Visiting a screen once while online is what puts it within reach
 * offline — which for a desk that opens the same four screens every day is the
 * same thing a day later.
 */

// Bump when the strategies below change. Old caches are dropped on activate.
const VERSION = "v1"

const SHELL = `sewak-shell-${VERSION}`
const ASSETS = `sewak-assets-${VERSION}`
const CURRENT = [SHELL, ASSETS]

/** The apology page, shown only when there is nothing cached to show instead. */
const OFFLINE_URL = "/offline"

/**
 * Where a cold offline start lands. `/` is a redirect to whichever firm was
 * last open, and a redirect cannot be cached and replayed — so the default
 * firm's dashboard stands in for it. Keep in step with `DEFAULT_COMPANY`.
 */
const OFFLINE_START = "/sewak-cargo-movers/dashboard"

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL)
      // `reload` so an install never picks these up from the HTTP cache.
      await cache.addAll(
        [OFFLINE_URL, OFFLINE_START].map(
          (url) => new Request(url, { cache: "reload" })
        )
      )
      // Take over straight away rather than waiting for every tab to close.
      // Safe here because navigations are network-first and build output is
      // content-hashed: a tab running the old build keeps asking for URLs that
      // still resolve.
      await self.skipWaiting()
    })()
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      await Promise.all(
        names
          .filter(
            (name) => name.startsWith("sewak-") && !CURRENT.includes(name)
          )
          .map((name) => caches.delete(name))
      )
      await self.clients.claim()
    })()
  )
})

/** Only successful, complete, same-origin responses are worth keeping. */
function worthCaching(response) {
  return (
    response &&
    response.ok &&
    response.status === 200 &&
    response.type === "basic" &&
    // A redirected response replayed into a navigation is rejected by the
    // browser, so it is never stored.
    !response.redirected
  )
}

async function putInCache(cacheName, request, response) {
  if (!worthCaching(response)) return
  const cache = await caches.open(cacheName)
  await cache.put(request, response.clone())
}

/** Hashed build output and icons: a hit is always right, so ask the cache first. */
async function cacheFirst(request) {
  const hit = await caches.match(request)
  if (hit) return hit

  const response = await fetch(request)
  await putInCache(ASSETS, request, response)
  return response
}

/** Everything else: current when the line is up, cached when it is not. */
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request)
    await putInCache(cacheName, request, response)
    return response
  } catch (error) {
    const hit = await caches.match(request)
    if (hit) return hit
    throw error
  }
}

async function handleNavigation(request) {
  try {
    const response = await fetch(request)
    await putInCache(SHELL, request, response)
    return response
  } catch {
    // This exact screen, if it has been opened before.
    const hit = await caches.match(request, { ignoreSearch: true })
    if (hit) return hit

    // `/` cannot be served from cache — it is a redirect — so a cold start
    // offline lands on the default firm's dashboard instead. Only `/`: asking
    // for one screen and silently getting another is worse than being told
    // the screen is not here.
    if (new URL(request.url).pathname === "/") {
      const start = await caches.match(OFFLINE_START)
      if (start) return start
    }

    const offline = await caches.match(OFFLINE_URL)
    if (offline) return offline

    return Response.error()
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event

  // Anything that changes something on a server is none of this worker's
  // business, and neither is another origin's traffic.
  if (request.method !== "GET") return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request))
    return
  }

  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/favicon.ico" ||
    url.pathname === "/manifest.webmanifest"
  ) {
    event.respondWith(cacheFirst(request))
    return
  }

  event.respondWith(networkFirst(request, SHELL))
})
