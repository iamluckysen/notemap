import type {
  ApiErrorBody,
  Note,
  NoteHistoryItem,
  UpdateNotePayload,
} from "../types/note";
import { getOrCreateUserId } from "../lib/userId";

export type DiagramType = "visual" | "flowchart";

const DEFAULT_API_BASE_URL = "http://localhost:8080/api/notes";
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL
).replace(/\/+$/, "");

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  timeoutMs?: number;
}

function isErrorBody(value: unknown): value is ApiErrorBody {
  return typeof value === "object" && value !== null;
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, timeoutMs = 30_000, headers, ...init } = options;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  const requestHeaders = new Headers(headers);
  requestHeaders.set("Accept", "application/json");
  requestHeaders.set("X-User-Id", getOrCreateUserId());

  if (body !== undefined) {
    requestHeaders.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(
        "The request timed out. The server may be busy — please try again.",
        0,
      );
    }

    throw new ApiError(
      "Could not reach the NoteMap API. Make sure the backend is running at localhost:8080 and allows this origin (CORS).",
      0,
    );
  } finally {
    window.clearTimeout(timeout);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const rawText = await response.text();
  let payload: unknown = null;

  if (rawText) {
    try {
      payload = JSON.parse(rawText);
    } catch {
      payload = rawText;
    }
  }

  if (!response.ok) {
    let message = "";

    if (isErrorBody(payload)) {
      const bodyMessage = payload.message || payload.error;
      if (typeof bodyMessage === "string" && bodyMessage.trim()) {
        message = bodyMessage.trim();
      }
    } else if (typeof payload === "string" && payload.trim()) {
      message = payload.trim();
    }

    if (!message) {
      if (response.status === 404) {
        message = "That note could not be found. It may have been deleted.";
      } else if (response.status === 401 || response.status === 403) {
        message = "This workspace does not have access to that note.";
      } else if (response.status >= 500) {
        message = "The NoteMap server hit an error. Please try again.";
      } else {
        message = `The request failed (HTTP ${response.status}).`;
      }
    }

    throw new ApiError(message, response.status);
  }

  return payload as T;
}

export const notesApi = {
  generateFromText(
    text: string,
    diagramType: DiagramType = "visual",
  ): Promise<Note> {
    return request<Note>("/generate/text", {
      method: "POST",
      body: { text, diagramType },
      timeoutMs: 180_000,
    });
  },

  getHistory(): Promise<NoteHistoryItem[]> {
    return request<NoteHistoryItem[]>("/history");
  },

  getNote(id: number): Promise<Note> {
    return request<Note>(`/${id}`);
  },

  updateNote(id: number, payload: UpdateNotePayload): Promise<Note> {
    return request<Note>(`/${id}`, {
      method: "PUT",
      body: payload,
    });
  },

  deleteNote(id: number): Promise<void> {
    return request<void>(`/${id}`, {
      method: "DELETE",
    });
  },
};

export { API_BASE_URL };