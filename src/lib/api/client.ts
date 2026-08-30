/**
 * The one place the app talks to scm-backend.
 *
 * The API answers in a fixed envelope — `{ success: true, data }` or
 * `{ success: false, error }` — and this unwraps it, so nothing above this file
 * ever sees `success` or has to remember which half of the response the payload
 * is in. A failure becomes a thrown `ApiError`, which is what both TanStack
 * Query and a server component expect: neither has anywhere to put a returned
 * error, and both have somewhere to put a thrown one.
 *
 * Deliberately isomorphic. Reads run on the server (a page prefetching before
 * it renders) and writes run in the browser (a mutation), and both want the
 * same unwrapping, so the only thing that differs is who supplies the cookie —
 * the browser sends it, and `api/server.ts` forwards it. See that file.
 */

/** Where the API lives. Public because the browser makes the mutations. */
export const API_URL: string =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"

/** Field path → messages, addressed as react-hook-form addresses a field. */
export type FieldErrors = Record<string, string[]>

/**
 * A response the API refused, carrying enough to act on: `code` to branch on,
 * `message` to show, and `fieldErrors` to put back on the form that caused it.
 */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fieldErrors: FieldErrors | null

  constructor(
    status: number,
    code: string,
    message: string,
    fieldErrors: FieldErrors | null = null
  ) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
  }

  /**
   * The API is unreachable — down, wrong port, or the browser is offline.
   * Status 0 because no response came back to take one from.
   */
  static offline(cause: unknown): ApiError {
    const error = new ApiError(
      0,
      "NETWORK_ERROR",
      "Could not reach the server. Check that it is running.",
      null
    )
    // Kept for the console; the message above is the one people read.
    error.cause = cause
    return error
  }
}

interface Envelope {
  success?: unknown
  data?: unknown
  error?: { code?: unknown; message?: unknown; details?: unknown }
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE"
  /** Serialised as JSON. Omitted entirely on a GET. */
  body?: unknown
  /** Forwarded headers — the server uses this to pass the auth cookie on. */
  headers?: Record<string, string>
  signal?: AbortSignal
}

/**
 * Calls the API and returns the `data` half of the envelope.
 *
 * The caller says what shape it expects. That is a claim, not a check: the
 * checking happens one layer up, where each endpoint parses `data` with the
 * schema it is documented to return — see `api/companies.ts`.
 */
export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, headers, signal } = options

  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...headers,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      // The auth cookie is httpOnly and cross-origin; without this the browser
      // neither sends nor stores it.
      credentials: "include",
      // A register is read to be acted on. A stale bilty list is worse than a
      // slow one, so nothing here is cached by the fetch layer — freshness is
      // TanStack Query's job, where it can be reasoned about per query.
      cache: "no-store",
      signal,
    })
  } catch (cause) {
    // A rejected fetch means the request never landed. An abort is the caller's
    // own doing, though, so it is passed through rather than dressed up as the
    // server being down.
    if (cause instanceof DOMException && cause.name === "AbortError")
      throw cause
    throw ApiError.offline(cause)
  }

  // A 204 has no body to parse, and an error page from something in front of
  // the API (a proxy, a tunnel) is not JSON at all.
  const envelope = await readJson(response)

  if (!response.ok || envelope?.success === false) {
    throw new ApiError(
      response.status,
      asString(envelope?.error?.code) ?? "UNKNOWN",
      asString(envelope?.error?.message) ??
        `Request failed with status ${response.status}`,
      asFieldErrors(envelope?.error?.details)
    )
  }

  return envelope?.data as T
}

async function readJson(response: Response): Promise<Envelope | null> {
  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text) as Envelope
  } catch {
    return null
  }
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null
}

/**
 * Narrows the `details` of a validation failure to the field map the form
 * needs, and returns null for anything else — `details` also carries stack
 * traces in development, which are not field errors.
 */
function asFieldErrors(details: unknown): FieldErrors | null {
  if (typeof details !== "object" || details === null) return null

  const entries = Object.entries(details).filter(
    (entry): entry is [string, string[]] =>
      Array.isArray(entry[1]) &&
      entry[1].every((message) => typeof message === "string")
  )

  return entries.length > 0 ? Object.fromEntries(entries) : null
}
