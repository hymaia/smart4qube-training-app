export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message);
  }
}

export interface RequestOptions {
  method?: string;
  body?: unknown;
  timeoutMs?: number;
}

/** fetch + JSON + timeout. Throws HttpError on non-2xx, Error on network failure/timeout. */
export async function requestJson<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, timeoutMs = 3000 } = options;
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    const reason = error instanceof Error && error.name === "TimeoutError" ? `timed out after ${timeoutMs} ms` : "unreachable";
    throw new Error(`${method} ${url}: ${reason}`);
  }
  const text = await response.text();
  let parsed: unknown = text;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    // keep the raw text
  }
  if (!response.ok) throw new HttpError(`${method} ${url}: HTTP ${response.status}`, response.status, parsed);
  return parsed as T;
}
