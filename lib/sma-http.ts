export class SmaResponseTooLargeError extends Error {
  constructor() {
    super("SMA response exceeded the configured limit.");
    this.name = "SmaResponseTooLargeError";
  }
}

export async function readLimitedJson(response: Response, maxBytes: number): Promise<unknown> {
  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > maxBytes) throw new SmaResponseTooLargeError();
  if (!response.body) return null;

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new SmaResponseTooLargeError();
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  if (!size) return null;
  return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
}

export function smaHeaders(token: string | null, json = false) {
  return {
    Accept: "application/json",
    ...(json ? { "Content-Type": "application/json; charset=utf-8" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
