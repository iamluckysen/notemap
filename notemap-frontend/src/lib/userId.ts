const STORAGE_KEY = "notemap_user_id";

let memoryUserId: string | null = null;

function createUuid(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  // crypto.randomUUID is only available in secure contexts. This fallback
  // keeps the anonymous identity working on plain-HTTP LAN origins too.
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.getRandomValues === "function"
  ) {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) =>
      byte.toString(16).padStart(2, "0"),
    );
    return [
      hex.slice(0, 4).join(""),
      hex.slice(4, 6).join(""),
      hex.slice(6, 8).join(""),
      hex.slice(8, 10).join(""),
      hex.slice(10, 16).join(""),
    ].join("-");
  }

  return `anon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Returns the anonymous NoteMap identity for this browser, creating and
 * persisting one on first load. This is called once at app startup and again
 * (cheaply) by the API client so every request carries `X-User-Id`.
 */
export function getOrCreateUserId(): string {
  if (memoryUserId) {
    return memoryUserId;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      memoryUserId = stored;
      return stored;
    }
  } catch {
    // localStorage can be unavailable (private mode / restricted storage).
    // Fall through to an in-memory identity for this session.
  }

  const id = createUuid();
  memoryUserId = id;

  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Ignore storage write failures; the in-memory ID still works.
  }

  return id;
}

export function shortenUserId(userId: string): string {
  return userId.length > 12 ? `${userId.slice(0, 8)}…` : userId;
}
