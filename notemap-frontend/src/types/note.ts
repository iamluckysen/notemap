export type NoteSourceType = "TEXT" | "PDF" | "YOUTUBE";

export interface Note {
  id: number;
  sourceType: NoteSourceType | string;
  title: string;
  summary: string;
  mermaidCode: string;
  excalidrawJson: string | null;
  createdAt: string;
}

export interface NoteHistoryItem {
  id: number;
  sourceType: NoteSourceType | string;
  title: string;
  createdAt: string;
}

export interface UpdateNotePayload {
  title: string;
  summary: string;
  mermaidCode: string;
  excalidrawJson: string | null;
}

export interface ApiErrorBody {
  timestamp?: string;
  status?: number;
  error?: string;
  message?: string;
}
